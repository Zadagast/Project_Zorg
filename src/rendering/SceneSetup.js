import * as THREE from 'three';

export function createSceneSetup() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    15000,
  );
  camera.position.set(600, 400, 1400);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.outline = 'none';
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xbfd4ff, 0x1a1028, 0.45);
  scene.add(hemiLight);

  return { scene, camera, renderer };
}

export function createSunLight() {
  const sunLight = new THREE.PointLight(0xfff5e6, 25000, 15000, 1.5);
  sunLight.position.set(0, 0, 0);
  return sunLight;
}

/** Directional sunlight so planet colors stay visible from any camera angle. */
export function createSunDirectionalLight() {
  const light = new THREE.DirectionalLight(0xfff0dd, 2.2);
  light.position.set(-1, 0.35, 0.25);
  return light;
}
