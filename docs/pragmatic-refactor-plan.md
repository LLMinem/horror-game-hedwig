---
type: plan
status: active
created: 2025-09-16
last_verified: 2025-09-16
last_verified_commit: pending
owned_by: plan-tracker
supersedes: [night-scene-makeover-guide.md]
superseded_by: []
---

# Pragmatic Refactor Plan - Simple & Clean

## Executive Summary

Split the 1792-line `main.js` into **11-12 logical modules** over **3-5 days**. Keep it simple, understandable, and ADHD-friendly. Every step produces a working game.

**Core Philosophy**: Group things that belong together. One level of folders. Medium-sized files that make intuitive sense.

## The Architecture (11-12 Files Total)

```
src/
├── main.js                    # Entry point, wires everything (< 50 lines)
├── core/
│   └── Engine.js              # Renderer, scene, camera, clock, resize
├── atmosphere/
│   └── Atmosphere.js          # Sky + stars together (they're one visual system)
├── world/
│   ├── World.js               # Fog, lights, ground, test objects
│   └── Environment.js         # HDRI loading, envMap fixes for r179
├── gameplay/
│   └── PlayerController.js   # Mouse look + WASD movement + flashlight
├── assets/
│   └── Assets.js              # Asset loading utilities (for later)
├── ui/
│   └── DebugGui.js            # All lil-gui controls in one place
├── loop/
│   └── Loop.js                # Animation loop
├── config/
│   └── Constants.js           # SCENE_CONSTANTS + defaults
```

**Future additions** (post-refactor):

- `gameplay/AIUncle.js` - Uncle pathing AI
- `gameplay/Gameplay.js` - Game logic, win/lose conditions
- `assets/DevRoom.js` - Asset testing area

## Why This Structure Makes Sense

### Logical Grouping

- **Atmosphere** = Sky gradient + stars (they work together visually)
- **World** = Physical things (fog, lights, ground)
- **PlayerController** = Everything the player controls (camera, movement, flashlight)
- **DebugGui** = All GUI controls (one place to look when tweaking)

### ADHD-Friendly

- **11 files** = Not overwhelming
- **Clear names** = You know where to look
- **One level deep** = No folder diving
- **Medium size** = Each file does related things, not just one tiny thing

## Git Strategy

```bash
# Create feature branch
git checkout -b refactor/pragmatic
git push -u origin refactor/pragmatic

# Work in small commits
git add -p  # Stage specific chunks
git commit -m "refactor(core): extract Engine from main.js"

# After testing everything
git checkout main
git merge --no-ff refactor/pragmatic
git push origin main
```

### Commit Messages

```
refactor(module): extract [what] from main.js
- Maintains [what still works]
- Next: [what comes next]
```

## Phase-by-Phase Implementation

### PHASE 1: Foundation (Day 1 Morning)

**Extract the stable, rarely-changing core**

#### Step 1.1: Extract Constants

Create `config/Constants.js`:

```javascript
// All the constants that rarely change
export const SCENE_CONSTANTS = {
  SKYDOME_RADIUS: 1000,
  GROUND_SIZE: 500,
  FAR_PLANE: 5000,
  CAMERA_HEIGHT: 1.7,
  CAMERA_START_Z: 15,
  DEFAULT_STAR_COUNT: 3000,
  GROUND_TILING: 64,
};

export const DEG2RAD = Math.PI / 180;

// GUI default values
export const DEFAULTS = {
  exposure: 1.0,
  envIntensity: 0.25,
  moonIntensity: 0.8,
  fogDensity: 0.02,
  // ... etc (lines 734-793 from main.js)
};
```

#### Step 1.2: Extract Engine

Create `core/Engine.js`:

