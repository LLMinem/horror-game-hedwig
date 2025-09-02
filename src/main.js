import * as THREE from 'three';

// =====================================
// SCENE SETUP
// =====================================
const scene = new THREE.Scene();

// =====================================
// NIGHT SKY GRADIENT
// =====================================
// Creating a gradient background to simulate night sky
// This is more performant than a skybox and gives us precise control
const canvas = document.createElement('canvas');
canvas.width = 2;
canvas.height = 512;
const context = canvas.getContext('2d');
const gradient = context.createLinearGradient(0, 0, 0, 512);

// Night sky gradient colors (from research guide)
// Top: Deep blue-purple (like night sky away from horizon)
// Middle: Darker blue (transition zone)  
// Bottom: Almost black (horizon during night)
gradient.addColorStop(0, '#0A0A2E');    // Top - Deep blue (RGB: 10, 10, 46)
gradient.addColorStop(0.4, '#050520');  // Middle - Darker blue
gradient.addColorStop(1, '#000000');    // Horizon - Black

context.fillStyle = gradient;
context.fillRect(0, 0, 2, 512);

const skyTexture = new THREE.CanvasTexture(canvas);
scene.background = skyTexture;

// =====================================
// FOG CONFIGURATION
// =====================================
// Fog is CRITICAL for horror atmosphere - adds depth and mystery
// Linear fog gives us precise control over visibility distance
// Color should match or be slightly darker than sky horizon
scene.fog = new THREE.Fog(
  0x1a1a3e,  // Color: Dark blue (matches sky) - RGB: (26, 26, 62)
  30,        // Near: Start fading at 30 meters
  60         // Far: Complete fade at 60 meters (as per spec)
);

// Alternative: Exponential fog (more realistic but harder to control)
// scene.fog = new THREE.FogExp2(0x1a1a3e, 0.02);
// Density: 0.01-0.03 typical for night scenes

// =====================================
// CAMERA SETUP
// =====================================
const camera = new THREE.PerspectiveCamera(
  75,  // FOV - Standard for first-person games
  window.innerWidth / window.innerHeight,
  0.1, // Near plane
  100  // Far plane - matches fog distance
);
// Position camera to see the lit side of objects
camera.position.set(0, 5, 15); // Elevated for better ground view
camera.lookAt(0, 0, 0);

// =====================================
// RENDERER CONFIGURATION
// =====================================
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Shadow configuration - essential for depth perception
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows for realism

// Tone mapping for better color in dark scenes
renderer.toneMapping = THREE.ACESFilmicToneMapping;
// CRITICAL: Lower exposure for true night (default is 1.0)
// Range: 0.5-1.0 for night scenes
renderer.toneMappingExposure = 0.8; // Darker for proper night atmosphere

renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// =====================================
// THREE-LIGHT SYSTEM FOR NIGHT
// =====================================
// Based on research: Every good night scene uses THREE types of light

// 1. HEMISPHERE LIGHT - Sky/Ground bounce simulation
// This creates natural outdoor lighting by simulating light bouncing between sky and ground
const hemisphereLight = new THREE.HemisphereLight(
  0x3a3a5a,  // Sky color: Dark blue-gray (RGB: 58, 58, 90)
  0x080820,  // Ground color: Very dark blue (RGB: 8, 8, 32) 
  0.2        // Intensity: 0.15-0.25 for horror night scenes
);
scene.add(hemisphereLight);

// 2. AMBIENT LIGHT - Base visibility
// Ensures nothing is pure black (unplayable)
// Keep very low to maintain darkness while allowing gameplay
const ambientLight = new THREE.AmbientLight(
  0x222244,  // Color: Very dark blue (RGB: 34, 34, 68)
  0.15       // Intensity: 0.05-0.15 for true night (research guide)
);
scene.add(ambientLight);

// 3. DIRECTIONAL LIGHT - The Moon
// This is our primary light source casting shadows
// CRITICAL: Position in front of camera view to see lit surfaces
const moonLight = new THREE.DirectionalLight(
  0x4488cc,  // Color: Soft blue-white moonlight (RGB: 68, 136, 204)
  0.3        // Intensity: 0.2-0.4 for night (0.3 is sweet spot)
);

// Moon position: High and in front-right of camera
// This ensures we see moonlit surfaces, not shadows
moonLight.position.set(10, 30, 20); // Front-right, high in sky
moonLight.target.position.set(0, 0, 0); // Aim at scene center
moonLight.castShadow = true; // ONLY this light casts shadows (performance)

// Shadow configuration - balance quality vs performance
moonLight.shadow.mapSize.width = 1024;   // Options: 512, 1024, 2048
moonLight.shadow.mapSize.height = 1024;  // Higher = better quality, worse performance
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;       // Don't calculate shadows beyond fog
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;

// Shadow bias to prevent acne artifacts
moonLight.shadow.bias = -0.002;
moonLight.shadow.normalBias = 0.02;

scene.add(moonLight);
scene.add(moonLight.target);

