// main.js - Refactored with modular architecture
// --------------------------------------------------
import GUI from 'lil-gui';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Import our new modules
import { SCENE_CONSTANTS, DEG2RAD, DEFAULTS } from './config/Constants.js';
import { createEngine } from './core/Engine.js';
import { createAtmosphere } from './atmosphere/Atmosphere.js';
import { createWorld } from './world/World.js';

// Constants now imported from ./config/Constants.js

// =============== HDRI SELECTION (easy to switch!)
// Options: 'moonless_golf', 'dikhololo_night', 'satara_night'
let HDRI_CHOICE = 'dikhololo_night'; // Beautiful stars, good for testing
let CURRENT_ENV_INTENSITY = 0.25; // Increased for better object visibility with moonless_golf

// =============== CREATE ENGINE
// Initialize core Three.js components
const { scene, renderer, camera, clock, onResize } = createEngine(SCENE_CONSTANTS);

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
  yaw += movementX * mouseSensitivity; // Fixed: was inverted
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

// =============== ATMOSPHERE (Sky + Stars)
// Create the complete atmosphere system
const atmosphere = createAtmosphere({
  scene,
  renderer,
  camera,
  constants: SCENE_CONSTANTS,
  defaults: DEFAULTS
});

// Extract the objects we need for GUI controls
const { skydome, skyMaterial, stars } = atmosphere;

// REMOVED: ~400 lines of sky and star code moved to Atmosphere module
// The following was extracted:
// - Sky vertex and fragment shaders
// - Skydome creation and material
// - Star geometry generation
// - Star vertex and fragment shaders
// - Star system creation

// =============== WORLD (Fog, Lights, Ground, Objects)
// Create the physical world elements
const world = createWorld({
  scene,
  constants: SCENE_CONSTANTS,
  defaults: DEFAULTS
});

// Extract the objects we need for GUI controls
let { fog } = world;  // Let because we might reassign it when changing fog type
const { lights, ground, groundMat, textures, flashlight } = world;
const { moon, hemi, amb } = lights;
const { grassColorTex, grassNormalTex } = textures;

// REMOVED: ~200 lines of world code moved to World module
// The following was extracted:
// - Fog setup (FogExp2)
// - Three light sources (moon, hemisphere, ambient)
// - Ground plane with grass textures
// - Test objects (tombstones, trees, posts, sphere)
// - Flashlight (SpotLight)

// =============== IMAGE-BASED LIGHTING (Step 2: Night HDRI)
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

// FIX: In r179, must set envMap directly on materials for intensity to work!

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

      // Remove any fallback lighting if HDRI loads successfully
      const fallbackLight = scene.getObjectByName('HDRI_Fallback_Light');
      if (fallbackLight) {
        scene.remove(fallbackLight);
      }

      console.log(`✓ Loaded HDRI for lighting: ${hdriName}`);
    },
    (progress) => {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
      // Loading HDRI...
    },
    (error) => {
      console.error('Failed to load HDRI:', error);
      console.log('Applying fallback lighting to prevent black scene');

      // Apply basic fallback lighting so scene isn't completely dark
      const fallbackAmbient = new THREE.AmbientLight(0x404050, 0.3);
      fallbackAmbient.name = 'HDRI_Fallback_Light';

      // Remove any previous fallback lights
      const existingFallback = scene.getObjectByName('HDRI_Fallback_Light');
      if (existingFallback) {
        scene.remove(existingFallback);
      }

      scene.add(fallbackAmbient);
    }
  );
}

// Load initial HDRI
loadHDRI(HDRI_CHOICE);

function applyEnvMapToMaterials(root, envMap, intensity) {
  CURRENT_ENV_INTENSITY = intensity;
  let count = 0;

  root.traverse((obj) => {
    if (obj.isMesh && obj.material) {
      if ('envMapIntensity' in obj.material) {
        // Critical fix: Must set envMap on material in r179!
        obj.material.envMap = envMap;
        obj.material.envMapIntensity = intensity;
        obj.material.needsUpdate = true; // Force shader rebuild
        count++;
      }
    }
  });

  // Applied envMap to materials
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

  // Environment intensity updated
}

// =============== GUI SETUP (Step 3: Developer Panel)
const gui = new GUI();

// Defaults now imported from ./config/Constants.js

// State object initialized from defaults
const state = { ...DEFAULTS };

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
    // Reset property to default value
  });
}

// Wrapper to automatically add double-click reset to all controllers
function enhanceGuiWithReset(guiOrFolder) {
  const originalAdd = guiOrFolder.add.bind(guiOrFolder);

  guiOrFolder.add = function (object, property, ...args) {
    const controller = originalAdd(object, property, ...args);

    // Check if we have a default value for this property
    if (DEFAULTS.hasOwnProperty(property)) {
      addDblClickReset(controller, DEFAULTS[property]);
    }

    return controller;
  };

  // Also wrap addColor method
  if (guiOrFolder.addColor) {
    const originalAddColor = guiOrFolder.addColor.bind(guiOrFolder);
    guiOrFolder.addColor = function (object, property) {
      const controller = originalAddColor(object, property);
      if (DEFAULTS.hasOwnProperty(property)) {
        addDblClickReset(controller, DEFAULTS[property]);
      }
      return controller;
    };
  }
}

