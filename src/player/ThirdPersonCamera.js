import * as THREE from 'three';
import { tangentBasis } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _pivot = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _view = new THREE.Vector3();
const _mat = new THREE.Matrix4();

/**
 * Third-person shooter camera on a spherical surface.
 * Yaw/pitch orbit around a chest pivot; camera.up = surface normal so the horizon
 * stays level with the player's view (no world-Y roll from lookAt).
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 4.5;
    this.minDistance = 2.5;
    this.maxDistance = 40;
    /** Radians above the local horizon (0 = eye-level behind player). */
    this.pitch = 0.32;
    this.minPitch = 0.08;
    this.maxPitch = 1.15;
    this.yaw = 0;
    this.shoulderOffset = 0.75;
    this.aimLead = 16;
    this.aimHeight = 0.25;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0032;
    this.wheelSensitivity = 0.015;
    this.walkFov = 52;
    this._savedFov = null;
  }

  setDistanceForBody(radius) {
    this.distance = Math.max(3.2, radius * 0.52);
    this.minDistance = Math.max(2.2, radius * 0.32);
    this.exitDistance = radius * EXIT_ZOOM_FACTOR;
    this.maxDistance = this.exitDistance * 1.05;
    this.pitch = 0.32;
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
    _offset.addScaledVector(_right, this.shoulderOffset);

    return target.copy(pivot).add(_offset);
  }

  _writeAimPoint(pivot, up, target) {
    this._writeForwardFromYaw(up, _forward);
    return target
      .copy(pivot)
      .addScaledVector(_forward, this.aimLead)
      .addScaledVector(up, this.aimHeight);
  }

  /** Aim with a fixed horizon (surface up) — standard TPS, no roll. */
  _orientCamera(position, target, up) {
    this.camera.position.copy(position);
    _view.copy(target).sub(position);

    if (_view.lengthSq() < 1e-8) {
      this._writeForwardFromYaw(up, _view);
    } else {
      _view.normalize();
    }

    _right.crossVectors(_view, up);
    if (_right.lengthSq() < 1e-8) {
      _right.copy(tangentBasis(up).east);
    } else {
      _right.normalize();
    }

    _offset.copy(_view).negate();
    _mat.makeBasis(_right, up, _offset);
    this.camera.quaternion.setFromRotationMatrix(_mat);
    this.camera.up.copy(up);
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

    const horizLen = _flat.length();
    const vert = _toCamera.dot(up);

    if (horizLen > 1e-4) {
      _flat.normalize();
      this.yaw = Math.atan2(_flat.dot(_east), _flat.dot(_north));
      this.pitch = THREE.MathUtils.clamp(Math.atan2(vert, horizLen), this.minPitch, this.maxPitch);
    } else {
      this.yaw = 0;
      this.pitch = 0.32;
    }
  }

  applyCameraPose(pivot, up) {
    _pivot.copy(pivot);
    this._writeOrbitPosition(_pivot, up, _desired);
    this._writeAimPoint(_pivot, up, _aim);

    if (!Number.isFinite(_desired.x) || !Number.isFinite(_aim.x)) return;

    this._orientCamera(_desired, _aim, up);
  }

  update(pivot, up) {
    this.applyCameraPose(pivot, up);
  }

  /** Camera-relative WASD on the local horizon (yaw only). */
  getMovementBasis(_pivot, up) {
    this._writeForwardFromYaw(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
