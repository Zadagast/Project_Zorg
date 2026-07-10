import * as THREE from 'three';

const SKIN = 0xffdbac;
const SHIRT = 0x3366cc;
const PANTS = 0x222233;
const SHOES = 0x1a1a28;
const HAIR = 0x4a3728;

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

/** Procedural humanoid used until AI `.vox` files are dropped in public/models/. */
export function createHumanoidBlueprint() {
  const voxels = [];

  fillBox(voxels, -1, 0, -1, 1, 2, 0, PANTS);
  fillBox(voxels, -1, 0, -1, 0, 0, 0, SHOES);
  fillBox(voxels, 1, 0, -1, 1, 0, 0, SHOES);

  fillBox(voxels, -2, 3, -1, -2, 5, 0, SHIRT);
  fillBox(voxels, 2, 3, -1, 2, 5, 0, SHIRT);
  fillBox(voxels, -1, 3, -1, 1, 7, 0, SHIRT);

  fillBox(voxels, -1, 8, -1, 1, 10, 0, SKIN);
  fillBox(voxels, -1, 11, -1, 1, 11, 0, HAIR);
  fillBox(voxels, 0, 9, 1, 0, 9, 1, 0x111111);

  return { voxels, step: STEP };
}
