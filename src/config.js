export const VOXEL_SIZE = 1;

/** Clear space between each planet's sphere edge and the next. */
const ORBIT_GAP = 220;

/** Saturn ring outer radius (YZ plane — does not extend along the orbit axis). */
export const RING_OUTER_FACTOR = 2.25;

/** Earth sits this many units from the Sun; other orbits scale by real AU. */
const AU_SCALE = 420;

const BODY_DEFS = [
  { name: 'Sun', radius: 55, color: 0xffcc00, isSun: true },
  { name: 'Mercury', radius: 16, color: 0xaaaaaa },
  { name: 'Venus', radius: 28, color: 0xffcc99 },
  { name: 'Earth', radius: 30, color: 0x228b22 },
  { name: 'Mars', radius: 22, color: 0xff4500 },
  { name: 'Jupiter', radius: 52, color: 0xdb7093 },
  { name: 'Saturn', radius: 44, color: 0xf4a460, hasRings: true },
  { name: 'Uranus', radius: 34, color: 0xadd8e6 },
  { name: 'Neptune', radius: 34, color: 0x4682b4 },
  { name: 'Pluto', radius: 10, color: 0x9a806a },
];

const AU = {
  Mercury: 0.39,
  Venus: 0.72,
  Earth: 1.0,
  Mars: 1.52,
  Jupiter: 5.2,
  Saturn: 9.5,
  Uranus: 19.2,
  Neptune: 30.1,
  Pluto: 39.5,
};

function layoutSolarSystem(defs) {
  const sun = defs.find((d) => d.isSun);
  const planets = defs.filter((d) => !d.isSun);

  const bodies = [{ ...sun, distance: 0 }];
  let rightEdge = sun.radius;

  for (const def of planets) {
    const auTarget = AU[def.name] * AU_SCALE;
    const minCenter = rightEdge + ORBIT_GAP + def.radius;
    const center = Math.max(auTarget, minCenter);

    bodies.push({ ...def, distance: center });
    rightEdge = center + def.radius;
  }

  return bodies;
}

export const CELESTIAL_BODIES = layoutSolarSystem(BODY_DEFS);

export const SOLAR_SYSTEM_SPAN = (() => {
  const last = CELESTIAL_BODIES[CELESTIAL_BODIES.length - 1];
  return last.distance + last.radius;
})();

export const SOLAR_SYSTEM_CENTER_X = SOLAR_SYSTEM_SPAN * 0.5;

export const MODES = {
  PLANETARIUM: 'planetarium',
  WALK: 'walk',
  TRANSITIONING: 'transitioning',
};

export const LAND_ZOOM_FACTOR = 2.5;
export const EXIT_ZOOM_FACTOR = 3.5;
