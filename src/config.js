export const APP_VERSION = '0.2.0';

export const VOXEL_SIZE = 1;

/** Even gap between each body's sphere edge — catalog lineup like the reference art. */
const ORBIT_GAP = 52;

/** Saturn ring outer radius (YZ plane — does not extend along the orbit axis). */
export const RING_OUTER_FACTOR = 2.25;

const BODY_DEFS = [
  { name: 'Sun', radius: 45, color: 0xffcc00, isSun: true },
  { name: 'Mercury', radius: 14, color: 0xaaaaaa },
  { name: 'Venus', radius: 26, color: 0xffcc99 },
  { name: 'Earth', radius: 28, color: 0x228b22 },
  { name: 'Mars', radius: 20, color: 0xff4500 },
  { name: 'Jupiter', radius: 42, color: 0xdb7093 },
  { name: 'Saturn', radius: 38, color: 0xf4a460, hasRings: true },
  { name: 'Uranus', radius: 30, color: 0xadd8e6 },
  { name: 'Neptune', radius: 30, color: 0x4682b4 },
  { name: 'Pluto', radius: 8, color: 0x9a806a },
];

function layoutCatalog(defs) {
  const sun = defs.find((d) => d.isSun);
  const planets = defs.filter((d) => !d.isSun);

  const bodies = [{ ...sun, distance: 0 }];
  let rightEdge = sun.radius;

  for (const def of planets) {
    const center = rightEdge + ORBIT_GAP + def.radius;
    bodies.push({ ...def, distance: center });
    rightEdge = center + def.radius;
  }

  return bodies;
}

export const CELESTIAL_BODIES = layoutCatalog(BODY_DEFS);

export const SOLAR_SYSTEM_SPAN = (() => {
  const last = CELESTIAL_BODIES[CELESTIAL_BODIES.length - 1];
  return last.distance + last.radius;
})();

export const SOLAR_SYSTEM_CENTER_X = SOLAR_SYSTEM_SPAN * 0.5;

/** Default planetarium camera — frames the full catalog row like the reference screenshot. */
export const CATALOG_CAMERA = {
  y: 90,
  z: 1050,
};

export const MODES = {
  PLANETARIUM: 'planetarium',
  WALK: 'walk',
  TRANSITIONING: 'transitioning',
};

export const LAND_ZOOM_FACTOR = 2.5;
export const EXIT_ZOOM_FACTOR = 3.5;
