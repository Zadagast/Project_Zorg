import * as THREE from 'three';
import { tangentBasis } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _pivot = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _view = new THREE.Vector3();
const _east = new THREE.Vector3();
const _north = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _qPitch = new THREE.Quaternion();

/**
 * True pivot-orbit TPS camera.
 * Yaw/pitch rotate around the player chest; view direction and position both
 * derive from the same angles so rotation never pivots on the crosshair.
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = 4.5;
    this.minDistance = 2.5;
    this.maxDistance = 40;
    /** View elevation above local horizon (rad). Negative = look slightly down. */
    this.pitch = -0.18;
    this.minPitch = -0.55;
    this.maxPitch = 0.65;
    this.yaw = 0;
    this.shoulderOffset = 0.7;
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
    this.pitch = -0.18;
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

  /** Horizontal forward on the surface tangent plane (movement + yaw reference). */
  _writeFlatForward(up, target) {
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);
    return target.copy(_north).multiplyScalar(Math.cos(this.yaw)).addScaledVector(_east, Math.sin(this.yaw));
  }

  /** Full view direction after pitch — crosshair points here. */
  _writeViewDirection(up, target) {
    this._writeFlatForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    _qPitch.setFromAxisAngle(_right, this.pitch);
    return target.copy(_forward).applyQuaternion(_qPitch).normalize();
  }

  _writeCameraPosition(pivot, up, target) {
    this._writeFlatForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    this._writeViewDirection(up, _view);

    return target
      .copy(pivot)
      .addScaledVector(_right, this.shoulderOffset)
      .addScaledVector(_view, -this.distance);
  }

  /** Orient camera to look along viewDir with a level horizon (surface up). */
  _orientAlongView(position, viewDir, up) {
    this.camera.position.copy(position);

    _right.crossVectors(viewDir, up);
    if (_right.lengthSq() < 1e-8) {
      _right.copy(tangentBasis(up).east);
    } else {
      _right.normalize();
    }

    _forward.copy(viewDir).negate();
    _mat.makeBasis(_right, up, _forward);
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

    _view.copy(_pivot).sub(cameraPosition);
    if (_view.lengthSq() < 1e-4 && bodyCenter) {
      _view.copy(_pivot).sub(bodyCenter);
    }
    if (_view.lengthSq() < 1e-4) {
      this.yaw = 0;
      this.pitch = -0.18;
      return;
    }
    _view.normalize();

    _flat.copy(_view);
    _flat.addScaledVector(up, -_flat.dot(up));
    const horizLen = _flat.length();

    if (horizLen > 1e-4) {
      _flat.normalize();
      this.yaw = Math.atan2(_flat.dot(_east), _flat.dot(_north));
      this.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(_view.dot(up), -1, 1)), this.minPitch, this.maxPitch);
    } else {
      this.yaw = 0;
      this.pitch = _view.dot(up) > 0 ? this.maxPitch : this.minPitch;
    }
  }

  applyCameraPose(pivot, up) {
    _pivot.copy(pivot);
    this._writeViewDirection(up, _view);
    this._writeCameraPosition(_pivot, up, _desired);

    if (!Number.isFinite(_desired.x) || !Number.isFinite(_view.x)) return;

    this._orientAlongView(_desired, _view, up);
  }

  update(pivot, up) {
    this.applyCameraPose(pivot, up);
  }

  /** WASD uses flat camera yaw on the horizon, not pitched view. */
  getMovementBasis(_pivot, up) {
    this._writeFlatForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
