export const VOXEL_SIZE = 1;

/** Catalog-style lineup: bodies sit close together like the reference art. */
export const CELESTIAL_BODIES = [
  { name: 'Sun', radius: 45, color: 0xffcc00, distance: 0, isSun: true },
  { name: 'Mercury', radius: 14, color: 0xaaaaaa, distance: 72 },
  { name: 'Venus', radius: 26, color: 0xffcc99, distance: 118 },
  { name: 'Earth', radius: 28, color: 0x228b22, distance: 178 },
  { name: 'Mars', radius: 20, color: 0xff4500, distance: 242 },
  { name: 'Jupiter', radius: 42, color: 0xdb7093, distance: 318 },
  { name: 'Saturn', radius: 38, color: 0xf4a460, distance: 412, hasRings: true },
  { name: 'Uranus', radius: 30, color: 0xadd8e6, distance: 496 },
  { name: 'Neptune', radius: 30, color: 0x4682b4, distance: 568 },
  { name: 'Pluto', radius: 8, color: 0x9a806a, distance: 618 },
];

export const SOLAR_SYSTEM_CENTER_X = 310;

export const MODES = {
  PLANETARIUM: 'planetarium',
  WALK: 'walk',
  TRANSITIONING: 'transitioning',
};

export const LAND_ZOOM_FACTOR = 2.5;
export const EXIT_ZOOM_FACTOR = 3.5;
