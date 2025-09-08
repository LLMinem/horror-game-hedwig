// main.js (with fog-aware skydome)
// --------------------------------------------------
import GUI from "lil-gui";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

// =============== HDRI SELECTION (easy to switch!)
// Options: 'moonless_golf', 'dikhololo_night', 'satara_night'
let HDRI_CHOICE = "dikhololo_night"; // Beautiful stars, good for testing
let CURRENT_ENV_INTENSITY = 0.25; // Increased for better object visibility with moonless_golf

// =============== SCENE & RENDERER
const scene = new THREE.Scene();
// Skydome handles all sky visuals now

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0; // neutral starting point
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// =============== CAMERA
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  5000, // Increased far plane for skydome
);
camera.position.set(0, 1.7, 15);

// =============== MOUSE LOOK CONTROLS
let yaw = 0; // Horizontal rotation (radians)
let pitch = 0; // Vertical rotation (radians)
let mouseSensitivity = 0.002; // How fast the camera rotates
let isPointerLocked = false;

// Request pointer lock when clicking on the canvas
renderer.domElement.addEventListener('click', () => {
  if (!isPointerLocked) {
    renderer.domElement.requestPointerLock();
  }
});

// Handle pointer lock change
document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
  if (isPointerLocked) {
    console.log('✓ Mouse captured - move to look around, ESC to release');
  } else {
    console.log('✓ Mouse released - click to capture again');
  }
});

// Handle mouse movement when pointer is locked
document.addEventListener('mousemove', (event) => {
  if (!isPointerLocked) return;
  
  // Get mouse movement delta
  const movementX = event.movementX || 0;
  const movementY = event.movementY || 0;
  
  // Update rotation angles
  yaw += movementX * mouseSensitivity;  // Fixed: was inverted
  pitch -= movementY * mouseSensitivity;
  
  // Clamp pitch to prevent over-rotation (looking too far up/down)
  const maxPitch = Math.PI / 2 - 0.1; // Almost straight up/down
  pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
});

// Function to update camera rotation based on yaw/pitch
function updateCameraRotation() {
  // Calculate direction vector from yaw and pitch
  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
  
  // Point camera in that direction
  camera.lookAt(
    camera.position.x + direction.x,
    camera.position.y + direction.y,
    camera.position.z + direction.z
  );
}

