// Composition root: pilot review by default, original sandbox via ?mode=sandbox.
import { SCENE_CONSTANTS, DEFAULTS } from './config/Constants.js';
import { createEngine } from './core/Engine.js';
import { createAtmosphere } from './atmosphere/Atmosphere.js';
import { createWorld } from './world/World.js';
import { createPilotWorld } from './world/PilotWorld.js';
import { createEnvironment } from './world/Environment.js';
import { createPlayerController } from './gameplay/PlayerController.js';
import { initDebugGui } from './ui/DebugGui.js';
import { createPilotReview } from './ui/PilotReview.js';
import { startLoop } from './loop/Loop.js';
import { initAssetSystem } from './assets/Assets.js';
import { createDevRoom } from './assets/DevRoom.js';

const mode = new URLSearchParams(window.location.search).get('mode') === 'sandbox' ? 'sandbox' : 'pilot';
const { scene, renderer, camera, clock, onResize } = createEngine(SCENE_CONSTANTS);
initAssetSystem({ renderer });
const atmosphere = createAtmosphere({ scene, renderer, camera, constants: SCENE_CONSTANTS, defaults: DEFAULTS });
const world = createWorld({ scene, constants: SCENE_CONSTANTS, defaults: DEFAULTS, sandbox: mode === 'sandbox' });
const environment = createEnvironment({ renderer, scene, initialHDRI: DEFAULTS.hdri, initialIntensity: DEFAULTS.envIntensity });
const pilot = mode === 'pilot' ? createPilotWorld({ scene, environment }) : null;
const devRoom = mode === 'sandbox' ? createDevRoom({ scene, world, environment }) : null;
const player = createPlayerController({ camera, renderer, flashlight: world.flashlight, constants: SCENE_CONSTANTS, navigation: pilot, enabled: false });
const guiControls = initDebugGui({ renderer, scene, atmosphere, world, environment, player, devRoom, pilot });

if (pilot) {
  // Cover the pilot, not the original 36 m sandbox shadow bubble.
  const moon = world.lights.moon;
  moon.target.position.set(-10, 0, -30);
  Object.assign(moon.shadow.camera, { left: -65, right: 65, top: 65, bottom: -65, near: 1, far: 200 });
  moon.shadow.camera.updateProjectionMatrix();
}

let reviewStatus = 'loading';
let reviewError = null;
let activeView = null;
function setView(id) {
  if (reviewStatus !== 'ready' || !pilot) return false;
  const view = pilot.views.find(candidate => candidate.id === id);
  if (!view || !player.setView(view)) return false;
  camera.fov = view.inspection ? 65 : 55;
  // A higher near plane preserves depth precision for 25 mm paving at overview height.
  camera.near = view.inspection ? 1 : 0.1;
  camera.updateProjectionMatrix();
  if (view.inspection) guiControls.setReviewLighting('neutral');
  activeView = id;
  review.setActiveView(id);
  review.setStatus('ready', view.inspection ? 'Inspection — overhead, walking disabled. Select a ground view to walk.' : `Walking — ${view.label ?? id}. Prototype, awaiting visual review.`);
  return true;
}
function reset() {
  if (reviewStatus !== 'ready' || !player.reset()) return false;
  activeView = null;
  review.setActiveView('');
  if (pilot) {
    camera.fov = 55;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
  }
  review.setStatus('ready', 'Walking — entrance spawn. Prototype, awaiting visual review.');
  return true;
}
const review = createPilotReview({ mode, onView: setView, onLighting: lighting => guiControls.setReviewLighting(lighting), onReset: reset });

const ready = Promise.all([pilot ? pilot.ready : devRoom.ready, environment.ready]).then(() => {
  reviewStatus = 'ready';
  player.setEnabled(true);
  if (pilot) review.setViews(pilot.views);
  if (!reset()) throw new Error('Unable to place player at the authored spawn.');
  if (pilot?.views.some(view => view.id === 'approach')) setView('approach');
  if (!pilot) review.setStatus('ready', 'Sandbox ready — original lamp and lighting test scene.');
}).catch(error => {
  reviewStatus = 'error';
  reviewError = error instanceof Error ? error.message : String(error);
  player.setEnabled(false);
  review.setStatus('error', `${mode === 'pilot' ? 'Pilot' : 'Sandbox'} failed to load: ${reviewError}. No fallback scene. Reload after correcting the asset error.`);
  console.error(`${mode} review failed`, error);
  throw error;
});
// Keep failure visible without an unhandled rejection; callers can still await ready.
ready.catch(() => {});

if (pilot) {
  window.__pilotReview = Object.freeze({
    ready, camera, player, world: pilot, renderer, scene,
    setView, reset,
    setLighting: mode => guiControls.setReviewLighting(mode),
    sampleHeight: (x, z) => pilot.sampleHeight(x, z),
    canStand: (x, z, radius) => pilot.canStand(x, z, radius),
    // Deterministic collision probe through the same movement seam as real input.
    move(dx, dz) {
      if (reviewStatus !== 'ready' || player.inspection || !Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) > 2) return false;
      player.clearInput();
      if (!pilot.move(camera.position, dx, dz)) return false;
      camera.position.y += SCENE_CONSTANTS.CAMERA_HEIGHT;
      return true;
    },
    snapshot() {
      return {
        status: reviewStatus, error: reviewError, view: activeView,
        mode: player.inspection ? 'inspection' : 'walk', lighting: guiControls.state.reviewLighting,
        position: camera.position.toArray(), yaw: player.yaw, pitch: player.pitch,
        floor: pilot.sampleHeight(camera.position.x, camera.position.z),
        supported: pilot.canStand(camera.position.x, camera.position.z),
        speed: player.getSpeed(), pointerLocked: player.pointerLocked,
        render: { width: renderer.domElement.width, height: renderer.domElement.height, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
      };
    },
  });
} else {
  window.__sandboxReview = Object.freeze({ ready, camera, renderer, scene, player, devRoom, atmosphere, world, guiControls });
}

window.addEventListener('keydown', event => {
  if (!player.pointerLocked) return;
  const state = guiControls.state;
  switch (event.key) {
    case 'ü': state.exposure = Math.min(3, state.exposure * 1.06); break;
    case 'ä': state.exposure = Math.max(0.3, state.exposure / 1.06); break;
    case '+': state.envIntensity = Math.min(1, state.envIntensity + 0.05); break;
    case '-': state.envIntensity = Math.max(0, state.envIntensity - 0.05); break;
    default: return;
  }
  guiControls.applyState();
});
onResize(() => atmosphere.onResize());
startLoop({ renderer, scene, camera, clock, systems: [
  { update: dt => player.update(dt) },
  { update: (dt, elapsed) => atmosphere.update(elapsed) },
] });
