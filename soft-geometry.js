import * as THREE from './vendor/three/three.module.js';

// Project a subdivided box onto a rounded cuboid. The outer dimensions, UVs
// and material groups stay intact, including the flat centre of each face.
export function roundedBox(width, height, depth) {
  const radius = Math.min(.065, Math.min(width, height, depth) * .22);
  const geometry = new THREE.BoxGeometry(width, height, depth, 7, 7, 7);
  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const half = [width / 2, height / 2, depth / 2];
  const grids = half.map(h => [-h, -h + radius / 3, -h + radius * 2 / 3,
    -h + radius, h - radius, h - radius * 2 / 3, h - radius / 3, h]);
  const point = new THREE.Vector3(), inner = new THREE.Vector3(), direction = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i);
    for (let axis = 0; axis < 3; axis++) {
      const step = Math.round((point.getComponent(axis) / (half[axis] * 2) + .5) * 7);
      point.setComponent(axis, grids[axis][step]);
      inner.setComponent(axis, THREE.MathUtils.clamp(point.getComponent(axis), -half[axis] + radius, half[axis] - radius));
    }
    direction.subVectors(point, inner).normalize();
    point.copy(inner).addScaledVector(direction, radius);
    position.setXYZ(i, point.x, point.y, point.z);
    normal.setXYZ(i, direction.x, direction.y, direction.z);
  }
  return geometry;
}

export function softenGeometry(geometry) {
  const p = geometry.parameters;
  if (!p) return geometry;
  switch (geometry.type) {
    case 'BoxGeometry':
      // Keep structural wall joints closed, and printed/textured boxes crisp.
      if ([p.width, p.height, p.depth].filter(size => size > 3).length > 1) return geometry;
      return roundedBox(p.width, p.height, p.depth);
    case 'CylinderGeometry':
      return new THREE.CylinderGeometry(p.radiusTop, p.radiusBottom, p.height,
        Math.max(p.radialSegments, p.radiusTop > 7 ? 128 : 32), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
    case 'ConeGeometry':
      return new THREE.ConeGeometry(p.radius, p.height, Math.max(p.radialSegments, 32), p.heightSegments, p.openEnded, p.thetaStart, p.thetaLength);
    case 'SphereGeometry':
      return new THREE.SphereGeometry(p.radius, Math.max(p.widthSegments, 32), Math.max(p.heightSegments, 20), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    case 'TorusGeometry':
      return new THREE.TorusGeometry(p.radius, p.tube, Math.max(p.radialSegments, 12), Math.max(p.tubularSegments, 64), p.arc);
    case 'CircleGeometry':
      return new THREE.CircleGeometry(p.radius, Math.max(p.segments, 96), p.thetaStart, p.thetaLength);
    case 'RingGeometry':
      return new THREE.RingGeometry(p.innerRadius, p.outerRadius, Math.max(p.thetaSegments, 96), p.phiSegments, p.thetaStart, p.thetaLength);
    default:
      // Crystals, gears and custom puzzle silhouettes retain their design.
      return geometry;
  }
}
