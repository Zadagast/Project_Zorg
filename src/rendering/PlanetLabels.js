import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export function createLabelRenderer() {
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.className = 'planet-label-layer';
  document.body.appendChild(labelRenderer.domElement);
  return labelRenderer;
}

export function attachBodyLabel(body, step) {
  const div = document.createElement('div');
  div.className = 'planet-label';
  div.textContent = body.name;

  const label = new CSS2DObject(div);
  label.position.set(0, -(body.radius + step * 2.2), 0);
  body.group.add(label);
  body.label = label;
}
