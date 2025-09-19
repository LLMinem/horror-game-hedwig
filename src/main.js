// main.js - Refactored with modular architecture
// --------------------------------------------------
import * as THREE from 'three';

// Import our new modules
import { SCENE_CONSTANTS, DEG2RAD, DEFAULTS } from './config/Constants.js';
import { createEngine } from './core/Engine.js';
import { createAtmosphere } from './atmosphere/Atmosphere.js';
import { createWorld } from './world/World.js';
import { createEnvironment } from './world/Environment.js';
import { createPlayerController } from './gameplay/PlayerController.js';
import { initDebugGui } from './ui/DebugGui.js';

// Constants now imported from ./config/Constants.js

// =============== CREATE ENGINE
// Initialize core Three.js components
const { scene, renderer, camera, clock, onResize } = createEngine(SCENE_CONSTANTS);

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

// =============== ENVIRONMENT (HDRI Image-Based Lighting)
// Create the environment system for realistic reflections
const environment = createEnvironment({
  renderer,
  scene,
  initialHDRI: DEFAULTS.hdri,
  initialIntensity: DEFAULTS.envIntensity
});

// REMOVED: ~100 lines of environment code moved to Environment module
// The following was extracted:
// - PMREM generator setup
// - HDRI loading with RGBELoader
// - Critical r179 fix (applying envMap to materials)
// - Environment intensity helpers
// - Fallback lighting system

// =============== PLAYER CONTROLLER (Mouse Look + WASD Movement)
// Create the player controller with all input handling
const player = createPlayerController({
  camera,
  renderer,
  scene,
  flashlight,
  constants: SCENE_CONSTANTS
});

// =============== GUI SETUP
// Initialize the debug GUI with centralized state management
const guiControls = initDebugGui({
  renderer,
  scene,
  atmosphere,
  world,
  environment,
  player
});

// Extract the controls we need
const { gui, state, updateGuiController } = guiControls;

// REMOVED: ~850 lines of GUI setup code moved to DebugGui module
// The following was extracted:
// - All GUI folder creation
// - All control setup
// - Preset functions
// - State management
// - Double-click reset functionality

// =============== KEYBOARD CONTROLS (keeping for backwards compatibility)
window.addEventListener('keydown', (e) => {
  // Note: Flashlight toggle is now handled in PlayerController (F key)

  // Exposure controls (German keyboard) - still work but GUI is better!
  if (e.key === 'ü') {
    state.exposure = Math.min(3.0, state.exposure * 1.06);
    guiControls.applyState();
    // Exposure increased
  }
  if (e.key === 'ä') {
    state.exposure = Math.max(0.3, state.exposure / 1.06);
    guiControls.applyState();
    // Exposure decreased
  }

  // Quick HDRI intensity test (+ and - keys) - still work but GUI is better!
  if (e.key === '+') {
    state.envIntensity = Math.min(1.0, state.envIntensity + 0.05);
    guiControls.applyState();
  }
  if (e.key === '-') {
    state.envIntensity = Math.max(0.0, state.envIntensity - 0.05);
    guiControls.applyState();
  }
});

// =============== RESIZE
// The Engine module handles basic resize, we just register atmosphere's resize callback
onResize(() => {
  atmosphere.onResize();
});

// =============== LOOP
function animate() {
  requestAnimationFrame(animate);

  // Get delta time for frame-independent movement
  const deltaTime = clock.getDelta();

  // Update player controller (handles movement, rotation, and flashlight)
  player.update(deltaTime);

  // Update atmosphere (handles skydome and stars positioning)
  atmosphere.update(clock.getElapsedTime());

  renderer.render(scene, camera);
}
animate();

// Start message
console.log('🎮 Horror Game - Refactored with WASD Movement!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 Controls:');
console.log('  • CLICK to capture mouse, ESC to release');
console.log('  • WASD or Arrow Keys to move');
console.log('  • SHIFT to sprint (1.5x speed)');
console.log('  • F to toggle flashlight');
console.log('  • Mouse to look around');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✨ Phase 5 Complete: DebugGui extracted with centralized state');
console.log('🌌 Beautiful atmospheric night scene maintained');
console.log('🎨 Full GUI controls with improved state management');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');