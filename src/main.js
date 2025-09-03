// main.js (baseline playable night)
// --------------------------------------------------
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// =============== HDRI SELECTION (easy to switch!)
// Options: 'moonless_golf', 'satara_night_no_lamps', 'satara_night', 'dikhololo_night', 'kloppenheim_02'
const HDRI_CHOICE = 'moonless_golf';  // Very dark, perfect for horror atmosphere
let CURRENT_ENV_INTENSITY = 0.15;  // Track the current intensity

// =============== SCENE & RENDERER
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // neutral starting point
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// =============== CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 120);
camera.position.set(0, 1.7, 15);
camera.lookAt(0, 1.5, 0);

// =============== SKY (background only; does NOT light)
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 4; skyCanvas.height = 2048; // Higher res to reduce banding
const g = skyCanvas.getContext('2d');
const grad = g.createLinearGradient(0, 0, 0, 2048);
grad.addColorStop(0.0, '#0a0a2e');  // deep blue at top
grad.addColorStop(0.5, '#0a0e2a');  // slightly lighter blue
grad.addColorStop(1.0, '#000000');  // black at horizon
g.fillStyle = grad; g.fillRect(0, 0, 4, 2048);
scene.background = new THREE.CanvasTexture(skyCanvas);

// =============== FOG (subtle; visibility to ~80m)
scene.fog = new THREE.Fog(0x0b1133, 35, 90); // slightly adjusted to match new lighting

// =============== IMAGE-BASED LIGHTING (Step 2: Night HDRI)
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// Load the selected night HDRI
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  `/assets/hdri/${HDRI_CHOICE}_2k.hdr`,
  (hdrTexture) => {
    // Convert HDRI to environment map
    const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap;  // For diffuse IBL
    hdrTexture.dispose();  // Clean up original
    
    // FIX for r179: Must also set envMap on each material!
    applyEnvMapToMaterials(scene, envMap, CURRENT_ENV_INTENSITY);
    
    console.log(`✓ Loaded HDRI: ${HDRI_CHOICE}`);
    console.log('Tip: Change HDRI_CHOICE at top of file to test others!');
    console.log('Use +/- keys to adjust environment intensity!');
  },
  (progress) => {
    const percent = (progress.loaded / progress.total * 100).toFixed(0);
    console.log(`Loading HDRI: ${percent}%`);
  },
  (error) => {
    console.error('Failed to load HDRI:', error);
    console.log('Scene will work but shadows will be very dark');
  }
);

// FIX: In r179, must set envMap directly on materials for intensity to work!
let globalEnvMap = null;  // Store for later use

function applyEnvMapToMaterials(root, envMap, intensity) {
  globalEnvMap = envMap;  // Store globally
  CURRENT_ENV_INTENSITY = intensity;
  let count = 0;
  
  root.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if ('envMapIntensity' in obj.material) {
        // Critical fix: Must set envMap on material in r179!
        obj.material.envMap = envMap;
        obj.material.envMapIntensity = intensity;
        obj.material.needsUpdate = true;  // Force shader rebuild
        count++;
      }
    }
  });
  
  console.log(`✓ Applied envMap to ${count} materials at intensity ${intensity}`);
}

// Helper to just change intensity (after envMap is set)
function setEnvIntensity(root, intensity) {
  CURRENT_ENV_INTENSITY = intensity;
  let count = 0;
  
  root.traverse((obj) => {
    if (obj.isMesh && obj.material && obj.material.envMap) {
      obj.material.envMapIntensity = intensity;
      // No needsUpdate required for just changing intensity!
      count++;
    }
  });
  
  console.log(`Environment intensity changed to ${intensity} on ${count} materials`);
}

// =============== LIGHTS
// 1) Moon (directional) - main light source, cool blue-white
const moon = new THREE.DirectionalLight(0x9bb7ff, 0.8); // cooler, dimmer moon
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

// 2) Hemisphere (sky/ground bounce) - subtle blue from above, dark from below
const hemi = new THREE.HemisphereLight(0x20324f, 0x0a0f18, 0.25);
scene.add(hemi);

// 3) Ambient (tiny base lift; keep very low or it flattens everything)
const amb = new THREE.AmbientLight(0x1b1e34, 0.05);
scene.add(amb);

// =============== GROUND
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x3b4d3b,
  roughness: 0.85,
  metalness: 0.0,
  emissive: 0x0c0d10,
  emissiveIntensity: 0.08  // reduced emissive glow
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// =============== TEST OBJECTS (lighten albedo a touch)
for (let i = 0; i < 5; i++) {
  const tombMat = new THREE.MeshStandardMaterial({
    color: 0x7a808a,   // stone color
    roughness: 0.65,
    metalness: 0.0,     // stone isn't metal!
    envMapIntensity: 0.15  // Will be overridden by setEnvIntensity
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
    new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 0.3, metalness: 1.0, envMapIntensity: 0.5 }) // shinier metal for testing!
  );
  post.position.set(-20 + i * 5, 1.5, -15);
  post.castShadow = post.receiveShadow = true;
  scene.add(post);
}

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x9aa2b5, roughness: 0.5, metalness: 0.0, envMapIntensity: 0.15 })
);
sphere.position.set(5, 1, 5);
sphere.castShadow = sphere.receiveShadow = true;
scene.add(sphere);

// =============== OPTIONAL: FLASHLIGHT (toggle with 'F')
const flashlight = new THREE.SpotLight(0xfff2d0, 20, 35, Math.PI * 0.1, 0.5, 2); // warmer, less intense
// If your version uses "legacy" light scaling, start with intensity ~5–8 instead of 35.
flashlight.visible = false;             // keep OFF by default
flashlight.castShadow = true;
scene.add(flashlight, flashlight.target);

// =============== KEYBOARD CONTROLS
window.addEventListener('keydown', (e) => {
  // Flashlight toggle
  if (e.key.toLowerCase() === 'f') flashlight.visible = !flashlight.visible;
  
  // Exposure controls (German keyboard)
  if (e.key === 'ä') {
    renderer.toneMappingExposure *= 1.06;
    console.log('Exposure increased to:', renderer.toneMappingExposure.toFixed(2));
  }
  if (e.key === 'ü') {
    renderer.toneMappingExposure /= 1.06;
    console.log('Exposure decreased to:', renderer.toneMappingExposure.toFixed(2));
  }
  
  // Quick HDRI intensity test (+ and - keys)
  if (e.key === '+') {
    const newIntensity = Math.min(1.0, CURRENT_ENV_INTENSITY + 0.1);  // Bigger steps
    setEnvIntensity(scene, newIntensity);
  }
  if (e.key === '-') {
    const newIntensity = Math.max(0.0, CURRENT_ENV_INTENSITY - 0.1);  // Bigger steps
    setEnvIntensity(scene, newIntensity);
  }
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

// Debug: List available HDRIs on startup
console.log('Available HDRIs:');
console.log('  moonless_golf - Darkest (horror perfect)');
console.log('  satara_night_no_lamps - Dark with stars');
console.log('  satara_night - Dark with lamp glow');
console.log('  dikhololo_night - Brighter (good for testing)');
console.log('  kloppenheim_02 - Brightest');
console.log(`Currently using: ${HDRI_CHOICE}`);