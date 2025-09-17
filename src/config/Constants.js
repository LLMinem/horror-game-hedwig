// Constants.js - Central configuration for the horror game
// All the magic numbers and default values live here

// =============== SCENE CONSTANTS
export const SCENE_CONSTANTS = {
  // World dimensions
  SKYDOME_RADIUS: 1000, // Celestial sphere radius
  GROUND_SIZE: 500, // Ground plane dimensions
  FAR_PLANE: 5000, // Camera far clipping plane

  // Camera settings
  CAMERA_HEIGHT: 1.7, // Player eye level (average human height)
  CAMERA_START_Z: 15, // Starting position

  // Stars
  DEFAULT_STAR_COUNT: 3000, // Number of stars to generate

  // Texture quality
  GROUND_TILING: 64, // Default texture tiling for ground
};

// Math helper constants
export const DEG2RAD = Math.PI / 180; // Degree to radian conversion factor

// =============== DEFAULT VALUES FOR GUI CONTROLS
// These are the starting values and also what we reset to on double-click
export const DEFAULTS = {
  // Rendering
  exposure: 1.0,
  envIntensity: 0.25,
  hdri: 'dikhololo_night',

  // Lights
  moonIntensity: 0.8,
  moonX: 12,
  moonY: 30,
  moonZ: 16,
  hemiIntensity: 0.25,
  ambientIntensity: 0.05,

  // Fog
  fogDensity: 0.02, // Optimal for 70-80m visibility
  fogType: 'exp2',
  fogColor: '#141618', // Bluish charcoal for night atmosphere
  fogMax: 0.95, // Maximum fog opacity at horizon

  // Flashlight
  flashlightIntensity: 50,
  flashlightAngle: 28,
  flashlightPenumbra: 0.4,
  flashlightDistance: 45,

  // Shadows
  shadowBias: -0.001,
  shadowNormalBias: 0.02,

  // Ground texture controls
  groundTiling: SCENE_CONSTANTS.GROUND_TILING,
  normalStrength: 1.0,

  // Sky gradient (4-stop for realistic night)
  skyHorizonColor: '#2b2822', // USER TUNED: Warmer horizon
  skyMidLowColor: '#0f0e14', // USER TUNED: Dark plum
  skyMidHighColor: '#080a10', // USER TUNED: Deeper blue
  skyZenithColor: '#040608', // USER TUNED: Almost black
  skyMidLowStop: 0.25, // Where first transition happens
  skyMidHighStop: 0.6, // Where second transition happens

  // Light pollution controls
  village1Azimuth: -45, // Northwest direction (degrees)
  village1Intensity: 0.15, // USER TUNED: Near village glow
  village1Spread: 70, // USER TUNED: Focused spread
  village1Height: 0.35, // USER TUNED: Max altitude
  village2Azimuth: 135, // Southeast direction (degrees)
  village2Intensity: 0.06, // USER TUNED: Distant village
  village2Spread: 60, // USER TUNED: Broader spread
  village2Height: 0.15, // USER TUNED: Lower on horizon
  pollutionColor: '#3D2F28', // Warm sodium lamp color

  // Dithering
  skyDitherAmount: 0.008, // Dithering to prevent gradient banding

  // THREE.Points star system
  starEnabled: true,
  starCount: SCENE_CONSTANTS.DEFAULT_STAR_COUNT, // USER TUNED: More stars
  starBrightness: 1.0, // USER TUNED: Full brightness stars
  starSizeMin: 0.8, // USER TUNED: Min size
  starSizeMax: 5.0, // USER TUNED: Max size
  starHorizonFade: 0.3, // USER TUNED: Horizon fade
  starAntiAlias: true,
  starTint: '#F5FFF9', // Star color tint (neutral white, less green)

  // Horror atmosphere controls
  horrorEnabled: false, // Horror mode off by default
  horrorDesat: 0.25, // Desaturation amount
  horrorGreenTint: 0.12, // Green tint strength
  horrorContrast: 0.12, // Contrast adjustment
  horrorVignette: 0.35, // Vignette strength
  horrorBreatheAmp: 0.0, // Breathing amplitude (off by default)
  horrorBreatheSpeed: 0.15, // Breathing speed
};

// HDRI options available
export const HDRI_OPTIONS = {
  'moonless_golf': 'moonless_golf',
  'dikhololo_night': 'dikhololo_night',
  'satara_night': 'satara_night',
  // Add more as needed
};