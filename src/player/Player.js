import * as THREE from 'three';
import { quaternionFromYUp, tangentBasis } from '../utils/SphericalMath.js';

const PARTS = [
  { pos: [0, 1.2, 0], size: [0.5, 0.6, 0.35], color: 0xffdbac },
  { pos: [0, 0.45, 0], size: [0.55, 0.7, 0.35], color: 0x3366cc },
  { pos: [0, 1.65, 0], size: [0.38, 0.38, 0.38], color: 0xffdbac },
  { pos: [-0.35, 0.55, 0], size: [0.2, 0.55, 0.2], color: 0x3366cc },
  { pos: [0.35, 0.55, 0], size: [0.2, 0.55, 0.2], color: 0x3366cc },
  { pos: [-0.18, -0.05, 0], size: [0.22, 0.65, 0.22], color: 0x222233 },
  { pos: [0.18, -0.05, 0], size: [0.22, 0.65, 0.22], color: 0x222233 },
];

export class Player {
  constructor() {
    this.root = new THREE.Group();
    this.height = 1.8;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    for (const part of PARTS) {
      const mat = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(part.size[0], part.size[1], part.size[2]);
      mesh.position.set(part.pos[0], part.pos[1], part.pos[2]);
      this.root.add(mesh);
    }

    this.worldPosition = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.yaw = 0;
  }

  setWorldPosition(position, up) {
    this.worldPosition.copy(position);
    this.up.copy(safeUp(up));
    this.root.position.copy(position);
    this.root.quaternion.copy(quaternionFromYUp(this.up));
    this.root.rotateY(this.yaw);
  }

  setRigOrientation(yaw) {
    this.yaw = yaw;
    this.root.rotation.set(0, yaw, 0);
  }

  setYaw(yaw) {
    this.yaw = yaw;
  }
}

function safeUp(up) {
  if (up.lengthSq() < 1e-8) return new THREE.Vector3(0, 1, 0);
  return up.clone().normalize();
}
