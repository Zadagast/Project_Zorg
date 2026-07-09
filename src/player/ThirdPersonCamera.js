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
const _camForward = new THREE.Vector3();

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 8;
    this.minDistance = 4;
    this.maxDistance = 40;
    this.pitch = 0.38;
    this.minPitch = 0.08;
    this.maxPitch = 0.72;
    this.yaw = 0;
    this.lookHeight = 1.2;
    this.shoulderRatio = 0.42;
    this.aimLead = 5;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0032;
    this.wheelSensitivity = 0.012;
  }

  setDistanceForBody(radius) {
    this.distance = Math.max(7, radius * 1.05);
    this.minDistance = Math.max(3.5, radius * 0.5);
    this.exitDistance = radius * EXIT_ZOOM_FACTOR;
    this.maxDistance = this.exitDistance * 1.05;
    this.lookHeight = Math.max(1.0, radius * 0.18);
    this.shoulderRatio = 0.4;
    this.aimLead = Math.max(4, radius * 0.65);
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

  /** Camera position on a sphere around the player pivot, shifted to the right shoulder. */
  _writeOrbitPosition(pivot, up, target) {
    this._writeForwardFromYaw(up, _forward);
    _right.crossVectors(_forward, up).normalize();

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);

    _offset.copy(_forward).multiplyScalar(-cosPitch * this.distance);
    _offset.addScaledVector(up, sinPitch * this.distance);
    _offset.addScaledVector(_right, this.distance * this.shoulderRatio);

    return target.copy(pivot).add(_offset);
  }

  /** Look past the player in the facing direction (crosshair-style). */
  _writeAimPoint(pivot, up, target) {
    this._writeForwardFromYaw(up, _forward);
    return target.copy(pivot).addScaledVector(_forward, this.aimLead);
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

    this.pitch = 0.38;
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

  /** WASD moves relative to where the camera looks (standard TPS). */
  getMovementBasis(focusBase, up) {
    this.camera.getWorldDirection(_camForward);
    projectOntoTangentPlane(_camForward, up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
