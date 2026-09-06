import * as THREE from 'three';
import { softenGeometry } from './soft-geometry.js';

// Local, deterministic material textures. No external texture downloads.
function masonry() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#797b76'; ctx.fillRect(0, 0, 512, 512);
  let seed = 87;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const x = col * 128 + (row % 2) * 64, y = row * 64;
    const tint = Math.floor(145 + rand() * 14);
    ctx.fillStyle = `rgb(${tint},${tint + 3},${tint - 2})`;
    ctx.beginPath(); ctx.roundRect(x + 1, y + 1, 126, 62, 5); ctx.fill();
    ctx.strokeStyle = '#ddd9cb20'; ctx.stroke();
    for (let i = 0; i < 120; i++) { ctx.fillStyle = rand() > .5 ? '#ffffff0b' : '#00000012'; ctx.fillRect(x + rand() * 124, y + rand() * 60, 1 + rand() * 5, 1); }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace; texture.repeat.set(6, 2); return texture;
}

export function enhanceAtmosphere(scene, renderer, chapter) {
  const stone = masonry();
  const floor = stone.clone(); floor.repeat.set(5, 5); floor.needsUpdate = true;
  const materials = new Map();
  const geometries = new Map();
  const moteCanvas = document.createElement('canvas');
  moteCanvas.width = moteCanvas.height = 32;
  const moteContext = moteCanvas.getContext('2d');
  const moteGlow = moteContext.createRadialGradient(16, 16, 0, 16, 16, 16);
  moteGlow.addColorStop(0, '#ffffffff');
  moteGlow.addColorStop(.3, '#ffffffa0');
  moteGlow.addColorStop(1, '#ffffff00');
  moteContext.fillStyle = moteGlow; moteContext.fillRect(0, 0, 32, 32);
  const moteTexture = new THREE.CanvasTexture(moteCanvas);
  scene.traverse(object => {
    if (object.isPoints && !object.material.map) {
      object.material.map = moteTexture;
      object.material.transparent = true;
      object.material.depthWrite = false;
      object.material.needsUpdate = true;
    }
    if (object.isMesh && !object.material?.map && !Array.isArray(object.material)) {
      const source = object.geometry;
      const key = source.type + JSON.stringify(source.parameters);
      if (!geometries.has(key)) geometries.set(key, softenGeometry(source));
      // Never cache custom geometries by type alone.
      if (source.parameters) object.geometry = geometries.get(key);
    }
    if (!object.isMesh || !object.material?.isMeshToonMaterial) return;
    const old = object.material;
    if (!materials.has(old)) {
      const material = new THREE.MeshStandardMaterial({ color: old.color, side: old.side, map: old.map, transparent: old.transparent, opacity: old.opacity, roughness: .72, metalness: .035, emissive: old.emissive, emissiveIntensity: old.emissiveIntensity });
      materials.set(old, material);
    }
    object.material = materials.get(old);
    object.receiveShadow = true;
    object.castShadow = true;
    const p = object.geometry.parameters || {};
    // Texture architectural surfaces only; labels and puzzle colors remain clear.
    if ((p.radiusTop > 7 && p.height > 4) || (p.width > 5 && p.height > 3)) {
      object.material = object.material.clone(); object.material.map = stone; object.material.bumpMap = stone; object.material.bumpScale = .018;
      object.material.color.set(0xb1b6a8); object.castShadow = false;
    }
    if ((p.radius > 7 && object.rotation.x < -1) || (p.width > 7 && p.height > 7 && object.rotation.x < -1)) {
      object.material = object.material.clone(); object.material.map = floor; object.material.bumpMap = floor; object.material.bumpScale = .012; object.material.color.set(0x858477); object.castShadow = false;
    }
  });
  // Broad fill reveals the new curved edges without washing out torch colours.
  scene.add(new THREE.HemisphereLight(0xc1c9df, 0x66513d, .38));
  const pool = new THREE.SpotLight(chapter === 2 ? 0xa9d9ed : 0xffd6a0, 90, 26, .95, .65, 2);
  pool.position.set(-2.7, chapter === 5 ? 6 : 4.8, 2.3); pool.target.position.set(0, 0, -2);
  pool.castShadow = true; pool.shadow.mapSize.set(2048, 2048); pool.shadow.bias = -.0004; pool.shadow.normalBias = .025;
  scene.add(pool, pool.target);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
