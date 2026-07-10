import * as THREE from 'three';
import { CATALOG_CAMERA, SOLAR_SYSTEM_CENTER_X, SOLAR_SYSTEM_SPAN } from '../config.js';

export function createSceneSetup() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  const far = Math.max(8000, SOLAR_SYSTEM_SPAN * 4);
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    far,
  );
  camera.position.set(SOLAR_SYSTEM_CENTER_X, CATALOG_CAMERA.y, CATALOG_CAMERA.z);
  camera.lookAt(SOLAR_SYSTEM_CENTER_X, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.outline = 'none';
  document.body.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.58);
  scene.add(ambientLight);

  // Sun sits at origin — light planets from the left like the reference art.
  const sunLight = new THREE.DirectionalLight(0xfff4e8, 1.35);
  sunLight.position.set(-1, 0.32, 0.38);
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0x8899cc, 0.28);
  fillLight.position.set(0.5, 0.15, -0.7);
  scene.add(fillLight);

  return { scene, camera, renderer };
}

export function createSunLight() {
  const sunLight = new THREE.PointLight(0xfff5e6, 45000, 8000, 1.5);
  sunLight.position.set(0, 0, 0);
  return sunLight;
}
