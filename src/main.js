// main.js (with lil-gui developer panel)
// --------------------------------------------------
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import GUI from 'lil-gui';

// =============== HDRI SELECTION (easy to switch!)
// Options: 'moonless_golf', 'satara_night_no_lamps', 'satara_night', 'dikhololo_night', 'kloppenheim_02'
let HDRI_CHOICE = 'moonless_golf';  // Very dark, perfect for horror atmosphere
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

// =============== IMAGE-BASED LIGHTING (Step 2: Night HDRI)
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// FIX: In r179, must set envMap directly on materials for intensity to work!
let globalEnvMap = null;  // Store for later use

// Function to load a new HDRI
function loadHDRI(hdriName) {
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    `/assets/hdri/${hdriName}_2k.hdr`,
    (hdrTexture) => {
      // Convert HDRI to environment map
      const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
      scene.environment = envMap;  // For diffuse IBL
      hdrTexture.dispose();  // Clean up original
      
      // FIX for r179: Must also set envMap on each material!
      applyEnvMapToMaterials(scene, envMap, CURRENT_ENV_INTENSITY);
      
      console.log(`✓ Loaded HDRI: ${hdriName}`);
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
}

// Load initial HDRI
loadHDRI(HDRI_CHOICE);

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
  
  console.log(`Environment intensity changed to ${intensity.toFixed(2)} on ${count} materials`);
}

// =============== GUI SETUP (Step 3: Developer Panel)
const gui = new GUI();

// State object to track all adjustable values
const state = {
  // Rendering
  exposure: renderer.toneMappingExposure,
  
  // Environment
  envIntensity: CURRENT_ENV_INTENSITY,
  hdri: HDRI_CHOICE,
  
  // Lights
  moonIntensity: moon.intensity,
  moonX: moon.position.x,
  moonY: moon.position.y,
  moonZ: moon.position.z,
  hemiIntensity: hemi.intensity,
  ambientIntensity: amb.intensity,
  
  // Fog
  fogNear: scene.fog.near,
  fogFar: scene.fog.far,
  fogColor: '#0b1133',
  
  // Flashlight
  flashlightIntensity: flashlight.intensity,
  flashlightAngle: flashlight.angle * 180 / Math.PI,  // Convert to degrees for GUI
  flashlightPenumbra: flashlight.penumbra,
  flashlightDistance: flashlight.distance,
  
  // Shadows
  shadowBias: moon.shadow.bias,
  shadowNormalBias: moon.shadow.normalBias
};

// Rendering folder
const renderFolder = gui.addFolder('Rendering');
renderFolder.add(state, 'exposure', 0.3, 3.0, 0.01)
  .name('Exposure')
  .onChange(v => renderer.toneMappingExposure = v);
renderFolder.open();

// Environment folder
const envFolder = gui.addFolder('Environment');
envFolder.add(state, 'envIntensity', 0, 1, 0.01)
  .name('Env Intensity')
  .onChange(v => setEnvIntensity(scene, v));
envFolder.add(state, 'hdri', {
  'Darkest (moonless_golf)': 'moonless_golf',
  'Dark with stars': 'satara_night_no_lamps',
  'Dark with lamp': 'satara_night',
  'Brighter test': 'dikhololo_night',
  'Brightest': 'kloppenheim_02'
})
  .name('HDRI')
  .onChange(v => {
    HDRI_CHOICE = v;
    loadHDRI(v);
  });
envFolder.open();

// Lights folder
const lightsFolder = gui.addFolder('Lights');
lightsFolder.add(state, 'moonIntensity', 0, 2, 0.01)
  .name('Moon Intensity')
  .onChange(v => moon.intensity = v);
lightsFolder.add(state, 'moonX', -50, 50, 0.5)
  .name('Moon X')
  .onChange(v => moon.position.x = v);
lightsFolder.add(state, 'moonY', 10, 50, 0.5)
  .name('Moon Y')
  .onChange(v => moon.position.y = v);
lightsFolder.add(state, 'moonZ', -50, 50, 0.5)
  .name('Moon Z')
  .onChange(v => moon.position.z = v);
lightsFolder.add(state, 'hemiIntensity', 0, 1, 0.01)
  .name('Hemisphere')
  .onChange(v => hemi.intensity = v);
lightsFolder.add(state, 'ambientIntensity', 0, 0.3, 0.001)
  .name('Ambient')
  .onChange(v => amb.intensity = v);

// Fog folder
const fogFolder = gui.addFolder('Fog');
fogFolder.add(state, 'fogNear', 0, 100, 1)
  .name('Near')
  .onChange(v => scene.fog.near = v);
fogFolder.add(state, 'fogFar', 50, 200, 1)
  .name('Far')
  .onChange(v => scene.fog.far = v);
fogFolder.addColor(state, 'fogColor')
  .name('Color')
  .onChange(v => scene.fog.color.set(v));

// Flashlight folder
const flashFolder = gui.addFolder('Flashlight');
flashFolder.add(state, 'flashlightIntensity', 0, 50, 0.5)
  .name('Intensity')
  .onChange(v => flashlight.intensity = v);
flashFolder.add(state, 'flashlightAngle', 5, 45, 1)
  .name('Angle (degrees)')
  .onChange(v => flashlight.angle = v * Math.PI / 180);
