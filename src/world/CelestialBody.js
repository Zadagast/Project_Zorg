import * as THREE from 'three';
import { generateVoxels } from './VoxelPlanetGenerator.js';

const _dummy = new THREE.Object3D();
const _scratchColor = new THREE.Color();

export class CelestialBody {
  constructor(def) {
    this.name = def.name;
    this.radius = def.radius;
    this.distance = def.distance;
    this.isSun = !!def.isSun;
    this.hasRings = !!def.hasRings;
    this.color = def.color;
    this.voxelStep = 1;

    this.group = new THREE.Group();
    this.group.position.set(def.distance, 0, 0);
    this.group.userData.celestialBody = this;

    // Rings sit in YZ — use a modest pick radius, not full ring span along X.
    const pickRadius = this.radius * (this.hasRings ? 1.65 : 1);
    this.pickSphere = new THREE.Mesh(
      new THREE.SphereGeometry(pickRadius, 16, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.pickSphere.userData.celestialBody = this;
    this.group.add(this.pickSphere);

    this._buildMesh();
  }

  _buildMesh() {
    const { voxels, step } = generateVoxels({
      name: this.name,
      radius: this.radius,
      color: this.color,
      isSun: !!this.isSun,
      hasRings: this.hasRings,
    });
    this.voxelStep = step;

    const geometry = new THREE.BoxGeometry(step, step, step);
    const baseColors = new Float32Array(geometry.attributes.position.count * 3);
    baseColors.fill(1);
    geometry.setAttribute('color', new THREE.BufferAttribute(baseColors, 3));

    const material = this.isSun
      ? new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
      : new THREE.MeshLambertMaterial({
          color: 0xffffff,
          vertexColors: true,
          emissive: new THREE.Color(0x000000),
        });

    this.mesh = new THREE.InstancedMesh(geometry, material, voxels.length);
    this.mesh.userData.celestialBody = this;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.frustumCulled = true;

    const instanceColors = new Float32Array(voxels.length * 3);
    for (let i = 0; i < voxels.length; i += 1) {
      _dummy.position.copy(voxels[i].position);
      _dummy.updateMatrix();
      this.mesh.setMatrixAt(i, _dummy.matrix);
      _scratchColor.setHex(voxels[i].color);
      _scratchColor.toArray(instanceColors, i * 3);
    }
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;

    this.group.add(this.mesh);
  }

  getWorldCenter(target = new THREE.Vector3()) {
    return this.group.getWorldPosition(target);
  }

  getPickTargets() {
    return [this.pickSphere];
  }

  setHighlighted(on) {
    if (!this.isSun) {
      this.mesh.material.emissive.set(on ? 0x334466 : 0x000000);
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
    if (this.label) this.label.visible = visible;
  }

  raycastSurface(worldOrigin, worldDirection, surfaceOffset = 0.5) {
    const center = this.getWorldCenter(_centerScratch);
    const radius = this.radius + surfaceOffset;
    const direction = _dirScratch.copy(worldDirection).normalize();
    const oc = _ocScratch.copy(worldOrigin).sub(center);
    const a = direction.dot(direction);
    const b = 2 * oc.dot(direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtD = Math.sqrt(discriminant);
    let t = (-b - sqrtD) / (2 * a);
    if (t < 0) t = (-b + sqrtD) / (2 * a);
    if (t < 0) return null;

    const point = worldOrigin.clone().add(_dirScratch.copy(worldDirection).normalize().multiplyScalar(t));
    const normal = point.clone().sub(center).normalize();
    return { point, normal, distance: t };
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.pickSphere.geometry.dispose();
    this.pickSphere.material.dispose();
  }
}

const _centerScratch = new THREE.Vector3();
const _dirScratch = new THREE.Vector3();
const _ocScratch = new THREE.Vector3();
