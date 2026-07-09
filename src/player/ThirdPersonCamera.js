import * as THREE from 'three';
import { tangentBasis, projectOntoTangentPlane } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _focus = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 4.5;
    this.minDistance = 2.5;
    this.maxDistance = 40;
    this.pitch = 0.48;
    this.minPitch = 0.22;
    this.maxPitch = 0.82;
    this.yaw = 0;
    this.lookHeight = 1.0;
    this.shoulderOffset = 0.85;
    this.aimLead = 24;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0045;
    this.wheelSensitivity = 0.015;
    this.walkFov = 52;
    this._savedFov = null;
  }

  setDistanceForBody(radius) {
    this.distance = Math.max(3.2, radius * 0.52);
    this.minDistance = Math.max(2.2, radius * 0.32);
    this.exitDistance = radius * EXIT_ZOOM_FACTOR;
    this.maxDistance = this.exitDistance * 1.05;
    this.lookHeight = Math.max(0.85, radius * 0.12);
    this.shoulderOffset = Math.max(0.7, radius * 0.11);
    this.aimLead = Math.max(16, radius * 2.2);
    this.pitch = 0.48;
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

  _writePivot(focusBase, up, target) {
    return target.copy(up).multiplyScalar(this.lookHeight).add(focusBase);
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
    _offset.addScaledVector(_right, this.shoulderOffset);

    return target.copy(pivot).add(_offset);
  }

  _writeAimPoint(pivot, up, target) {
    this._writeForwardFromYaw(up, _forward);
    return target.copy(pivot)
      .addScaledVector(_forward, this.aimLead)
      .addScaledVector(up, this.lookHeight * 0.15);
  }

  setApproachOrientation(focusBase, up, cameraPosition, bodyCenter) {
    this._writePivot(focusBase, up, _focus);
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);

    _toCamera.copy(cameraPosition).sub(_focus);
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

    this.pitch = 0.48;
  }

  applyCameraPose(focusBase, up) {
    this._writePivot(focusBase, up, _focus);
    this._writeOrbitPosition(_focus, up, _desired);
    this._writeAimPoint(_focus, up, _aim);

    if (!Number.isFinite(_desired.x) || !Number.isFinite(_aim.x)) return;

    this.camera.position.copy(_desired);
    this.camera.lookAt(_aim);
  }

  update(focusBase, up) {
    this.applyCameraPose(focusBase, up);
  }

  /** TPS strafe: move on the ground plane using camera yaw, not look pitch. */
  getMovementBasis(focusBase, up) {
    this._writeForwardFromYaw(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
