import * as THREE from 'three';
import { MODES } from '../config.js';
import { animateCameraTransition, stopAllTweens } from '../utils/transitions.js';

const LAND_TRANSITION_MS = 1400;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export class ModeManager {
  constructor({ planetariumMode, walkMode, camera, ui }) {
    this.planetariumMode = planetariumMode;
    this.walkMode = walkMode;
    this.camera = camera;
    this.ui = ui;
    this.mode = MODES.PLANETARIUM;
    this.transitioning = false;
    this.landTransition = null;
  }

  start() {
    this.planetariumMode.enter();
    this.setHint('Drag to orbit · Double-click a planet to focus · Scroll to zoom · Zoom in to land');
    this.planetariumMode.selectInitialBody();
  }

  handleSelectBody(body) {
    this.ui.bodyLabel.textContent = body.name;
  }

  handleLandTrigger(body) {
    if (this.mode !== MODES.PLANETARIUM || this.transitioning || body.isSun) return;

    try {
      const landingPoint = this.planetariumMode.getLandingPoint();
      if (!landingPoint) return;

      stopAllTweens();
      this.planetariumMode.cancelFocus();
      this.transitioning = true;
      this.mode = MODES.TRANSITIONING;
      this.planetariumMode.exit();
      this.setHint('Click and drag to look · WASD move · Scroll to zoom · Esc to exit');

      const { startDist, targetDist } = this.walkMode.prepareLanding(body, landingPoint);

      this.landTransition = {
        startTime: performance.now(),
        duration: LAND_TRANSITION_MS,
        startDist,
        targetDist,
        body,
      };
    } catch (err) {
      console.error('Land transition failed:', err);
      this.walkMode.abortLanding();
      this.transitioning = false;
      this.landTransition = null;
      this.mode = MODES.PLANETARIUM;
      this.planetariumMode.enter();
      this.planetariumMode.landTriggered = false;
      this.setHint('Landing failed — try again. Drag to orbit · Click a planet to focus');
    }
  }

  _updateLandTransition() {
    const lt = this.landTransition;
    if (!lt) return;

    const raw = Math.min(1, (performance.now() - lt.startTime) / lt.duration);
    const eased = easeInOutCubic(raw);

    const dist = THREE.MathUtils.lerp(lt.startDist, lt.targetDist, eased);
    this.walkMode.setLandingDistance(dist);
    this.walkMode.updateLandingTransition();

    if (raw >= 1) {
      try {
        this.walkMode.finishLanding();
        this.mode = MODES.WALK;
      } catch (err) {
        console.error('Walk mode enter failed:', err);
        this.walkMode.abortLanding();
        this.planetariumMode.enter();
        this.mode = MODES.PLANETARIUM;
        this.planetariumMode.landTriggered = false;
        this.setHint('Landing failed — try again. Drag to orbit · Click a planet to focus');
      } finally {
        this.landTransition = null;
        this.transitioning = false;
      }
    }
  }

  handleExitRequest(body) {
    if (this.mode !== MODES.WALK || this.transitioning) return;

    stopAllTweens();
    this.transitioning = true;
    this.mode = MODES.TRANSITIONING;
    const { camPos, lookAt } = this.walkMode.getExitCameraPose();
    this.walkMode.exit();

    animateCameraTransition(this.camera, camPos, lookAt, 900, () => {
      this.planetariumMode.enter();
      this.planetariumMode.selectedBody = body;
      body.setHighlighted(true);
      this.planetariumMode.controls.target.copy(lookAt);
      this.planetariumMode.landTriggered = false;
      this.mode = MODES.PLANETARIUM;
      this.transitioning = false;
      this.setHint('Drag to orbit · Double-click a planet to focus · Scroll to zoom · Zoom in to land');
    });
  }

  setHint(text) {
    this.ui.hint.textContent = text;
  }

  update(dt) {
    if (this.landTransition) {
      this._updateLandTransition();
      return;
    }

    if (this.transitioning) return;

    if (this.mode === MODES.PLANETARIUM) {
      this.planetariumMode.update();
    } else if (this.mode === MODES.WALK) {
      this.walkMode.update(dt);
    }
  }
}
