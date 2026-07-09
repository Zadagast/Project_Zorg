import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { VOXEL_SIZE } from '../config.js';

const noise3D = createNoise3D();
const SHELL_DEPTH = VOXEL_SIZE * 2;

function getLatitude(y, radius) {
  return Math.asin(THREE.MathUtils.clamp(y / radius, -1, 1));
}

function getVoxelColorHex(body, x, y, z) {
  const r = body.radius;
  const lat = getLatitude(y, r);

  if (body.isSun) {
    const flicker = 0.85 + noise3D(x * 0.15, y * 0.15, z * 0.15) * 0.15;
    return new THREE.Color(0xffaa00).multiplyScalar(flicker).getHex();
  }

  if (body.name === 'Earth') {
    const n = noise3D(x * 0.25, y * 0.25, z * 0.25);
    if (Math.abs(lat) > 1.1) return 0xffffff;
    if (n > 0.08) return 0x2d8a4e;
    if (n > -0.05) return 0xc2b280;
    return 0x1a4a8a;
  }

  if (body.name === 'Mars') {
    if (Math.abs(lat) > 1.2) return 0xf5f5f5;
    const n = noise3D(x * 0.3, y * 0.3, z * 0.3);
    return new THREE.Color(0xc1440e).lerp(new THREE.Color(0x8b3a12), (n + 1) * 0.25).getHex();
  }

  if (body.name === 'Jupiter' || body.name === 'Saturn') {
    const stripe = Math.sin(y * 0.55 + noise3D(x * 0.1, y * 0.1, z * 0.1) * 2);
    if (stripe > 0.55) return 0xf5e6d3;
    if (stripe > 0.15) return body.color;
    if (stripe > -0.25) return 0xc4956a;
    return 0x8b4513;
  }

  const variation = noise3D(x * 0.35, y * 0.35, z * 0.35) * 0.15;
  const base = new THREE.Color(body.color);
  base.offsetHSL(0, 0, variation);
  return base.getHex();
}

function isOnShell(dist, radius) {
  return dist <= radius && dist >= radius - SHELL_DEPTH;
}

function fillShellVoxels(body, voxels) {
  const r = body.radius;
  const step = VOXEL_SIZE;
  const bound = r + step;
  const min = -bound;
  const max = bound;

  for (let x = Math.floor(min); x <= Math.ceil(max); x += step) {
    for (let y = Math.floor(min); y <= Math.ceil(max); y += step) {
      for (let z = Math.floor(min); z <= Math.ceil(max); z += step) {
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (!isOnShell(dist, r)) continue;
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: getVoxelColorHex(body, x, y, z),
        });
      }
    }
  }
}

function fillRingVoxels(body, voxels) {
  const r = body.radius;
  const step = VOXEL_SIZE;
  const innerRing = r * 1.4;
  const outerRing = r * 2.2;
  const max = outerRing + step;

  for (let x = Math.floor(-max); x <= Math.ceil(max); x += step) {
    for (let z = Math.floor(-max); z <= Math.ceil(max); z += step) {
      const distXZ = Math.sqrt(x * x + z * z);
      if (distXZ < innerRing || distXZ > outerRing) continue;
      for (let y = -step * 0.5; y <= step * 0.5; y += step) {
        const band = Math.sin(distXZ * 0.5) * 0.2 + 0.8;
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: new THREE.Color(0xccccaa).multiplyScalar(band).getHex(),
        });
      }
    }
  }
}

export function generateVoxels(body) {
  const voxels = [];
  fillShellVoxels(body, voxels);
  if (body.hasRings) fillRingVoxels(body, voxels);
  return voxels;
}
