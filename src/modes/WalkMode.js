import * as THREE from 'three';
import { WalkRig } from '../player/WalkRig.js';

const WHEEL_GRACE_MS = 800;
const _focusBase = new THREE.Vector3();
const _up = new THREE.Vector3();
const _bodyCenter = new THREE.Vector3();

export class WalkMode {
  constructor({
    scene,
    camera,
    solarSystem,
    player,
    tpsCamera,
    input,
    onExitRequest,
  }) {
    this.scene = scene;
    this.camera = camera;
    this.solarSystem = solarSystem;
    this.player = player;
    this.tpsCamera = tpsCamera;
    this.input = input;
    this.onExitRequest = onExitRequest;
    this.walkRig = new WalkRig(scene);
    this.activeBody = null;
    this.enabled = false;
    this._enterTime = 0;
    this._lookActive = false;

    input.domElement.addEventListener('mousedown', this._onCanvasMouseDown);
    input.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  _onContextMenu = (e) => {
    if (this.enabled) e.preventDefault();
  };

  _onCanvasMouseDown = (e) => {
    if (!this.enabled) return;
    if (e.button === 0 || e.button === 2) {
      e.preventDefault();
      this._lookActive = true;
      this.input.domElement.focus({ preventScroll: true });
    }
  };

  prepareLanding(body, landingPoint) {
    this.activeBody = body;
    this.enabled = false;

    this.solarSystem.setBodiesVisibleExcept(body, false);
    body.setHighlighted(false);

    this.walkRig.attach(body, this.player, landingPoint);

    const focusBase = this.walkRig.getFocusBase(_focusBase);
    const up = this.walkRig.getWorldUp(_up);
    const bodyCenter = body.getWorldCenter(_bodyCenter);

    this.tpsCamera.setDistanceForBody(body.radius);
    const targetDist = this.tpsCamera.distance;
    this.tpsCamera.setApproachOrientation(focusBase, up, this.camera.position, bodyCenter);
    const startDist = this.tpsCamera.distance;
    this.tpsCamera.applyCameraPose(focusBase, up);

    return { startDist, targetDist };
  }

  abortLanding() {
    this.enabled = false;
    this.activeBody = null;
    this._lookActive = false;
    if (this.player.root.parent) {
      this.player.root.parent.remove(this.player.root);
    }
    this.walkRig.detach();
    this.solarSystem?.resetVisibility();
    this.input.consumeWheelDelta();
  }

  finishLanding() {
    this.enabled = true;
    this._enterTime = performance.now();
    this._lookActive = false;
    this.input.consumeWheelDelta();
    const focusBase = this.walkRig.getFocusBase(_focusBase);
    const up = this.walkRig.getWorldUp(_up);
    this.tpsCamera.applyCameraPose(focusBase, up);
    this.walkRig.syncPlayerFacing(this.tpsCamera, focusBase, up);
  }

  exit() {
    this.enabled = false;
    this._lookActive = false;
    if (this.player.root.parent) {
      this.player.root.parent.remove(this.player.root);
    }
    this.walkRig.detach();
    this.activeBody = null;
    this.input.exitPointerLock();
    this.input.consumeWheelDelta();
    this.solarSystem.resetVisibility();
  }

  update(dt) {
    if (!this.enabled || !this.activeBody) return;

    try {
      const focusBase = this.walkRig.getFocusBase(_focusBase);
      const up = this.walkRig.getWorldUp(_up);

      if (!this.input.isMouseDown(0) && !this.input.isMouseDown(2)) {
        this._lookActive = false;
      }

      const mouse = this.input.consumeMouseDelta();
      const canLook = this._lookActive || this.input.isMouseDown(0) || this.input.isMouseDown(2);
      if (canLook && (mouse.x !== 0 || mouse.y !== 0)) {
        this.tpsCamera.applyMouseDelta(mouse);
      }

      const sinceEnter = performance.now() - this._enterTime;
      let wheel = 0;
      if (sinceEnter > WHEEL_GRACE_MS) {
        wheel = this.input.consumeWheelDelta();
      } else {
        this.input.consumeWheelDelta();
      }
      if (wheel !== 0) {
        const zoom = this.tpsCamera.adjustDistance(wheel);
        if (zoom.atExit || (zoom.scrolledOut && zoom.atMax)) {
          this.onExitRequest(this.activeBody);
          return;
        }
      }

      if (this.input.isDown('Escape')) {
        this.onExitRequest(this.activeBody);
        return;
      }

      const movementBasis = this.tpsCamera.getMovementBasis(focusBase, up);
      const moved = this.walkRig.applyMovement(this.input, movementBasis, dt);
      if (!moved) {
        this.walkRig.syncPlayerFacing(this.tpsCamera, focusBase, up);
      }

      this.tpsCamera.update(focusBase, up);
    } catch (err) {
      console.error('Walk mode update failed:', err);
    }
  }

  updateLandingTransition() {
    if (!this.activeBody) return;
    const focusBase = this.walkRig.getFocusBase(_focusBase);
    const up = this.walkRig.getWorldUp(_up);
    this.tpsCamera.applyCameraPose(focusBase, up);
  }

  setLandingDistance(distance) {
    this.tpsCamera.distance = distance;
  }

  getExitCameraPose() {
    return this.walkRig.getExitCameraPose();
  }
}
