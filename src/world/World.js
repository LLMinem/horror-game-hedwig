// World.js - Physical world elements (fog, lights, ground, objects)
// This module creates everything you can see and interact with in the world

import * as THREE from 'three';

/**
 * Creates the physical world including fog, lights, ground, and test objects
 * @param {Object} params - Configuration parameters
 * @param {THREE.Scene} params.scene - The Three.js scene to add objects to
 * @param {Object} params.constants - Scene constants from config
 * @param {Object} params.defaults - Default values for fog, lights, etc.
 * @returns {Object} World components for external control
 */
export function createWorld({ scene, constants, defaults }) {
  const DEG2RAD = Math.PI / 180; // Local conversion factor

  // =============== FOG SETUP
  // FogExp2 creates exponential fog - more realistic than linear fog
  // The density parameter controls how quickly the fog thickens with distance
  // Formula: fogFactor = 1 - e^(-distance * density)
  // At density 0.02: ~50% visibility at 35m, ~86% fog at 100m
  scene.fog = new THREE.FogExp2(
    defaults.fogColor,   // Bluish charcoal for night atmosphere
    defaults.fogDensity  // 0.02 gives us ~70-80m practical visibility
  );

  // =============== LIGHTING SETUP
  // We use three light sources to create believable night lighting:

  // 1) MOON (DirectionalLight) - Main light source
  // DirectionalLight simulates light from an infinitely distant source
  // All rays are parallel, creating consistent shadows (like sun/moon)
  const moon = new THREE.DirectionalLight(
    0x9bb7ff,  // Cool blue-white color (moonlight is slightly blue)
    defaults.moonIntensity  // 0.8 intensity for subtle night lighting
  );

  // Position doesn't affect light direction, only shadow camera position
  moon.position.set(defaults.moonX, defaults.moonY, defaults.moonZ);
  moon.target.position.set(0, 0, 0); // Point at world origin

  // Shadow configuration for soft, realistic shadows
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);  // Shadow map resolution
  moon.shadow.camera.near = 0.5;        // Shadow camera near plane
  moon.shadow.camera.far = 120;         // Shadow camera far plane
  moon.shadow.camera.left = -60;        // Shadow coverage area
  moon.shadow.camera.right = 60;
  moon.shadow.camera.top = 60;
  moon.shadow.camera.bottom = -60;
  moon.shadow.bias = defaults.shadowBias;           // Prevents shadow acne
  moon.shadow.normalBias = defaults.shadowNormalBias; // Prevents peter-panning

  scene.add(moon);
  scene.add(moon.target); // Must add target for directional light to work

  // 2) HEMISPHERE LIGHT - Sky/ground color bounce
  // HemisphereLight simulates light bouncing between sky and ground
  // Objects facing up get sky color, objects facing down get ground color
  const hemi = new THREE.HemisphereLight(
    0x20324f,  // Sky color: subtle blue from above
    0x0a0f18,  // Ground color: very dark from below
    defaults.hemiIntensity  // 0.25 intensity for subtle fill light
  );
  scene.add(hemi);

  // 3) AMBIENT LIGHT - Base illumination
  // AmbientLight adds uniform light from all directions
  // Use sparingly - too much flattens the scene
  const amb = new THREE.AmbientLight(
    0x1b1e34,  // Very dark blue
    defaults.ambientIntensity  // 0.05 - just enough to see in shadows
  );
  scene.add(amb);

  // =============== GROUND WITH TEXTURES
  // Load textures using Three.js TextureLoader
  const textureLoader = new THREE.TextureLoader();

  // Load grass textures (2K resolution for quality)
  // Color map: The base color/albedo of the surface
  const grassColorTex = textureLoader.load('/assets/textures/ground/grass_color_2k.jpg');
  // Normal map: Adds surface detail without additional geometry
  const grassNormalTex = textureLoader.load('/assets/textures/ground/grass_normal_2k.jpg');

  // Configure texture tiling for seamless repetition
  const groundTiling = defaults.groundTiling;
  grassColorTex.wrapS = grassColorTex.wrapT = THREE.RepeatWrapping;
  grassNormalTex.wrapS = grassNormalTex.wrapT = THREE.RepeatWrapping;
  grassColorTex.repeat.set(groundTiling, groundTiling);
  grassNormalTex.repeat.set(groundTiling, groundTiling);

  // CRITICAL: Mark color texture as sRGB for correct gamma
  // Without this, textures appear too dark or washed out
  grassColorTex.colorSpace = THREE.SRGBColorSpace;

  // Create ground plane geometry
  const groundGeo = new THREE.PlaneGeometry(
    constants.GROUND_SIZE,  // 500x500 units
    constants.GROUND_SIZE
  );

  // Create PBR material with textures
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassColorTex,           // Color/albedo map
    normalMap: grassNormalTex,     // Normal map for surface detail
    normalScale: new THREE.Vector2(defaults.normalStrength, defaults.normalStrength),
    roughness: 0.8,                // Grass is fairly rough
    metalness: 0.0,                // Grass is not metallic
    envMapIntensity: 0.25,         // Will be overridden by Environment module
  });

  // Create ground mesh and rotate to horizontal
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;  // Rotate from vertical to horizontal
  ground.receiveShadow = true;        // Ground receives shadows from objects
  scene.add(ground);

  // =============== TEST OBJECTS
  // These objects help test lighting, shadows, and materials

  const testObjects = [];  // Keep track for potential cleanup

  // TOMBSTONES - Test shadow casting and stone material
  for (let i = 0; i < 5; i++) {
    const tombMat = new THREE.MeshStandardMaterial({
      color: 0x7a808a,      // Light grey stone color
      roughness: 0.65,      // Stone is somewhat rough
      metalness: 0.0,       // Stone is not metallic
      envMapIntensity: 0.15 // Low reflection for matte stone
    });
    const tomb = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.5, 0.3),  // Thin rectangular shape
      tombMat
    );
    tomb.position.set(
      Math.random() * 20 - 10,  // Random X: -10 to 10
      1.25,                      // Y: Half height above ground
      Math.random() * 20 - 10   // Random Z: -10 to 10
    );
    tomb.castShadow = true;
    tomb.receiveShadow = true;
    scene.add(tomb);
    testObjects.push(tomb);
  }

  // TREE TRUNKS - Test cylinder geometry and bark material
  for (let i = 0; i < 3; i++) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 6, 8),  // Tapered cylinder
      new THREE.MeshStandardMaterial({
        color: 0x3a2f26,    // Dark brown bark
        roughness: 0.95     // Very rough bark surface
      })
    );
    trunk.position.set(
      Math.random() * 30 - 15,  // Random X: -15 to 15
      3,                         // Y: Half height above ground
      Math.random() * 30 - 15   // Random Z: -15 to 15
    );
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    testObjects.push(trunk);
  }

  // METAL POSTS - Test metallic material and reflections
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 3, 0.15),  // Thin vertical post
      new THREE.MeshStandardMaterial({
        color: 0x9a9a9a,        // Light grey metal
        roughness: 0.3,         // Shiny metal surface
        metalness: 1.0,         // Fully metallic
        envMapIntensity: 0.5    // Strong reflections
      })
    );
    post.position.set(
      -20 + i * 5,  // Evenly spaced along X axis
      1.5,          // Y: Half height above ground
      -15           // Fixed Z position
    );
    post.castShadow = true;
    post.receiveShadow = true;
    scene.add(post);
    testObjects.push(post);
  }

  // TEST SPHERE - Good for checking lighting from all angles
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x9aa2b5,       // Light purple-grey
      roughness: 0.5,        // Medium roughness
      metalness: 0.0,        // Non-metallic
      envMapIntensity: 0.15  // Some environment reflection
    })
  );
  sphere.position.set(5, 1, 5);  // Fixed position for reference
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);
  testObjects.push(sphere);

  // =============== FLASHLIGHT (SpotLight)
  // SpotLight creates a cone of light, perfect for flashlights
  const flashlight = new THREE.SpotLight(
    0xfff2d0,                              // Warm white color
    defaults.flashlightIntensity,         // Intensity (50 is good for night)
    defaults.flashlightDistance,          // Max distance (45 units)
    defaults.flashlightAngle * DEG2RAD,   // Cone angle (28 degrees)
    defaults.flashlightPenumbra,          // Soft edge (0.4)
    2                                      // Distance attenuation
  );
  flashlight.visible = false;  // Start with flashlight off
  flashlight.castShadow = true; // Flashlight casts shadows

  scene.add(flashlight);
  scene.add(flashlight.target); // SpotLight needs a target

  // =============== PUBLIC API
  // Return references to objects that need external control
  return {
    // Fog reference (for GUI control)
    fog: scene.fog,

    // Light references (for GUI control)
    lights: {
      moon,
      hemi,
      amb
    },

    // Ground references (for texture updates)
    ground,
    groundMat,
    textures: {
      grassColorTex,
      grassNormalTex
    },

    // Flashlight (for player control)
    flashlight,

    // Test objects array (for potential cleanup)
    testObjects,

    // Helper function to toggle test objects visibility
    setTestObjectsVisible: (visible) => {
      testObjects.forEach(obj => obj.visible = visible);
    }
  };
}