// =============== SKYDOME (replaces the 2D gradient background)
// Vertex shader - calculates eye-ray direction for proper horizon alignment
const skyVertexShader = `
  varying vec3 vDir;  // Direction from camera to vertex
  
  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vDir = worldPos - cameraPosition;  // THREE.js provides cameraPosition automatically!
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader - creates 4-stop gradient aligned with visual horizon
const skyFragmentShader = `
  precision highp float;
  
  // Four color stops for complex gradient
  uniform vec3 horizonColor;    // Bottom color (light pollution)
  uniform vec3 midLowColor;     // Lower-mid transition
  uniform vec3 midHighColor;    // Upper-mid transition  
  uniform vec3 zenithColor;     // Top color (darkest sky)
  
  // Control where transitions happen (0-1 range)
  uniform float midLowStop;     // Where horizon transitions to mid-low
  uniform float midHighStop;    // Where mid-low transitions to mid-high
  
  // LIGHT POLLUTION SOURCES
  // Near village (NW-N, ~250m away)
  uniform vec3 village1Dir;        // Direction to village (normalized)
  uniform float village1Intensity; // Glow intensity (0.0-1.0)
  uniform float village1Spread;    // Angular spread in radians
  uniform float village1Height;    // Max height above horizon (0-1)
  
  // Distant village (SE, ~2km away)  
  uniform vec3 village2Dir;        // Direction to distant village
  uniform float village2Intensity; // Much weaker intensity
  uniform float village2Spread;    // Broader spread
  uniform float village2Height;    // Lower height limit
  
  // DITHERING
  uniform float ditherAmount;      // How strong the dither effect is (0.0-0.01)
  
  varying vec3 vDir;  // Direction from camera to this fragment
  
  // Simple hash function for dithering noise
  float hash(vec2 p) {
    // This creates a pseudo-random value based on screen position
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    // Normalize the eye-ray direction
    vec3 dir = normalize(vDir);
    
    // Use Y component directly: 0 = horizon, 1 = straight up
    // Clamp to [0,1] so anything below horizon stays at horizon color
    float altitude = clamp(dir.y, 0.0, 1.0);
    
    // SMOOTHSTEP: Creates smooth S-curve transitions
    // Now altitude=0 is TRUE VISUAL HORIZON, altitude=1 is zenith
    
    // Transition 1: Horizon to Mid-Low
    float t1 = smoothstep(0.0, midLowStop, altitude);
    vec3 col = mix(horizonColor, midLowColor, t1);
    
    // Transition 2: Mid-Low to Mid-High  
    float t2 = smoothstep(midLowStop, midHighStop, altitude);
    col = mix(col, midHighColor, t2);
    
    // Transition 3: Mid-High to Zenith
    float t3 = smoothstep(midHighStop, 1.0, altitude);
    col = mix(col, zenithColor, t3);
    
    // ============ LIGHT POLLUTION CALCULATION ============
    // Calculate horizontal direction (ignore vertical component)
    vec3 horizDir = normalize(vec3(dir.x, 0.0, dir.z));
    
    // VILLAGE 1 (Near, NW-N, ~250m)
    float village1Alignment = dot(horizDir, village1Dir);
    // Convert alignment to glow intensity (falloff from center)
    float village1Glow = smoothstep(
      cos(village1Spread),  // Cutoff angle
      1.0,                  // Maximum at perfect alignment
      village1Alignment     // Current alignment
    ) * village1Intensity;
    
    // Fade with altitude (stronger near horizon)
    village1Glow *= smoothstep(village1Height, 0.0, altitude);
    
    // VILLAGE 2 (Distant, SE, ~2km)  
    float village2Alignment = dot(horizDir, village2Dir);
    float village2Glow = smoothstep(
      cos(village2Spread),
      1.0,
      village2Alignment
    ) * village2Intensity;
    
    // Even stronger altitude falloff for distant source
    village2Glow *= smoothstep(village2Height, 0.0, altitude);
    
    // Add light pollution to base gradient
    // Using warm color (#3D2F28) for sodium lamp glow
    vec3 pollutionColor = vec3(0.24, 0.18, 0.16); // Warm brown-orange
    col += pollutionColor * (village1Glow + village2Glow);
    
    // Apply dithering to prevent color banding
    // Uses screen-space position for stable noise pattern
    float dither = hash(gl_FragCoord.xy);
    dither = (dither - 0.5) * ditherAmount; // Center around 0, scale by amount
    col += vec3(dither); // Add noise to break up gradients
    
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Create skydome geometry and material
// FIXED: Reduced radius and disabled depth test completely
const skyGeometry = new THREE.SphereGeometry(1000, 32, 32);
const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    // Four color stops for realistic night gradient
    horizonColor: { value: new THREE.Color(0x2B1E1B) },  // Warm grey-brown (light pollution)
    midLowColor: { value: new THREE.Color(0x15131C) },   // Dark plum (transition)
    midHighColor: { value: new THREE.Color(0x0D1019) },  // Deep grey-blue
    zenithColor: { value: new THREE.Color(0x060B14) },   // Very dark indigo (never pure black!)
    
    // Control where color transitions happen
    midLowStop: { value: 0.25 },   // 25% up from horizon
    midHighStop: { value: 0.60 },  // 60% up from horizon
    
    // NEAR VILLAGE (NW-N, ~250m) - Noticeable glow
    village1Dir: { value: new THREE.Vector3(-0.7, 0, -0.7).normalize() }, // Northwest
    village1Intensity: { value: 0.20 },  // Moderate glow (reduced from 0.25)
    village1Spread: { value: (90 * Math.PI) / 180 }, // 90° spread (increased from 23°)
    village1Height: { value: 0.4 },      // Visible up to 40% altitude (increased from 20%)
    
    // DISTANT VILLAGE (SE, ~2km) - Very subtle
    village2Dir: { value: new THREE.Vector3(0.7, 0, 0.7).normalize() }, // Southeast  
    village2Intensity: { value: 0.1 },   // Weak but more visible (increased from 0.05)
    village2Spread: { value: (50 * Math.PI) / 180 }, // 50° spread (increased from 34°)
    village2Height: { value: 0.25 },     // Up to 25% altitude (increased from 10%)
    
    // DITHERING - Prevents gradient banding
    ditherAmount: { value: 0.008 },      // Noise to break up gradients
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
  side: THREE.BackSide, // Render inside of sphere
  depthWrite: false, // Don't write to depth buffer
  depthTest: false, // CRITICAL: Don't test depth at all
  fog: false, // DISABLE fog on sky itself (we'll handle blending differently)
});

const skydome = new THREE.Mesh(skyGeometry, skyMaterial);
skydome.renderOrder = -999; // CRITICAL: Render before everything else
skydome.frustumCulled = false; // Never cull the sky
scene.add(skydome);

// =============== FOG (adjusted for skydome interaction)
// Using FogExp2 for atmospheric depth - slightly reduced density for skydome
scene.fog = new THREE.FogExp2(0x0a0e2a, 0.030); // Blue-tinted fog matching sky

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

// =============== GROUND WITH TEXTURES
const textureLoader = new THREE.TextureLoader();