// Apply the enhancement to the main GUI and all folders
enhanceGuiWithReset(gui);

// NEW: Sky folder for 4-stop gradient controls
const skyFolder = gui.addFolder('Sky Gradient (4 Colors)');
enhanceGuiWithReset(skyFolder);

// Color controls - from bottom to top
skyFolder
  .addColor(state, 'skyHorizonColor')
  .name('1. Horizon (Light Pollution)')
  .onChange((v) => skyMaterial.uniforms.horizonColor.value.set(v));
skyFolder
  .addColor(state, 'skyMidLowColor')
  .name('2. Mid-Low (Transition)')
  .onChange((v) => skyMaterial.uniforms.midLowColor.value.set(v));
skyFolder
  .addColor(state, 'skyMidHighColor')
  .name('3. Mid-High (Main Sky)')
  .onChange((v) => skyMaterial.uniforms.midHighColor.value.set(v));
skyFolder
  .addColor(state, 'skyZenithColor')
  .name('4. Zenith (Darkest)')
  .onChange((v) => skyMaterial.uniforms.zenithColor.value.set(v));

// Transition position controls
skyFolder
  .add(state, 'skyMidLowStop', 0.0, 0.5, 0.01)
  .name('Low→Mid Transition')
  .onChange((v) => (skyMaterial.uniforms.midLowStop.value = v));
skyFolder
  .add(state, 'skyMidHighStop', 0.5, 1.0, 0.01)
  .name('Mid→High Transition')
  .onChange((v) => (skyMaterial.uniforms.midHighStop.value = v));

// Dithering control to prevent banding
skyFolder
  .add(state, 'skyDitherAmount', 0, 0.01, 0.0001)
  .name('Dithering (Anti-banding)')
  .onChange((v) => (skyMaterial.uniforms.ditherAmount.value = v));

// skyFolder.open(); // Start collapsed

// THREE.Points Star System controls
const starsFolder = gui.addFolder('Stars (THREE.Points)');
enhanceGuiWithReset(starsFolder);

starsFolder
  .add(state, 'starEnabled')
  .name('Enable Stars')
  .onChange((v) => {
    stars.visible = v;
  });

starsFolder
  .add(state, 'starCount', 1000, 10000, 100)
  .name('Star Count')
  .onChange((v) => {
    // Regenerate star geometry with new count
    atmosphere.regenerateStars(v);
  });

starsFolder
  .add(state, 'starBrightness', 0, 3, 0.01)
  .name('Brightness')
  .onChange((v) => {
    atmosphere.setStarBrightness(v);
  });

starsFolder
  .add(state, 'starSizeMin', 0.5, 5, 0.1)
  .name('Min Size')
  .onChange((v) => {
    atmosphere.setStarSizeMin(v);
  });

starsFolder
  .add(state, 'starSizeMax', 2, 15, 0.1)
  .name('Max Size')
  .onChange((v) => {
    atmosphere.setStarSizeMax(v);
  });

starsFolder
  .add(state, 'starHorizonFade', 0, 0.5, 0.01)
  .name('Horizon Fade')
  .onChange((v) => {
    atmosphere.setStarHorizonFade(v);
  });

starsFolder
  .add(state, 'starAntiAlias')
  .name('Anti-Aliasing')
  .onChange((v) => {
    atmosphere.setStarAntiAlias(v);
  });

starsFolder
  .addColor(state, 'starTint')
  .name('Star Tint')
  .onChange((v) => {
    atmosphere.setStarTintColor(v);
  });

// starsFolder.open(); // Start collapsed

// Light Pollution folder for dual village sources
const pollutionFolder = gui.addFolder('Light Pollution (2 Villages)');
enhanceGuiWithReset(pollutionFolder);

// Near Village (NW-N, ~250m)
const village1Sub = pollutionFolder.addFolder('Near Village (NW, 250m)');
enhanceGuiWithReset(village1Sub);
village1Sub
  .add(state, 'village1Azimuth', -180, 180, 1)
  .name('Direction (°)')
  .onChange((v) => {
    const rad = v * DEG2RAD;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
  });
village1Sub
  .add(state, 'village1Intensity', 0, 0.5, 0.01)
  .name('Intensity')
  .onChange((v) => (skyMaterial.uniforms.village1Intensity.value = v));
village1Sub
  .add(state, 'village1Spread', 30, 120, 1)
  .name('Spread (°)')
  .onChange((v) => (skyMaterial.uniforms.village1Spread.value = v * DEG2RAD));
