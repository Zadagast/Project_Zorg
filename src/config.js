export const VOXEL_SIZE = 1;

export const CELESTIAL_BODIES = [
  { name: 'Sun', radius: 45, color: 0xffcc00, distance: 0, isSun: true },
  { name: 'Mercury', radius: 14, color: 0xaaaaaa, distance: 210 },
  { name: 'Venus', radius: 26, color: 0xffcc99, distance: 315 },
  { name: 'Earth', radius: 28, color: 0x228b22, distance: 420 },
  { name: 'Mars', radius: 20, color: 0xff4500, distance: 525 },
  { name: 'Jupiter', radius: 42, color: 0xdb7093, distance: 735 },
  { name: 'Saturn', radius: 38, color: 0xf4a460, distance: 945, hasRings: true },
  { name: 'Uranus', radius: 30, color: 0xadd8e6, distance: 1155 },
  { name: 'Neptune', radius: 30, color: 0x4682b4, distance: 1330 },
];

export const MODES = {
  PLANETARIUM: 'planetarium',
  WALK: 'walk',
  TRANSITIONING: 'transitioning',
};

export const LAND_ZOOM_FACTOR = 2.5;
export const EXIT_ZOOM_FACTOR = 3.5;