// Load grass textures (using 2K for better quality)
const grassColorTex = textureLoader.load('/assets/textures/ground/grass_color_2k.jpg');
const grassNormalTex = textureLoader.load('/assets/textures/ground/grass_normal_2k.jpg');

// Configure textures for tiling
const groundTiling = 64; // 64x tiling with 2K textures = sharp detail (~0.4cm per pixel)
grassColorTex.wrapS = grassColorTex.wrapT = THREE.RepeatWrapping;
grassNormalTex.wrapS = grassNormalTex.wrapT = THREE.RepeatWrapping;
grassColorTex.repeat.set(groundTiling, groundTiling);
grassNormalTex.repeat.set(groundTiling, groundTiling);

// IMPORTANT: Mark color texture as sRGB for correct color management
grassColorTex.colorSpace = THREE.SRGBColorSpace;

// Ground material with textures
const groundGeo = new THREE.PlaneGeometry(500, 500);
const groundMat = new THREE.MeshStandardMaterial({
  map: grassColorTex,           // Color texture
  normalMap: grassNormalTex,     // Normal map for surface detail
  normalScale: new THREE.Vector2(1, 1), // Strength of normal effect
  roughness: 0.8,                // Slightly less rough since texture has detail
  metalness: 0.0,
  envMapIntensity: 0.25,         // Will be overridden by setEnvIntensity
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// =============== TEST OBJECTS (lighten albedo a touch)
for (let i = 0; i < 5; i++) {
  const tombMat = new THREE.MeshStandardMaterial({
    color: 0x7a808a, // stone color
    roughness: 0.65,
    metalness: 0.0, // stone isn't metal!
    envMapIntensity: 0.15, // Will be overridden by setEnvIntensity
  });
  const tomb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.3), tombMat);
  tomb.position.set(Math.random() * 20 - 10, 1.25, Math.random() * 20 - 10);
  tomb.castShadow = tomb.receiveShadow = true;
  scene.add(tomb);
}

for (let i = 0; i < 3; i++) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.7, 6, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.95 }),
  );
  trunk.position.set(Math.random() * 30 - 15, 3, Math.random() * 30 - 15);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
}

for (let i = 0; i < 8; i++) {
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 3, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0x9a9a9a,
      roughness: 0.3,
      metalness: 1.0,
      envMapIntensity: 0.5,
    }), // shinier metal for testing!
  );
  post.position.set(-20 + i * 5, 1.5, -15);
  post.castShadow = post.receiveShadow = true;
  scene.add(post);
}
console.log("Metal posts are at 25-60m distance (along -15 Z axis)");

const sphere = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x9aa2b5,
    roughness: 0.5,
    metalness: 0.0,
    envMapIntensity: 0.15,
  }),
);
sphere.position.set(5, 1, 5);
sphere.castShadow = sphere.receiveShadow = true;
scene.add(sphere);
console.log("Sphere is at ~7m distance (5,1,5 from camera at 0,1.7,15)");

// =============== OPTIONAL: FLASHLIGHT (toggle with 'F')
// Updated defaults based on testing: intensity 50, angle 28°, penumbra 0.4, distance 45
const flashlight = new THREE.SpotLight(
  0xfff2d0,
  50,
  45,
  (Math.PI * 28) / 180,
  0.4,
  2,
);
flashlight.visible = false; // keep OFF by default
flashlight.castShadow = true;
scene.add(flashlight, flashlight.target);

// =============== IMAGE-BASED LIGHTING (Step 2: Night HDRI)
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// FIX: In r179, must set envMap directly on materials for intensity to work!
let globalEnvMap = null; // Store for later use

// Function to load a new HDRI
function loadHDRI(hdriName) {
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load(
    `/assets/hdri/${hdriName}_2k.hdr`,
    (hdrTexture) => {
      // Convert HDRI to environment map
      const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
      scene.environment = envMap; // For diffuse IBL
      hdrTexture.dispose(); // Clean up original
      
      // NOTE: We no longer set scene.background - skydome handles visuals!

      // FIX for r179: Must also set envMap on each material!
      applyEnvMapToMaterials(scene, envMap, CURRENT_ENV_INTENSITY);

      console.log(`✓ Loaded HDRI for lighting: ${hdriName}`);
    },
    (progress) => {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
      console.log(`Loading HDRI: ${percent}%`);
    },
    (error) => {
      console.error("Failed to load HDRI:", error);
      console.log("Scene will work but shadows will be very dark");
    },
  );
}

// Load initial HDRI
loadHDRI(HDRI_CHOICE);

