import * as THREE from 'three';

const _rigUp = new THREE.Vector3(0, 1, 0);
const _focusScratch = new THREE.Vector3();
const _moveScratch = new THREE.Vector3();
const _axisScratch = new THREE.Vector3();
const _deltaScratch = new THREE.Quaternion();
const _invRigQuat = new THREE.Quaternion();
const _localForward = new THREE.Vector3();
const _localRight = new THREE.Vector3();

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
    this.moveSpeed = 12;
    this.spinQuaternion = new THREE.Quaternion();
  }

  attach(body, player, landingPoint) {
    if (this.attached) this.detach();

    this.body = body;
    this.player = player;
    this.moveSpeed = Math.max(8, body.radius * 0.42);
    this.playerHeight = body.radius + this.surfaceOffset;
    this.spinQuaternion.identity();

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
    player.root.position.set(0, this.playerHeight, 0);
    player.setRigOrientation(0);

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
    this.attached = false;
    this.spinQuaternion.identity();
  }

  getWorldUp(target) {
    return target.set(0, 1, 0).applyQuaternion(this.rig.quaternion);
  }

  getFocusBase(target) {
    return this.rig.localToWorld(target.set(0, this.playerHeight, 0));
  }

  applyMovement(input, basis, dt) {
    if (!this.attached || !this.body) return false;

    const { forward, right } = basis;
    _invRigQuat.copy(this.rig.quaternion).invert();

    _localForward.copy(forward).applyQuaternion(_invRigQuat);
    _localRight.copy(right).applyQuaternion(_invRigQuat);
    _localForward.y = 0;
    _localRight.y = 0;
    if (_localForward.lengthSq() > 1e-8) _localForward.normalize();
    if (_localRight.lengthSq() > 1e-8) _localRight.normalize();

    _moveScratch.set(0, 0, 0);
    if (input.isDown('KeyW')) _moveScratch.add(_localForward);
    if (input.isDown('KeyS')) _moveScratch.sub(_localForward);
    if (input.isDown('KeyD')) _moveScratch.add(_localRight);
    if (input.isDown('KeyA')) _moveScratch.sub(_localRight);

    if (_moveScratch.lengthSq() === 0) return false;

    _moveScratch.normalize();
    const angle = (this.moveSpeed * dt) / this.body.radius;
    _axisScratch.crossVectors(_moveScratch, _rigUp);
    if (_axisScratch.lengthSq() < 1e-8) return;
    _axisScratch.normalize();

    _deltaScratch.setFromAxisAngle(_axisScratch, angle);
    this.spinQuaternion.premultiply(_deltaScratch);
    this.spinQuaternion.normalize();
    this.body.group.quaternion.copy(this.spinQuaternion);

    this.player.setRigOrientation(Math.atan2(_moveScratch.x, _moveScratch.z));
    return true;
  }

  syncPlayerFacing(tpsCamera, focusBase, up) {
    if (!this.player) return;
    const { forward } = tpsCamera.getMovementBasis(focusBase, up);
    _invRigQuat.copy(this.rig.quaternion).invert();
    _localForward.copy(forward).applyQuaternion(_invRigQuat);
    _localForward.y = 0;
    if (_localForward.lengthSq() < 1e-8) return;
    _localForward.normalize();
    this.player.setRigOrientation(Math.atan2(_localForward.x, _localForward.z));
  }

  getExitCameraPose() {
    const center = this.body.getWorldCenter(new THREE.Vector3());
    const up = this.getWorldUp(new THREE.Vector3());
    const east = tangentEast(up);
    const camPos = this.getFocusBase(_focusScratch)
      .addScaledVector(up, this.body.radius * 0.35)
      .addScaledVector(east, this.body.radius * 3.5);
    return { camPos, lookAt: center };
  }
}

function tangentEast(up) {
  let reference = new THREE.Vector3(0, 0, 1);
  if (Math.abs(up.dot(reference)) > 0.9) reference.set(1, 0, 0);
  return new THREE.Vector3().crossVectors(up, reference).normalize();
}
