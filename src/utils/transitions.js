import * as THREE from 'three';
import { Tween, Easing, update as tweenUpdate, removeAll as tweenRemoveAll } from '@tweenjs/tween.js';

export function animateVector3(start, end, duration, onUpdate, onComplete) {
  const proxy = { t: 0 };
  const from = start.clone();

  return new Tween(proxy, true)
    .to({ t: 1 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(() => {
      onUpdate(from.clone().lerp(end, proxy.t));
    })
    .onComplete(() => {
      onUpdate(end.clone());
      if (onComplete) onComplete();
    })
    .start();
}

export function animateDual(startA, endA, startB, endB, duration, onUpdate, onComplete) {
  const proxy = { t: 0 };

  return new Tween(proxy, true)
    .to({ t: 1 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(() => {
      onUpdate(
        startA.clone().lerp(endA, proxy.t),
        startB.clone().lerp(endB, proxy.t),
      );
    })
    .onComplete(() => {
      onUpdate(endA.clone(), endB.clone());
      if (onComplete) onComplete();
    })
    .start();
}

export function animateCameraTransition(camera, targetPos, lookAt, duration, onComplete) {
  const startPos = camera.position.clone();
  const startTarget = lookAt.clone();
  const proxy = { t: 0 };

  return new Tween(proxy, true)
    .to({ t: 1 }, duration)
    .easing(Easing.Cubic.InOut)
    .onUpdate(() => {
      camera.position.copy(startPos).lerp(targetPos, proxy.t);
      camera.lookAt(startTarget.clone().lerp(lookAt, proxy.t));
    })
    .onComplete(() => {
      camera.position.copy(targetPos);
      camera.lookAt(lookAt);
      if (onComplete) onComplete();
    })
    .start();
}

export function updateTweens(time = performance.now()) {
  tweenUpdate(time);
}

export function stopAllTweens() {
  tweenRemoveAll();
}

export { Tween, Easing };
