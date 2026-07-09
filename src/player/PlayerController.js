import * as THREE from 'three';
import {
  getLocalUp,
  projectOntoTangentPlane,
  snapToSphereSurface,
  directionFromWorldPoint,
  tangentBasis,
} from '../utils/SphericalMath.js';

export class PlayerController {
  constructor(player) {
    this.player = player;
    this.moveSpeed = 12;
    this.activeBody = null;
  }

  setActiveBody(body) {
    this.activeBody = body;
    this.moveSpeed = Math.max(6, body.radius * 0.35);
  }

  spawnOnBody(body, worldPoint) {
    this.setActiveBody(body);
    const up = getLocalUp(body, worldPoint);
    const snapped = snapToSphereSurface(body, directionFromWorldPoint(body, worldPoint), 0.5);
    this.player.setWorldPosition(snapped, up);
  }

  update(input, dt, movementBasis) {
    if (!this.activeBody) return;

    const body = this.activeBody;
    const up = getLocalUp(body, this.player.worldPosition);
    const { forward, right } = movementBasis;

    let moveDir = new THREE.Vector3();
    if (input.isDown('KeyW')) moveDir.add(forward);
    if (input.isDown('KeyS')) moveDir.sub(forward);
    if (input.isDown('KeyD')) moveDir.add(right);
    if (input.isDown('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const tangentMove = projectOntoTangentPlane(moveDir, up).multiplyScalar(this.moveSpeed * dt);
      const nextPoint = this.player.worldPosition.clone().add(tangentMove);
      const nextDir = directionFromWorldPoint(body, nextPoint);
      const snapped = snapToSphereSurface(body, nextDir, 0.5);
      const nextUp = getLocalUp(body, snapped);
      const { east, north } = tangentBasis(nextUp);
      this.player.setYaw(Math.atan2(moveDir.dot(east), moveDir.dot(north)));
      this.player.setWorldPosition(snapped, nextUp);
    } else {
      this.player.setWorldPosition(this.player.worldPosition, up);
    }
  }
}
