import * as THREE from 'three';
import { tangentBasis } from '../utils/SphericalMath.js';

const _rigUp = new THREE.Vector3(0, 1, 0);
const _pole = new THREE.Vector3(0, 1, 0);
const _localUp = new THREE.Vector3();
const _localPos = new THREE.Vector3();
const _focusScratch = new THREE.Vector3();
const _moveScratch = new THREE.Vector3();
const _axisScratch = new THREE.Vector3();
const _deltaScratch = new THREE.Quaternion();
const _invRigQuat = new THREE.Quaternion();
const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();
const _worldForward = new THREE.Vector3();
const _tangentEast = new THREE.Vector3();
const _tangentNorth = new THREE.Vector3();

/** Fixed walk speed in world units/sec — feels the same on every planet size. */
const WALK_SPEED = 11;

export class WalkRig {
  constructor(scene) {
    this.scene = scene;
    this.rig = new THREE.Group();
    this.attached = false;
    this.body = null;
    this.player = null;
    this.savedBodyParent = null;
    this.savedBodyMatrix = new THREE.Matrix4();
    this.surfaceOffset = 0.5;
    this.playerHeight = 0;
    /** Rotates the player from the landing pole to their current spot on the sphere. */
    this.surfaceRotation = new THREE.Quaternion();
    this.playerFacing = 0;
    this.fillLight = new THREE.PointLight(0xc8d8ff, 1.1, 0, 1.5);
    this.fillLight.visible = false;
    scene.add(this.fillLight);
  }

  attach(body, player, landingPoint) {
    if (this.attached) this.detach();

    this.body = body;
    this.player = player;
    this.playerHeight = body.radius + this.surfaceOffset;
    this.surfaceRotation.identity();
    this.playerFacing = 0;

    const center = body.getWorldCenter(new THREE.Vector3());
    const landingDir = landingPoint.clone().sub(center).normalize();

    this.savedBodyParent = body.group.parent;
    this.savedBodyMatrix.copy(body.group.matrixWorld);

    this.rig.position.copy(center);
    this.rig.quaternion.setFromUnitVectors(_rigUp, landingDir);

    this.scene.add(this.rig);
    this.rig.add(body.group);
    body.group.position.set(0, 0, 0);
    body.group.quaternion.identity();
    body.group.scale.set(1, 1, 1);

    this.rig.add(player.root);
    const playerScale = THREE.MathUtils.clamp(5.5 / body.radius, 1, 1.6);
    player.root.scale.setScalar(playerScale);

    this._updatePlayerTransform();
    this.fillLight.visible = true;
    this.updateFillLight();
    this.attached = true;
  }

  detach() {
    if (!this.attached || !this.body) return;

    this.rig.remove(this.player.root);
    this.player.root.scale.setScalar(1);
    this.rig.remove(this.body.group);
    this.scene.remove(this.rig);

    if (this.savedBodyParent) {
      this.savedBodyParent.add(this.body.group);
      this.savedBodyMatrix.decompose(
        this.body.group.position,
        this.body.group.quaternion,
        this.body.group.scale,
      );
    }

    this.body = null;
    this.player = null;
    this.fillLight.visible = false;
    this.attached = false;
    this.surfaceRotation.identity();
  }

  getSurfaceLocalUp(target) {
    return target.copy(_pole).applyQuaternion(this.surfaceRotation).normalize();
  }

  getWorldUp(target) {
    this.getSurfaceLocalUp(_localUp);
    return target.copy(_localUp).applyQuaternion(this.rig.quaternion).normalize();
  }

  getFocusBase(target) {
    this.getSurfaceLocalUp(_localUp);
    _localPos.copy(_localUp).multiplyScalar(this.playerHeight);
    return this.rig.localToWorld(target.copy(_localPos));
  }

  getCameraPivot(target) {
    const feet = this.getFocusBase(_focusScratch);
    const up = this.getWorldUp(_localUp);
    const scale = this.player?.root.scale.x ?? 1;
    return target.copy(feet).addScaledVector(up, 1.1 * scale);
  }

  _updatePlayerTransform() {
    if (!this.player) return;
    this.getSurfaceLocalUp(_localUp);
    _localPos.copy(_localUp).multiplyScalar(this.playerHeight);
    this.player.root.position.copy(_localPos);
    this.player.setSurfacePose(_localUp, this.playerFacing);
  }

  updateFillLight() {
    if (!this.attached) return;
    this.fillLight.position.copy(this.getCameraPivot(_focusScratch));
  }

  applyMovement(input, basis, dt) {
    if (!this.attached || !this.body) return false;

    const { forward, right } = basis;
    _invRigQuat.copy(this.rig.quaternion).invert();

    _localForward.copy(forward).applyQuaternion(_invRigQuat);
    _localRight.copy(right).applyQuaternion(_invRigQuat);
    this.getSurfaceLocalUp(_localUp);

    _localForward.addScaledVector(_localUp, -_localForward.dot(_localUp));
    _localRight.addScaledVector(_localUp, -_localRight.dot(_localUp));
    if (_localForward.lengthSq() > 1e-8) _localForward.normalize();
    if (_localRight.lengthSq() > 1e-8) _localRight.normalize();

    _moveScratch.set(0, 0, 0);
    if (input.isDown('KeyW')) _moveScratch.add(_localForward);
    if (input.isDown('KeyS')) _moveScratch.sub(_localForward);
    if (input.isDown('KeyD')) _moveScratch.add(_localRight);
    if (input.isDown('KeyA')) _moveScratch.sub(_localRight);

    if (_moveScratch.lengthSq() === 0) return false;

    _moveScratch.normalize();
    const angle = (WALK_SPEED * dt) / this.body.radius;

    _axisScratch.crossVectors(_localUp, _moveScratch);
    if (_axisScratch.lengthSq() < 1e-8) return false;
    _axisScratch.normalize();

    _deltaScratch.setFromAxisAngle(_axisScratch, angle);
    this.surfaceRotation.premultiply(_deltaScratch);
    this.surfaceRotation.normalize();

    this._updatePlayerTransform();
    this.updateFillLight();
    return true;
  }

  syncPlayerFacing(tpsCamera, focusBase, up) {
    if (!this.player) return;
    const { forward } = tpsCamera.getMovementBasis(focusBase, up);

    _invRigQuat.copy(this.rig.quaternion).invert();
    _worldForward.copy(forward);
    _localForward.copy(_worldForward).applyQuaternion(_invRigQuat);

    this.getSurfaceLocalUp(_localUp);
    _localForward.addScaledVector(_localUp, -_localForward.dot(_localUp));
    if (_localForward.lengthSq() < 1e-8) return;
    _localForward.normalize();

    const basis = tangentBasis(_localUp);
    _tangentEast.copy(basis.east);
    _tangentNorth.copy(basis.north);
    this.playerFacing = Math.atan2(_localForward.dot(_tangentEast), _localForward.dot(_tangentNorth));
    this._updatePlayerTransform();
  }

  getExitCameraPose() {
    const center = this.body.getWorldCenter(new THREE.Vector3());
    const up = this.getWorldUp(new THREE.Vector3());
    let reference = new THREE.Vector3(0, 0, 1);
    if (Math.abs(up.dot(reference)) > 0.9) reference.set(1, 0, 0);
    const east = new THREE.Vector3().crossVectors(up, reference).normalize();
    const camPos = this.getFocusBase(_focusScratch)
      .addScaledVector(up, this.body.radius * 0.35)
      .addScaledVector(east, this.body.radius * 3.5);
    return { camPos, lookAt: center };
  }
}
