// DebugGui.js - Developer controls and presets with centralized state management
// ============================================================================
// This module manages all lil-gui controls for the horror game, providing
// real-time adjustment of rendering, atmosphere, lighting, and gameplay settings.
// Uses a centralized state management pattern for maintainability.

import GUI from 'lil-gui';
import * as THREE from 'three';
import { DEG2RAD, DEFAULTS } from '../config/Constants.js';

// Module-level variables
let gui = null;
let state = null;
let sceneComponents = null;

/**
 * Apply the entire state object to the scene components
 * This centralized function eliminates repetitive code in presets
 * @param {Object} currentState - The state object with all settings
 * @param {Object} components - Scene components to update
 */
function applyState(currentState, components) {
  const {
    renderer,
    atmosphere,
    world,
    environment,
    player
  } = components;

  // =============== RENDERER SETTINGS
  renderer.toneMappingExposure = currentState.exposure;

  // =============== ATMOSPHERE SETTINGS
  const { skyMaterial, stars } = atmosphere;

  // Sky gradient colors
  skyMaterial.uniforms.horizonColor.value.set(currentState.skyHorizonColor);
  skyMaterial.uniforms.midLowColor.value.set(currentState.skyMidLowColor);
  skyMaterial.uniforms.midHighColor.value.set(currentState.skyMidHighColor);
  skyMaterial.uniforms.zenithColor.value.set(currentState.skyZenithColor);
  skyMaterial.uniforms.midLowStop.value = currentState.skyMidLowStop;
  skyMaterial.uniforms.midHighStop.value = currentState.skyMidHighStop;

  // Dithering
  skyMaterial.uniforms.ditherAmount.value = currentState.skyDitherAmount;

  // Light pollution - Village 1
  let rad = currentState.village1Azimuth * DEG2RAD;
  skyMaterial.uniforms.village1Dir.value.set(
    Math.sin(rad), 0, -Math.cos(rad)
  ).normalize();
  skyMaterial.uniforms.village1Intensity.value = currentState.village1Intensity;
  skyMaterial.uniforms.village1Spread.value = currentState.village1Spread * DEG2RAD;
  skyMaterial.uniforms.village1Height.value = currentState.village1Height;

  // Light pollution - Village 2
  rad = currentState.village2Azimuth * DEG2RAD;
  skyMaterial.uniforms.village2Dir.value.set(
    Math.sin(rad), 0, -Math.cos(rad)
  ).normalize();
  skyMaterial.uniforms.village2Intensity.value = currentState.village2Intensity;
  skyMaterial.uniforms.village2Spread.value = currentState.village2Spread * DEG2RAD;
  skyMaterial.uniforms.village2Height.value = currentState.village2Height;

  // Pollution color
  skyMaterial.uniforms.pollutionColor.value.set(currentState.pollutionColor);

  // Horror atmosphere settings
  skyMaterial.uniforms.u_horrorEnabled.value = currentState.horrorEnabled ? 1.0 : 0.0;
  skyMaterial.uniforms.u_desat.value = currentState.horrorDesat;
  skyMaterial.uniforms.u_greenTint.value = currentState.horrorGreenTint;
  skyMaterial.uniforms.u_contrast.value = currentState.horrorContrast;
  skyMaterial.uniforms.u_vignette.value = currentState.horrorVignette;
  skyMaterial.uniforms.u_breatheAmp.value = currentState.horrorBreatheAmp;
  skyMaterial.uniforms.u_breatheSpeed.value = currentState.horrorBreatheSpeed;

  // Fog settings
  skyMaterial.uniforms.fogDensity.value = currentState.fogDensity;
  skyMaterial.uniforms.fogColor.value.set(currentState.fogColor);
  skyMaterial.uniforms.fogMax.value = currentState.fogMax;

  // Stars settings
  stars.visible = currentState.starEnabled;
  atmosphere.setStarBrightness(currentState.starBrightness);
  atmosphere.setStarSizeMin(currentState.starSizeMin);
  atmosphere.setStarSizeMax(currentState.starSizeMax);
  atmosphere.setStarHorizonFade(currentState.starHorizonFade);
  atmosphere.setStarAntiAlias(currentState.starAntiAlias);
  atmosphere.setStarTintColor(currentState.starTint);
  atmosphere.setFogDensity(currentState.fogDensity);

  // Regenerate stars if count changed (only if regenerateStars exists)
  if (atmosphere.regenerateStars && atmosphere.getStarCount) {
    const currentStarCount = atmosphere.getStarCount();
    if (currentStarCount !== currentState.starCount) {
      atmosphere.regenerateStars(currentState.starCount);
    }
  } else if (atmosphere.regenerateStars) {
    // If we can't check current count, always regenerate to be safe
    atmosphere.regenerateStars(currentState.starCount);
  }

  // =============== WORLD SETTINGS
  const { lights, fog, flashlight, groundMat, textures } = world;
  const { moon, hemi, amb } = lights;
  const { grassColorTex, grassNormalTex } = textures;

  // Lights
  moon.intensity = currentState.moonIntensity;
  moon.position.set(currentState.moonX, currentState.moonY, currentState.moonZ);
  hemi.intensity = currentState.hemiIntensity;
  amb.intensity = currentState.ambientIntensity;

  // Fog
  if (currentState.fogType === 'exp2') {
    if (!(fog instanceof THREE.FogExp2)) {
      // Need to recreate fog
      world.fog = renderer.scene.fog = new THREE.FogExp2(currentState.fogColor, currentState.fogDensity);
    } else {
      fog.color.set(currentState.fogColor);
      fog.density = currentState.fogDensity;
    }
  } else {
    if (!(fog instanceof THREE.Fog)) {
      // Need to recreate fog
      world.fog = renderer.scene.fog = new THREE.Fog(currentState.fogColor, 35, 90);
    } else {
      fog.color.set(currentState.fogColor);
    }
  }

  // Flashlight
  flashlight.intensity = currentState.flashlightIntensity;
  flashlight.angle = currentState.flashlightAngle * DEG2RAD;
  flashlight.penumbra = currentState.flashlightPenumbra;
  flashlight.distance = currentState.flashlightDistance;

  // Shadows
  moon.shadow.bias = currentState.shadowBias;
  moon.shadow.normalBias = currentState.shadowNormalBias;

  // Ground textures
  grassColorTex.repeat.set(currentState.groundTiling, currentState.groundTiling);
  grassNormalTex.repeat.set(currentState.groundTiling, currentState.groundTiling);
  groundMat.normalScale.set(currentState.normalStrength, currentState.normalStrength);

  // =============== ENVIRONMENT SETTINGS
  environment.setEnvIntensity(currentState.envIntensity);
  // Only switch HDRI if it changed
  if (environment.getCurrentHDRI && environment.getCurrentHDRI() !== currentState.hdri) {
    environment.switchHDRI(currentState.hdri);
  }

  // =============== PLAYER SETTINGS
  if (player) {
    player.setSensitivity(currentState.mouseSensitivity);
    player.setWalkSpeed(currentState.walkSpeed);
  }

  // =============== UPDATE GUI DISPLAY
  if (gui) {
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay());
  }
}

