import * as THREE from 'three';

const _dummy = new THREE.Object3D();
const _scratchColor = new THREE.Color();

/**
 * Build an instanced voxel mesh matching planet rendering style.
 * @param {{ position: THREE.Vector3, color: number }[]} voxels
 * @param {number} step cube edge length
 * @param {{ emissive?: THREE.Color, basic?: boolean }} [opts]
 */
export function buildInstancedVoxelMesh(voxels, step, opts = {}) {
  if (voxels.length === 0) {
    return new THREE.Group();
  }

  const geometry = new THREE.BoxGeometry(step, step, step);
  const material = opts.basic
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true })
    : new THREE.MeshLambertMaterial({
        color: 0xffffff,
        vertexColors: true,
        emissive: opts.emissive ?? new THREE.Color(0x000000),
      });

  const mesh = new THREE.InstancedMesh(geometry, material, voxels.length);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const instanceColors = new Float32Array(voxels.length * 3);
  for (let i = 0; i < voxels.length; i += 1) {
    _dummy.position.copy(voxels[i].position);
    _dummy.updateMatrix();
    mesh.setMatrixAt(i, _dummy.matrix);
    _scratchColor.setHex(voxels[i].color);
    _scratchColor.toArray(instanceColors, i * 3);
  }

  mesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColors, 3);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

/** Center model feet on origin, scale to target height (Y-up). */
export function normalizeVoxelGroup(group, targetHeight = 1.8) {
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return;

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 1e-4);

  group.scale.setScalar(scale);
  group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  group.updateMatrixWorld(true);
}