function applyEnvMapToMaterials(root, envMap, intensity) {
  globalEnvMap = envMap; // Store globally
  CURRENT_ENV_INTENSITY = intensity;
  let count = 0;

  root.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if ("envMapIntensity" in obj.material) {
        // Critical fix: Must set envMap on material in r179!
        obj.material.envMap = envMap;
        obj.material.envMapIntensity = intensity;
        obj.material.needsUpdate = true; // Force shader rebuild
        count++;
      }
    }
  });

  console.log(
    `✓ Applied envMap to ${count} materials at intensity ${intensity}`,
  );
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

  console.log(
    `Environment intensity changed to ${intensity.toFixed(2)} on ${count} materials`,
  );
}

// =============== GUI SETUP (Step 3: Developer Panel)
const gui = new GUI();

// Default values for double-click reset functionality (MUST be defined first!)
const defaults = {
  exposure: 1.0,
  envIntensity: 0.25,
  hdri: "dikhololo_night",
  moonIntensity: 0.8,
  moonX: 12,
  moonY: 30,
  moonZ: 16,
  hemiIntensity: 0.25,
  ambientIntensity: 0.05,
  fogDensity: 0.030, // Reduced for skydome
  fogType: "exp2",
  fogColor: "#0a0e2a", // Blue-tinted to match sky
  flashlightIntensity: 50,
  flashlightAngle: 28,
  flashlightPenumbra: 0.4,
  flashlightDistance: 45,
  shadowBias: -0.001,
  shadowNormalBias: 0.02,
  // Ground texture controls
  groundTiling: 64,
  normalStrength: 1.0,
  // NEW: Sky controls - 4-stop gradient for realistic night
  skyHorizonColor: "#2B1E1B",  // Warm grey-brown (light pollution)
  skyMidLowColor: "#15131C",   // Dark plum (transition zone)
  skyMidHighColor: "#0D1019",  // Deep grey-blue (main sky)
  skyZenithColor: "#060B14",   // Very dark indigo (never pure black!)
  skyMidLowStop: 0.25,         // Where first transition happens
  skyMidHighStop: 0.60,        // Where second transition happens
  // Light pollution controls
  village1Azimuth: -45,        // Northwest direction (degrees)
  village1Intensity: 0.20,     // Near village glow strength (reduced from 0.25)
  village1Spread: 90,          // Angular spread in degrees (increased from 23)
  village1Height: 0.4,         // Max altitude (0-1) (increased from 0.2)
  village2Azimuth: 135,        // Southeast direction (degrees)
  village2Intensity: 0.1,      // Distant village (increased from 0.05)
  village2Spread: 50,          // Broader spread (increased from 34)
  village2Height: 0.25,        // Lower on horizon (increased from 0.1)
  pollutionColor: "#3D2F28",   // Warm sodium lamp color
  // Dithering
  skyDitherAmount: 0.008,      // Dithering to prevent gradient banding
};

// State object initialized from defaults
const state = { ...defaults };

// Helper function to add double-click reset to any controller
function addDblClickReset(controller, defaultValue) {
  // lil-gui uses .name for the label element
  const labelEl = controller.domElement.querySelector('.name');
  if (!labelEl) {
    console.warn('Could not find label element for', controller.property);
    return;
  }
  
  // Make it discoverable
  labelEl.style.cursor = 'pointer';
  labelEl.title = 'Double-click to reset to default';
  
  // Add the double-click handler
  labelEl.addEventListener('dblclick', (e) => {
    e.preventDefault(); // Prevent text selection
    controller.setValue(defaultValue);
    console.log(`Reset ${controller.property} to ${defaultValue}`);
  });
}

// Wrapper to automatically add double-click reset to all controllers
function enhanceGuiWithReset(guiOrFolder) {
  const originalAdd = guiOrFolder.add.bind(guiOrFolder);
  
  guiOrFolder.add = function(object, property, ...args) {
    const controller = originalAdd(object, property, ...args);
    
    // Check if we have a default value for this property
    if (defaults.hasOwnProperty(property)) {
      addDblClickReset(controller, defaults[property]);
    }
    
    return controller;
  };
  
  // Also wrap addColor method
  if (guiOrFolder.addColor) {
    const originalAddColor = guiOrFolder.addColor.bind(guiOrFolder);
    guiOrFolder.addColor = function(object, property) {
      const controller = originalAddColor(object, property);
      if (defaults.hasOwnProperty(property)) {
        addDblClickReset(controller, defaults[property]);
      }
      return controller;
    };
  }
}

// Apply the enhancement to the main GUI and all folders
enhanceGuiWithReset(gui);

// NEW: Sky folder for 4-stop gradient controls
const skyFolder = gui.addFolder("Sky Gradient (4 Colors)");
enhanceGuiWithReset(skyFolder);

// Color controls - from bottom to top
skyFolder
  .addColor(state, "skyHorizonColor")
  .name("1. Horizon (Light Pollution)")
  .onChange((v) => skyMaterial.uniforms.horizonColor.value.set(v));
