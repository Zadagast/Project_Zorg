export const VOXEL_SIZE = 1;

export const CELESTIAL_BODIES = [
  { name: 'Sun', radius: 30, color: 0xffcc00, distance: 0, isSun: true },
  { name: 'Mercury', radius: 4, color: 0xaaaaaa, distance: 60 },
  { name: 'Venus', radius: 7, color: 0xffcc99, distance: 90 },
  { name: 'Earth', radius: 7, color: 0x228b22, distance: 120 },
  { name: 'Mars', radius: 5, color: 0xff4500, distance: 150 },
  { name: 'Jupiter', radius: 18, color: 0xdb7093, distance: 210 },
  { name: 'Saturn', radius: 15, color: 0xf4a460, distance: 270, hasRings: true },
  { name: 'Uranus', radius: 12, color: 0xadd8e6, distance: 330 },
  { name: 'Neptune', radius: 12, color: 0x4682b4, distance: 380 },
];

export const MODES = {
  PLANETARIUM: 'planetarium',
  WALK: 'walk',
  TRANSITIONING: 'transitioning',
};

export const LAND_ZOOM_FACTOR = 2.5;
export const EXIT_ZOOM_FACTOR = 3.5;
