// PlayerController.js - First-person camera controls with WASD movement
// ========================================================================
// This module handles all player input and movement for the horror game.
// Designed to support future features like terrain following, collision,
// stamina, and different movement states (crouching, stunned, etc.)

import * as THREE from 'three';

// Movement configuration - all speeds in meters per second
const MOVEMENT_CONFIG = {
  walkSpeed: 3.5,           // Normal walking pace
  sprintMultiplier: 1.5,    // Sprint is 1.5x walk speed (5.25 m/s)
  acceleration: 10,         // How quickly we reach target speed
  deceleration: 15,         // How quickly we stop (slightly faster than accel)
  mouseSensitivity: 0.002,  // Mouse look sensitivity

  // Future-proofing for upcoming features
  jumpHeight: 1.5,          // For future jumping
  stepHeight: 0.3,          // Maximum step-up height (future)
  slopeLimit: 45,           // Maximum walkable slope in degrees (future)
  crouchSpeedMultiplier: 0.5, // For future crouching
};

/**
 * Creates a first-person player controller with mouse look and WASD movement
 *
 * @param {Object} params Configuration object
 * @param {THREE.Camera} params.camera - The player's camera
 * @param {THREE.WebGLRenderer} params.renderer - The renderer (for pointer lock)
 * @param {THREE.Scene} params.scene - The scene (for future collision checks)
 * @param {THREE.SpotLight} params.flashlight - The player's flashlight
 * @param {Object} params.constants - Scene constants (ground size, etc.)
 * @returns {Object} Controller with update method and settings
 */