```javascript
// Scene, renderer, camera, clock - the foundation
export function createEngine(constants) {
  const scene = new THREE.Scene();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  });
  // ... renderer setup

  const camera = new THREE.PerspectiveCamera(/*...*/);
  const clock = new THREE.Clock();

  // Handle resize
  const resizeCallbacks = [];
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    resizeCallbacks.forEach((cb) => cb());
  });

  return {
    scene,
    renderer,
    camera,
    clock,
    onResize: (cb) => resizeCallbacks.push(cb),
  };
}
```

**Test**: Scene renders, can resize window
**Commit**: `refactor(core): extract Engine and Constants`

### PHASE 2: Atmosphere (Day 1 Afternoon)

**Extract the complete sky system**

#### Step 2.1: Extract Atmosphere

Create `atmosphere/Atmosphere.js`:

```javascript
// Sky dome + stars = complete atmosphere
export function createAtmosphere({ scene, renderer, camera, constants }) {
  // Vertex shader (lines 121-133)
  const skyVertexShader = `...`;

  // Fragment shader (lines 135-298)
  const skyFragmentShader = `...`;

  // Create sky dome
  const skyGeometry = new THREE.SphereGeometry(constants.SKYDOME_RADIUS, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      /* all uniforms from lines 304-348 */
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const skydome = new THREE.Mesh(skyGeometry, skyMaterial);

  // Generate stars (lines 364-398)
  function generateStarGeometry(count) {
    /*...*/
  }

  // Star shaders and material (lines 400-499)
  const stars = new THREE.Points(starGeometry, starMaterial);

  // Add to scene
  scene.add(skydome);
  scene.add(stars);

  // Update function for animation loop
  function update(elapsedTime) {
    skyMaterial.uniforms.u_time.value = elapsedTime;
    skydome.position.copy(camera.position);
    stars.position.copy(camera.position);
  }

  // Handle resize
  function onResize() {
    starMaterial.uniforms.u_pixelRatio.value = renderer.getPixelRatio();
    skyMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }

  return {
    skydome,
    skyMaterial,
    stars,
    starMaterial,
    update,
    onResize,
  };
}
```

**Test**: Sky gradient works, stars visible, light pollution shows
**Commit**: `refactor(atmosphere): extract sky and stars together`

### PHASE 3: World (Day 2 Morning)

**Extract physical world elements**

#### Step 3.1: Extract World

Create `world/World.js`:

```javascript
// Fog, lights, ground - the physical world
export function createWorld({ scene, constants }) {
  // Fog (lines 518-521)
  scene.fog = new THREE.FogExp2(0x141618, 0.02);

  // Lights (lines 523-546)
  const moon = new THREE.DirectionalLight(0x9bb7ff, 0.8);
  // ... moon setup
  const hemi = new THREE.HemisphereLight(0x20324f, 0x0a0f18, 0.25);
  const amb = new THREE.AmbientLight(0x1b1e34, 0.05);

  scene.add(moon, moon.target, hemi, amb);

  // Ground (lines 547-578)
  const textureLoader = new THREE.TextureLoader();
  const grassColorTex = textureLoader.load('/assets/textures/ground/grass_color_2k.jpg');
  const grassNormalTex = textureLoader.load('/assets/textures/ground/grass_normal_2k.jpg');
  // ... texture setup

  const groundGeo = new THREE.PlaneGeometry(constants.GROUND_SIZE, constants.GROUND_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassColorTex,
    normalMap: grassNormalTex,
    // ... material props
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  scene.add(ground);

  // Optional: Test objects (lines 579-631)
  function addDebugProps() {
    // Tombstones, trees, posts for testing
  }

  // Flashlight (lines 633-639)
  const flashlight = new THREE.SpotLight(0xfff2d0, 50, 45, 28 * DEG2RAD, 0.4, 2);
  flashlight.visible = false;
  scene.add(flashlight, flashlight.target);

  return {
    fog: scene.fog,
    lights: { moon, hemi, amb },
    ground,
    groundMat,
    flashlight,
    addDebugProps,
  };
}
```

#### Step 3.2: Extract Environment

