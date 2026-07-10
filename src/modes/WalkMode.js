import * as THREE from 'three';
import { WalkRig } from '../player/WalkRig.js';

const WHEEL_GRACE_MS = 600;
const _focusBase = new THREE.Vector3();
const _cameraPivot = new THREE.Vector3();
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
    crosshair,
    onHintChange,
  }) {
    this.scene = scene;
    this.camera = camera;
    this.solarSystem = solarSystem;
    this.player = player;
    this.tpsCamera = tpsCamera;
    this.input = input;
    this.onExitRequest = onExitRequest;
    this.onHintChange = onHintChange;
    this.crosshair = crosshair;
    this.walkRig = new WalkRig(scene);
    this.activeBody = null;
    this.enabled = false;
    this._enterTime = 0;

    input.domElement.addEventListener('contextmenu', this._onContextMenu);
  }

  _onContextMenu = (e) => {
    if (this.enabled) e.preventDefault();
  };

  _setCrosshairVisible(visible) {
    if (this.crosshair) this.crosshair.hidden = !visible;
  }

  _updateLookHint() {
    if (!this.onHintChange || !this.enabled) return;
    if (this.input.isPointerLocked()) {
      this.onHintChange('WASD move · Mouse look · Scroll out to leave · Esc exit');
    } else {
      this.onHintChange('Hold click + drag to look · WASD move · Scroll out · Esc exit');
    }
  };

  prepareLanding(body, landingPoint) {
    this.activeBody = body;
    this.enabled = false;
    this.input.setWalkMode(false);
    this.tpsCamera.enterWalkMode();

    this.solarSystem.setBodiesVisibleExcept(body, false);
    body.setHighlighted(false);
    if (body.label) body.label.visible = false;

    this.walkRig.attach(body, this.player, landingPoint);

    const cameraPivot = this.walkRig.getCameraPivot(_cameraPivot);
    const up = this.walkRig.getWorldUp(_up);
    const bodyCenter = body.getWorldCenter(_bodyCenter);

    this.tpsCamera.setDistanceForBody(body.radius);
    const targetDist = this.tpsCamera.distance;
    this.tpsCamera.setApproachOrientation(cameraPivot, up, this.camera.position, bodyCenter);
    const startDist = this.tpsCamera.distance;
    this.tpsCamera.applyCameraPose(cameraPivot, up);

    return { startDist, targetDist };
  }

  abortLanding() {
    this.enabled = false;
    this.activeBody = null;
    this.input.setWalkMode(false);
    this._setCrosshairVisible(false);
    this.tpsCamera.exitWalkMode();
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
    this.input.setWalkMode(true);
    this._setCrosshairVisible(true);
    this.input.consumeWheelDelta();
    this.input.consumeMouseDelta();

    const focusBase = this.walkRig.getFocusBase(_focusBase);
    const cameraPivot = this.walkRig.getCameraPivot(_cameraPivot);
    const up = this.walkRig.getWorldUp(_up);
    this.tpsCamera.applyCameraPose(cameraPivot, up);
    this.walkRig.syncPlayerFacing(this.tpsCamera, focusBase, up);
    this._updateLookHint();
  }

  exit() {
    this.enabled = false;
    this.input.setWalkMode(false);
    this._setCrosshairVisible(false);
    this.tpsCamera.exitWalkMode();
    if (this.player.root.parent) {
      this.player.root.parent.remove(this.player.root);
    }
    this.walkRig.detach();
    this.activeBody = null;
    this.input.consumeWheelDelta();
    this.solarSystem.resetVisibility();
  }

  update(dt) {
    if (!this.enabled || !this.activeBody) return;

    try {
      const focusBase = this.walkRig.getFocusBase(_focusBase);
      const cameraPivot = this.walkRig.getCameraPivot(_cameraPivot);
      const up = this.walkRig.getWorldUp(_up);

      const mouse = this.input.consumeMouseDelta();
      if (mouse.x !== 0 || mouse.y !== 0) {
        this.tpsCamera.applyMouseDelta(mouse);
      }

      this._updateLookHint();

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

      this.walkRig.syncPlayerFacing(this.tpsCamera, focusBase, up);

      const movementBasis = this.tpsCamera.getMovementBasis(cameraPivot, up);
      this.walkRig.applyMovement(this.input, movementBasis, dt);

      const pivot = this.walkRig.getCameraPivot(_cameraPivot);
      const surfaceUp = this.walkRig.getWorldUp(_up);
      this.tpsCamera.update(pivot, surfaceUp);
      this.walkRig.updateFillLight();
    } catch (err) {
      console.error('Walk mode update failed:', err);
    }
  }

  updateLandingTransition() {
    if (!this.activeBody) return;
    const cameraPivot = this.walkRig.getCameraPivot(_cameraPivot);
    const up = this.walkRig.getWorldUp(_up);
    this.tpsCamera.applyCameraPose(cameraPivot, up);
  }

  setLandingDistance(distance) {
    this.tpsCamera.distance = distance;
  }

  getExitCameraPose() {
    return this.walkRig.getExitCameraPose();
  }
}