skyFolder
  .addColor(state, "skyMidLowColor")
  .name("2. Mid-Low (Transition)")
  .onChange((v) => skyMaterial.uniforms.midLowColor.value.set(v));
skyFolder
  .addColor(state, "skyMidHighColor")
  .name("3. Mid-High (Main Sky)")
  .onChange((v) => skyMaterial.uniforms.midHighColor.value.set(v));
skyFolder
  .addColor(state, "skyZenithColor")
  .name("4. Zenith (Darkest)")
  .onChange((v) => skyMaterial.uniforms.zenithColor.value.set(v));

// Transition position controls
skyFolder
  .add(state, "skyMidLowStop", 0.0, 0.5, 0.01)
  .name("Low→Mid Transition")
  .onChange((v) => (skyMaterial.uniforms.midLowStop.value = v));
skyFolder
  .add(state, "skyMidHighStop", 0.5, 1.0, 0.01)
  .name("Mid→High Transition")
  .onChange((v) => (skyMaterial.uniforms.midHighStop.value = v));

// Dithering control to prevent banding
skyFolder
  .add(state, "skyDitherAmount", 0, 0.01, 0.0001)
  .name("Dithering (Anti-banding)")
  .onChange((v) => (skyMaterial.uniforms.ditherAmount.value = v));

skyFolder.open();

// Light Pollution folder for dual village sources
const pollutionFolder = gui.addFolder("Light Pollution (2 Villages)");
enhanceGuiWithReset(pollutionFolder);

// Near Village (NW-N, ~250m)
const village1Sub = pollutionFolder.addFolder("Near Village (NW, 250m)");
enhanceGuiWithReset(village1Sub);
village1Sub
  .add(state, "village1Azimuth", -180, 180, 1)
  .name("Direction (°)")
  .onChange((v) => {
    const rad = (v * Math.PI) / 180;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
  });
village1Sub
  .add(state, "village1Intensity", 0, 0.5, 0.01)
  .name("Intensity")
  .onChange((v) => (skyMaterial.uniforms.village1Intensity.value = v));
village1Sub
  .add(state, "village1Spread", 30, 120, 1)
  .name("Spread (°)")
  .onChange((v) => (skyMaterial.uniforms.village1Spread.value = (v * Math.PI) / 180));
village1Sub
  .add(state, "village1Height", 0, 0.5, 0.01)
  .name("Max Height")
  .onChange((v) => (skyMaterial.uniforms.village1Height.value = v));

// Distant Village (SE, ~2km)
const village2Sub = pollutionFolder.addFolder("Distant Village (SE, 2km)");
enhanceGuiWithReset(village2Sub);
village2Sub
  .add(state, "village2Azimuth", -180, 180, 1)
  .name("Direction (°)")
  .onChange((v) => {
    const rad = (v * Math.PI) / 180;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
  });
village2Sub
  .add(state, "village2Intensity", 0, 0.2, 0.01)
  .name("Intensity")
  .onChange((v) => (skyMaterial.uniforms.village2Intensity.value = v));
village2Sub
  .add(state, "village2Spread", 30, 120, 1)
  .name("Spread (°)")
  .onChange((v) => (skyMaterial.uniforms.village2Spread.value = (v * Math.PI) / 180));
village2Sub
  .add(state, "village2Height", 0, 0.5, 0.01)
  .name("Max Height")
  .onChange((v) => (skyMaterial.uniforms.village2Height.value = v));

// Pollution color (shared by both sources)
pollutionFolder
  .addColor(state, "pollutionColor")
  .name("Glow Color")
  .onChange((v) => {
    // Need to update the shader - for now this won't work as color is hardcoded
    console.log("Note: Pollution color needs shader uniform to be functional");
  });

pollutionFolder.open();
village1Sub.open();

// Rendering folder
const renderFolder = gui.addFolder("Rendering");
enhanceGuiWithReset(renderFolder); // Enable double-click reset for this folder
renderFolder
  .add(state, "exposure", 0.3, 3.0, 0.01)
  .name("Exposure")
  .onChange((v) => (renderer.toneMappingExposure = v));
renderFolder.open();

// Environment folder
const envFolder = gui.addFolder("Environment");
enhanceGuiWithReset(envFolder); // Enable double-click reset for this folder
envFolder
  .add(state, "envIntensity", 0, 1, 0.01)
  .name("Env Intensity")
  .onChange((v) => setEnvIntensity(scene, v));
envFolder
  .add(state, "hdri", {
    "Dikhololo Night": "dikhololo_night",
    "Moonless Golf": "moonless_golf",
    "Satara Night": "satara_night",
  })
  .name("HDRI (Lighting)")
  .onChange((v) => {
    HDRI_CHOICE = v;
    loadHDRI(v);
  });
envFolder.open();