Create `world/Environment.js`:

```javascript
// HDRI loading and r179 envMap fixes
export function createEnvironment({ renderer, scene }) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  let currentEnvIntensity = 0.25;

  // Load HDRI (lines 647-691)
  function loadHDRI(hdriName) {
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load(`/assets/hdri/${hdriName}_2k.hdr`, (hdrTexture) => {
      const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
      scene.environment = envMap;
      hdrTexture.dispose();

      // Apply to materials (r179 fix)
      applyEnvMapToMaterials(scene, envMap, currentEnvIntensity);
    });
  }

  // r179 envMap fix (lines 696-713)
  function applyEnvMapToMaterials(root, envMap, intensity) {
    root.traverse((obj) => {
      if (obj.isMesh && obj.material && 'envMapIntensity' in obj.material) {
        obj.material.envMap = envMap; // Critical for r179!
        obj.material.envMapIntensity = intensity;
        obj.material.needsUpdate = true;
      }
    });
  }

  // Initial load
  loadHDRI('dikhololo_night');

  return {
    loadHDRI,
    applyEnvMapToMaterials,
    setEnvIntensity: (intensity) => {
      currentEnvIntensity = intensity;
      scene.traverse(/* update intensity */);
    },
  };
}
```

**Test**: Fog visible, lights work, ground textured, HDRI reflections work
**Commit**: `refactor(world): extract world elements and environment`

### PHASE 4: Player Controls (Day 2 Afternoon)

**Extract input and movement (ADD WASD HERE!)**

#### Step 4.1: Extract PlayerController

Create `gameplay/PlayerController.js`:

```javascript
// Mouse look + WASD movement + flashlight control
export function createPlayerController({ camera, renderer, scene, flashlight }) {
  let yaw = 0,
    pitch = 0;
  let mouseSensitivity = 0.002;
  let isPointerLocked = false;

  // Movement state (NEW!)
  const keys = new Map();
  const velocity = new THREE.Vector3();
  const walkSpeed = 3.5; // m/s
  const sprintMultiplier = 1.5;

  // Pointer lock (lines 69-84)
  renderer.domElement.addEventListener('click', () => {
    if (!isPointerLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

  // Mouse movement (lines 85-100)
  document.addEventListener('mousemove', (event) => {
    if (!isPointerLocked) return;

    yaw += event.movementX * mouseSensitivity;
    pitch -= event.movementY * mouseSensitivity;
    pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
  });

  // Keyboard input (NEW!)
  window.addEventListener('keydown', (e) => {
    keys.set(e.key.toLowerCase(), true);

    // Flashlight toggle
    if (e.key.toLowerCase() === 'f') {
      flashlight.visible = !flashlight.visible;
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.set(e.key.toLowerCase(), false);
  });

  // Update function for game loop
  function update(deltaTime) {
    // Update camera rotation
    const direction = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );
    camera.lookAt(
      camera.position.x + direction.x,
      camera.position.y + direction.y,
      camera.position.z + direction.z
    );

    // WASD movement (NEW!)
    const forward = (keys.get('w') ? 1 : 0) - (keys.get('s') ? 1 : 0);
    const strafe = (keys.get('d') ? 1 : 0) - (keys.get('a') ? 1 : 0);
    const sprint = keys.get('shift');

    const speed = walkSpeed * (sprint ? sprintMultiplier : 1) * deltaTime;

    // Calculate movement relative to camera direction
    const moveDir = new THREE.Vector3();
    camera.getWorldDirection(moveDir);
    moveDir.y = 0; // Keep movement horizontal
    moveDir.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(moveDir, new THREE.Vector3(0, 1, 0));

    // Apply movement
    velocity.set(0, 0, 0);
    velocity.addScaledVector(moveDir, forward * speed);
    velocity.addScaledVector(right, strafe * speed);

    camera.position.add(velocity);

    // Update flashlight position
    if (flashlight.visible) {
      flashlight.position.copy(camera.position);
      const tmpDir = new THREE.Vector3();
      camera.getWorldDirection(tmpDir);
      flashlight.target.position.copy(camera.position).add(tmpDir.multiplyScalar(10));
    }
  }

  return {
    update,
    setSensitivity: (v) => {
      mouseSensitivity = v;
    },
  };
}
```

