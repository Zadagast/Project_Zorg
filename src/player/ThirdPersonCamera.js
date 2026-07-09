import * as THREE from 'three';
import { tangentBasis, projectOntoTangentPlane } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _focus = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _back = new THREE.Vector3();
const _lift = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 8;
    this.minDistance = 4;
    this.maxDistance = 40;
    this.pitch = 0.32;
    this.minPitch = 0.12;
    this.maxPitch = 0.65;
    this.yaw = 0;
    this.lookHeight = 1.2;
    this.shoulder = 0.22;
    this.exitDistance = 20;
  }

  setDistanceForBody(radius) {
    this.distance = Math.max(6, radius * 0.85);
    this.minDistance = Math.max(3, radius * 0.45);
    this.exitDistance = radius * EXIT_ZOOM_FACTOR;
    this.maxDistance = this.exitDistance * 1.05;
    this.lookHeight = Math.max(0.9, radius * 0.16);
    this.shoulder = Math.max(0.15, radius * 0.03);
  }

  applyMouseDelta(delta, sensitivity = 0.0025) {
    this.yaw -= delta.x * sensitivity;
    this.pitch -= delta.y * sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, this.minPitch, this.maxPitch);
  }

  adjustDistance(wheelDelta) {
    const scrolledOut = wheelDelta > 0;
    this.distance += wheelDelta * 0.02;
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

  _writeFocus(focusBase, up, target) {
    return target.copy(up).multiplyScalar(this.lookHeight).add(focusBase);
  }

  _writeOrbitOffset(up, target) {
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);

    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const cosYaw = Math.cos(this.yaw);
    const sinYaw = Math.sin(this.yaw);

    _back.copy(_north).multiplyScalar(-cosPitch * cosYaw)
      .addScaledVector(_east, cosPitch * sinYaw);

    _lift.copy(up).multiplyScalar(sinPitch * this.distance * 0.35);
    _shoulder.copy(_east).multiplyScalar(cosYaw * this.distance * this.shoulder)
      .addScaledVector(_north, -sinYaw * this.distance * this.shoulder);

    return target.copy(_back).multiplyScalar(this.distance).add(_lift).add(_shoulder);
  }

  setApproachOrientation(focusBase, up, cameraPosition, bodyCenter) {
    this._writeFocus(focusBase, up, _focus);
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

    this.pitch = 0.32;
  }

  applyCameraPose(focusBase, up) {
    this._writeFocus(focusBase, up, _focus);
    this._writeOrbitOffset(up, _desired).add(_focus);
    if (!Number.isFinite(_desired.x) || !Number.isFinite(_focus.x)) return;
    this.camera.position.copy(_desired);
    this.camera.lookAt(_focus);
  }

  update(focusBase, up) {
    this.applyCameraPose(focusBase, up);
  }

  getMovementBasis(focusBase, up) {
    this._writeFocus(focusBase, up, _focus);
    projectOntoTangentPlane(_forward.copy(_focus).sub(this.camera.position), up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
