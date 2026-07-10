import * as THREE from 'three';
import { buildInstancedVoxelMesh, normalizeVoxelGroup } from '../world/VoxelMeshBuilder.js';
import { createHumanoidBlueprint } from './blueprints/humanoid.js';
import { createEnemyBlueprint } from './blueprints/enemy.js';
import { loadVoxAsset } from './loadVoxAsset.js';

const BLUEPRINTS = {
  humanoid: createHumanoidBlueprint,
  enemy: createEnemyBlueprint,
};

export class VoxelCharacter {
  constructor({ root, height = 1.8, source = 'blueprint' }) {
    this.root = root;
    this.height = height;
    this.source = source;
    this.up = new THREE.Vector3(0, 1, 0);
  }

  static async load({ url, fallback = 'humanoid', height = 1.8 }) {
    if (url) {
      try {
        const model = await loadVoxAsset(url, height);
        model.name = 'voxel-character';
        const character = new VoxelCharacter({ root: model, height, source: 'vox' });
        console.info(`Loaded voxel character from ${url}`);
        return character;
      } catch (err) {
        console.warn(`Could not load ${url}, using ${fallback} blueprint:`, err.message);
      }
    }

    return VoxelCharacter.fromBlueprint(fallback, height);
  }

  static fromBlueprint(name = 'humanoid', height = 1.8) {
    const factory = BLUEPRINTS[name] ?? createHumanoidBlueprint;
    const { voxels, step } = factory();
    const mesh = buildInstancedVoxelMesh(voxels, step);
    mesh.name = 'voxel-character';

    const root = new THREE.Group();
    root.add(mesh);
    normalizeVoxelGroup(root, height);

    return new VoxelCharacter({ root, height, source: `blueprint:${name}` });
  }

  setSurfaceFacing(localUp, localForward) {
    this.up.copy(localUp);
    const right = new THREE.Vector3().crossVectors(localForward, localUp).normalize();
    const back = new THREE.Vector3().crossVectors(localUp, right).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(right, localUp, back);
    this.root.quaternion.setFromRotationMatrix(m);
  }
}
