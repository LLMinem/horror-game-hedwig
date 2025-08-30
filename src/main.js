import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();

// Create gradient background for night sky
const canvas = document.createElement('canvas');
canvas.width = 2;
canvas.height = 512;
const context = canvas.getContext('2d');
const gradient = context.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#1e1e3f');  // Darker purple at top
gradient.addColorStop(0.5, '#0a0a2e'); // Deep blue in middle
gradient.addColorStop(1, '#050510');   // Almost black at horizon
context.fillStyle = gradient;
context.fillRect(0, 0, 2, 512);

const skyTexture = new THREE.CanvasTexture(canvas);
scene.background = skyTexture;

// Add subtle fog for depth (NOT heavy obscuring fog)
scene.fog = new THREE.Fog(0x1a1a3e, 40, 80); // More subtle: starts at 40m, ends at 80m

// Camera setup
const camera = new THREE.PerspectiveCamera(
  75, // FOV
  window.innerWidth / window.innerHeight,
  0.1, // Near plane
  100 // Far plane
);
camera.position.set(0, 5, 15); // Higher and further back to see ground
camera.lookAt(0, 0, 0); // Look at origin

// Renderer setup
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Proper exposure for night scene
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Hemisphere light for subtle ambient (sky and ground colors)
const hemisphereLight = new THREE.HemisphereLight(
  0x1a1a2e, // Very dark blue sky
  0x0f0f23, // Almost black ground
  0.3       // Low intensity for night
);
scene.add(hemisphereLight);

// Subtle ambient light to prevent pure black shadows
const ambientLight = new THREE.AmbientLight(0x404060, 0.2); // Subtle blue-gray
scene.add(ambientLight);

// Moonlight (main directional light)
const moonLight = new THREE.DirectionalLight(0x8888ff, 0.8); // Slightly brighter
moonLight.position.set(-15, 25, 10); // High and angled for better coverage
moonLight.target.position.set(0, 0, 0); // Explicitly target the ground center
moonLight.castShadow = true;

// Configure shadow properties for soft shadows
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -50;
moonLight.shadow.camera.right = 50;
moonLight.shadow.camera.top = 50;
moonLight.shadow.camera.bottom = -50;
moonLight.shadow.bias = -0.002;
moonLight.shadow.normalBias = 0.02;

scene.add(moonLight);
scene.add(moonLight.target); // Add target to scene

// Add a subtle moon glow helper (optional visual)
const moonHelper = new THREE.DirectionalLightHelper(moonLight, 1);
moonHelper.visible = false; // Hide by default, can enable for debugging
scene.add(moonHelper);

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
// DEBUG: Using MeshBasicMaterial with visible color
const groundMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x4a6a4a,  // Visible green color
  side: THREE.DoubleSide,
  wireframe: false  // Set to true to see wireframe for debugging
});

// Add some vertex variation for more natural look
const positionAttribute = groundGeometry.attributes.position;
for (let i = 0; i < positionAttribute.count; i++) {
  const y = 0.1 * Math.random() - 0.05; // Small height variation
  positionAttribute.setY(i, y);
}
groundGeometry.computeVertexNormals();

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to horizontal
ground.position.y = 0; // Position at origin level
ground.receiveShadow = true;
scene.add(ground);

// Add some reference objects to see the atmosphere
// Temporary cubes to visualize shadows and depth
for (let i = 0; i < 5; i++) {
  const cubeGeometry = new THREE.BoxGeometry(2, 3, 2);
  const cubeMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x8a8a9a,  // Lighter gray for visibility
    shininess: 10
  });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.position.set(
    Math.random() * 20 - 10,
    1.5,
    Math.random() * 20 - 10
  );
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  renderer.render(scene, camera);
}

// Start animation
animate();

console.log('Three.js scene initialized successfully');