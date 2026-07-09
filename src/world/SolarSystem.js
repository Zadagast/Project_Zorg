import { CELESTIAL_BODIES } from '../config.js';
import { CelestialBody } from './CelestialBody.js';
import { createSunLight, createSunDirectionalLight } from '../rendering/SceneSetup.js';

function yieldFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

export class SolarSystem {
  constructor(scene) {
    this.scene = scene;
    this.bodies = [];
    this.sunLight = createSunLight();
    this.sunDirectional = createSunDirectionalLight();
    scene.add(this.sunLight);
    scene.add(this.sunDirectional);
  }

  static async create(scene, onProgress) {
    const system = new SolarSystem(scene);
    for (const def of CELESTIAL_BODIES) {
      await yieldFrame();
      const body = new CelestialBody(def);
      system.bodies.push(body);
      scene.add(body.group);
      onProgress?.(def.name);
    }
    return system;
  }

  getBodyByName(name) {
    return this.bodies.find((b) => b.name === name) ?? null;
  }

  getWalkableBodies() {
    return this.bodies.filter((b) => !b.isSun);
  }

  getPickTargets() {
    return this.bodies.flatMap((b) => b.getPickTargets());
  }

  setBodiesVisibleExcept(activeBody, visible) {
    for (const body of this.bodies) {
      if (body !== activeBody) body.setVisible(visible);
    }
  }

  resetVisibility() {
    for (const body of this.bodies) {
      body.setVisible(true);
      body.setHighlighted(false);
    }
  }
}
