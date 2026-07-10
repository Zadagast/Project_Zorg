import * as THREE from 'three';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _pivot = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _right = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

const ARM_LENGTH = 5.5;
const ARM_MIN = 2.5;
const SHOULDER = 0.55;
const DEFAULT_YAW = 0;
const DEFAULT_PITCH = 0.42;

/**
 * Fortnite-style TPS on a flat XZ plane.
 * Mouse orbits the camera around the player pivot; camera always lookAt(pivot).
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = ARM_LENGTH;
    this.minDistance = ARM_MIN;
    this.maxDistance = 40;
    this.yaw = DEFAULT_YAW;
    this.pitch = DEFAULT_PITCH;
    this.minPitch = 0.12;
    this.maxPitch = 1.15;
    this.shoulderOffset = SHOULDER;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.004;
    this.wheelSensitivity = 0.012;
    this.walkFov = 80;
    this._savedFov = null;
  }

  setDistanceForBody(radius) {
    this.distance = ARM_LENGTH;
    this.minDistance = ARM_MIN;
    this.exitDistance = Math.max(radius * EXIT_ZOOM_FACTOR, 22);
    this.maxDistance = this.exitDistance * 1.05;
    this.pitch = DEFAULT_PITCH;
  }

  enterWalkMode() {
    this._savedFov = this.camera.fov;
    this.camera.fov = this.walkFov;
    this.camera.updateProjectionMatrix();
  }

  exitWalkMode() {
    this.camera.fov = this._savedFov ?? 50;
    this._savedFov = null;
    this.camera.updateProjectionMatrix();
  }

  applyMouseDelta(delta) {
    this.yaw -= delta.x * this.mouseSensitivity;
    this.pitch -= delta.y * this.mouseSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  adjustDistance(wheelDelta) {
    const scrolledOut = wheelDelta > 0;
    this.distance += wheelDelta * this.wheelSensitivity;
    this.distance = THREE.MathUtils.clamp(this.distance, this.minDistance, this.maxDistance);
    return {
      scrolledOut,
      atMax: this.distance >= this.maxDistance - 0.05,
      atExit: this.distance >= this.exitDistance,
    };
  }

  getDistance() {
    return this.distance;
  }

  /** Camera-relative WASD on the XZ plane (yaw only, no pitch). */
  getMovementBasis() {
    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    return { forward: _forward, right: _right, up: _worldUp };
  }

  /** Place camera on a spring arm behind the player and look at the pivot. */
  update(pivot) {
    _pivot.copy(pivot);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);

    _offset.set(
      this.distance * sinY * cosP,
      this.distance * sinP,
      this.distance * cosY * cosP,
    );

    _right.set(cosY, 0, sinY);
    this.camera.position.copy(_pivot).add(_offset).addScaledVector(_right, this.shoulderOffset);
    this.camera.up.copy(_worldUp);
    this.camera.lookAt(_pivot);
  }

  applyCameraPose(pivot) {
    this.update(pivot);
  }

  setApproachOrientation(pivot, _up, cameraPosition) {
    _pivot.copy(pivot);
    _toCam.copy(cameraPosition).sub(_pivot);
    const len = _toCam.length();
    if (len > 1e-4) {
      this.distance = THREE.MathUtils.clamp(len, this.minDistance, this.maxDistance);
      this.yaw = Math.atan2(_toCam.x, _toCam.z);
      this.pitch = THREE.MathUtils.clamp(
        Math.asin(THREE.MathUtils.clamp(_toCam.y / len, -1, 1)),
        this.minPitch,
        this.maxPitch,
      );
    } else {
      this.yaw = DEFAULT_YAW;
      this.pitch = DEFAULT_PITCH;
    }
  }
}
