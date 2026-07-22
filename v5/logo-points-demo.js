/* logo-points-demo.js — direct port of the user's p5.js sketch.
   Exact same logic, just running inside Three.js so it can sit next
   to the existing app camera/perspective.

     - Background: orange #ff601a (the p5 `background(255, 96, 26)`)
     - Every dot:  cream #fffae6 (the p5 `col = [255, 250, 230]`)
     - Edge fade is driven by the Z COORDINATE of the point
       (`zNorm = map(z, minZ, maxZ, -1, 1); edge = pow(1 - |zNorm|, 8)`),
       which fades points away from the front/back surfaces into the bg.
     - 30,000 dots picked across faces with random barycentric coords. */

import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// --- p5 palette, byte-for-byte ---
const BG  = [255,  96,  26]; // #ff601a — orange canvas bg
const DOT = [255, 250, 230]; // #fffae6 — cream dot colour

const NUM_DOTS = 30000;
const POINT_SIZE = 0.008;
const EDGE_POWER = 8;          // matches `pow(1 - |zNorm|, 8)`

const canvas = document.getElementById('cv');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(new THREE.Color(BG[0]/255, BG[1]/255, BG[2]/255), 1);

const scene = new THREE.Scene();
// Camera / perspective matched to the live logo (initTitleScene3D).
const camera = new THREE.PerspectiveCamera(15, 1, 0.1, 100);
camera.position.set(0, 0, 13.82);

const titleGroup = new THREE.Group();
scene.add(titleGroup);

function resize(){
  const rect = canvas.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }
}
new ResizeObserver(resize).observe(canvas);

// === Build a flat list of triangle faces with world-space vertices =====
function collectFaces(model){
  const faces = [];
  model.updateMatrixWorld(true);

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const geom = child.geometry;
    const pos = geom.attributes.position;
    const idx = geom.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const mat = child.matrixWorld;
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();

    for (let t = 0; t < triCount; t++){
      const ia = idx ? idx.getX(t*3)   : t*3;
      const ib = idx ? idx.getX(t*3+1) : t*3+1;
      const ic = idx ? idx.getX(t*3+2) : t*3+2;

      vA.fromBufferAttribute(pos, ia).applyMatrix4(mat);
      vB.fromBufferAttribute(pos, ib).applyMatrix4(mat);
      vC.fromBufferAttribute(pos, ic).applyMatrix4(mat);

      faces.push([vA.x, vA.y, vA.z, vB.x, vB.y, vB.z, vC.x, vC.y, vC.z]);
    }
  });

  return faces;
}

// === Same loop as the p5 sketch, just typed-arrays for Three.js =======
new OBJLoader().load('/image/3d/zeut.obj', (model) => {
  const faces = collectFaces(model);
  if (!faces.length) return;

  // Bounds — mirrors the p5 `minX/maxX/minY/maxY/minZ/maxZ` pass.
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const f of faces){
    for (let k = 0; k < 9; k += 3){
      const x = f[k], y = f[k+1], z = f[k+2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
  }
  // Re-centre + scale so the model fits the live-logo viewport.
  const ccx = (minX + maxX) / 2;
  const ccy = (minY + maxY) / 2;
  const ccz = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scale = 2.4 / span;
  const zRange = (maxZ - minZ) || 1;

  const positions = new Float32Array(NUM_DOTS * 3);
  const colors    = new Float32Array(NUM_DOTS * 3);

  for (let i = 0; i < NUM_DOTS; i++){
    // Pick a random face (= p5 `faces[int(random(faces.length))]`).
    const f = faces[(Math.random() * faces.length) | 0];

    // Random barycentric — exact same pattern.
    let r1 = Math.random(), r2 = Math.random();
    if (r1 + r2 > 1){ r1 = 1 - r1; r2 = 1 - r2; }
    const r3 = 1 - r1 - r2;

    const wx = r1*f[0] + r2*f[3] + r3*f[6];
    const wy = r1*f[1] + r2*f[4] + r3*f[7];
    const wz = r1*f[2] + r2*f[5] + r3*f[8];

    // Centre + scale + flip Y (p5 uses `translate(p.x, -p.y, p.z)`).
    positions[i*3 + 0] =  (wx - ccx) * scale;
    positions[i*3 + 1] = -(wy - ccy) * scale;
    positions[i*3 + 2] =  (wz - ccz) * scale;

    // Edge fade — taken straight from the sketch.
    // `zNorm = map(z, minZ, maxZ, -1, 1)` → `(wz - minZ) / zRange * 2 - 1`.
    const zNorm = (wz - minZ) / zRange * 2 - 1;
    const edge  = Math.pow(1 - Math.abs(zNorm), EDGE_POWER);

    // `lerp(col, BG, edge)` for each channel — same as the sketch.
    colors[i*3 + 0] = (DOT[0] * (1 - edge) + BG[0] * edge) / 255;
    colors[i*3 + 1] = (DOT[1] * (1 - edge) + BG[1] * edge) / 255;
    colors[i*3 + 2] = (DOT[2] * (1 - edge) + BG[2] * edge) / 255;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: POINT_SIZE,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: false,
    depthWrite: false,
  });

  const points = new THREE.Points(geom, mat);
  titleGroup.add(points);
});

// === Manual interaction ===============================================
// No auto rotation. Hover = parallax, drag = free rotate.
const target  = { rx: 0, ry: 0 };
const current = { rx: 0, ry: 0 };
const drag = { active: false, lastX: 0, lastY: 0 };
const PARALLAX_X = 0.10;
const PARALLAX_Y = 0.14;
const DRAG_SENS  = 0.005;
const EASE       = 0.08;

canvas.addEventListener('pointerdown', (e) => {
  drag.active = true; drag.lastX = e.clientX; drag.lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', (e) => {
  drag.active = false;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
});
canvas.addEventListener('pointercancel', () => { drag.active = false; });
canvas.addEventListener('pointermove', (e) => {
  if (drag.active) {
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX; drag.lastY = e.clientY;
    target.ry += dx * DRAG_SENS;
    target.rx += dy * DRAG_SENS;
  } else {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width)  * 2 - 1;
    const ny = ((e.clientY - r.top)  / r.height) * 2 - 1;
    target.ry =  nx * PARALLAX_Y;
    target.rx = -ny * PARALLAX_X;
  }
});

function animate(){
  resize();
  current.rx += (target.rx - current.rx) * EASE;
  current.ry += (target.ry - current.ry) * EASE;
  titleGroup.rotation.x = current.rx;
  titleGroup.rotation.y = current.ry;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
