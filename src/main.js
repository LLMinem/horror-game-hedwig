// main.js (with ground textures)
// --------------------------------------------------
import GUI from "lil-gui";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

// =============== HDRI SELECTION (easy to switch!)
// Options: 'moonless_golf', 'satara_night_no_lamps', 'satara_night', 'dikhololo_night', 'kloppenheim_02'
let HDRI_CHOICE = "moonless_golf"; // Very dark, perfect for horror atmosphere
let CURRENT_ENV_INTENSITY = 0.25; // Increased for better object visibility with moonless_golf

// =============== SCENE & RENDERER
const scene = new THREE.Scene();

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
  120,
);
camera.position.set(0, 1.7, 15);
camera.lookAt(0, 1.5, 0);

// =============== SKY (background only; does NOT light)
const skyCanvas = document.createElement("canvas");
skyCanvas.width = 4;
skyCanvas.height = 2048; // Higher res to reduce banding
const g = skyCanvas.getContext("2d");
const grad = g.createLinearGradient(0, 0, 0, 2048);
grad.addColorStop(0.0, "#0a0a2e"); // deep blue at top
grad.addColorStop(0.5, "#0a0e2a"); // slightly lighter blue
grad.addColorStop(1.0, "#000000"); // black at horizon
g.fillStyle = grad;
g.fillRect(0, 0, 4, 2048);
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

// =============== GROUND WITH TEXTURES
const textureLoader = new THREE.TextureLoader();

// Load grass textures
const grassColorTex = textureLoader.load('/assets/textures/grass_color.jpg');
const grassNormalTex = textureLoader.load('/assets/textures/grass_normal.jpg');

// Configure textures for tiling
const groundTiling = 32; // Start with 32x32 tiling for sharp detail (~1.5cm per pixel)
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

      // FIX for r179: Must also set envMap on each material!
      applyEnvMapToMaterials(scene, envMap, CURRENT_ENV_INTENSITY);

      console.log(`✓ Loaded HDRI: ${hdriName}`);
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

// Default values for double-click reset functionality
const defaults = {
  exposure: 1.0,
  envIntensity: 0.25,
  hdri: "moonless_golf",
  moonIntensity: 0.8,
  moonX: 12,
  moonY: 30,
  moonZ: 16,
  hemiIntensity: 0.25,
  ambientIntensity: 0.05,
  fogNear: 35,
  fogFar: 90,
  fogColor: "#0b1133",
  flashlightIntensity: 50,
  flashlightAngle: 28,
  flashlightPenumbra: 0.4,
  flashlightDistance: 45,
  shadowBias: -0.001,
  shadowNormalBias: 0.02,
  // New ground texture controls
  groundTiling: 32,
  normalStrength: 1.0,
};

// State object initialized from defaults (enables double-click reset)
const state = { ...defaults };

// Rendering folder
const renderFolder = gui.addFolder("Rendering");
renderFolder
  .add(state, "exposure", 0.3, 3.0, 0.01)
  .name("Exposure")
  .onChange((v) => (renderer.toneMappingExposure = v))
  .listen(); // Enable double-click reset
renderFolder.open();

// Environment folder
const envFolder = gui.addFolder("Environment");
envFolder
  .add(state, "envIntensity", 0, 1, 0.01)
  .name("Env Intensity")
  .onChange((v) => setEnvIntensity(scene, v))
  .listen(); // Enable double-click reset
envFolder
  .add(state, "hdri", {
    "Darkest (moonless_golf)": "moonless_golf",
    "Dark with stars": "satara_night_no_lamps",
    "Dark with lamp": "satara_night",
    "Brighter test": "dikhololo_night",
    Brightest: "kloppenheim_02",
  })
  .name("HDRI")
  .onChange((v) => {
    HDRI_CHOICE = v;
    loadHDRI(v);
  })
  .listen(); // Enable double-click reset
envFolder.open();

// Ground texture folder
const groundFolder = gui.addFolder("Ground Texture");
groundFolder
  .add(state, "groundTiling", 8, 64, 1)
  .name("Tiling Amount")
  .onChange((v) => {
    grassColorTex.repeat.set(v, v);
    grassNormalTex.repeat.set(v, v);
    console.log(`Ground tiling: ${v}x${v} (${(500/v).toFixed(1)}m per tile, ${(1024/(500/v)*0.01).toFixed(1)}cm per pixel)`);
  })
  .listen();
groundFolder
  .add(state, "normalStrength", 0, 2, 0.01)
  .name("Bump Strength")
  .onChange((v) => {
    groundMat.normalScale.set(v, v);
  })
  .listen();
groundFolder.open();

// Lights folder
const lightsFolder = gui.addFolder("Lights");
lightsFolder
  .add(state, "moonIntensity", 0, 2, 0.01)
  .name("Moon Intensity")
  .onChange((v) => (moon.intensity = v))
  .listen(); // Enable double-click reset
lightsFolder
  .add(state, "moonX", -50, 50, 0.5)
  .name("Moon X")
  .onChange((v) => (moon.position.x = v))
  .listen(); // Enable double-click reset
lightsFolder
  .add(state, "moonY", 10, 50, 0.5)
  .name("Moon Y")
  .onChange((v) => (moon.position.y = v))
  .listen(); // Enable double-click reset
lightsFolder
  .add(state, "moonZ", -50, 50, 0.5)
  .name("Moon Z")
  .onChange((v) => (moon.position.z = v))
  .listen(); // Enable double-click reset
