export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.pointerLocked = false;
    this.walkMode = false;
    this._mouseButtons = 0;

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);

    this._onPointerDown = (e) => {
      if (e.target !== this.domElement && !this.domElement.contains(e.target)) return;
      this._mouseButtons |= 1 << e.button;
      if (this.walkMode && (e.button === 0 || e.button === 2)) {
        e.preventDefault();
      }
    };

    this._onPointerUp = (e) => {
      this._mouseButtons &= ~(1 << e.button);
    };

    this._onMouseMove = (e) => {
      if (!this._shouldTrackLook()) return;
      const dx = e.movementX ?? 0;
      const dy = e.movementY ?? 0;
      if (dx === 0 && dy === 0) return;
      this.mouseDelta.x += dx;
      this.mouseDelta.y += dy;
    };

    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
      document.body.classList.toggle('pointer-locked', this.pointerLocked);
    };

    this._onWheel = (e) => {
      this.wheelDelta += e.deltaY;
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
    document.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockChange);
  }

  setWalkMode(active) {
    this.walkMode = active;
    if (!active) {
      this.exitPointerLock();
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
  }

  _shouldTrackLook() {
    if (this.pointerLocked) return true;
    return false;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isPointerLocked() {
    return this.pointerLocked;
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }

  consumeWheelDelta() {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }

  requestPointerLock() {
    if (document.pointerLockElement === this.domElement) {
      return Promise.resolve(true);
    }

    this.domElement.focus({ preventScroll: true });

    if (!document.hasFocus()) {
      return Promise.resolve(false);
    }

    try {
      const result = this.domElement.requestPointerLock({ unadjustedMovement: true });
      if (result && typeof result.then === 'function') {
        return result.then(() => true).catch(() => false);
      }
      return Promise.resolve(true);
    } catch {
      return Promise.resolve(false);
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore if lock already released.
      }
    }
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
    document.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockChange);
    document.body.classList.remove('pointer-locked');
  }
}
