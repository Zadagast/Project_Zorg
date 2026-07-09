import { createSceneSetup } from '../rendering/SceneSetup.js';
import { createStarfield } from '../rendering/Starfield.js';
import { SolarSystem } from '../world/SolarSystem.js';
import { InputManager } from './InputManager.js';
import { ModeManager } from './ModeManager.js';
import { PlanetariumMode } from '../modes/PlanetariumMode.js';
import { WalkMode } from '../modes/WalkMode.js';
import { Player } from '../player/Player.js';
import { ThirdPersonCamera } from '../player/ThirdPersonCamera.js';
import { updateTweens } from '../utils/transitions.js';
import { MODES } from '../config.js';

export class Game {
  constructor() {
    this.ui = {
      hint: document.getElementById('hint'),
      bodyLabel: document.getElementById('body-label'),
      loading: document.getElementById('loading'),
      crosshair: document.getElementById('crosshair'),
    };

    const { scene, camera, renderer } = createSceneSetup();
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.ready = false;

    scene.add(createStarfield());
    this.input = new InputManager(renderer.domElement);

    const player = new Player();
    const tpsCamera = new ThirdPersonCamera(camera);

    this.planetariumMode = new PlanetariumMode({
      camera,
      renderer,
      solarSystem: null,
      onSelectBody: (body) => this._modeManager?.handleSelectBody(body),
      onLandTrigger: (body) => this._modeManager?.handleLandTrigger(body),
    });

    this.walkMode = new WalkMode({
      scene,
      camera,
      solarSystem: null,
      player,
      tpsCamera,
      input: this.input,
      crosshair: this.ui.crosshair,
      onExitRequest: (body) => this._modeManager?.handleExitRequest(body),
    });

    this.modeManager = new ModeManager({
      planetariumMode: this.planetariumMode,
      walkMode: this.walkMode,
      camera,
      ui: this.ui,
    });
    this._modeManager = this.modeManager;

    this.clock = { last: performance.now() };

    window.addEventListener('resize', this._onResize);
    this._loop();
    this._initWorld();
  }

  async _initWorld() {
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const solarSystem = await SolarSystem.create(this.scene, (name) => {
        if (this.ui.loading) this.ui.loading.textContent = `Loading ${name}…`;
      });
      this.solarSystem = solarSystem;
      this.planetariumMode.solarSystem = solarSystem;
      this.walkMode.solarSystem = solarSystem;
      this.ready = true;
      if (this.ui.loading) this.ui.loading.hidden = true;
      this.modeManager.start();
    } catch (err) {
      console.error('Failed to build solar system:', err);
      if (this.ui.hint) {
        this.ui.hint.textContent = `Error loading world: ${err.message}. Hard-refresh the page (Ctrl+Shift+R).`;
      }
    }
  }

  _onResize = () => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  _loop = () => {
    requestAnimationFrame(this._loop);
    const now = performance.now();
    const dt = Math.min((now - this.clock.last) / 1000, 0.05);
    this.clock.last = now;

    updateTweens();
    if (this.ready && this.modeManager.mode === MODES.PLANETARIUM) {
      this.planetariumMode.controls.update();
    }
    if (this.ready) {
      this.modeManager.update(dt);
      this.renderer.render(this.scene, this.camera);
    }
  };
}
