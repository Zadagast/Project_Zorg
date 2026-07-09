import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { VOXEL_SIZE } from '../config.js';

const noise3D = createNoise3D();
const SHELL_DEPTH = VOXEL_SIZE * 2;

/** Keep noise feature size consistent as planet radius changes. */
function noiseFreq(radius) {
  return 3.2 / Math.max(radius, 1);
}

function sampleNoise(x, y, z, freq, seed = 0) {
  const sx = x * freq + seed;
  const sy = y * freq + seed * 1.7;
  const sz = z * freq + seed * 2.3;
  const a = noise3D(sx, sy, sz);
  const b = noise3D(sx * 2.1 + 17, sy * 2.1 + 31, sz * 2.1 + 47);
  return a * 0.62 + b * 0.38;
}

function getLatitude(y, radius) {
  return Math.asin(THREE.MathUtils.clamp(y / radius, -1, 1));
}

function tintFromNoise(baseHex, n, { hue = 0.04, sat = 0.12, light = 0.22 } = {}) {
  const base = new THREE.Color(baseHex);
  base.offsetHSL(n * hue, n * sat, n * light);
  return base.getHex();
}

/** Fake sun shading baked into vertex color (MeshBasicMaterial is unlit). */
function shadeForSun(hex, x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const ndotl = THREE.MathUtils.clamp(
    (x / len) * -0.92 + (y / len) * 0.18 + (z / len) * 0.08,
    0,
    1,
  );
  const shade = 0.78 + ndotl * 0.22;
  return new THREE.Color(hex).multiplyScalar(shade).getHex();
}

function getVoxelColorHex(body, x, y, z) {
  const r = body.radius;
  const lat = getLatitude(y, r);
  const freq = noiseFreq(r);
  const n = sampleNoise(x, y, z, freq);

  if (body.isSun) {
    const flicker = 0.82 + noise3D(x * 0.15, y * 0.15, z * 0.15) * 0.18;
    return new THREE.Color(0xffaa00).multiplyScalar(flicker).getHex();
  }

  let color;

  if (body.name === 'Earth') {
    const nEarth = sampleNoise(x, y, z, freq * 1.1, 5);
    if (Math.abs(lat) > 1.05) color = 0xffffff;
    else if (nEarth > 0.08) color = tintFromNoise(0x2d8a4e, nEarth, { hue: 0.03, sat: 0.1, light: 0.15 });
    else if (nEarth > -0.05) color = tintFromNoise(0xc2b280, nEarth, { hue: 0.02, sat: 0.08, light: 0.12 });
    else color = tintFromNoise(0x1a4a8a, nEarth, { hue: 0.04, sat: 0.1, light: 0.18 });
  } else if (body.name === 'Mars') {
    if (Math.abs(lat) > 1.15) color = 0xf5f5f5;
    else {
      const nMars = sampleNoise(x, y, z, freq * 1.2, 11);
      color = new THREE.Color(0xc1440e).lerp(new THREE.Color(0x8b3a12), (nMars + 1) * 0.3).getHex();
    }
  } else if (body.name === 'Mercury') {
    const nMercury = sampleNoise(x, y, z, freq * 1.4, 19);
    color = tintFromNoise(0x9a9a9a, nMercury, { hue: 0.02, sat: 0.05, light: 0.28 });
  } else if (body.name === 'Venus') {
    const nVenus = sampleNoise(x, y, z, freq * 1.1, 23);
    color = tintFromNoise(0xffcc99, nVenus, { hue: 0.03, sat: 0.14, light: 0.2 });
  } else if (body.name === 'Jupiter' || body.name === 'Saturn') {
    const stripe = Math.sin(y * freq * 2.2 + sampleNoise(x, y, z, freq, 29) * 2.5);
    if (stripe > 0.55) color = 0xf5e6d3;
    else if (stripe > 0.15) color = tintFromNoise(body.color, n, { hue: 0.02, sat: 0.1, light: 0.15 });
    else if (stripe > -0.25) color = 0xc4956a;
    else color = 0x8b4513;
  } else if (body.name === 'Uranus' || body.name === 'Neptune') {
    const nIce = sampleNoise(x, y, z, freq * 1.3, 37);
    if (Math.abs(lat) > 1.05) color = tintFromNoise(0xffffff, nIce, { light: 0.08 });
    else color = tintFromNoise(body.color, nIce, { hue: 0.04, sat: 0.12, light: 0.24 });
  } else {
    color = tintFromNoise(body.color, n, { hue: 0.04, sat: 0.12, light: 0.24 });
  }

  return shadeForSun(color, x, y, z);
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
        const band = Math.sin(distXZ * 0.5 + noise3D(x * 0.08, z * 0.08, r) * 2) * 0.2 + 0.85;
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
