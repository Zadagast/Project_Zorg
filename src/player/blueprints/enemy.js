import * as THREE from 'three';

const BODY = 0xcc3333;
const CORE = 0xff6644;
const EYE = 0x44ff88;
const SPIKE = 0x882222;

const STEP = 0.15;

function v(x, y, z, color) {
  return {
    position: new THREE.Vector3(x * STEP, y * STEP, z * STEP),
    color,
  };
}

function fillBox(voxels, x0, y0, z0, x1, y1, z1, color) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      for (let z = z0; z <= z1; z += 1) {
        voxels.push(v(x, y, z, color));
      }
    }
  }
}

/** Simple hostile voxel creature blueprint. */
export function createEnemyBlueprint() {
  const voxels = [];

  fillBox(voxels, -1, 0, -1, 1, 1, 1, BODY);
  fillBox(voxels, -2, 2, -1, 2, 5, 1, BODY);
  fillBox(voxels, -1, 3, -2, 1, 4, -2, SPIKE);
  fillBox(voxels, -1, 6, -1, 1, 7, 1, CORE);
  voxels.push(v(-1, 4, 2, EYE));
  voxels.push(v(1, 4, 2, EYE));

  return { voxels, step: STEP };
}