export function createPlayerController({ camera, renderer, scene, flashlight, constants }) {
  // =============== MOUSE LOOK STATE ===============
  let yaw = 0;    // Horizontal rotation (radians)
  let pitch = 0;  // Vertical rotation (radians)
  let mouseSensitivity = MOVEMENT_CONFIG.mouseSensitivity;
  let isPointerLocked = false;

  // =============== MOVEMENT STATE ===============
  // Input state - what keys are currently pressed
  const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,     // Future
    crouch: false,   // Future
  };

  // Movement physics state
  const velocity = new THREE.Vector3(0, 0, 0);      // Current velocity
  const acceleration = new THREE.Vector3(0, 0, 0);  // Current acceleration

  // Movement calculation helpers
  const moveDirection = new THREE.Vector3();
  const strafeDirection = new THREE.Vector3();
  const desiredVelocity = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);

  // Ground constraints (will be replaced by collision detection)
  const groundBounds = {
    minX: -constants.GROUND_SIZE * 0.45,  // Stay away from edges
    maxX: constants.GROUND_SIZE * 0.45,
    minZ: -constants.GROUND_SIZE * 0.45,
    maxZ: constants.GROUND_SIZE * 0.45,
  };

  // =============== POINTER LOCK SETUP ===============
  renderer.domElement.addEventListener('click', () => {
    if (!isPointerLocked) {
      renderer.domElement.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
    if (isPointerLocked) {
      console.log('✓ Mouse captured - move to look around, ESC to release');
    } else {
      console.log('✓ Mouse released - click to capture again');
    }
  });

  // =============== MOUSE MOVEMENT ===============
  document.addEventListener('mousemove', (event) => {
    if (!isPointerLocked) return;

    // Get mouse movement delta
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Update rotation angles
    yaw += movementX * mouseSensitivity;
    pitch -= movementY * mouseSensitivity;

    // Clamp pitch to prevent over-rotation
    const maxPitch = Math.PI / 2 - 0.1; // Can't look completely up/down
    pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));
  });

  // =============== KEYBOARD INPUT ===============
  // Keyboard mappings
  const keyMap = {
    'w': 'forward',
    'arrowup': 'forward',
    's': 'backward',
    'arrowdown': 'backward',
    'a': 'left',
    'arrowleft': 'left',
    'd': 'right',
    'arrowright': 'right',
    'shift': 'sprint',
    ' ': 'jump',        // Spacebar (future)
    'control': 'crouch', // Ctrl (future)
    'c': 'crouch',      // Alternative crouch key (future)
  };

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Movement keys
    if (keyMap[key]) {
      keys[keyMap[key]] = true;
      e.preventDefault(); // Prevent page scroll with arrow keys
    }

    // Flashlight toggle (separate from movement)
    if (key === 'f') {
      flashlight.visible = !flashlight.visible;
      console.log(`🔦 Flashlight ${flashlight.visible ? 'ON' : 'OFF'}`);
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keyMap[key]) {
      keys[keyMap[key]] = false;
      e.preventDefault();
    }
  });

  // =============== MOVEMENT CALCULATION ===============
  /**
   * Calculate desired movement direction based on input
   * @param {number} deltaTime - Time since last frame
   * @returns {THREE.Vector3} Desired velocity vector
   */
  function calculateDesiredVelocity(deltaTime) {
    // Reset desired velocity
    desiredVelocity.set(0, 0, 0);

    // Get camera's forward direction (projected onto XZ plane)
    camera.getWorldDirection(moveDirection);
    moveDirection.y = 0; // Keep movement horizontal
    moveDirection.normalize();

    // Calculate strafe direction (perpendicular to forward)
    strafeDirection.crossVectors(moveDirection, worldUp).normalize();

    // Calculate input direction
    if (keys.forward) desiredVelocity.add(moveDirection);
    if (keys.backward) desiredVelocity.sub(moveDirection);
    if (keys.right) desiredVelocity.add(strafeDirection);
    if (keys.left) desiredVelocity.sub(strafeDirection);

    // Normalize diagonal movement (so you don't move faster diagonally)
    if (desiredVelocity.length() > 0) {
      desiredVelocity.normalize();

      // Apply movement speed
      const currentSpeed = keys.sprint ?
        MOVEMENT_CONFIG.walkSpeed * MOVEMENT_CONFIG.sprintMultiplier :
        MOVEMENT_CONFIG.walkSpeed;

      desiredVelocity.multiplyScalar(currentSpeed);
    }

    return desiredVelocity;
  }

  /**
   * Apply smooth acceleration/deceleration to movement
   * @param {THREE.Vector3} targetVelocity - Where we want to be
   * @param {number} deltaTime - Time since last frame
   */
  function smoothMovement(targetVelocity, deltaTime) {
    // Calculate acceleration needed to reach target velocity
    acceleration.subVectors(targetVelocity, velocity);

    // Limit acceleration (smooth start/stop)
    const accelMagnitude = acceleration.length();
    if (accelMagnitude > 0) {
      const maxAccel = targetVelocity.length() > 0 ?
        MOVEMENT_CONFIG.acceleration :
        MOVEMENT_CONFIG.deceleration;

      const actualAccel = Math.min(accelMagnitude, maxAccel * deltaTime);
      acceleration.normalize().multiplyScalar(actualAccel);

      // Apply acceleration to velocity
      velocity.add(acceleration);
    }

    // If we're very close to target velocity, just set it
    if (velocity.distanceTo(targetVelocity) < 0.01) {
      velocity.copy(targetVelocity);
    }
  }

  /**
   * Validate and apply movement (simple boundary check for now)
   * @param {THREE.Vector3} movement - Proposed movement vector
   * @returns {boolean} Whether movement was valid
   */
  function validateAndApplyMovement(movement) {
    // Calculate new position
    const newPosition = camera.position.clone().add(movement);

    // Simple boundary clamping (will be replaced with proper collision)
    newPosition.x = Math.max(groundBounds.minX, Math.min(groundBounds.maxX, newPosition.x));
    newPosition.z = Math.max(groundBounds.minZ, Math.min(groundBounds.maxZ, newPosition.z));

    // Keep player at ground level (will be replaced with terrain following)
    newPosition.y = constants.CAMERA_HEIGHT;

    // Apply validated position
    camera.position.copy(newPosition);

    return true; // For now, always succeed
  }

  // =============== UPDATE FUNCTION ===============
  /**
   * Main update function - call this every frame
   * @param {number} deltaTime - Time since last frame in seconds
   */
  function update(deltaTime) {
    // Clamp deltaTime to prevent huge jumps (e.g., after tab switch)
    deltaTime = Math.min(deltaTime, 0.1);

    // === Update camera rotation from mouse ===
    const lookDirection = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );

    // Apply rotation to camera
    camera.lookAt(
      camera.position.x + lookDirection.x,
      camera.position.y + lookDirection.y,
      camera.position.z + lookDirection.z
    );

    // === Calculate and apply movement ===
    const targetVelocity = calculateDesiredVelocity(deltaTime);
    smoothMovement(targetVelocity, deltaTime);

    // Apply velocity to position (with validation)
    if (velocity.length() > 0.01) {
      const movement = velocity.clone().multiplyScalar(deltaTime);
      validateAndApplyMovement(movement);
    }

    // === Update flashlight to follow camera ===
    if (flashlight.visible) {
      // Position flashlight at camera position
      flashlight.position.copy(camera.position);

      // Point flashlight where camera is looking
      const flashlightTarget = camera.position.clone().add(
        lookDirection.multiplyScalar(10)
      );
      flashlight.target.position.copy(flashlightTarget);
    }

    // === Debug output (remove in production) ===
    if (keys.forward || keys.backward || keys.left || keys.right) {
      const speed = velocity.length().toFixed(1);
      const mode = keys.sprint ? 'SPRINT' : 'WALK';
      // Movement: ${mode} at ${speed} m/s
    }
  }

  // =============== PUBLIC API ===============
  return {
    update,

    // Settings that can be adjusted at runtime
    setSensitivity: (value) => {
      mouseSensitivity = value;
    },

    setWalkSpeed: (value) => {
      MOVEMENT_CONFIG.walkSpeed = value;
    },

    // Utility methods for GUI or debugging
    getVelocity: () => velocity.clone(),
    getSpeed: () => velocity.length(),
    isMoving: () => velocity.length() > 0.01,
    isSprinting: () => keys.sprint,

    // For future features
    getPosition: () => camera.position.clone(),
    setPosition: (pos) => camera.position.copy(pos),

    // Reset to starting position (useful for testing)
    reset: () => {
      camera.position.set(0, constants.CAMERA_HEIGHT, constants.CAMERA_START_Z);
      velocity.set(0, 0, 0);
      yaw = 0;
      pitch = 0;
    }
  };
}