// Ground texture folder
const groundFolder = gui.addFolder("Ground Texture");
enhanceGuiWithReset(groundFolder); // Enable double-click reset for this folder
groundFolder
  .add(state, "groundTiling", 16, 128, 1)
  .name("Tiling Amount")
  .onChange((v) => {
    grassColorTex.repeat.set(v, v);
    grassNormalTex.repeat.set(v, v);
    console.log(`Ground tiling: ${v}x${v} (${(500/v).toFixed(1)}m per tile, ${(1024/(500/v)*0.01).toFixed(1)}cm per pixel)`);
  })
;
groundFolder
  .add(state, "normalStrength", 0, 2, 0.01)
  .name("Bump Strength")
  .onChange((v) => {
    groundMat.normalScale.set(v, v);
  })
;

// Lights folder
const lightsFolder = gui.addFolder("Lights");
enhanceGuiWithReset(lightsFolder); // Enable double-click reset for this folder
lightsFolder
  .add(state, "moonIntensity", 0, 2, 0.01)
  .name("Moon Intensity")
  .onChange((v) => (moon.intensity = v));
lightsFolder
  .add(state, "moonX", -50, 50, 0.5)
  .name("Moon X")
  .onChange((v) => (moon.position.x = v));
lightsFolder
  .add(state, "moonY", 10, 50, 0.5)
  .name("Moon Y")
  .onChange((v) => (moon.position.y = v));
lightsFolder
  .add(state, "moonZ", -50, 50, 0.5)
  .name("Moon Z")
  .onChange((v) => (moon.position.z = v));
lightsFolder
  .add(state, "hemiIntensity", 0, 1, 0.01)
  .name("Hemisphere")
  .onChange((v) => (hemi.intensity = v));
lightsFolder
  .add(state, "ambientIntensity", 0, 0.3, 0.001)
  .name("Ambient")
  .onChange((v) => (amb.intensity = v));

// Fog folder
const fogFolder = gui.addFolder("Fog");
enhanceGuiWithReset(fogFolder); // Enable double-click reset for this folder
// Add fog type selector
fogFolder
  .add(state, "fogType", ["linear", "exp2"])
  .name("Fog Type")
  .onChange((v) => {
    if (v === "exp2") {
      scene.fog = new THREE.FogExp2(state.fogColor, state.fogDensity);
      console.log("Switched to exponential fog");
    } else {
      scene.fog = new THREE.Fog(state.fogColor, 35, 90);
      console.log("Switched to linear fog");
    }
  });

// Exponential fog density control
fogFolder
  .add(state, "fogDensity", 0.010, 0.050, 0.002)
  .name("Density")
  .onChange((v) => {
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = v;
      state.fogDensity = v; // Update state
      // Log visibility distance for reference
      const visibilityMeters = Math.round(2 / v); // Rough approximation
      console.log(`Fog density: ${v.toFixed(3)} (~${visibilityMeters}m visibility)`);
    }
  });

fogFolder
  .addColor(state, "fogColor")
  .name("Color")
  .onChange((v) => scene.fog.color.set(v));

// Flashlight folder
const flashFolder = gui.addFolder("Flashlight");
enhanceGuiWithReset(flashFolder); // Enable double-click reset for this folder
flashFolder
  .add(state, "flashlightIntensity", 0, 100, 0.5) // Increased max to 100
  .name("Intensity")
  .onChange((v) => (flashlight.intensity = v));
flashFolder
  .add(state, "flashlightAngle", 5, 45, 1)
  .name("Angle (degrees)")
  .onChange((v) => (flashlight.angle = (v * Math.PI) / 180));
flashFolder
  .add(state, "flashlightPenumbra", 0, 1, 0.01)
  .name("Penumbra")
  .onChange((v) => (flashlight.penumbra = v));
flashFolder
  .add(state, "flashlightDistance", 10, 100, 1)
  .name("Distance")
  .onChange((v) => (flashlight.distance = v));
flashFolder.add(flashlight, "visible").name("Enabled");

// Shadows folder
const shadowFolder = gui.addFolder("Shadows");
enhanceGuiWithReset(shadowFolder); // Enable double-click reset for this folder
shadowFolder
  .add(state, "shadowBias", -0.005, 0.005, 0.0001)
  .name("Bias")
  .onChange((v) => (moon.shadow.bias = v));
shadowFolder
  .add(state, "shadowNormalBias", 0, 0.1, 0.001)
  .name("Normal Bias")
  .onChange((v) => (moon.shadow.normalBias = v));

