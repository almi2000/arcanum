import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { roundedBox, softenGeometry } from '../soft-geometry.js';

test('rounded furniture preserves bounds and has smooth, finite edge normals', () => {
  for (const dimensions of [[1.1, .22, .65], [.08, .06, .02], [.3, .25, 17.4]]) {
    const geometry = roundedBox(...dimensions);
    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    size.toArray().forEach((value, axis) => assert.ok(Math.abs(value - dimensions[axis]) < 1e-5));
    const normals = geometry.attributes.normal;
    let curved = 0;
    for (let i = 0; i < normals.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(normals, i);
      assert.ok(Math.abs(n.length() - 1) < 1e-6);
      if (n.toArray().filter(value => Math.abs(value) > .01).length > 1) curved++;
    }
    assert.ok(curved > 0);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 20), new THREE.Vector3(0, 0, -1));
    assert.ok(ray.intersectObject(mesh).length > 0, 'flat front remains clickable');
  }
});

test('smoothing preserves door openings, partial arcs and designed crystal facets', () => {
  const wall = softenGeometry(new THREE.CylinderGeometry(9, 9, 5.5, 48, 1, true, 3.28, 6));
  assert.equal(wall.parameters.thetaStart, 3.28);
  assert.equal(wall.parameters.thetaLength, 6);
  assert.equal(wall.parameters.openEnded, true);
  assert.equal(wall.parameters.radialSegments, 128);
  const arch = softenGeometry(new THREE.CircleGeometry(.45, 16, 0, Math.PI));
  assert.equal(arch.parameters.thetaLength, Math.PI);
  const crystal = new THREE.OctahedronGeometry(.45);
  assert.equal(softenGeometry(crystal), crystal);
  const partition = new THREE.BoxGeometry(8, 5, .4);
  assert.equal(softenGeometry(partition), partition);
});
