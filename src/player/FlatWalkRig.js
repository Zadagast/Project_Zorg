import * as THREE from 'three';

const _move = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _pivotScratch = new THREE.Vector3();

const WALK_SPEED = 10;
const ARENA_HALF = 140;
const CHEST_HEIGHT = 1.15;

export class FlatWalkRig {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.attached = false;
    this.body = null;
    this.player = null;
    this.playerPos = new THREE.Vector3();
    this.savedBodyParent = null;
    this.savedBodyMatrix = new THREE.Matrix4();
    this.ground = null;
    this.fillLight = new THREE.PointLight(0xc8d8ff, 1.2, 0, 1.5);
    this.fillLight.visible = false;
    scene.add(this.fillLight);
  }

  attach(body, player) {
    if (this.attached) this.detach();

    this.body = body;
    this.player = player;
    this.playerPos.set(0, 0, 0);

    this.savedBodyParent = body.group.parent;
    this.savedBodyMatrix.copy(body.group.matrixWorld);

    const groundGeo = new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2, 32, 32);
    const groundMat = new THREE.MeshLambertMaterial({
      color: body.color ?? 0x228b22,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = 0;

    const grid = new THREE.GridHelper(ARENA_HALF * 2, 40, 0x334455, 0x223344);
    grid.position.y = 0.02;

    this.root.clear();
    this.root.add(this.ground);
    this.root.add(grid);
    this.scene.add(this.root);

    this.scene.add(player.root);
    player.root.scale.setScalar(1);
    player.root.position.set(0, 0, 0);
    player.setSurfaceFacing(_worldUp, new THREE.Vector3(0, 0, -1));

    this.fillLight.visible = true;
    this.updateFillLight();
    this.attached = true;
  }

  detach() {
    if (!this.attached) return;

    if (this.player?.root.parent) {
      this.player.root.parent.remove(this.player.root);
    }
    this.player?.root.scale.setScalar(1);

    this.scene.remove(this.root);
    this.ground = null;
    this.root.clear();

    this.body = null;
    this.player = null;
    this.fillLight.visible = false;
    this.attached = false;
    this.playerPos.set(0, 0, 0);
  }

  getCameraPivot(target) {
    return target.set(this.playerPos.x, CHEST_HEIGHT, this.playerPos.z);
  }

  applyMovement(input, basis, dt) {
    if (!this.attached || !this.player) return false;

    const { forward, right } = basis;
    _move.set(0, 0, 0);
    if (input.isDown('KeyW')) _move.add(forward);
    if (input.isDown('KeyS')) _move.sub(forward);
    if (input.isDown('KeyD')) _move.add(right);
    if (input.isDown('KeyA')) _move.sub(right);

    if (_move.lengthSq() === 0) return false;

    _move.normalize().multiplyScalar(WALK_SPEED * dt);
    this.playerPos.add(_move);
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -ARENA_HALF, ARENA_HALF);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -ARENA_HALF, ARENA_HALF);

    this.player.root.position.set(this.playerPos.x, 0, this.playerPos.z);
    this.player.setSurfaceFacing(_worldUp, _move.clone().normalize());
    this.updateFillLight();
    return true;
  }

  setPlayerFacingFromCamera(tpsCamera) {
    if (!this.player) return;
    const { forward } = tpsCamera.getMovementBasis();
    this.player.setSurfaceFacing(_worldUp, forward);
  }

  updateFillLight() {
    if (!this.attached) return;
    this.fillLight.position.copy(this.getCameraPivot(_pivotScratch));
  }

  getExitCameraPose() {
    const center = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    if (this.body) {
      this.savedBodyMatrix.decompose(center, new THREE.Quaternion(), new THREE.Vector3());
      camPos.copy(center).add(new THREE.Vector3(0, this.body.radius * 0.6, this.body.radius * 4));
    } else {
      camPos.set(0, 40, 120);
      center.set(0, 0, 0);
    }
    return { camPos, lookAt: center };
  }
}
