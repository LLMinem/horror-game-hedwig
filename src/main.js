// main.js - Horror Game Entry Point
import * as THREE from 'three';
import { SCENE_CONSTANTS, DEFAULTS } from './config/Constants.js';
import { createEngine } from './core/Engine.js';
import { createAtmosphere } from './atmosphere/Atmosphere.js';
import { createWorld } from './world/World.js';
import { createEnvironment } from './world/Environment.js';
import { createPlayerController } from './gameplay/PlayerController.js';
import { initDebugGui } from './ui/DebugGui.js';
import { startLoop } from './loop/Loop.js';
import { initAssetSystem } from './assets/Assets.js';
import { createDevRoom } from './assets/DevRoom.js';

// Create core systems
const { scene, renderer, camera, clock, onResize } = createEngine(SCENE_CONSTANTS);

// Prepare shared asset loaders (GLTF + Draco + future KTX2 support)
initAssetSystem({ renderer });

// Create world systems
const atmosphere = createAtmosphere({ scene, renderer, camera, constants: SCENE_CONSTANTS, defaults: DEFAULTS });
const world = createWorld({ scene, constants: SCENE_CONSTANTS, defaults: DEFAULTS });
const environment = createEnvironment({ renderer, scene, initialHDRI: DEFAULTS.hdri, initialIntensity: DEFAULTS.envIntensity });

// Create the dev room sandbox and place the street lamp hero asset
const devRoom = createDevRoom({ scene, world, environment });
devRoom.ready.then(() => {
  console.log('✓ Dev Room ready – street lamp loaded');
}).catch((error) => {
  console.error('Dev Room failed to initialize', error);
});

// Create player controller
const player = createPlayerController({ camera, renderer, scene, flashlight: world.flashlight, constants: SCENE_CONSTANTS });

// Setup GUI
const guiControls = initDebugGui({ renderer, scene, atmosphere, world, environment, player, devRoom });

// Legacy keyboard shortcuts (optional - GUI provides same controls)
window.addEventListener('keydown', (e) => {
  const keys = { 'ü': () => guiControls.state.exposure = Math.min(3.0, guiControls.state.exposure * 1.06),
                 'ä': () => guiControls.state.exposure = Math.max(0.3, guiControls.state.exposure / 1.06),
                 '+': () => guiControls.state.envIntensity = Math.min(1.0, guiControls.state.envIntensity + 0.05),
                 '-': () => guiControls.state.envIntensity = Math.max(0.0, guiControls.state.envIntensity - 0.05) };
  if (keys[e.key]) { keys[e.key](); guiControls.applyState(); }
});

// Handle resize
onResize(() => atmosphere.onResize());

// Start game loop
startLoop({ renderer, scene, camera, clock, systems: [
  { update: (dt) => player.update(dt) },
  { update: (dt, elapsed) => atmosphere.update(elapsed) }
]});

console.log('🌙 Horror Game - Refactored and Ready');