flashFolder.add(state, 'flashlightPenumbra', 0, 1, 0.01)
  .name('Penumbra')
  .onChange(v => flashlight.penumbra = v);
flashFolder.add(state, 'flashlightDistance', 10, 100, 1)
  .name('Distance')
  .onChange(v => flashlight.distance = v);
flashFolder.add(flashlight, 'visible')
  .name('Enabled');

// Shadows folder
const shadowFolder = gui.addFolder('Shadows');
shadowFolder.add(state, 'shadowBias', -0.005, 0.005, 0.0001)
  .name('Bias')
  .onChange(v => moon.shadow.bias = v);
shadowFolder.add(state, 'shadowNormalBias', 0, 0.1, 0.001)
  .name('Normal Bias')
  .onChange(v => moon.shadow.normalBias = v);

// Presets button
const presetsObj = {
  resetToDefaults: () => {
    // Reset all values to their starting defaults
    state.exposure = 1.0;
    state.envIntensity = 0.15;
    state.hdri = 'moonless_golf';
    state.moonIntensity = 0.8;
    state.moonX = 12;
    state.moonY = 30;
    state.moonZ = 16;
    state.hemiIntensity = 0.25;
    state.ambientIntensity = 0.05;
    state.fogNear = 35;
    state.fogFar = 90;
    state.flashlightIntensity = 20;
    state.flashlightAngle = 18;  // degrees
    state.flashlightPenumbra = 0.5;
    state.flashlightDistance = 35;
    state.shadowBias = -0.001;
    state.shadowNormalBias = 0.02;
    
    // Apply all changes
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    loadHDRI(state.hdri);
    moon.intensity = state.moonIntensity;
    moon.position.set(state.moonX, state.moonY, state.moonZ);
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;
    scene.fog.near = state.fogNear;
    scene.fog.far = state.fogFar;
    flashlight.intensity = state.flashlightIntensity;
    flashlight.angle = state.flashlightAngle * Math.PI / 180;
    flashlight.penumbra = state.flashlightPenumbra;
    flashlight.distance = state.flashlightDistance;
    moon.shadow.bias = state.shadowBias;
    moon.shadow.normalBias = state.shadowNormalBias;
    
    // Update GUI to reflect changes
    gui.controllersRecursive().forEach(controller => controller.updateDisplay());
    
    console.log('✓ Reset all values to defaults');
  },
  
  brightTest: () => {
    // Preset for testing visibility
    state.exposure = 1.5;
    state.envIntensity = 0.3;
    state.moonIntensity = 1.2;
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    gui.controllersRecursive().forEach(controller => controller.updateDisplay());
    console.log('✓ Applied bright test preset');
  },
  
  horrorDark: () => {
    // Preset for maximum horror atmosphere
    state.exposure = 0.8;
    state.envIntensity = 0.08;
    state.moonIntensity = 0.5;
    state.fogNear = 25;
    state.fogFar = 70;
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    scene.fog.near = state.fogNear;
    scene.fog.far = state.fogFar;
    gui.controllersRecursive().forEach(controller => controller.updateDisplay());
    console.log('✓ Applied horror dark preset');
  }
};

const presetsFolder = gui.addFolder('Presets');
presetsFolder.add(presetsObj, 'resetToDefaults').name('Reset to Defaults');
presetsFolder.add(presetsObj, 'brightTest').name('Bright (Testing)');
presetsFolder.add(presetsObj, 'horrorDark').name('Horror Dark');
presetsFolder.open();

// =============== KEYBOARD CONTROLS (keeping for backwards compatibility)
window.addEventListener('keydown', (e) => {
  // Flashlight toggle
  if (e.key.toLowerCase() === 'f') {
    flashlight.visible = !flashlight.visible;
    // Update GUI to reflect change
    gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'visible' && controller.object === flashlight) {
        controller.updateDisplay();
      }
    });
  }
  
  // Exposure controls (German keyboard) - still work but GUI is better!
  if (e.key === 'ü') {
    state.exposure = Math.min(3.0, state.exposure * 1.06);
    renderer.toneMappingExposure = state.exposure;
    gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'exposure') controller.updateDisplay();
    });
    console.log('Exposure increased to:', state.exposure.toFixed(2));
  }
  if (e.key === 'ä') {
    state.exposure = Math.max(0.3, state.exposure / 1.06);
    renderer.toneMappingExposure = state.exposure;
    gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'exposure') controller.updateDisplay();
    });
    console.log('Exposure decreased to:', state.exposure.toFixed(2));
  }
  
  // Quick HDRI intensity test (+ and - keys) - still work but GUI is better!
  if (e.key === '+') {
    state.envIntensity = Math.min(1.0, state.envIntensity + 0.05);
    setEnvIntensity(scene, state.envIntensity);
    gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'envIntensity') controller.updateDisplay();
    });
  }
  if (e.key === '-') {
    state.envIntensity = Math.max(0.0, state.envIntensity - 0.05);
    setEnvIntensity(scene, state.envIntensity);
    gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'envIntensity') controller.updateDisplay();
    });
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

// Start message
console.log('🎮 Night Scene with GUI Controls');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GUI panel in top-right corner');
console.log('Keyboard shortcuts still work:');
console.log('  F - Toggle flashlight');
console.log('  ü/ä - Adjust exposure');
console.log('  +/- - Adjust environment intensity');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');