// Optional: Light helper for debugging (invisible by default)
const moonHelper = new THREE.DirectionalLightHelper(moonLight, 1);
moonHelper.visible = false; // Set to true to see light direction
scene.add(moonHelper);

// =====================================
// GROUND PLANE
// =====================================
const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);

// Ground material using MeshStandardMaterial for PBR lighting
// This gives us realistic light interaction
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x2a3a2a,        // Dark cemetery grass (RGB: 42, 58, 42)
                          // Range: 0x1a2a1a to 0x3a4a3a for night grass
  
  roughness: 0.9,         // Very rough surface (grass isn't shiny)
                          // Range: 0.8-1.0 for organic materials
  
  metalness: 0.0,         // No metallic properties (it's organic)
                          // Always 0 for grass/dirt
  
  // Emissive prevents pure black in shadows (maintains visibility)
  emissive: 0x0a0a0a,     // Very subtle self-illumination (RGB: 10, 10, 10)
                          // Range: 0x000000 to 0x0f0f0f for night
  
  emissiveIntensity: 0.1, // How strong the emissive glow is
                          // Range: 0.0-0.2 for subtle effect
  
  side: THREE.DoubleSide,
  flatShading: false      // Smooth shading for natural look
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
ground.position.y = 0;
ground.receiveShadow = true; // Ground receives shadows from objects
scene.add(ground);

// =====================================
// TEST OBJECTS - Cemetery Elements
// =====================================
// Adding various test objects to see how materials look in our lighting

// 1. TOMBSTONES - Gray stone material
for (let i = 0; i < 5; i++) {
  const tombstoneGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.3);
  
  // Stone material - slightly reflective, not too rough
  const tombstoneMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a4a5a,      // Gray with slight blue tint (RGB: 74, 74, 90)
                          // Range: 0x3a3a4a to 0x5a5a6a for stone
    
    roughness: 0.7,       // Some roughness for weathered stone
                          // Range: 0.6-0.8 for stone surfaces
    
    metalness: 0.1,       // Tiny bit for subtle highlights
                          // Range: 0.0-0.2 for non-metal objects
  });
  
  const tombstone = new THREE.Mesh(tombstoneGeometry, tombstoneMaterial);
  tombstone.position.set(
    Math.random() * 20 - 10,  // Random X position
    1.25,                      // Half-buried in ground
    Math.random() * 20 - 10   // Random Z position
  );
  tombstone.castShadow = true;
  tombstone.receiveShadow = true;
  scene.add(tombstone);
}

// 2. SIMPLE TREE TRUNKS - Dark brown/gray bark
for (let i = 0; i < 3; i++) {
  const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 6, 8);
  
  // Bark material - very rough, no shine
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2520,      // Dark brown-gray (RGB: 42, 37, 32)
    roughness: 0.95,      // Very rough bark texture
    metalness: 0.0        // No metallic properties
  });
  
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.position.set(
    Math.random() * 30 - 15,
    3,
    Math.random() * 30 - 15
  );
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);
}

// 3. CEMETERY FENCE POSTS - Old metal
for (let i = 0; i < 8; i++) {
  const postGeometry = new THREE.BoxGeometry(0.15, 3, 0.15);
  
  // Old metal material - some rust, low shine
  const postMaterial = new THREE.MeshStandardMaterial({
    color: 0x3a3a3a,      // Dark gray metal
    roughness: 0.8,       // Rusty, weathered
    metalness: 0.3        // Some metallic properties
  });
  
  const post = new THREE.Mesh(postGeometry, postMaterial);
  post.position.set(
    -20 + i * 5,          // Line them up
    1.5,
    -15
  );
  post.castShadow = true;
  post.receiveShadow = true;
  scene.add(post);
}

// 4. TEST SPHERE - To see how round objects look
const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
const sphereMaterial = new THREE.MeshStandardMaterial({
  color: 0x6a6a7a,        // Light gray for visibility
  roughness: 0.5,         // Medium roughness
  metalness: 0.2          // Slight metallic
});
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
sphere.position.set(5, 1, 5);
sphere.castShadow = true;
sphere.receiveShadow = true;
scene.add(sphere);

// =====================================
// WINDOW RESIZE HANDLER
// =====================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// =====================================
// ANIMATION LOOP
// =====================================
function animate() {
  requestAnimationFrame(animate);
  
  // Optional: Slowly rotate moon for dynamic lighting
  // Uncomment to see lighting changes over time
  // const time = Date.now() * 0.0001;
  // moonLight.position.x = Math.cos(time) * 20;
  // moonLight.position.z = Math.sin(time) * 20;
  
  renderer.render(scene, camera);
}

// Start the animation
animate();

// =====================================
// DEBUG INFO
// =====================================
console.log('Night Scene Reference Implementation Loaded');
console.log('Lighting Configuration:');
console.log('- Moonlight: 0x4488cc @ 0.3 intensity');
console.log('- Hemisphere: Sky 0x3a3a5a, Ground 0x080820 @ 0.2');
console.log('- Ambient: 0x222244 @ 0.15');
console.log('- Fog: 0x1a1a3e from 30m to 60m');
console.log('- Exposure: 0.8 (darker for night)');