village1Sub
  .add(state, 'village1Height', 0, 0.5, 0.01)
  .name('Max Height')
  .onChange((v) => (skyMaterial.uniforms.village1Height.value = v));

// Distant Village (SE, ~2km)
const village2Sub = pollutionFolder.addFolder('Distant Village (SE, 2km)');
enhanceGuiWithReset(village2Sub);
village2Sub
  .add(state, 'village2Azimuth', -180, 180, 1)
  .name('Direction (°)')
  .onChange((v) => {
    const rad = v * DEG2RAD;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
  });
village2Sub
  .add(state, 'village2Intensity', 0, 0.2, 0.01)
  .name('Intensity')
  .onChange((v) => (skyMaterial.uniforms.village2Intensity.value = v));
village2Sub
  .add(state, 'village2Spread', 30, 120, 1)
  .name('Spread (°)')
  .onChange((v) => (skyMaterial.uniforms.village2Spread.value = v * DEG2RAD));
village2Sub
  .add(state, 'village2Height', 0, 0.5, 0.01)
  .name('Max Height')
  .onChange((v) => (skyMaterial.uniforms.village2Height.value = v));

// Pollution color (shared by both sources)
pollutionFolder
  .addColor(state, 'pollutionColor')
  .name('Glow Color')
  .onChange((v) => {
    skyMaterial.uniforms.pollutionColor.value.set(v);
  });

// pollutionFolder.open(); // Start collapsed
// village1Sub.open(); // Start collapsed

// Horror Tuning folder
const horrorFolder = gui.addFolder('Horror Tuning');
enhanceGuiWithReset(horrorFolder);

horrorFolder
  .add(state, 'horrorEnabled')
  .name('Enable Horror Mode')
  .onChange((v) => {
    skyMaterial.uniforms.u_horrorEnabled.value = v ? 1.0 : 0.0;
  });

horrorFolder
  .add(state, 'horrorDesat', 0.0, 1.0, 0.01)
  .name('Desaturation')
  .onChange((v) => {
    skyMaterial.uniforms.u_desat.value = v;
  });

horrorFolder
  .add(state, 'horrorGreenTint', 0.0, 0.5, 0.01)
  .name('Green Tint')
  .onChange((v) => {
    skyMaterial.uniforms.u_greenTint.value = v;
  });

horrorFolder
  .add(state, 'horrorContrast', -0.5, 0.5, 0.01)
  .name('Contrast')
  .onChange((v) => {
    skyMaterial.uniforms.u_contrast.value = v;
  });

horrorFolder
  .add(state, 'horrorVignette', 0.0, 0.6, 0.01)
  .name('Vignette')
  .onChange((v) => {
    skyMaterial.uniforms.u_vignette.value = v;
  });

horrorFolder
  .add(state, 'horrorBreatheAmp', 0.0, 0.02, 0.001)
  .name('Breathing Amp')
  .onChange((v) => {
    skyMaterial.uniforms.u_breatheAmp.value = v;
  });

horrorFolder
  .add(state, 'horrorBreatheSpeed', 0.0, 1.0, 0.01)
  .name('Breathing Speed')
  .onChange((v) => {
    skyMaterial.uniforms.u_breatheSpeed.value = v;
  });

// horrorFolder.open(); // Start collapsed

// Rendering folder
const renderFolder = gui.addFolder('Rendering');
enhanceGuiWithReset(renderFolder); // Enable double-click reset for this folder
renderFolder
  .add(state, 'exposure', 0.3, 3.0, 0.01)
  .name('Exposure')
  .onChange((v) => (renderer.toneMappingExposure = v));
// renderFolder.open(); // Start collapsed

// Environment folder
const envFolder = gui.addFolder('Environment');
enhanceGuiWithReset(envFolder); // Enable double-click reset for this folder
envFolder
  .add(state, 'envIntensity', 0, 1, 0.01)
  .name('Env Intensity')
  .onChange((v) => setEnvIntensity(scene, v));
envFolder
  .add(state, 'hdri', {
    'Dikhololo Night': 'dikhololo_night',
    'Moonless Golf': 'moonless_golf',
    'Satara Night': 'satara_night',
  })
  .name('HDRI (Lighting)')
  .onChange((v) => {
    HDRI_CHOICE = v;
    loadHDRI(v);
  });
// envFolder.open(); // Start collapsed

// Ground texture folder
const groundFolder = gui.addFolder('Ground Texture');
enhanceGuiWithReset(groundFolder); // Enable double-click reset for this folder
groundFolder
  .add(state, 'groundTiling', 16, 128, 1)
  .name('Tiling Amount')
  .onChange((v) => {
    grassColorTex.repeat.set(v, v);
    grassNormalTex.repeat.set(v, v);
    // Ground tiling updated
  });
