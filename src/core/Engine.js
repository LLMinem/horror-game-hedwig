// Engine.js - Core Three.js setup (renderer, scene, camera, clock)
// This is the foundation everything else builds on

import * as THREE from 'three';

/**
 * Creates the core engine components
 * @param {Object} constants - Scene constants from config
 * @returns {Object} Engine components and utilities
 */
export function createEngine(constants) {
  // =============== SCENE
  // The container for all 3D objects
  const scene = new THREE.Scene();
  // Note: We no longer set scene.background - the skydome handles that now

  // =============== RENDERER
  // The WebGL renderer that draws everything to the canvas
  const renderer = new THREE.WebGLRenderer({
    antialias: true, // Smooth edges
    powerPreference: 'high-performance', // Request dedicated GPU
  });

  // Set initial size
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Pixel ratio for crisp rendering on high-DPI displays
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Shadow configuration for atmospheric lighting
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadow edges

  // Tone mapping for photorealistic lighting
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // Film-like response
  renderer.toneMappingExposure = 1.0; // Neutral starting point

  // Color management - critical for correct colors
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Add to DOM
  document.body.appendChild(renderer.domElement);

  // =============== CLOCK
  // For time-based animations and effects
  const clock = new THREE.Clock();

  // =============== CAMERA
  // First-person perspective camera
  const camera = new THREE.PerspectiveCamera(
    75, // Field of view in degrees
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane (objects closer than this won't render)
    constants.FAR_PLANE // Far clipping plane
  );

  // Set initial position
  camera.position.set(0, constants.CAMERA_HEIGHT, constants.CAMERA_START_Z);

  // =============== RESIZE HANDLING
  // Keep track of resize callbacks from other modules
  const resizeCallbacks = [];

  // Handle window resize
  const handleResize = () => {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Call any registered resize callbacks
    resizeCallbacks.forEach(callback => callback());
  };

  // Attach resize listener
  window.addEventListener('resize', handleResize);

  // =============== PUBLIC API
  return {
    scene,
    renderer,
    camera,
    clock,

    // Method to register resize callbacks from other modules
    onResize: (callback) => {
      resizeCallbacks.push(callback);
    },

    // Method to clean up (useful for hot module replacement)
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      document.body.removeChild(renderer.domElement);
    }
  };
}