// Presets button
const presetsObj = {
  resetToDefaults: () => {
    // Reset all values to their starting defaults
    state.exposure = 1.0;
    state.envIntensity = 0.25;
    state.hdri = "dikhololo_night";
    state.moonIntensity = 0.8;
    state.moonX = 12;
    state.moonY = 30;
    state.moonZ = 16;
    state.hemiIntensity = 0.25;
    state.ambientIntensity = 0.05;
    state.fogDensity = 0.030;
    state.fogType = "exp2";
    state.fogColor = "#0a0e2a";
    state.flashlightIntensity = 50;
    state.flashlightAngle = 28;
    state.flashlightPenumbra = 0.4;
    state.flashlightDistance = 45;
    state.shadowBias = -0.001;
    state.shadowNormalBias = 0.02;
    state.groundTiling = 64;
    state.normalStrength = 1.0;
    state.skyHorizonColor = "#2B1E1B";  // Warm grey-brown
    state.skyMidLowColor = "#15131C";   // Dark plum
    state.skyMidHighColor = "#0D1019";  // Deep grey-blue
    state.skyZenithColor = "#060B14";   // Very dark indigo
    state.skyMidLowStop = 0.25;
    state.skyMidHighStop = 0.60;
    state.village1Azimuth = -45;
    state.village1Intensity = 0.20;
    state.village1Spread = 90;
    state.village1Height = 0.4;
    state.village2Azimuth = 135;
    state.village2Intensity = 0.1;
    state.village2Spread = 50;
    state.village2Height = 0.25;
    state.skyDitherAmount = 0.008;

    // Apply all changes
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    loadHDRI(state.hdri);
    moon.intensity = state.moonIntensity;
    moon.position.set(state.moonX, state.moonY, state.moonZ);
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;
    if (state.fogType === "exp2") {
      scene.fog = new THREE.FogExp2(state.fogColor, state.fogDensity);
    } else {
      scene.fog = new THREE.Fog(state.fogColor, 35, 90);
    }
    flashlight.intensity = state.flashlightIntensity;
    flashlight.angle = (state.flashlightAngle * Math.PI) / 180;
    flashlight.penumbra = state.flashlightPenumbra;
    flashlight.distance = state.flashlightDistance;
    moon.shadow.bias = state.shadowBias;
    moon.shadow.normalBias = state.shadowNormalBias;
    grassColorTex.repeat.set(state.groundTiling, state.groundTiling);
    grassNormalTex.repeat.set(state.groundTiling, state.groundTiling);
    groundMat.normalScale.set(state.normalStrength, state.normalStrength);
    skyMaterial.uniforms.horizonColor.value.set(state.skyHorizonColor);
    skyMaterial.uniforms.midLowColor.value.set(state.skyMidLowColor);
    skyMaterial.uniforms.midHighColor.value.set(state.skyMidHighColor);
    skyMaterial.uniforms.zenithColor.value.set(state.skyZenithColor);
    skyMaterial.uniforms.midLowStop.value = state.skyMidLowStop;
    skyMaterial.uniforms.midHighStop.value = state.skyMidHighStop;
    // Update village light pollution
    let rad = (state.village1Azimuth * Math.PI) / 180;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village1Intensity.value = state.village1Intensity;
    skyMaterial.uniforms.village1Spread.value = (state.village1Spread * Math.PI) / 180;
    skyMaterial.uniforms.village1Height.value = state.village1Height;
    rad = (state.village2Azimuth * Math.PI) / 180;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village2Intensity.value = state.village2Intensity;
    skyMaterial.uniforms.village2Spread.value = (state.village2Spread * Math.PI) / 180;
    skyMaterial.uniforms.village2Height.value = state.village2Height;
    skyMaterial.uniforms.ditherAmount.value = state.skyDitherAmount;

    // Update GUI to reflect changes
    gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());

    console.log("✓ Reset all values to defaults");
  },

  brightTest: () => {
    // Preset for testing visibility
    state.exposure = 1.5;
    state.envIntensity = 0.3;
    state.moonIntensity = 1.2;
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
    console.log("✓ Applied bright test preset");
  },

  horrorDark: () => {
    // Preset for maximum horror atmosphere
    state.exposure = 0.8;
    state.envIntensity = 0.08;
    state.moonIntensity = 0.5;
    state.fogDensity = 0.040; // Denser fog for horror
    state.fogType = "exp2";
    // Darker, more oppressive sky colors
    state.skyHorizonColor = "#0A0807";  // Almost black with hint of brown
    state.skyMidLowColor = "#080709";   // Very dark grey
    state.skyMidHighColor = "#050608";  // Darker grey-blue
    state.skyZenithColor = "#020304";   // Nearly black
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = state.fogDensity;
    }
    skyMaterial.uniforms.horizonColor.value.set(state.skyHorizonColor);
    skyMaterial.uniforms.midLowColor.value.set(state.skyMidLowColor);
    skyMaterial.uniforms.midHighColor.value.set(state.skyMidHighColor);
    skyMaterial.uniforms.zenithColor.value.set(state.skyZenithColor);
    gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
    console.log("✓ Applied horror dark preset");
  },

  realisticNight: () => {
    // Preset for realistic 10-11pm night sky
    state.skyHorizonColor = "#2B1E1B";  // Warm grey-brown (light pollution)
    state.skyMidLowColor = "#15131C";   // Dark plum (transition)
    state.skyMidHighColor = "#0D1019";  // Deep grey-blue
    state.skyZenithColor = "#060B14";   // Very dark indigo
    state.skyMidLowStop = 0.25;         // Natural transition points
    state.skyMidHighStop = 0.60;
    state.fogDensity = 0.030;           // Moderate fog
    state.exposure = 1.0;
    state.envIntensity = 0.15;
    skyMaterial.uniforms.horizonColor.value.set(state.skyHorizonColor);
    skyMaterial.uniforms.midLowColor.value.set(state.skyMidLowColor);
    skyMaterial.uniforms.midHighColor.value.set(state.skyMidHighColor);
    skyMaterial.uniforms.zenithColor.value.set(state.skyZenithColor);
    skyMaterial.uniforms.midLowStop.value = state.skyMidLowStop;
    skyMaterial.uniforms.midHighStop.value = state.skyMidHighStop;
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = state.fogDensity;
    }
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
    console.log("✓ Applied realistic night preset");
  },
};

