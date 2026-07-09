import * as THREE from 'three';
import { tangentBasis } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _pivot = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();

/**
 * Standard third-person orbit: camera circles behind the player pivot (chest height).
 * Mouse yaw/pitch rotate around the character, not the screen-center crosshair.
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 4.5;
    this.minDistance = 2.5;
    this.maxDistance = 40;
    this.pitch = 0.38;
    this.minPitch = 0.12;
    this.maxPitch = 0.72;
    this.yaw = 0;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0045;
    this.wheelSensitivity = 0.015;
    this.walkFov = 50;
    this._savedFov = null;
  }

  setDistanceForBody(radius) {
    this.distance = Math.max(3.5, radius * 0.55);
    this.minDistance = Math.max(2.5, radius * 0.35);
    this.exitDistance = radius * EXIT_ZOOM_FACTOR;
    this.maxDistance = this.exitDistance * 1.05;
    this.pitch = 0.38;
  }

  enterWalkMode() {
    this._savedFov = this.camera.fov;
    this.camera.fov = this.walkFov;
    this.camera.updateProjectionMatrix();
  }

  exitWalkMode() {
    this.camera.fov = this._savedFov ?? 60;
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

  _writeForwardFromYaw(up, target) {
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);
    return target.copy(_north).multiplyScalar(Math.cos(this.yaw)).addScaledVector(_east, Math.sin(this.yaw));
  }

  _writeOrbitPosition(pivot, up, target) {
    this._writeForwardFromYaw(up, _forward);
    _right.crossVectors(_forward, up).normalize();

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    _offset.copy(_forward).multiplyScalar(-this.distance * cosPitch);
    _offset.addScaledVector(up, this.distance * sinPitch);

    return target.copy(pivot).add(_offset);
  }

  setApproachOrientation(pivot, up, cameraPosition, bodyCenter) {
    _pivot.copy(pivot);
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);

    _toCamera.copy(cameraPosition).sub(_pivot);
    const startDist = _toCamera.length();
    if (startDist > 1e-4) {
      this.distance = THREE.MathUtils.clamp(startDist, this.minDistance, this.maxDistance);
    }

    _flat.copy(_toCamera);
    _flat.addScaledVector(up, -_flat.dot(up));
    if (_flat.lengthSq() < 1e-4 && bodyCenter) {
      _flat.copy(cameraPosition).sub(bodyCenter);
      _flat.addScaledVector(up, -_flat.dot(up));
    }

    if (_flat.lengthSq() > 1e-4) {
      _flat.normalize();
      this.yaw = Math.atan2(_flat.dot(_east), _flat.dot(_north));
    } else {
      this.yaw = 0;
    }

    this.pitch = 0.38;
  }

  applyCameraPose(pivot, up) {
    _pivot.copy(pivot);
    this._writeOrbitPosition(_pivot, up, _desired);

    if (!Number.isFinite(_desired.x) || !Number.isFinite(_pivot.x)) return;

    this.camera.position.copy(_desired);
    this.camera.lookAt(_pivot);
  }

  update(pivot, up) {
    this.applyCameraPose(pivot, up);
  }

  getMovementBasis(_pivot, up) {
    this._writeForwardFromYaw(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
