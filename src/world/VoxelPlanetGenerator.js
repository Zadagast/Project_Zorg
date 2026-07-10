import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

/** Chunky voxel scale — ~14–20 blocks across each planet diameter. */
export function voxelStepForRadius(radius) {
  return Math.max(2, Math.round(radius / 13));
}

function sampleNoise(x, y, z, freq, seed = 0) {
  const sx = x * freq + seed;
  const sy = y * freq + seed * 1.7;
  const sz = z * freq + seed * 2.3;
  const a = noise3D(sx, sy, sz);
  const b = noise3D(sx * 2.05 + 17, sy * 2.05 + 31, sz * 2.05 + 47);
  return a * 0.6 + b * 0.4;
}

function getLatitude(y, radius) {
  return Math.asin(THREE.MathUtils.clamp(y / radius, -1, 1));
}

function dirDot(x, y, z, dx, dy, dz) {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  return (x * dx + y * dy + z * dz) / len;
}

/** Strong left-side sunlight like the reference art. */
function shadeForSun(hex, x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z) || 1;
  const ndotl = THREE.MathUtils.clamp(
    (-x / len) * 0.96 + (y / len) * 0.14 + (z / len) * 0.06,
    0,
    1,
  );
  const shade = 0.48 + ndotl * 0.52;
  return new THREE.Color(hex).multiplyScalar(shade).getHex();
}

function pickColor(body, x, y, z, radius, step) {
  const lat = getLatitude(y, radius);
  const freq = 4.2 / step;
  const n = sampleNoise(x, y, z, freq);
  const fine = sampleNoise(x, y, z, freq * 2.4, 13);

  if (body.isSun) {
    const heat = 0.75 + sampleNoise(x, y, z, 0.22, 3) * 0.25;
    const tone = fine > 0.2 ? 0xffcc33 : fine > -0.25 ? 0xff9900 : 0xff6600;
    return new THREE.Color(tone).multiplyScalar(heat).getHex();
  }

  switch (body.name) {
    case 'Mercury': {
      const crater = sampleNoise(x, y, z, freq * 1.8, 19);
      return crater > 0.42 ? 0x565c64 : crater > 0.05 ? 0x8a939e : 0xadb6c2;
    }

    case 'Venus': {
      const swirl = Math.sin(x * freq * 1.6 + y * freq * 1.2 + n * 2.8);
      if (swirl > 0.35) return 0xe8c88a;
      if (swirl > -0.15) return 0xc99a52;
      return 0x9a7038;
    }

    case 'Earth': {
      const clouds = sampleNoise(x, y, z, freq * 2.8, 41);
      if (Math.abs(lat) > 0.95) return 0xf4f4f4;
      if (clouds > 0.38) return 0xffffff;
      if (n > 0.12) return fine > 0.15 ? 0x3d9e46 : 0x2f7a36;
      if (n > -0.08) return 0xc9a66a;
      return fine > 0.1 ? 0x1a5cad : 0x144f96;
    }

    case 'Mars': {
      if (Math.abs(lat) > 1.05) return 0xf2f2f2;
      const dust = sampleNoise(x, y, z, freq * 1.5, 29);
      if (dust > 0.35) return 0xd65a32;
      if (dust > -0.1) return 0xb04624;
      return 0x7a3018;
    }

    case 'Jupiter': {
      const band = Math.sin(y * freq * 1.35 + sampleNoise(x, y, z, freq * 0.8, 53) * 2.2);
      const spot = dirDot(x, y, z, 0.72, -0.18, 0.42);
      if (spot > 0.9 && y > -radius * 0.15 && y < radius * 0.35) return 0xc0392b;
      if (band > 0.45) return 0xf0e0c8;
      if (band > 0.05) return 0xd4a574;
      if (band > -0.35) return 0xb07840;
      return 0x8b5a2b;
    }

    case 'Saturn': {
      const band = Math.sin(y * freq * 1.2 + n * 1.8);
      if (band > 0.4) return 0xf2dcc0;
      if (band > 0) return 0xd9b88a;
      if (band > -0.35) return 0xc49a62;
      return 0x9a7348;
    }

    case 'Uranus':
      return fine > 0.1 ? 0xb8ece8 : 0x8fd9d4;

    case 'Neptune': {
      if (Math.abs(lat) > 0.92) return 0xd8ecff;
      return fine > 0.05 ? 0x3566c9 : 0x244f9e;
    }

    default:
      return body.color;
  }
}

function pickRingColor(x, z, distXZ, step) {
  const band = Math.sin(distXZ * (0.55 / step) + noise3D(x * 0.07, z * 0.07, 0) * 2.4);
  if (band > 0.35) return 0xe8dcc0;
  if (band > -0.2) return 0xcdb890;
  return 0xa89268;
}

function fillSolidSphere(body, voxels, step) {
  const r = body.radius;
  const bound = r + step;
  const min = -bound;
  const max = bound;

  for (let x = min; x <= max; x += step) {
    for (let y = min; y <= max; y += step) {
      for (let z = min; z <= max; z += step) {
        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > r) continue;
        const color = pickColor(body, x, y, z, r, step);
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: body.isSun ? color : shadeForSun(color, x, y, z),
        });
      }
    }
  }
}

function fillRingVoxels(body, voxels, step) {
  const r = body.radius;
  const innerRing = r * 1.35;
  const outerRing = r * 2.15;
  const max = outerRing + step;
  const yLevels = [-step * 0.45, 0, step * 0.45];

  for (let x = -max; x <= max; x += step) {
    for (let z = -max; z <= max; z += step) {
      const distXZ = Math.sqrt(x * x + z * z);
      if (distXZ < innerRing || distXZ > outerRing) continue;
      for (const y of yLevels) {
        const base = pickRingColor(x, z, distXZ, step);
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: shadeForSun(base, x, y || step * 0.01, z),
        });
      }
    }
  }
}

export function generateVoxels(body) {
  const step = voxelStepForRadius(body.radius);
  const voxels = [];
  fillSolidSphere(body, voxels, step);
  if (body.hasRings) fillRingVoxels(body, voxels, step);
  return { voxels, step };
}
