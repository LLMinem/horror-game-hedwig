// loop/Loop.js - Animation Loop System
// ====================================
// Manages the game's render loop and updates all registered systems
// Provides a clean interface for adding systems that need per-frame updates

/**
 * Starts the animation loop with all necessary systems
 * @param {Object} config - Configuration object
 * @param {THREE.WebGLRenderer} config.renderer - Three.js renderer
 * @param {THREE.Scene} config.scene - Three.js scene
 * @param {THREE.Camera} config.camera - Three.js camera
 * @param {THREE.Clock} config.clock - Three.js clock for timing
 * @param {Array} config.systems - Array of systems with update methods
 *
 * Each system in the systems array should have an update method that receives:
 * - deltaTime: Time since last frame (for frame-independent movement)
 * - elapsedTime: Total time since start (for time-based animations)
 */
export function startLoop({ renderer, scene, camera, clock, systems = [] }) {
  // Validate required parameters
  if (!renderer || !scene || !camera || !clock) {
    throw new Error('Loop requires renderer, scene, camera, and clock');
  }

  // Main animation function
  function animate() {
    // Schedule next frame
    requestAnimationFrame(animate);

    // Get timing information
    const deltaTime = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update all registered systems
    // Systems are updated in the order they were added
    systems.forEach(system => {
      // Check if the system has an update method
      if (system && typeof system.update === 'function') {
        // Call update with both deltaTime and elapsedTime
        // Systems can choose which timing they need
        system.update(deltaTime, elapsedTime);
      }
    });

    // Render the scene
    renderer.render(scene, camera);
  }

  // Start the loop
  animate();

  // Return control object for future extensions
  // This allows for pausing, stopping, or modifying the loop later if needed
  return {
    addSystem: (system) => {
      if (system && typeof system.update === 'function') {
        systems.push(system);
      }
    },
    removeSystem: (system) => {
      const index = systems.indexOf(system);
      if (index > -1) {
        systems.splice(index, 1);
      }
    },
    getSystems: () => [...systems] // Return a copy to prevent external modification
  };
}