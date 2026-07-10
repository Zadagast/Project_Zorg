import * as THREE from 'three';
import { VOXLoader, VOXMesh } from 'three/addons/loaders/VOXLoader.js';
import { normalizeVoxelGroup } from '../world/VoxelMeshBuilder.js';

const _loader = new VOXLoader();

/** Swap VOXLoader's StandardMaterial for Lambert to match planets. */
function toPlanetMaterial(mesh) {
  const old = mesh.material;
  mesh.material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    vertexColors: old.vertexColors ?? true,
  });
  if (old.map) mesh.material.map = old.map;
  old.dispose?.();
}

/**
 * Load a MagicaVoxel `.vox` file into a normalized group (feet at y=0, facing +Z).
 * @param {string} url
 * @param {number} targetHeight
 */
export async function loadVoxAsset(url, targetHeight = 1.8) {
  const chunks = await _loader.loadAsync(url);
  if (!chunks?.length) {
    throw new Error(`VOX file empty: ${url}`);
  }

  const group = new THREE.Group();
  for (const chunk of chunks) {
    const mesh = new VOXMesh(chunk);
    toPlanetMaterial(mesh);
    group.add(mesh);
  }

  group.rotation.y = Math.PI;
  normalizeVoxelGroup(group, targetHeight);
  return group;
}
