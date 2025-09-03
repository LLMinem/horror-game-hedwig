// main.js (baseline playable night)
// --------------------------------------------------
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// =============== SCENE & RENDERER
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2; // ~night baseline; adjust live if needed
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// =============== CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 1.7, 15);
camera.lookAt(0, 1.5, 0);

// =============== SKY (background only; does NOT light)
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 2; skyCanvas.height = 512;
const g = skyCanvas.getContext('2d');
const grad = g.createLinearGradient(0, 0, 0, 512);
grad.addColorStop(0.0, '#0a0a2e');  // deep blue
grad.addColorStop(0.45, '#07071e'); // mid
grad.addColorStop(1.0, '#000000');  // horizon black
g.fillStyle = grad; g.fillRect(0, 0, 2, 512);
scene.background = new THREE.CanvasTexture(skyCanvas);

// =============== FOG (subtle; visibility to ~80m)
scene.fog = new THREE.Fog(0x10122e, 40, 90);

// =============== IMAGE-BASED LIGHTING (critical)
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;               // lights PBR materials
// If your three.js ≥ r163 you can globally dim/boost IBL:
// scene.environmentIntensity = 0.25;     // optional (depends on your version)

// =============== LIGHTS
// 1) Moon (directional)
const moon = new THREE.DirectionalLight(0xbfd2ff, 1.2); // off-white moon
moon.position.set(12, 30, 16);
moon.target.position.set(0, 0, 0);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.near = 0.5;
moon.shadow.camera.far = 120;
moon.shadow.camera.left = -60;
moon.shadow.camera.right = 60;
moon.shadow.camera.top = 60;
moon.shadow.camera.bottom = -60;
moon.shadow.bias = -0.001;
moon.shadow.normalBias = 0.02;
scene.add(moon, moon.target);

// 2) Hemisphere (sky/ground bounce)
const hemi = new THREE.HemisphereLight(0x2c3a5a, 0x0a0a18, 0.35);
scene.add(hemi);

// 3) Ambient (tiny base lift; keep low or it flattens)
const amb = new THREE.AmbientLight(0x222244, 0.08);
scene.add(amb);

// =============== GROUND
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x3b4d3b,  // a bit lighter than before
  roughness: 0.85,
  metalness: 0.0,
  emissive: 0x0f0f10,
  emissiveIntensity: 0.12,
  side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// =============== TEST OBJECTS (lighten albedo a touch)
for (let i = 0; i < 5; i++) {
  const tombMat = new THREE.MeshStandardMaterial({
    color: 0x6a6f78,   // lighter gray-blue stone
    roughness: 0.7,
    metalness: 0.05
  });
  const tomb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.3), tombMat);
  tomb.position.set(Math.random() * 20 - 10, 1.25, Math.random() * 20 - 10);
  tomb.castShadow = tomb.receiveShadow = true;
  scene.add(tomb);
}

for (let i = 0; i < 3; i++) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.95 })
  );
  trunk.position.set(Math.random() * 30 - 15, 3, Math.random() * 30 - 15);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
}

for (let i = 0; i < 8; i++) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.8, metalness: 0.3 })
  );
  post.position.set(-20 + i * 5, 1.5, -15);
  post.castShadow = post.receiveShadow = true;
  scene.add(post);
}

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x808699, roughness: 0.55, metalness: 0.2 })
);
sphere.position.set(5, 1, 5);
sphere.castShadow = sphere.receiveShadow = true;
scene.add(sphere);

// =============== OPTIONAL: FLASHLIGHT (toggle with 'F')
const flashlight = new THREE.SpotLight(0xfff5d6, 35, 35, Math.PI * 0.09, 0.5, 2);
// If your version uses “legacy” light scaling, start with intensity ~5–8 instead of 35.
flashlight.visible = false;             // keep OFF by default
flashlight.castShadow = true;
scene.add(flashlight, flashlight.target);

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') flashlight.visible = !flashlight.visible;
});

// =============== RESIZE
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============== LOOP
const tmpDir = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);

  // Attach flashlight to camera
  if (flashlight.visible) {
    flashlight.position.copy(camera.position);
    camera.getWorldDirection(tmpDir).normalize();
    flashlight.target.position.copy(camera.position).add(tmpDir.multiplyScalar(10));
  }

  renderer.render(scene, camera);
}
animate();