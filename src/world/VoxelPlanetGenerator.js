import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

const noise3D = createNoise3D();

/** ~10–14 chunky blocks across each planet diameter (reference style). */
export function voxelStepForRadius(radius) {
  return Math.max(3, Math.round(radius / 7));
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

function pickColor(body, x, y, z, radius, step) {
  const lat = getLatitude(y, radius);
  const freq = 3.6 / step;
  const n = sampleNoise(x, y, z, freq);
  const fine = sampleNoise(x, y, z, freq * 2.4, 13);

  if (body.isSun) {
    const heat = 0.8 + sampleNoise(x, y, z, 0.18, 3) * 0.2;
    const tone = fine > 0.25 ? 0xffd633 : fine > -0.2 ? 0xff9900 : 0xe85a00;
    return new THREE.Color(tone).multiplyScalar(heat).getHex();
  }

  switch (body.name) {
    case 'Mercury': {
      const crater = sampleNoise(x, y, z, freq * 1.8, 19);
      return crater > 0.42 ? 0x505860 : crater > 0.05 ? 0x7a848e : 0xa8b2bc;
    }

    case 'Venus': {
      const swirl = Math.sin(x * freq * 1.6 + y * freq * 1.2 + n * 2.8);
      if (swirl > 0.35) return 0xf0d090;
      if (swirl > -0.15) return 0xcc9850;
      return 0x966830;
    }

    case 'Earth': {
      const clouds = sampleNoise(x, y, z, freq * 2.8, 41);
      if (Math.abs(lat) > 0.95) return 0xffffff;
      if (clouds > 0.38) return 0xffffff;
      if (n > 0.12) return fine > 0.15 ? 0x42a848 : 0x348838;
      if (n > -0.08) return 0xd4b070;
      return fine > 0.1 ? 0x2068b8 : 0x1858a0;
    }

    case 'Mars': {
      if (Math.abs(lat) > 1.05) return 0xffffff;
      const dust = sampleNoise(x, y, z, freq * 1.5, 29);
      if (dust > 0.35) return 0xe06030;
      if (dust > -0.1) return 0xc04820;
      return 0x883018;
    }

    case 'Jupiter': {
      const turbulence = sampleNoise(x, y, z, freq * 0.85, 53);
      const band = Math.sin(y * freq * 1.75 + turbulence * 3.2);
      const band2 = Math.sin(y * freq * 2.6 + x * freq * 0.35 + turbulence);
      const spot = dirDot(x, y, z, 0.68, -0.22, 0.45);
      if (spot > 0.87 && y > -radius * 0.1 && y < radius * 0.34) return 0xc43028;
      if (band > 0.52) return 0xfff2dc;
      if (band > 0.18) return band2 > 0 ? 0xe8b878 : 0xcc8848;
      if (band > -0.15) return 0xa86830;
      if (band > -0.45) return 0x804820;
      return 0x5c3418;
    }

    case 'Saturn': {
      // Pale gold, soft low-contrast bands — visually distinct from stormy Jupiter.
      const soft = Math.sin(y * freq * 0.75 + n * 0.45);
      const sheen = sampleNoise(x, y, z, freq * 0.45, 71) * 0.12;
      const v = soft + sheen;
      if (v > 0.22) return 0xf8ecd8;
      if (v > -0.08) return 0xe8d4a8;
      return 0xc8a870;
    }

    case 'Uranus':
      return fine > 0.1 ? 0xc0f0ec : 0x98e0dc;

    case 'Neptune': {
      if (Math.abs(lat) > 0.92) return 0xe8f4ff;
      return fine > 0.05 ? 0x4070d8 : 0x2858b0;
    }

    case 'Pluto': {
      const patch = sampleNoise(x, y, z, freq * 1.6, 61);
      return patch > 0.2 ? 0xb89878 : 0x887058;
    }

    default:
      return body.color;
  }
}

function pickRingColor(y, z, distYZ, step) {
  const band = Math.sin(distYZ * (0.75 / step) + noise3D(y * 0.05, z * 0.05, 0) * 2.2);
  if (band > 0.45) return 0xf8f0d8;
  if (band > 0.08) return 0xe8dcb8;
  if (band > -0.28) return 0xd0c098;
  return 0xb0a078;
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
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: pickColor(body, x, y, z, r, step),
        });
      }
    }
  }
}

function fillRingVoxels(body, voxels, step) {
  const r = body.radius;
  const innerRing = r * 1.38;
  const outerRing = r * 2.25;
  const max = outerRing + step;
  // YZ plane — rings face the camera / orbit line so they don't clip neighbors on X.
  const xLevels = [-step * 0.55, -step * 0.18, step * 0.18, step * 0.55];

  for (let y = -max; y <= max; y += step) {
    for (let z = -max; z <= max; z += step) {
      const distYZ = Math.sqrt(y * y + z * z);
      if (distYZ < innerRing || distYZ > outerRing) continue;
      for (const x of xLevels) {
        voxels.push({
          position: new THREE.Vector3(x, y, z),
          color: pickRingColor(y, z, distYZ, step),
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