**Test**: Mouse look works, WASD movement functional, flashlight follows camera
**Commit**: `refactor(gameplay): extract player controls and add WASD movement`

### PHASE 5: GUI Extraction (Day 3)

**Move all GUI to one place**

#### Step 5.1: Extract DebugGui

Create `ui/DebugGui.js`:

```javascript
// All lil-gui controls in one place
import GUI from 'lil-gui';

export function setupDebugGui({
  renderer,
  scene,
  world, // { lights, groundMat, flashlight }
  atmosphere, // { skyMaterial, starMaterial, stars }
  environment, // { loadHDRI, setEnvIntensity }
  player, // { setSensitivity }
  constants,
  defaults,
}) {
  const gui = new GUI();
  const state = { ...defaults };

  // Helper for double-click reset
  function addDblClickReset(controller, defaultValue) {
    // ... (lines 800-818)
  }

  // Sky Gradient folder (lines 852-888)
  const skyFolder = gui.addFolder('Sky Gradient (4 Colors)');
  skyFolder
    .addColor(state, 'skyHorizonColor')
    .onChange((v) => atmosphere.skyMaterial.uniforms.horizonColor.value.set(v));
  // ... rest of sky controls

  // Stars folder (lines 891-959)
  const starsFolder = gui.addFolder('Stars (THREE.Points)');
  // ... star controls

  // Light Pollution folder (lines 962-1019)
  // ... pollution controls

  // Rendering folder (lines 1079-1085)
  const renderFolder = gui.addFolder('Rendering');
  renderFolder
    .add(state, 'exposure', 0.3, 3.0, 0.01)
    .onChange((v) => (renderer.toneMappingExposure = v));

  // Environment folder (lines 1087-1105)
  // ... HDRI controls

  // Lights folder (lines 1126-1151)
  // ... light controls

  // Fog folder (lines 1154-1199)
  // ... fog controls

  // Flashlight folder (lines 1202-1221)
  // ... flashlight controls

  // Presets (lines 1234-1671)
  const presetsObj = {
    resetToDefaults: () => {
      /* ... */
    },
    userTuned: () => {
      /* ... */
    },
    brightTest: () => {
      /* ... */
    },
    horrorAtmosphere: () => {
      /* ... */
    },
    exportCurrentSettings: () => {
      /* ... */
    },
  };

  const presetsFolder = gui.addFolder('Presets');
  // ... preset buttons

  return gui;
}
```

**Test**: All GUI controls work, presets apply correctly
**Commit**: `refactor(ui): extract all GUI controls`

### PHASE 6: Animation Loop (Day 3)

**Clean up the game loop**

#### Step 6.1: Extract Loop

Create `loop/Loop.js`:

```javascript
// Clean animation loop
export function startLoop({ renderer, scene, camera, clock, systems }) {
  function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update all systems
    systems.forEach((system) => {
      if (system.update) {
        system.update(deltaTime, elapsedTime);
      }
    });

    renderer.render(scene, camera);
  }

  animate();
}
```

### PHASE 7: Final Wiring (Day 3)

**Connect everything in main.js**