groundFolder
  .add(state, 'normalStrength', 0, 2, 0.01)
  .name('Bump Strength')
  .onChange((v) => {
    groundMat.normalScale.set(v, v);
  });

// Lights folder
const lightsFolder = gui.addFolder('Lights');
enhanceGuiWithReset(lightsFolder); // Enable double-click reset for this folder
lightsFolder
  .add(state, 'moonIntensity', 0, 2, 0.01)
  .name('Moon Intensity')
  .onChange((v) => (moon.intensity = v));
lightsFolder
  .add(state, 'moonX', -50, 50, 0.5)
  .name('Moon X')
  .onChange((v) => (moon.position.x = v));
lightsFolder
  .add(state, 'moonY', 10, 50, 0.5)
  .name('Moon Y')
  .onChange((v) => (moon.position.y = v));
lightsFolder
  .add(state, 'moonZ', -50, 50, 0.5)
  .name('Moon Z')
  .onChange((v) => (moon.position.z = v));
lightsFolder
  .add(state, 'hemiIntensity', 0, 1, 0.01)
  .name('Hemisphere')
  .onChange((v) => (hemi.intensity = v));
lightsFolder
  .add(state, 'ambientIntensity', 0, 0.3, 0.001)
  .name('Ambient')
  .onChange((v) => (amb.intensity = v));

// Fog folder
const fogFolder = gui.addFolder('Fog');
enhanceGuiWithReset(fogFolder); // Enable double-click reset for this folder
// Add fog type selector
fogFolder
  .add(state, 'fogType', ['linear', 'exp2'])
  .name('Fog Type')
  .onChange((v) => {
    if (v === 'exp2') {
      fog = scene.fog = new THREE.FogExp2(state.fogColor, state.fogDensity);
      // Switched to exponential fog
    } else {
      fog = scene.fog = new THREE.Fog(state.fogColor, 35, 90);
      // Switched to linear fog
    }
  });

// Exponential fog density control
fogFolder
  .add(state, 'fogDensity', 0.01, 0.05, 0.002)
  .name('Density')
  .onChange((v) => {
    if (fog instanceof THREE.FogExp2) {
      fog.density = v;
      state.fogDensity = v; // Update state
      atmosphere.setFogDensity(v); // Update both sky and star fog density
      // Log visibility distance for reference
      const visibilityMeters = Math.round(2 / v); // Rough approximation
      // Fog density updated
    }
  });

fogFolder
  .addColor(state, 'fogColor')
  .name('Color')
  .onChange((v) => {
    fog.color.set(v);
    skyMaterial.uniforms.fogColor.value.set(v); // Update skydome fog color too
  });

fogFolder
  .add(state, 'fogMax', 0.5, 1.0, 0.01)
  .name('Sky Fog Max')
  .onChange((v) => {
    skyMaterial.uniforms.fogMax.value = v; // Control maximum fog opacity at horizon
  });

// Flashlight folder
const flashFolder = gui.addFolder('Flashlight');
enhanceGuiWithReset(flashFolder); // Enable double-click reset for this folder
flashFolder
  .add(state, 'flashlightIntensity', 0, 100, 0.5) // Increased max to 100
  .name('Intensity')
  .onChange((v) => (flashlight.intensity = v));
flashFolder
  .add(state, 'flashlightAngle', 5, 45, 1)
  .name('Angle (degrees)')
  .onChange((v) => (flashlight.angle = v * DEG2RAD));
flashFolder
  .add(state, 'flashlightPenumbra', 0, 1, 0.01)
  .name('Penumbra')
  .onChange((v) => (flashlight.penumbra = v));
flashFolder
  .add(state, 'flashlightDistance', 10, 100, 1)
  .name('Distance')
  .onChange((v) => (flashlight.distance = v));
flashFolder.add(flashlight, 'visible').name('Enabled');

// Shadows folder
const shadowFolder = gui.addFolder('Shadows');
enhanceGuiWithReset(shadowFolder); // Enable double-click reset for this folder
shadowFolder
  .add(state, 'shadowBias', -0.005, 0.005, 0.0001)
  .name('Bias')
  .onChange((v) => (moon.shadow.bias = v));
shadowFolder
  .add(state, 'shadowNormalBias', 0, 0.1, 0.001)
  .name('Normal Bias')
  .onChange((v) => (moon.shadow.normalBias = v));

