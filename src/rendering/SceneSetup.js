import * as THREE from 'three';

export function createSceneSetup() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    8000,
  );
  camera.position.set(200, 150, 600);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222244, 0.35);
  scene.add(hemiLight);

  return { scene, camera, renderer };
}

export function createSunLight() {
  const sunLight = new THREE.PointLight(0xfff5e6, 80000, 2000, 2);
  sunLight.position.set(0, 0, 0);
  return sunLight;
}
