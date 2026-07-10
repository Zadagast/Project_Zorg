import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { animateDual, stopAllTweens } from '../utils/transitions.js';
import { getWorldCenter, getCameraDistanceToBody } from '../utils/SphericalMath.js';
import { LAND_ZOOM_FACTOR, SOLAR_SYSTEM_CENTER_X } from '../config.js';

export class PlanetariumMode {
  constructor({ camera, renderer, solarSystem, onSelectBody, onLandTrigger }) {
    this.camera = camera;
    this.solarSystem = solarSystem;
    this.onSelectBody = onSelectBody;
    this.onLandTrigger = onLandTrigger;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 2800;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.target.set(SOLAR_SYSTEM_CENTER_X, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.selectedBody = null;
    this.transitioning = false;
    this.landTriggered = false;
    this._focusTween = null;
    this._focusSafetyTimer = null;

    this.domElement = renderer.domElement;
    this.domElement.addEventListener('dblclick', this._onDoubleClick);
  }

  _onDoubleClick = (event) => {
    if (this.transitioning || !this.solarSystem) return;
    event.preventDefault();

    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.solarSystem.getPickTargets(), false);
    if (hits.length === 0) return;

    const body = hits[0].object.userData.celestialBody;
    if (!body) return;

    this.focusBody(body);
    this.onSelectBody(body);
  };

  cancelFocus() {
    if (this._focusTween) {
      stopAllTweens();
      this._focusTween = null;
    }
    this._releaseControls();
  }

  _releaseControls() {
    this.transitioning = false;
    this.controls.enabled = true;
    this.controls.enableRotate = true;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    if (this._focusSafetyTimer) {
      clearTimeout(this._focusSafetyTimer);
      this._focusSafetyTimer = null;
    }
    this._focusTween = null;
  }

  _lockControlsForFocus() {
    this.transitioning = true;
    this.controls.enableRotate = false;
    this.controls.enableZoom = false;
    this._focusSafetyTimer = setTimeout(() => this._releaseControls(), 1500);
  }

  focusBody(body) {
    if (this._focusTween) {
      stopAllTweens();
      this._focusTween = null;
    }

    if (this.selectedBody && this.selectedBody !== body) {
      this.selectedBody.setHighlighted(false);
    }
    this.selectedBody = body;
    body.setHighlighted(true);
    this.landTriggered = false;

    const center = getWorldCenter(body);
    const offset = this.camera.position.clone().sub(center);
    if (offset.lengthSq() < 1e-4) offset.set(0, 0, 1);
    const viewDir = offset.normalize();
    const targetDistance = Math.max(body.radius * 4, body.radius + 10);
    const endCam = center.clone().add(viewDir.multiplyScalar(targetDistance));
    const startCam = this.camera.position.clone();
    const startTarget = this.controls.target.clone();

    this._lockControlsForFocus();

    this._focusTween = animateDual(
      startCam,
      endCam,
      startTarget,
      center,
      800,
      (camPos, target) => {
        this.camera.position.copy(camPos);
        this.controls.target.copy(target);
      },
      () => {
        this._releaseControls();
        this.controls.minDistance = body.radius * 1.2;
        this.controls.maxDistance = Math.max(800, body.distance + body.radius * 10);
      },
    );
  }

  selectInitialBody() {
    const earth = this.solarSystem.getBodyByName('Earth');
    if (earth) {
      this.onSelectBody(earth);
      this.selectedBody = earth;
      earth.setHighlighted(true);
      this.controls.target.copy(earth.getWorldCenter());
    }
  }

  update() {
    if (!this.solarSystem || !this.selectedBody || this.transitioning || this.selectedBody.isSun) return;

    const dist = getCameraDistanceToBody(this.camera, this.selectedBody);
    if (!this.landTriggered && dist < this.selectedBody.radius * LAND_ZOOM_FACTOR) {
      this.landTriggered = true;
      this.onLandTrigger(this.selectedBody);
    }
  }

  getLandingPoint() {
    if (!this.selectedBody) return null;

    const center = getWorldCenter(this.selectedBody);
    const toCamera = this.camera.position.clone().sub(center);
    if (toCamera.lengthSq() < 1e-4) toCamera.set(0, 0, 1);
    toCamera.normalize();
    const origin = center.clone().add(toCamera.clone().multiplyScalar(this.selectedBody.radius * 3));
    const hit = this.selectedBody.raycastSurface(origin, toCamera.clone().negate());
    if (hit) return hit.point;

    return center.clone().add(toCamera.multiplyScalar(this.selectedBody.radius + 0.5));
  }

  setEnabled(enabled) {
    this.controls.enabled = enabled;
    if (enabled) {
      this.controls.enableRotate = true;
      this.controls.enableZoom = true;
    }
  }

  enter() {
    this.solarSystem.resetVisibility();
    this._releaseControls();
    this.landTriggered = false;
    this.controls.connect(this.domElement);
    this.setEnabled(true);
  }

  exit() {
    this.setEnabled(false);
    this.controls.disconnect();
  }

  dispose() {
    if (this._focusSafetyTimer) clearTimeout(this._focusSafetyTimer);
    this.domElement.removeEventListener('dblclick', this._onDoubleClick);
    this.controls.dispose();
  }
}
