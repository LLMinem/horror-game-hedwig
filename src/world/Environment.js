// Environment.js - HDRI environment maps for image-based lighting
// Handles loading HDR images and applying them for realistic lighting and reflections

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Creates the environment system for HDR image-based lighting
 * @param {Object} params - Configuration parameters
 * @param {THREE.WebGLRenderer} params.renderer - The Three.js renderer
 * @param {THREE.Scene} params.scene - The Three.js scene
 * @param {string} params.initialHDRI - Initial HDRI name to load
 * @param {number} params.initialIntensity - Initial environment intensity
 * @returns {Object} Environment controls and utilities
 */
export function createEnvironment({ renderer, scene, initialHDRI = 'dikhololo_night', initialIntensity = 0.25 }) {

  // =============== PMREM GENERATOR SETUP
  // PMREM = Pre-filtered Mipmap Radiance Environment Maps
  // This converts HDR images into a format optimized for real-time rendering
  // It pre-calculates different roughness levels for accurate reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader(); // Compile shader for converting equirectangular HDRIs

  // Track current settings for updates
  let currentEnvMap = null;
  let currentEnvIntensity = initialIntensity;
  let currentHDRI = initialHDRI;

  // =============== RGBE LOADER
  // RGBE format stores HDR images with RGB + Exponent encoding
  // This allows for much wider dynamic range than standard images
  const rgbeLoader = new RGBELoader();

  // =============== THE THREE.JS r179 FIX
  // CRITICAL: In Three.js r179+, environment maps don't automatically apply
  // We MUST manually set material.envMap = scene.environment for reflections to work
  // This is a breaking change from earlier versions where scene.environment was enough

  /**
   * Applies environment map to all materials in the scene
   * This is the critical r179 fix - without this, materials won't have reflections!
   * @param {THREE.Object3D} root - Root object to traverse (usually scene)
   * @param {THREE.Texture} envMap - The environment map texture
   * @param {number} intensity - Environment map intensity (0-1)
   */
  function applyEnvMapToMaterials(root, envMap, intensity) {
    let count = 0;

    root.traverse((obj) => {
      // Check if object is a mesh with a material that supports environment maps
      if (obj.isMesh && obj.material) {
        // MeshStandardMaterial and MeshPhysicalMaterial support envMaps
        if ('envMapIntensity' in obj.material) {
          // THE FIX: Must explicitly set envMap on each material!
          obj.material.envMap = envMap;
          obj.material.envMapIntensity = intensity;
          obj.material.needsUpdate = true; // Force shader recompilation
          count++;
        }
      }
    });

    console.log(`Applied envMap to ${count} materials (r179 fix)`);
    return count;
  }

  /**
   * Updates only the intensity of existing environment maps
   * More efficient than reapplying the entire envMap
   * @param {THREE.Object3D} root - Root object to traverse
   * @param {number} intensity - New environment intensity
   */
  function updateEnvIntensity(root, intensity) {
    currentEnvIntensity = intensity;
    let count = 0;

    root.traverse((obj) => {
      if (obj.isMesh && obj.material && obj.material.envMap) {
        obj.material.envMapIntensity = intensity;
        // Note: No needsUpdate required for just changing intensity
        count++;
      }
    });

    return count;
  }

  /**
   * Loads a new HDRI environment map
   * @param {string} hdriName - Name of the HDRI file (without path/extension)
   * @returns {Promise} Resolves when HDRI is loaded and applied
   */
  function loadHDRI(hdriName) {
    return new Promise((resolve, reject) => {
      const hdriPath = `/assets/hdri/${hdriName}_2k.hdr`;
      console.log(`Loading HDRI: ${hdriPath}`);

      rgbeLoader.load(
        hdriPath,
        (hdrTexture) => {
          // Success callback
          console.log(`Processing HDRI: ${hdriName}`);

          // Convert the equirectangular HDR image to a cube environment map
          // This is what allows for realistic reflections from all angles
          const envMap = pmrem.fromEquirectangular(hdrTexture).texture;

          // Set as scene environment (for diffuse lighting)
          scene.environment = envMap;

          // Store for later use
          currentEnvMap = envMap;
          currentHDRI = hdriName;

          // Clean up the original HDR texture (we only need the processed envMap)
          hdrTexture.dispose();

          // CRITICAL: Apply the r179 fix - set envMap on all materials!
          applyEnvMapToMaterials(scene, envMap, currentEnvIntensity);

          // Remove any fallback lighting if it exists
          const fallbackLight = scene.getObjectByName('HDRI_Fallback_Light');
          if (fallbackLight) {
            scene.remove(fallbackLight);
            console.log('Removed fallback lighting');
          }

          console.log(`✓ HDRI loaded and applied: ${hdriName}`);
          resolve(envMap);
        },
        (progress) => {
          // Progress callback
          const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
          console.log(`Loading HDRI... ${percent}%`);
        },
        (error) => {
          // Error callback
          console.error('Failed to load HDRI:', error);
          console.log('Applying fallback lighting to prevent black scene');

          // Create fallback ambient light so scene isn't completely dark
          const fallbackAmbient = new THREE.AmbientLight(0x404050, 0.3);
          fallbackAmbient.name = 'HDRI_Fallback_Light';

          // Remove any existing fallback lights
          const existingFallback = scene.getObjectByName('HDRI_Fallback_Light');
          if (existingFallback) {
            scene.remove(existingFallback);
          }

          scene.add(fallbackAmbient);
          reject(error);
        }
      );
    });
  }

  /**
   * Switches to a different HDRI
   * @param {string} hdriName - Name of the new HDRI to load
   */
  async function switchHDRI(hdriName) {
    if (hdriName === currentHDRI) {
      console.log(`HDRI ${hdriName} is already loaded`);
      return;
    }

    try {
      await loadHDRI(hdriName);
    } catch (error) {
      console.error(`Failed to switch to HDRI: ${hdriName}`, error);
    }
  }

  /**
   * Sets the environment intensity for all materials
   * @param {number} intensity - Environment intensity (0-1)
   */
  function setEnvIntensity(intensity) {
    const count = updateEnvIntensity(scene, intensity);
    console.log(`Updated env intensity to ${intensity} on ${count} materials`);
  }

  /**
   * Gets current environment settings
   * @returns {Object} Current HDRI name and intensity
   */
  function getSettings() {
    return {
      hdri: currentHDRI,
      intensity: currentEnvIntensity
    };
  }

  /**
   * Cleanup function for hot module replacement or scene disposal
   */
  function dispose() {
    if (currentEnvMap) {
      currentEnvMap.dispose();
    }
    pmrem.dispose();
  }

  // =============== INITIALIZE
  // Load the initial HDRI
  loadHDRI(initialHDRI).catch(error => {
    console.error('Failed to load initial HDRI:', error);
  });

  // =============== PUBLIC API
  return {
    loadHDRI,
    switchHDRI,
    setEnvIntensity,
    applyEnvMapToMaterials,
    updateEnvIntensity,
    getSettings,
    dispose,

    // Expose current state for debugging
    get currentHDRI() { return currentHDRI; },
    get currentIntensity() { return currentEnvIntensity; }
  };
}