lightsFolder
  .add(state, "hemiIntensity", 0, 1, 0.01)
  .name("Hemisphere")
  .onChange((v) => (hemi.intensity = v))
  .listen(); // Enable double-click reset
lightsFolder
  .add(state, "ambientIntensity", 0, 0.3, 0.001)
  .name("Ambient")
  .onChange((v) => (amb.intensity = v))
  .listen(); // Enable double-click reset

// Fog folder
const fogFolder = gui.addFolder("Fog");
fogFolder
  .add(state, "fogNear", 0, 100, 1)
  .name("Near (Start)")
  .onChange((v) => {
    // Prevent near from being greater than or equal to far
    if (v >= state.fogFar) {
      v = state.fogFar - 1;
      state.fogNear = v;
      gui.controllersRecursive().forEach((controller) => {
        if (controller.property === "fogNear") controller.updateDisplay();
      });
    }
    scene.fog.near = v;
  })
  .listen(); // Enable double-click reset
fogFolder
  .add(state, "fogFar", 50, 200, 1)
  .name("Far (Full)")
  .onChange((v) => {
    // Prevent far from being less than or equal to near
    if (v <= state.fogNear) {
      v = state.fogNear + 1;
      state.fogFar = v;
      gui.controllersRecursive().forEach((controller) => {
        if (controller.property === "fogFar") controller.updateDisplay();
      });
    }
    scene.fog.far = v;
  })
  .listen(); // Enable double-click reset
fogFolder
  .addColor(state, "fogColor")
  .name("Color")
  .onChange((v) => scene.fog.color.set(v))
  .listen(); // Enable double-click reset

// Flashlight folder
const flashFolder = gui.addFolder("Flashlight");
flashFolder
  .add(state, "flashlightIntensity", 0, 100, 0.5) // Increased max to 100
  .name("Intensity")
  .onChange((v) => (flashlight.intensity = v))
  .listen(); // Enable double-click reset
flashFolder
  .add(state, "flashlightAngle", 5, 45, 1)
  .name("Angle (degrees)")
  .onChange((v) => (flashlight.angle = (v * Math.PI) / 180))
  .listen(); // Enable double-click reset
flashFolder
  .add(state, "flashlightPenumbra", 0, 1, 0.01)
  .name("Penumbra")
  .onChange((v) => (flashlight.penumbra = v))
  .listen(); // Enable double-click reset
flashFolder
  .add(state, "flashlightDistance", 10, 100, 1)
  .name("Distance")
  .onChange((v) => (flashlight.distance = v))
  .listen(); // Enable double-click reset
flashFolder.add(flashlight, "visible").name("Enabled");

// Shadows folder
const shadowFolder = gui.addFolder("Shadows");
shadowFolder
  .add(state, "shadowBias", -0.005, 0.005, 0.0001)
  .name("Bias")
  .onChange((v) => (moon.shadow.bias = v))
  .listen(); // Enable double-click reset
shadowFolder
  .add(state, "shadowNormalBias", 0, 0.1, 0.001)
  .name("Normal Bias")
  .onChange((v) => (moon.shadow.normalBias = v))
  .listen(); // Enable double-click reset

// Presets button
const presetsObj = {
  resetToDefaults: () => {
    // Reset all values to their starting defaults
    state.exposure = 1.0;
    state.envIntensity = 0.25; // Updated default
    state.hdri = "moonless_golf";
    state.moonIntensity = 0.8;
    state.moonX = 12;
    state.moonY = 30;
    state.moonZ = 16;
    state.hemiIntensity = 0.25;
    state.ambientIntensity = 0.05;
    state.fogNear = 35;
    state.fogFar = 90;
    state.flashlightIntensity = 50; // Updated default
    state.flashlightAngle = 28; // Updated default (degrees)
    state.flashlightPenumbra = 0.4; // Updated default
    state.flashlightDistance = 45; // Updated default
    state.shadowBias = -0.001;
    state.shadowNormalBias = 0.02;
    state.groundTiling = 32;
    state.normalStrength = 1.0;

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
    flashlight.angle = (state.flashlightAngle * Math.PI) / 180;
    flashlight.penumbra = state.flashlightPenumbra;
    flashlight.distance = state.flashlightDistance;
    moon.shadow.bias = state.shadowBias;
    moon.shadow.normalBias = state.shadowNormalBias;
    grassColorTex.repeat.set(state.groundTiling, state.groundTiling);
    grassNormalTex.repeat.set(state.groundTiling, state.groundTiling);
    groundMat.normalScale.set(state.normalStrength, state.normalStrength);

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
    state.fogNear = 25;
    state.fogFar = 70;
    renderer.toneMappingExposure = state.exposure;
    setEnvIntensity(scene, state.envIntensity);
    moon.intensity = state.moonIntensity;
    scene.fog.near = state.fogNear;
    scene.fog.far = state.fogFar;
    gui
      .controllersRecursive()
      .forEach((controller) => controller.updateDisplay());
    console.log("✓ Applied horror dark preset");
  },
};

const presetsFolder = gui.addFolder("Presets");
presetsFolder.add(presetsObj, "resetToDefaults").name("Reset to Defaults");
presetsFolder.add(presetsObj, "brightTest").name("Bright (Testing)");
presetsFolder.add(presetsObj, "horrorDark").name("Horror Dark");
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
console.log("🎮 Night Scene with Ground Textures");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✓ Grass texture loaded with normal mapping");
console.log("GUI: Adjust 'Ground Texture' folder:");
console.log("  • Tiling: 8-64x (default 32x)");
console.log("  • Bump Strength: 0-2 (default 1.0)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