// Presets button
const presetsObj = {
  resetToDefaults: () => {
    // Reset all values to their starting defaults
    state.exposure = 1.0;
    state.envIntensity = 0.25;
    state.hdri = 'dikhololo_night';
    state.moonIntensity = 0.8;
    state.moonX = 12;
    state.moonY = 30;
    state.moonZ = 16;
    state.hemiIntensity = 0.25;
    state.ambientIntensity = 0.05;
    state.fogDensity = 0.02;
    state.fogType = 'exp2';
    state.fogColor = '#141618';
    state.fogMax = 0.95;
    state.flashlightIntensity = 50;
    state.flashlightAngle = 28;
    state.flashlightPenumbra = 0.4;
    state.flashlightDistance = 45;
    state.shadowBias = -0.001;
    state.shadowNormalBias = 0.02;
    state.groundTiling = SCENE_CONSTANTS.GROUND_TILING;
    state.normalStrength = 1.0;
    state.skyHorizonColor = '#2b2822'; // USER TUNED: Warmer horizon
    state.skyMidLowColor = '#0f0e14'; // USER TUNED: Dark plum
    state.skyMidHighColor = '#080a10'; // USER TUNED: Deeper blue
    state.skyZenithColor = '#040608'; // USER TUNED: Almost black
    state.skyMidLowStop = 0.25;
    state.skyMidHighStop = 0.6;
    state.village1Azimuth = -45;
    state.village1Intensity = 0.15; // USER TUNED
    state.village1Spread = 70; // USER TUNED
    state.village1Height = 0.35; // USER TUNED
    state.village2Azimuth = 135;
    state.village2Intensity = 0.06; // USER TUNED
    state.village2Spread = 60; // USER TUNED
    state.village2Height = 0.15; // USER TUNED
    state.skyDitherAmount = 0.008;
    state.starEnabled = true;
    state.starCount = SCENE_CONSTANTS.DEFAULT_STAR_COUNT; // USER TUNED
    state.starBrightness = 1.0; // USER TUNED
    state.starSizeMin = 0.8; // USER TUNED
    state.starSizeMax = 5.0;
    state.starHorizonFade = 0.3;
    state.starAntiAlias = true;
    state.starTint = '#FFFFFF';
    state.horrorEnabled = false;
    state.horrorDesat = 0.25;
    state.horrorGreenTint = 0.12;
    state.horrorContrast = 0.12;
    state.horrorVignette = 0.35;
    state.horrorBreatheAmp = 0.0;
    state.horrorBreatheSpeed = 0.15;

    // Apply all changes
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    loadHDRI(state.hdri);
    moon.intensity = state.moonIntensity;
    moon.position.set(state.moonX, state.moonY, state.moonZ);
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;
    if (state.fogType === 'exp2') {
      fog = scene.fog = new THREE.FogExp2(state.fogColor, state.fogDensity);
    } else {
      fog = scene.fog = new THREE.Fog(state.fogColor, 35, 90);
    }
    skyMaterial.uniforms.fogDensity.value = state.fogDensity;
    skyMaterial.uniforms.fogColor.value.set(state.fogColor);
    skyMaterial.uniforms.fogMax.value = state.fogMax;
    atmosphere.setFogDensity(state.fogDensity);
    flashlight.intensity = state.flashlightIntensity;
    flashlight.angle = state.flashlightAngle * DEG2RAD;
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
    let rad = state.village1Azimuth * DEG2RAD;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village1Intensity.value = state.village1Intensity;
    skyMaterial.uniforms.village1Spread.value = state.village1Spread * DEG2RAD;
    skyMaterial.uniforms.village1Height.value = state.village1Height;
    rad = state.village2Azimuth * DEG2RAD;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village2Intensity.value = state.village2Intensity;
    skyMaterial.uniforms.village2Spread.value = state.village2Spread * DEG2RAD;
    skyMaterial.uniforms.village2Height.value = state.village2Height;
    skyMaterial.uniforms.pollutionColor.value.set(state.pollutionColor);
    skyMaterial.uniforms.ditherAmount.value = state.skyDitherAmount;
    // Apply star changes
    stars.visible = state.starEnabled;
    atmosphere.regenerateStars(state.starCount);
    atmosphere.setStarBrightness(state.starBrightness);
    atmosphere.setStarSizeMin(state.starSizeMin);
    atmosphere.setStarSizeMax(state.starSizeMax);
    atmosphere.setStarHorizonFade(state.starHorizonFade);
    atmosphere.setStarAntiAlias(state.starAntiAlias);
    atmosphere.setStarTintColor(state.starTint);

    // Apply horror settings
    skyMaterial.uniforms.u_horrorEnabled.value = state.horrorEnabled ? 1.0 : 0.0;
    skyMaterial.uniforms.u_desat.value = state.horrorDesat;
    skyMaterial.uniforms.u_greenTint.value = state.horrorGreenTint;
    skyMaterial.uniforms.u_contrast.value = state.horrorContrast;
    skyMaterial.uniforms.u_vignette.value = state.horrorVignette;
    skyMaterial.uniforms.u_breatheAmp.value = state.horrorBreatheAmp;
    skyMaterial.uniforms.u_breatheSpeed.value = state.horrorBreatheSpeed;

    // Update GUI to reflect changes
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());

    // Reset all values to defaults
  },

  userTuned: () => {
    // Your personally tuned atmospheric night scene settings
    // These values represent the carefully balanced scene you've created
    state.exposure = 1.0;
    state.envIntensity = 0.25;
    state.hdri = 'dikhololo_night';
    state.moonIntensity = 0.8;
    state.moonX = 12;
    state.moonY = 30;
    state.moonZ = 16;
    state.hemiIntensity = 0.25;
    state.ambientIntensity = 0.05;
    state.fogDensity = 0.02;
    state.fogType = 'exp2';
    state.fogColor = '#141618';
    state.fogMax = 0.95;
    state.flashlightIntensity = 50;
    state.flashlightAngle = 28;
    state.flashlightPenumbra = 0.4;
    state.flashlightDistance = 45;
    state.shadowBias = -0.001;
    state.shadowNormalBias = 0.02;
    state.groundTiling = SCENE_CONSTANTS.GROUND_TILING;
    state.normalStrength = 1.0;

    // Your tuned sky colors
    state.skyHorizonColor = '#2b2822'; // Warmer horizon
    state.skyMidLowColor = '#0f0e14'; // Dark plum
    state.skyMidHighColor = '#080a10'; // Deeper blue
    state.skyZenithColor = '#040608'; // Almost black
    state.skyMidLowStop = 0.25;
    state.skyMidHighStop = 0.6;

    // Your tuned light pollution
    state.village1Azimuth = -45;
    state.village1Intensity = 0.15;
    state.village1Spread = 70;
    state.village1Height = 0.35;
    state.village2Azimuth = 135;
    state.village2Intensity = 0.06;
    state.village2Spread = 60;
    state.village2Height = 0.15;
    state.pollutionColor = '#3D2F28';

    // Dithering and stars
    state.skyDitherAmount = 0.008;
    state.starEnabled = true;
    state.starCount = SCENE_CONSTANTS.DEFAULT_STAR_COUNT;
    state.starBrightness = 1.0;
    state.starSizeMin = 0.8;
    state.starSizeMax = 5.0;
    state.starHorizonFade = 0.3;
    state.starAntiAlias = true;

    // Apply all settings
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    loadHDRI(state.hdri);
    moon.intensity = state.moonIntensity;
    moon.position.set(state.moonX, state.moonY, state.moonZ);
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;
    if (state.fogType === 'exp2') {
      fog = scene.fog = new THREE.FogExp2(state.fogColor, state.fogDensity);
    } else {
      fog = scene.fog = new THREE.Fog(state.fogColor, 35, 90);
    }
    skyMaterial.uniforms.fogDensity.value = state.fogDensity;
    skyMaterial.uniforms.fogColor.value.set(state.fogColor);
    skyMaterial.uniforms.fogMax.value = state.fogMax;
    atmosphere.setFogDensity(state.fogDensity);
    flashlight.intensity = state.flashlightIntensity;
    flashlight.angle = state.flashlightAngle * DEG2RAD;
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
    let rad = state.village1Azimuth * DEG2RAD;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village1Intensity.value = state.village1Intensity;
    skyMaterial.uniforms.village1Spread.value = state.village1Spread * DEG2RAD;
    skyMaterial.uniforms.village1Height.value = state.village1Height;
    rad = state.village2Azimuth * DEG2RAD;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village2Intensity.value = state.village2Intensity;
    skyMaterial.uniforms.village2Spread.value = state.village2Spread * DEG2RAD;
    skyMaterial.uniforms.village2Height.value = state.village2Height;
    skyMaterial.uniforms.pollutionColor.value.set(state.pollutionColor);
    skyMaterial.uniforms.ditherAmount.value = state.skyDitherAmount;

    // Apply star changes
    stars.visible = state.starEnabled;
    atmosphere.regenerateStars(state.starCount);
    atmosphere.setStarBrightness(state.starBrightness);
    atmosphere.setStarSizeMin(state.starSizeMin);
    atmosphere.setStarSizeMax(state.starSizeMax);
    atmosphere.setStarHorizonFade(state.starHorizonFade);
    atmosphere.setStarAntiAlias(state.starAntiAlias);

    // Update GUI to reflect changes
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    console.log('✓ Applied User Tuned preset - Your personal atmospheric settings');
  },

  brightTest: () => {
    // Testing preset - User Tuned settings but brighter for visibility testing
    // First apply user tuned as base
    presetsObj.userTuned();

    // Then brighten key values
    state.exposure = 1.5;
    state.envIntensity = 0.35;
    state.hdri = 'dikhololo_night'; // Brightest HDRI
    state.moonIntensity = 1.2;
    state.hemiIntensity = 0.35;
    state.ambientIntensity = 0.08;
    state.fogDensity = 0.02; // Less fog for better visibility
    state.starBrightness = 1.2;

    // Apply the brightened values
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    loadHDRI(state.hdri);
    moon.intensity = state.moonIntensity;
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;
    if (fog instanceof THREE.FogExp2) {
      fog.density = state.fogDensity;
      skyMaterial.uniforms.fogDensity.value = state.fogDensity;
      atmosphere.setStarFogDensity(state.fogDensity);
    }
    atmosphere.setStarBrightness(state.starBrightness);

    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    console.log('✓ Applied Bright Test preset - Enhanced visibility for testing');
  },

  exportCurrentSettings: () => {
    // Export current settings to clipboard as JSON
    const settings = { ...state };
    const json = JSON.stringify(settings, null, 2);

    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(json)
        .then(() => {
          console.log('✅ Settings copied to clipboard!');
          console.log('You can now paste this JSON anywhere to save your custom preset.');
        })
        .catch((err) => {
          console.error('Failed to copy to clipboard:', err);
          console.log('Settings JSON (copy manually):', json);
        });
    } else {
      // Fallback for older browsers or non-HTTPS
      console.log('📋 Settings JSON (copy this manually):');
      console.log(json);
    }

    // Also provide as downloadable file
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `horror-game-preset-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    console.log('📥 Settings also downloaded as JSON file');
  },

  horrorAtmosphere: () => {
    // Horror Atmosphere preset based on GPT-5 recommendations
    // Creates unsettling atmosphere with desaturated green-grey tones

    // Sky colors - desaturated with greenish tint
    state.skyHorizonColor = '#2A241F'; // Warm dirty brown
    state.skyMidLowColor = '#171A16'; // Greenish charcoal
    state.skyMidHighColor = '#0B1110'; // Deep sickly teal-grey
    state.skyZenithColor = '#060B0A'; // Very dark green-blue
    state.skyMidLowStop = 0.26;
    state.skyMidHighStop = 0.62;

    // Fog - greenish and denser for 50-60m visibility
    state.fogColor = '#0F1512'; // Greenish charcoal
    state.fogDensity = 0.035; // ~50-60m visibility
    state.fogMax = 0.93;

    // Lighting - darker overall
    state.exposure = 0.9;
    state.envIntensity = 0.12;
    state.moonIntensity = 0.6;
    state.hemiIntensity = 0.2;
    state.ambientIntensity = 0.04;

    // Light pollution - reduced with dirty sodium color
    state.pollutionColor = '#3A2E26';
    state.village1Intensity = 0.12;
    state.village1Spread = 80;
    state.village1Height = 0.3;
    state.village2Intensity = 0.05;
    state.village2Spread = 65;
    state.village2Height = 0.12;

    // Stars - dimmer with greenish tint
    state.starBrightness = 0.65;
    state.starSizeMin = 0.9;
    state.starSizeMax = 4.5;
    state.starHorizonFade = 0.28;
    state.starTint = '#E6FFF0'; // Slight green-white tint

    // Horror grading - ENABLED
    state.horrorEnabled = true;
    state.horrorDesat = 0.28; // More desaturation
    state.horrorGreenTint = 0.14; // Subtle green bias
    state.horrorContrast = 0.12; // Slight contrast boost
    state.horrorVignette = 0.3; // Moderate vignette
    state.horrorBreatheAmp = 0.0; // Keep breathing off by default
    state.horrorBreatheSpeed = 0.15;

    // Apply all settings
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    hemi.intensity = state.hemiIntensity;
    amb.intensity = state.ambientIntensity;

    fog.color.set(state.fogColor);
    if (fog instanceof THREE.FogExp2) {
      fog.density = state.fogDensity;
    }
    skyMaterial.uniforms.fogColor.value.set(state.fogColor);
    skyMaterial.uniforms.fogDensity.value = state.fogDensity;
    skyMaterial.uniforms.fogMax.value = state.fogMax;
    atmosphere.setStarFogDensity(state.fogDensity);

    // Apply sky colors
    skyMaterial.uniforms.horizonColor.value.set(state.skyHorizonColor);
    skyMaterial.uniforms.midLowColor.value.set(state.skyMidLowColor);
    skyMaterial.uniforms.midHighColor.value.set(state.skyMidHighColor);
    skyMaterial.uniforms.zenithColor.value.set(state.skyZenithColor);
    skyMaterial.uniforms.midLowStop.value = state.skyMidLowStop;
    skyMaterial.uniforms.midHighStop.value = state.skyMidHighStop;

    // Apply light pollution
    skyMaterial.uniforms.pollutionColor.value.set(state.pollutionColor);
    let rad = state.village1Azimuth * DEG2RAD;
    skyMaterial.uniforms.village1Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village1Intensity.value = state.village1Intensity;
    skyMaterial.uniforms.village1Spread.value = state.village1Spread * DEG2RAD;
    skyMaterial.uniforms.village1Height.value = state.village1Height;
    rad = state.village2Azimuth * DEG2RAD;
    skyMaterial.uniforms.village2Dir.value.set(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    skyMaterial.uniforms.village2Intensity.value = state.village2Intensity;
    skyMaterial.uniforms.village2Spread.value = state.village2Spread * DEG2RAD;
    skyMaterial.uniforms.village2Height.value = state.village2Height;

    // Apply star settings
    atmosphere.setStarBrightness(state.starBrightness);
    atmosphere.setStarSizeMin(state.starSizeMin);
    atmosphere.setStarSizeMax(state.starSizeMax);
    atmosphere.setStarHorizonFade(state.starHorizonFade);
    atmosphere.setStarTintColor(state.starTint);

    // Apply horror grading
    skyMaterial.uniforms.u_horrorEnabled.value = state.horrorEnabled ? 1.0 : 0.0;
    skyMaterial.uniforms.u_desat.value = state.horrorDesat;
    skyMaterial.uniforms.u_greenTint.value = state.horrorGreenTint;
    skyMaterial.uniforms.u_contrast.value = state.horrorContrast;
    skyMaterial.uniforms.u_vignette.value = state.horrorVignette;
    skyMaterial.uniforms.u_breatheAmp.value = state.horrorBreatheAmp;
    skyMaterial.uniforms.u_breatheSpeed.value = state.horrorBreatheSpeed;

    // Update GUI
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
    console.log(
      '🎭 Applied Horror Atmosphere preset - Unsettling green-grey tones with 50-60m visibility'
    );
  },
};

const presetsFolder = gui.addFolder('Presets');
presetsFolder.add(presetsObj, 'resetToDefaults').name('Reset to Defaults');
presetsFolder.add(presetsObj, 'userTuned').name('User Tuned (Normal)');
presetsFolder.add(presetsObj, 'brightTest').name('Bright (Testing)');
presetsFolder.add(presetsObj, 'horrorAtmosphere').name('Horror Atmosphere');
presetsFolder.add(presetsObj, 'exportCurrentSettings').name('📥 Export Current Settings');
presetsFolder.open();

// =============== KEYBOARD CONTROLS (keeping for backwards compatibility)
// Cache for GUI controllers to avoid repeated searches
const guiControllerCache = new Map();

// Helper function to find and update a specific GUI controller
function updateGuiController(property, object = null) {
  const key = object ? `${property}_${object.uuid}` : property;

  // Check cache first
  let controller = guiControllerCache.get(key);

  // If not cached, find it
  if (!controller) {
    for (const ctrl of gui.controllersRecursive()) {
      if (ctrl.property === property && (!object || ctrl.object === object)) {
        controller = ctrl;
        guiControllerCache.set(key, ctrl);
        break;
      }
    }
  }

  if (controller) {
    controller.updateDisplay();
  }
}

window.addEventListener('keydown', (e) => {
  // Flashlight toggle
  if (e.key.toLowerCase() === 'f') {
    flashlight.visible = !flashlight.visible;
    updateGuiController('visible', flashlight);
  }

  // Exposure controls (German keyboard) - still work but GUI is better!
  if (e.key === 'ü') {
    state.exposure = Math.min(3.0, state.exposure * 1.06);
    renderer.toneMappingExposure = state.exposure;
    updateGuiController('exposure');
    // Exposure increased
  }
  if (e.key === 'ä') {
    state.exposure = Math.max(0.3, state.exposure / 1.06);
    renderer.toneMappingExposure = state.exposure;
    updateGuiController('exposure');
    // Exposure decreased
  }

  // Quick HDRI intensity test (+ and - keys) - still work but GUI is better!
  if (e.key === '+') {
    state.envIntensity = Math.min(1.0, state.envIntensity + 0.05);
    setEnvIntensity(scene, state.envIntensity);
    updateGuiController('envIntensity');
  }
  if (e.key === '-') {
    state.envIntensity = Math.max(0.0, state.envIntensity - 0.05);
    setEnvIntensity(scene, state.envIntensity);
    updateGuiController('envIntensity');
  }
});

// =============== RESIZE
// The Engine module handles basic resize, we just register atmosphere's resize callback
onResize(() => {
  atmosphere.onResize();
});

// =============== LOOP
const tmpDir = new THREE.Vector3();
function animate() {
  requestAnimationFrame(animate);

  // Update camera rotation from mouse look
  updateCameraRotation();

  // Update atmosphere (handles skydome and stars positioning)
  atmosphere.update(clock.getElapsedTime());

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
console.log('🌌 Night Scene with Dual Light Pollution Sources');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🖱️ CLICK to capture mouse, ESC to release');
console.log('✨ Two village light sources implemented:');
console.log('  • Near village (NW, ~250m): Noticeable warm glow');
console.log('  • Distant village (SE, ~2km): Very subtle glow');
console.log('🎮 Full GUI controls for both sources');
console.log('📐 Directions: -45° (NW) and 135° (SE)');
console.log('🎨 Adjust everything in real-time via GUI');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