/**
 * Helper function to add double-click reset functionality to controllers
 */
function addDblClickReset(controller, defaultValue) {
  const labelEl = controller.domElement.querySelector('.name');
  if (!labelEl) {
    console.warn('Could not find label element for', controller.property);
    return;
  }

  labelEl.style.cursor = 'pointer';
  labelEl.title = 'Double-click to reset to default';

  labelEl.addEventListener('dblclick', (e) => {
    e.preventDefault();
    controller.setValue(defaultValue);
  });
}

/**
 * Enhance GUI folders with automatic double-click reset
 */
function enhanceGuiWithReset(guiOrFolder) {
  const originalAdd = guiOrFolder.add.bind(guiOrFolder);

  guiOrFolder.add = function (object, property, ...args) {
    const controller = originalAdd(object, property, ...args);
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

/**
 * Create preset functions using the centralized state pattern
 */
function createPresets() {
  return {
    resetToDefaults: () => {
      // Reset all values to defaults
      Object.assign(state, DEFAULTS);
      applyState(state, sceneComponents);
      console.log('✓ Reset to default values');
    },

    userTuned: () => {
      // Apply the carefully tuned atmospheric night scene
      Object.assign(state, {
        ...DEFAULTS,
        // Keep the user-tuned values as they are in DEFAULTS
      });
      applyState(state, sceneComponents);
      console.log('✓ Applied User Tuned preset - Your personal atmospheric settings');
    },

    brightTest: () => {
      // Testing preset - brighter for visibility
      Object.assign(state, {
        ...DEFAULTS,
        exposure: 1.5,
        envIntensity: 0.35,
        moonIntensity: 1.2,
        hemiIntensity: 0.35,
        ambientIntensity: 0.08,
        fogDensity: 0.02,
        starBrightness: 1.2
      });
      applyState(state, sceneComponents);
      console.log('✓ Applied Bright Test preset - Enhanced visibility for testing');
    },

    horrorAtmosphere: () => {
      // Horror atmosphere with desaturated green-grey tones
      Object.assign(state, {
        ...state, // Keep current state as base
        // Sky colors - desaturated with greenish tint
        skyHorizonColor: '#2A241F',
        skyMidLowColor: '#171A16',
        skyMidHighColor: '#0B1110',
        skyZenithColor: '#060B0A',
        skyMidLowStop: 0.26,
        skyMidHighStop: 0.62,
        // Fog - greenish and denser
        fogColor: '#0F1512',
        fogDensity: 0.035,
        fogMax: 0.93,
        // Lighting - darker
        exposure: 0.9,
        envIntensity: 0.12,
        moonIntensity: 0.6,
        hemiIntensity: 0.2,
        ambientIntensity: 0.04,
        // Light pollution - reduced
        pollutionColor: '#3A2E26',
        village1Intensity: 0.12,
        village1Spread: 80,
        village1Height: 0.3,
        village2Intensity: 0.05,
        village2Spread: 65,
        village2Height: 0.12,
        // Stars - dimmer with tint
        starBrightness: 0.65,
        starSizeMin: 0.9,
        starSizeMax: 4.5,
        starHorizonFade: 0.28,
        starTint: '#E6FFF0',
        // Horror grading enabled
        horrorEnabled: true,
        horrorDesat: 0.28,
        horrorGreenTint: 0.14,
        horrorContrast: 0.12,
        horrorVignette: 0.3,
        horrorBreatheAmp: 0.0,
        horrorBreatheSpeed: 0.15
      });
      applyState(state, sceneComponents);
      console.log('🎭 Applied Horror Atmosphere preset - Unsettling green-grey tones');
    },

    exportCurrentSettings: () => {
      // Export current settings to clipboard and file
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
    }
  };
}

/**
 * Initialize the debug GUI
 * @param {Object} components - All scene components needed for GUI control
 */
export function initDebugGui(components) {
  // Store components for use in applyState
  sceneComponents = components;

  const {
    renderer,
    scene,
    atmosphere,
    world,
    environment,
    player
  } = components;

  // Initialize state from defaults
  state = { ...DEFAULTS };

  // Create GUI
  gui = new GUI();
  enhanceGuiWithReset(gui);

  // Extract components we need
  const { skyMaterial, stars } = atmosphere;
  const { lights, fog, flashlight, groundMat, textures } = world;
  const { moon, hemi, amb } = lights;
  const { grassColorTex, grassNormalTex } = textures;

  // =============== SKY GRADIENT FOLDER
  const skyFolder = gui.addFolder('Sky Gradient (4 Colors)');
  enhanceGuiWithReset(skyFolder);

  skyFolder
    .addColor(state, 'skyHorizonColor')
    .name('1. Horizon (Light Pollution)')
    .onChange(() => applyState(state, sceneComponents));
  skyFolder
    .addColor(state, 'skyMidLowColor')
    .name('2. Mid-Low (Transition)')
    .onChange(() => applyState(state, sceneComponents));
  skyFolder
    .addColor(state, 'skyMidHighColor')
    .name('3. Mid-High (Main Sky)')
    .onChange(() => applyState(state, sceneComponents));
  skyFolder
    .addColor(state, 'skyZenithColor')
    .name('4. Zenith (Darkest)')
    .onChange(() => applyState(state, sceneComponents));

  skyFolder
    .add(state, 'skyMidLowStop', 0.0, 0.5, 0.01)
    .name('Low→Mid Transition')
    .onChange(() => applyState(state, sceneComponents));
  skyFolder
    .add(state, 'skyMidHighStop', 0.5, 1.0, 0.01)
    .name('Mid→High Transition')
    .onChange(() => applyState(state, sceneComponents));

  skyFolder
    .add(state, 'skyDitherAmount', 0, 0.01, 0.0001)
    .name('Dithering (Anti-banding)')
    .onChange(() => applyState(state, sceneComponents));

  // =============== STARS FOLDER
  const starsFolder = gui.addFolder('Stars (THREE.Points)');
  enhanceGuiWithReset(starsFolder);

  starsFolder
    .add(state, 'starEnabled')
    .name('Enable Stars')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starCount', 1000, 10000, 100)
    .name('Star Count')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starBrightness', 0, 3, 0.01)
    .name('Brightness')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starSizeMin', 0.5, 5, 0.1)
    .name('Min Size')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starSizeMax', 2, 15, 0.1)
    .name('Max Size')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starHorizonFade', 0, 0.5, 0.01)
    .name('Horizon Fade')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .add(state, 'starAntiAlias')
    .name('Anti-Aliasing')
    .onChange(() => applyState(state, sceneComponents));

  starsFolder
    .addColor(state, 'starTint')
    .name('Star Tint')
    .onChange(() => applyState(state, sceneComponents));

  // =============== LIGHT POLLUTION FOLDER
  const pollutionFolder = gui.addFolder('Light Pollution (2 Villages)');
  enhanceGuiWithReset(pollutionFolder);

  const village1Sub = pollutionFolder.addFolder('Near Village (NW, 250m)');
  enhanceGuiWithReset(village1Sub);
  village1Sub
    .add(state, 'village1Azimuth', -180, 180, 1)
    .name('Direction (°)')
    .onChange(() => applyState(state, sceneComponents));
  village1Sub
    .add(state, 'village1Intensity', 0, 0.5, 0.01)
    .name('Intensity')
    .onChange(() => applyState(state, sceneComponents));
  village1Sub
    .add(state, 'village1Spread', 30, 120, 1)
    .name('Spread (°)')
    .onChange(() => applyState(state, sceneComponents));
  village1Sub
    .add(state, 'village1Height', 0, 0.5, 0.01)
    .name('Max Height')
    .onChange(() => applyState(state, sceneComponents));

  const village2Sub = pollutionFolder.addFolder('Distant Village (SE, 2km)');
  enhanceGuiWithReset(village2Sub);
  village2Sub
    .add(state, 'village2Azimuth', -180, 180, 1)
    .name('Direction (°)')
    .onChange(() => applyState(state, sceneComponents));
  village2Sub
    .add(state, 'village2Intensity', 0, 0.2, 0.01)
    .name('Intensity')
    .onChange(() => applyState(state, sceneComponents));
  village2Sub
    .add(state, 'village2Spread', 30, 120, 1)
    .name('Spread (°)')
    .onChange(() => applyState(state, sceneComponents));
  village2Sub
    .add(state, 'village2Height', 0, 0.5, 0.01)
    .name('Max Height')
    .onChange(() => applyState(state, sceneComponents));

  pollutionFolder
    .addColor(state, 'pollutionColor')
    .name('Glow Color')
    .onChange(() => applyState(state, sceneComponents));

  // =============== HORROR TUNING FOLDER
  const horrorFolder = gui.addFolder('Horror Tuning');
  enhanceGuiWithReset(horrorFolder);

  horrorFolder
    .add(state, 'horrorEnabled')
    .name('Enable Horror Mode')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorDesat', 0.0, 1.0, 0.01)
    .name('Desaturation')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorGreenTint', 0.0, 0.5, 0.01)
    .name('Green Tint')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorContrast', -0.5, 0.5, 0.01)
    .name('Contrast')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorVignette', 0.0, 0.6, 0.01)
    .name('Vignette')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorBreatheAmp', 0.0, 0.02, 0.001)
    .name('Breathing Amp')
    .onChange(() => applyState(state, sceneComponents));

  horrorFolder
    .add(state, 'horrorBreatheSpeed', 0.0, 1.0, 0.01)
    .name('Breathing Speed')
    .onChange(() => applyState(state, sceneComponents));

  // =============== RENDERING FOLDER
  const renderFolder = gui.addFolder('Rendering');
  enhanceGuiWithReset(renderFolder);
  renderFolder
    .add(state, 'exposure', 0.3, 3.0, 0.01)
    .name('Exposure')
    .onChange(() => applyState(state, sceneComponents));

  // =============== ENVIRONMENT FOLDER
  const envFolder = gui.addFolder('Environment');
  enhanceGuiWithReset(envFolder);
  envFolder
    .add(state, 'envIntensity', 0, 1, 0.01)
    .name('Env Intensity')
    .onChange(() => applyState(state, sceneComponents));
  envFolder
    .add(state, 'hdri', {
      'Dikhololo Night': 'dikhololo_night',
      'Moonless Golf': 'moonless_golf',
      'Satara Night': 'satara_night',
    })
    .name('HDRI (Lighting)')
    .onChange(() => applyState(state, sceneComponents));

  // =============== GROUND TEXTURE FOLDER
  const groundFolder = gui.addFolder('Ground Texture');
  enhanceGuiWithReset(groundFolder);
  groundFolder
    .add(state, 'groundTiling', 16, 128, 1)
    .name('Tiling Amount')
    .onChange(() => applyState(state, sceneComponents));
  groundFolder
    .add(state, 'normalStrength', 0, 2, 0.01)
    .name('Bump Strength')
    .onChange(() => applyState(state, sceneComponents));

  // =============== LIGHTS FOLDER
  const lightsFolder = gui.addFolder('Lights');
  enhanceGuiWithReset(lightsFolder);
  lightsFolder
    .add(state, 'moonIntensity', 0, 2, 0.01)
    .name('Moon Intensity')
    .onChange(() => applyState(state, sceneComponents));
  lightsFolder
    .add(state, 'moonX', -50, 50, 0.5)
    .name('Moon X')
    .onChange(() => applyState(state, sceneComponents));
  lightsFolder
    .add(state, 'moonY', 10, 50, 0.5)
    .name('Moon Y')
    .onChange(() => applyState(state, sceneComponents));
  lightsFolder
    .add(state, 'moonZ', -50, 50, 0.5)
    .name('Moon Z')
    .onChange(() => applyState(state, sceneComponents));
  lightsFolder
    .add(state, 'hemiIntensity', 0, 1, 0.01)
    .name('Hemisphere')
    .onChange(() => applyState(state, sceneComponents));
  lightsFolder
    .add(state, 'ambientIntensity', 0, 0.3, 0.001)
    .name('Ambient')
    .onChange(() => applyState(state, sceneComponents));

  // =============== FOG FOLDER
  const fogFolder = gui.addFolder('Fog');
  enhanceGuiWithReset(fogFolder);
  fogFolder
    .add(state, 'fogType', ['linear', 'exp2'])
    .name('Fog Type')
    .onChange(() => applyState(state, sceneComponents));

  fogFolder
    .add(state, 'fogDensity', 0.01, 0.05, 0.002)
    .name('Density')
    .onChange(() => applyState(state, sceneComponents));

  fogFolder
    .addColor(state, 'fogColor')
    .name('Color')
    .onChange(() => applyState(state, sceneComponents));

  fogFolder
    .add(state, 'fogMax', 0.5, 1.0, 0.01)
    .name('Sky Fog Max')
    .onChange(() => applyState(state, sceneComponents));

  // =============== PLAYER CONTROLS FOLDER
  const playerFolder = gui.addFolder('Player Controls');
  enhanceGuiWithReset(playerFolder);
  playerFolder
    .add(state, 'mouseSensitivity', 0.0005, 0.005, 0.0001)
    .name('Mouse Sensitivity')
    .onChange(() => applyState(state, sceneComponents));
  playerFolder
    .add(state, 'walkSpeed', 1, 6, 0.1)
    .name('Walk Speed (m/s)')
    .onChange(() => applyState(state, sceneComponents));
  playerFolder
    .add({ reset: () => player.reset() }, 'reset')
    .name('Reset Position');

  // =============== FLASHLIGHT FOLDER
  const flashFolder = gui.addFolder('Flashlight');
  enhanceGuiWithReset(flashFolder);
  flashFolder
    .add(state, 'flashlightIntensity', 0, 100, 0.5)
    .name('Intensity')
    .onChange(() => applyState(state, sceneComponents));
  flashFolder
    .add(state, 'flashlightAngle', 5, 45, 1)
    .name('Angle (degrees)')
    .onChange(() => applyState(state, sceneComponents));
  flashFolder
    .add(state, 'flashlightPenumbra', 0, 1, 0.01)
    .name('Penumbra')
    .onChange(() => applyState(state, sceneComponents));
  flashFolder
    .add(state, 'flashlightDistance', 10, 100, 1)
    .name('Distance')
    .onChange(() => applyState(state, sceneComponents));
  flashFolder
    .add(flashlight, 'visible')
    .name('Enabled (F key)');

  // =============== SHADOWS FOLDER
  const shadowFolder = gui.addFolder('Shadows');
  enhanceGuiWithReset(shadowFolder);
  shadowFolder
    .add(state, 'shadowBias', -0.005, 0.005, 0.0001)
    .name('Bias')
    .onChange(() => applyState(state, sceneComponents));
  shadowFolder
    .add(state, 'shadowNormalBias', 0, 0.1, 0.001)
    .name('Normal Bias')
    .onChange(() => applyState(state, sceneComponents));

  // =============== PRESETS FOLDER
  const presetsObj = createPresets();
  const presetsFolder = gui.addFolder('Presets');
  presetsFolder.add(presetsObj, 'resetToDefaults').name('Reset to Defaults');
  presetsFolder.add(presetsObj, 'userTuned').name('User Tuned (Normal)');
  presetsFolder.add(presetsObj, 'brightTest').name('Bright (Testing)');
  presetsFolder.add(presetsObj, 'horrorAtmosphere').name('Horror Atmosphere');
  presetsFolder.add(presetsObj, 'exportCurrentSettings').name('📥 Export Current Settings');
  presetsFolder.open();

  // Apply initial state
  applyState(state, sceneComponents);

  return {
    gui,
    state,
    applyState: () => applyState(state, sceneComponents),
    updateGuiController: (property) => {
      // Helper to update a specific controller
      for (const ctrl of gui.controllersRecursive()) {
        if (ctrl.property === property) {
          ctrl.updateDisplay();
          break;
        }
      }
    }
  };
}