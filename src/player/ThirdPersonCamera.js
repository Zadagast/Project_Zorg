import * as THREE from 'three';
import { parallelTransportDirection, projectOntoTangentPlane, tangentBasis } from '../utils/SphericalMath.js';
import { EXIT_ZOOM_FACTOR } from '../config.js';

const _pivot = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _flat = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _view = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _qPitch = new THREE.Quaternion();
const _qYaw = new THREE.Quaternion();

const ARM_LENGTH = 4.8;
const ARM_MIN = 3;
const SHOULDER = 0.62;
const DEFAULT_PITCH = -0.28;

/**
 * Flat-plane TPS on a sphere: store look direction as a tangent vector and
 * parallel-transport it when the surface normal changes — no yaw drift.
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.distance = ARM_LENGTH;
    this.minDistance = ARM_MIN;
    this.maxDistance = 40;
    this.pitch = DEFAULT_PITCH;
    this.minPitch = -1.1;
    this.maxPitch = 0.75;
    /** World-space horizontal look direction (tangent to surface). */
    this._controlForward = new THREE.Vector3(0, 0, -1);
    this._lastUp = new THREE.Vector3(0, 1, 0);
    this.shoulderOffset = SHOULDER;
    this.exitDistance = 20;
    this.mouseSensitivity = 0.0042;
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
    this._lastUp.set(0, 1, 0);
  }

  exitWalkMode() {
    this.camera.fov = this._savedFov ?? 50;
    this._savedFov = null;
    this.camera.updateProjectionMatrix();
  }

  /** Carry control forward when walking changes the surface normal. */
  syncToSurface(up) {
    if (this._lastUp.lengthSq() > 0.5 && this._lastUp.dot(up) < 0.9999) {
      parallelTransportDirection(this._controlForward, this._lastUp, up, this._controlForward);
    } else {
      projectOntoTangentPlane(this._controlForward, up, this._controlForward);
    }
    this._lastUp.copy(up);
  }

  applyMouseDelta(delta, up) {
    _qYaw.setFromAxisAngle(up, -delta.x * this.mouseSensitivity);
    this._controlForward.applyQuaternion(_qYaw);
    projectOntoTangentPlane(this._controlForward, up, this._controlForward);
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

  /** Horizontal control forward — movement + camera yaw (no pitch). */
  getControlForward(up, target) {
    return projectOntoTangentPlane(this._controlForward, up, target);
  }

  getViewDirection(up, target) {
    this.getControlForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    _qPitch.setFromAxisAngle(_right, this.pitch);
    return target.copy(_forward).applyQuaternion(_qPitch).normalize();
  }

  _writeSpringArmPosition(pivot, up, target) {
    this.getViewDirection(up, _view);
    this.getControlForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return target
      .copy(pivot)
      .addScaledVector(_view, -this.distance)
      .addScaledVector(_right, this.shoulderOffset);
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
      projectOntoTangentPlane(new THREE.Vector3(0, 0, -1), up, this._controlForward);
      this.pitch = DEFAULT_PITCH;
      this._lastUp.copy(up);
      return;
    }
    _view.normalize();

    _flat.copy(_view);
    projectOntoTangentPlane(_flat, up, this._controlForward);
    if (this._controlForward.lengthSq() < 1e-8) {
      projectOntoTangentPlane(new THREE.Vector3(0, 0, -1), up, this._controlForward);
    }

    const pitchedComponent = _view.dot(up);
    this.pitch = THREE.MathUtils.clamp(
      Math.asin(THREE.MathUtils.clamp(pitchedComponent, -1, 1)),
      this.minPitch,
      this.maxPitch,
    );
    this._lastUp.copy(up);
  }

  applyCameraPose(pivot, up) {
    _pivot.copy(pivot);
    this.getViewDirection(up, _view);
    this._writeSpringArmPosition(_pivot, up, _desired);

    if (!Number.isFinite(_desired.x) || !Number.isFinite(_view.x)) return;

    this._orientAlongView(_desired, _view, up);
  }

  update(pivot, up) {
    this.syncToSurface(up);
    this.applyCameraPose(pivot, up);
  }

  getMovementBasis(_pivot, up) {
    this.getControlForward(up, _forward);
    _right.crossVectors(_forward, up).normalize();
    return { forward: _forward, right: _right, up };
  }
}
