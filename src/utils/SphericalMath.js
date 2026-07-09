import * as THREE from 'three';

export function safeNormalize(v, fallback = new THREE.Vector3(0, 1, 0)) {
  if (v.lengthSq() < 1e-8) {
    if (fallback === v) return v.set(0, 1, 0);
    return fallback.clone();
  }
  return v.normalize();
}

export function tangentBasis(up) {
  const normal = safeNormalize(up);
  let reference = new THREE.Vector3(0, 0, 1);
  if (Math.abs(normal.dot(reference)) > 0.9) reference.set(1, 0, 0);
  const east = new THREE.Vector3().crossVectors(normal, reference);
  if (east.lengthSq() < 1e-8) east.set(1, 0, 0);
  east.normalize();
  const north = new THREE.Vector3().crossVectors(east, normal).normalize();
  return { east, north, up: normal };
}

export function quaternionFromYUp(up) {
  const normal = safeNormalize(up);
  const dot = new THREE.Vector3(0, 1, 0).dot(normal);
  if (dot > 0.9999) return new THREE.Quaternion();
  if (dot < -0.9999) {
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  }
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
}

export function getWorldCenter(body) {
  return body.group.getWorldPosition(new THREE.Vector3());
}

export function getLocalUp(body, worldPoint) {
  const center = getWorldCenter(body);
  return safeNormalize(worldPoint.clone().sub(center));
}

export function projectOntoTangentPlane(vector, up, target) {
  const out = target ?? new THREE.Vector3();
  out.copy(vector).addScaledVector(up, -vector.dot(up));
  return safeNormalize(out, out);
}

export function snapToSphereSurface(body, direction, offset = 0) {
  const center = getWorldCenter(body);
  const dist = body.radius + offset;
  return center.clone().add(safeNormalize(direction).multiplyScalar(dist));
}

export function directionFromWorldPoint(body, worldPoint) {
  const center = getWorldCenter(body);
  return safeNormalize(worldPoint.clone().sub(center));
}

export function directionFromYaw(up, yaw) {
  const { east, north } = tangentBasis(up);
  return east.multiplyScalar(Math.sin(yaw)).add(north.multiplyScalar(Math.cos(yaw))).normalize();
}

export function alignObjectToUp(object, up) {
  object.quaternion.copy(quaternionFromYUp(up));
}

export function getCameraDistanceToBody(camera, body) {
  const center = getWorldCenter(body);
  return camera.position.distanceTo(center);
}
