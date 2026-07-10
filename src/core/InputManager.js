export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.pointerLocked = false;
    this._mouseButtons = 0;
    this._dragDistance = 0;

    this._onKeyDown = (e) => this.keys.add(e.code);
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (this.pointerLocked || this._mouseButtons !== 0) {
        this.mouseDelta.x += e.movementX;
        this.mouseDelta.y += e.movementY;
        this._dragDistance += Math.abs(e.movementX) + Math.abs(e.movementY);
      }
    };
    this._onWheel = (e) => {
      this.wheelDelta += e.deltaY;
    };
    this._onMouseDown = (e) => {
      this._mouseButtons |= 1 << e.button;
      this._dragDistance = 0;
    };
    this._onMouseUp = (e) => {
      this._mouseButtons &= ~(1 << e.button);
    };
    this._onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
      document.body.classList.toggle('pointer-locked', this.pointerLocked);
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('wheel', this._onWheel, { passive: true });
    domElement.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    document.addEventListener('pointerlockerror', this._onPointerLockChange);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  isMouseDown(button = 0) {
    return (this._mouseButtons & (1 << button)) !== 0;
  }

  isLooking() {
    return this.pointerLocked || this._mouseButtons !== 0;
  }

  wasDrag() {
    return this._dragDistance > 4;
  }

  resetDrag() {
    this._dragDistance = 0;
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
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('wheel', this._onWheel);
    this.domElement.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('pointerlockerror', this._onPointerLockChange);
    document.body.classList.remove('pointer-locked');
  }
}
