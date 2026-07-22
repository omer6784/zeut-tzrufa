import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas   = document.getElementById('canvas-3d');
const section4 = document.getElementById('section-4');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 4);

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 2);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0xf9edde, 0.8);
fill.position.set(-3, -2, 2);
scene.add(fill);

// Load GLB
let model = null;
const loader = new GLTFLoader();
loader.load('image/circle 3d.glb', (gltf) => {
  model = gltf.scene;
  model.position.set(0, 0, 0);

  // Scale to fit nicely
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  model.scale.setScalar(2 / maxDim);

  // Center
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center.multiplyScalar(2 / maxDim));

  scene.add(model);
}, undefined, (err) => console.error('GLB load error:', err));

function resize() {
  const w = section4.clientWidth;
  const h = section4.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

// Gentle auto-rotation
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  if (model) {
    model.rotation.y = t * 0.35;
    model.rotation.x = Math.sin(t * 0.2) * 0.12;
  }
  renderer.render(scene, camera);
}
animate();