const presetsFolder = gui.addFolder("Presets");
presetsFolder.add(presetsObj, "resetToDefaults").name("Reset to Defaults");
presetsFolder.add(presetsObj, "brightTest").name("Bright (Testing)");
presetsFolder.add(presetsObj, "horrorDark").name("Horror Dark");
presetsFolder.add(presetsObj, "realisticNight").name("Realistic Night");
presetsFolder.open();

// =============== KEYBOARD CONTROLS (keeping for backwards compatibility)
window.addEventListener("keydown", (e) => {
  // Flashlight toggle
  if (e.key.toLowerCase() === "f") {
    flashlight.visible = !flashlight.visible;
    // Update GUI to reflect change
    gui.controllersRecursive().forEach((controller) => {
      if (
        controller.property === "visible" &&
        controller.object === flashlight
      ) {
        controller.updateDisplay();
      }
    });
  }

  // Exposure controls (German keyboard) - still work but GUI is better!
  if (e.key === "ü") {
    state.exposure = Math.min(3.0, state.exposure * 1.06);
    renderer.toneMappingExposure = state.exposure;
    gui.controllersRecursive().forEach((controller) => {
      if (controller.property === "exposure") controller.updateDisplay();
    });
    console.log("Exposure increased to:", state.exposure.toFixed(2));
  }
  if (e.key === "ä") {
    state.exposure = Math.max(0.3, state.exposure / 1.06);
    renderer.toneMappingExposure = state.exposure;
    gui.controllersRecursive().forEach((controller) => {
      if (controller.property === "exposure") controller.updateDisplay();
    });
    console.log("Exposure decreased to:", state.exposure.toFixed(2));
  }

  // Quick HDRI intensity test (+ and - keys) - still work but GUI is better!
  if (e.key === "+") {
    state.envIntensity = Math.min(1.0, state.envIntensity + 0.05);
    setEnvIntensity(scene, state.envIntensity);
    gui.controllersRecursive().forEach((controller) => {
      if (controller.property === "envIntensity") controller.updateDisplay();
    });
  }
  if (e.key === "-") {
    state.envIntensity = Math.max(0.0, state.envIntensity - 0.05);
    setEnvIntensity(scene, state.envIntensity);
    gui.controllersRecursive().forEach((controller) => {
      if (controller.property === "envIntensity") controller.updateDisplay();
    });
  }
});

// =============== RESIZE
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =============== LOOP
const tmpDir = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);

  // Update camera rotation from mouse look
  updateCameraRotation();

  // IMPORTANT: Skydome follows camera completely now that shader is fixed!
  // The eye-ray calculation in the shader handles horizon alignment properly
  skydome.position.copy(camera.position);

  // Attach flashlight to camera
  if (flashlight.visible) {
    flashlight.position.copy(camera.position);
    camera.getWorldDirection(tmpDir).normalize();
    flashlight.target.position
      .copy(camera.position)
      .add(tmpDir.multiplyScalar(10));
  }

  renderer.render(scene, camera);
}
animate();

// Start message
console.log("🌌 Night Scene with Dual Light Pollution Sources");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🖱️ CLICK to capture mouse, ESC to release");
console.log("✨ Two village light sources implemented:");
console.log("  • Near village (NW, ~250m): Noticeable warm glow");
console.log("  • Distant village (SE, ~2km): Very subtle glow");
console.log("🎮 Full GUI controls for both sources");
console.log("📐 Directions: -45° (NW) and 135° (SE)");
console.log("🎨 Adjust everything in real-time via GUI");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");