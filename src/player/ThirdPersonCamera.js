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

/** Fixed TPS camera distance — character-scale, not planet-scale. */
const TPS_DISTANCE = 5.2;
const TPS_MIN_DISTANCE = 3.2;
const TPS_SHOULDER = 0.55;

/**
 * Third-person shooter camera — orbits a moving chest pivot on the surface.
 * Yaw/pitch share one view direction; horizon locked to local surface up.
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = TPS_DISTANCE;
    this.minDistance = TPS_MIN_DISTANCE;
    this.maxDistance = 40;
    this.pitch = -0.22;
    this.minPitch = -0.45;
    this.maxPitch = 0.55;
    this.yaw = 0;
    this.shoulderOffset = TPS_SHOULDER;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0038;
    this.wheelSensitivity = 0.012;
    this.walkFov = 60;
    this._savedFov = null;
  }

  setDistanceForBody(radius) {
    this.distance = TPS_DISTANCE;
    this.minDistance = TPS_MIN_DISTANCE;
    this.exitDistance = Math.max(radius * EXIT_ZOOM_FACTOR, 22);
    this.maxDistance = this.exitDistance * 1.05;
    this.pitch = -0.22;
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

  _writeFlatForward(up, target) {
    const basis = tangentBasis(up);
    _east.copy(basis.east);
    _north.copy(basis.north);
    return target.copy(_north).multiplyScalar(Math.cos(this.yaw)).addScaledVector(_east, Math.sin(this.yaw));
  }

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
      this.pitch = -0.22;
      return;
    }
    _view.normalize();

    _flat.copy(_view);
    _flat.addScaledVector(up, -_flat.dot(up));
    const horizLen = _flat.length();

    if (horizLen > 1e-4) {
      _flat.normalize();
      this.yaw = Math.atan2(_flat.dot(_east), _flat.dot(_north));
      this.pitch = THREE.MathUtils.clamp(
        Math.asin(THREE.MathUtils.clamp(_view.dot(up), -1, 1)),
        this.minPitch,
        this.maxPitch,
      );
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

  getMovementBasis(_pivot, up) {
    this._writeFlatForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
