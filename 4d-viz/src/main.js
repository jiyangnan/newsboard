import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Tesseract } from './math/Tesseract.js';

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// 4D Object Setup
const tesseract = new Tesseract(1.5);
const originalVertices = tesseract.getVertices();
const edges = tesseract.getEdges();

// Geometry for rendering
// We use LineSegments. Each edge needs 2 vertices.
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(edges.length * 2 * 3); // 2 points per edge, 3 coords (x,y,z) per point
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
const lines = new THREE.LineSegments(geometry, material);
scene.add(lines);

// Add vertices as points for better visualization
const pointsGeometry = new THREE.BufferGeometry();
const pointsPositions = new Float32Array(originalVertices.length * 3);
pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointsPositions, 3));
const pointsMaterial = new THREE.PointsMaterial({ color: 0xff0055, size: 0.15 });
const points = new THREE.Points(pointsGeometry, pointsMaterial);
scene.add(points);


// State
const rotationAngles = {
  xy: 0, xz: 0, xw: 0,
  yz: 0, yw: 0, zw: 0
};

let autoRotate = true;

// UI Elements
const inputs = {
  xy: document.getElementById('rot-xy'),
  xz: document.getElementById('rot-xz'),
  xw: document.getElementById('rot-xw'),
  yz: document.getElementById('rot-yz'),
  yw: document.getElementById('rot-yw'),
  zw: document.getElementById('rot-zw'),
};

const displays = {
  xy: document.getElementById('val-xy'),
  xz: document.getElementById('val-xz'),
  xw: document.getElementById('val-xw'),
  yz: document.getElementById('val-yz'),
  yw: document.getElementById('val-yw'),
  zw: document.getElementById('val-zw'),
};

const autoRotateCheckbox = document.getElementById('auto-rotate');

// Event Listeners
Object.keys(inputs).forEach(key => {
  inputs[key].addEventListener('input', (e) => {
    rotationAngles[key] = parseFloat(e.target.value) * (Math.PI / 180);
    displays[key].innerText = `${e.target.value}°`;
    autoRotate = false;
    autoRotateCheckbox.checked = false;
  });
});

autoRotateCheckbox.addEventListener('change', (e) => {
  autoRotate = e.target.checked;
});

// Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);

  if (autoRotate) {
    // Slowly rotate in multiple planes for effect
    rotationAngles.xw += 0.01;
    rotationAngles.zw += 0.005;

    // Update UI to match
    inputs.xw.value = (rotationAngles.xw * 180 / Math.PI) % 360;
    displays.xw.innerText = `${Math.round(inputs.xw.value)}°`;

    inputs.zw.value = (rotationAngles.zw * 180 / Math.PI) % 360;
    displays.zw.innerText = `${Math.round(inputs.zw.value)}°`;
  }

  // Calculate transformed vertices
  const projectedPoints = [];

  for (const v of originalVertices) {
    let p = v.clone();

    // Apply rotations
    if (rotationAngles.xy !== 0) p.rotateXY(rotationAngles.xy);
    if (rotationAngles.xz !== 0) p.rotateXZ(rotationAngles.xz);
    if (rotationAngles.xw !== 0) p.rotateXW(rotationAngles.xw);
    if (rotationAngles.yz !== 0) p.rotateYZ(rotationAngles.yz);
    if (rotationAngles.yw !== 0) p.rotateYW(rotationAngles.yw);
    if (rotationAngles.zw !== 0) p.rotateZW(rotationAngles.zw);

    // Project to 3D
    // We project from 4D to 3D. The camera distance in 4D determines perspective.
    const p3 = p.projectTo3D(3); // Camera at w=3
    projectedPoints.push(p3);
  }

  // Update Line Geometry
  const posAttribute = lines.geometry.attributes.position;
  let index = 0;

  for (const [i, j] of edges) {
    const p1 = projectedPoints[i];
    const p2 = projectedPoints[j];

    posAttribute.setXYZ(index++, p1.x, p1.y, p1.z);
    posAttribute.setXYZ(index++, p2.x, p2.y, p2.z);
  }
  posAttribute.needsUpdate = true;

  // Update Points Geometry
  const pointsPosAttribute = points.geometry.attributes.position;
  for (let i = 0; i < projectedPoints.length; i++) {
    const p = projectedPoints[i];
    pointsPosAttribute.setXYZ(i, p.x, p.y, p.z);
  }
  pointsPosAttribute.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}

animate();