```javascript
// main.js - Final clean version
import * as THREE from 'three';
import { createEngine } from './core/Engine.js';
import { createAtmosphere } from './atmosphere/Atmosphere.js';
import { createWorld } from './world/World.js';
import { createEnvironment } from './world/Environment.js';
import { createPlayerController } from './gameplay/PlayerController.js';
import { setupDebugGui } from './ui/DebugGui.js';
import { startLoop } from './loop/Loop.js';
import { SCENE_CONSTANTS, DEFAULTS } from './config/Constants.js';

// Create core systems
const { scene, renderer, camera, clock, onResize } = createEngine(SCENE_CONSTANTS);

// Create world
const atmosphere = createAtmosphere({ scene, renderer, camera, constants: SCENE_CONSTANTS });
const world = createWorld({ scene, constants: SCENE_CONSTANTS });
const environment = createEnvironment({ renderer, scene });

// Optional: add test objects
world.addDebugProps();

// Create player controller
const player = createPlayerController({
  camera,
  renderer,
  scene,
  flashlight: world.flashlight,
});

// Setup GUI
setupDebugGui({
  renderer,
  scene,
  world,
  atmosphere,
  environment,
  player,
  constants: SCENE_CONSTANTS,
  defaults: DEFAULTS,
});

// Handle resize
onResize(() => {
  atmosphere.onResize();
});

// Start game loop
startLoop({
  renderer,
  scene,
  camera,
  clock,
  systems: [
    { update: (dt) => player.update(dt) },
    { update: (dt, elapsed) => atmosphere.update(elapsed) },
  ],
});

console.log('🌙 Horror Game - Refactored and Ready');
```

**Test**: Everything works identically to before
**Commit**: `refactor(integration): complete pragmatic refactor`

## Testing Checklist

### After Each Phase

- [ ] Scene renders correctly
- [ ] No visual differences
- [ ] 60 FPS maintained
- [ ] No console errors
- [ ] GUI controls work

### Final Validation

- [ ] Mouse look smooth
- [ ] WASD movement works
- [ ] Flashlight toggles with F
- [ ] Sky gradient/stars/light pollution visible
- [ ] Fog density adjustable
- [ ] All presets load correctly
- [ ] HDRI switching works
- [ ] Ground textures visible

## Asset Pack Integration (Post-Refactor)

### The Plan (Based on GPT-5 Analysis)

1. **Select ~5 assets** to start (2 trees, bench, lantern, building)
2. **Convert in Blender**: FBX → GLB with Draco compression
3. **Compress textures**: PNG → KTX2 (4-8x smaller)
4. **Create DevRoom**: Test assets under current lighting

### Where It Fits

- `assets/Assets.js` - Loading utilities
- `assets/DevRoom.js` - Testing area (Step 7 from night-scene guide)
- Keep total under 10-20MB initially

## Future Features Placement

### Physical Moon

Add to `world/World.js`:

- Small emissive sphere
- Position synced with directional light
- GUI control for phase/intensity

### Cloud System

Add to `atmosphere/Atmosphere.js`:

- Start with simple: translucent plane with cloud texture
- Later: particle-based or shader procedural

### Uncle AI

New file `gameplay/AIUncle.js`:

- Simple state machine
- Path between grave positions
- Mumbling audio at 25m

### Cemetery Layout

Add method to `world/World.js`:

- `loadCemeteryLayout(data)`
- Instance graves efficiently
- Place paths and buildings

## Why This Plan Works

### For ADHD

- **11 files** = manageable cognitive load
- **Clear names** = instant understanding
- **Logical groups** = intuitive navigation
- **One place per concern** = no hunting

### For Learning

- Each module demonstrates specific Three.js concepts
- Comments explain the WHY
- Incremental changes = understanding builds gradually

### For Performance

- Same optimizations maintained
- Resource management ready for assets
- Clean update loops

### For Future

- Clear extension points
- No premature abstraction
- Room to grow without restructuring

## Timeline

**Day 1**: Foundation + Atmosphere (4-6 hours)
**Day 2**: World + Player Controls (4-6 hours)
**Day 3**: GUI + Integration (4-6 hours)

**Total: 12-18 focused hours**

---

_This refactor transforms chaos into clarity while keeping things simple and understandable. Every file has a clear purpose, every phase produces a working game, and the whole structure makes intuitive sense._
