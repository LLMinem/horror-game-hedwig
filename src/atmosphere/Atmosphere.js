// Atmosphere.js - Complete sky rendering system (skydome + stars)
// The sky and stars work together to create the night atmosphere

import * as THREE from 'three';

// =============== SKY VERTEX SHADER
// Calculates world-space direction for stable positioning
const skyVertexShader = `
  varying vec3 vDir;  // World-space direction (ignores camera translation)

  void main() {
    // CRITICAL: Extract only rotation from modelMatrix, ignore translation.
    // This provides a stable world-space direction for the celestial sphere.
    // This is what makes the light pollution stay fixed in the northwest!
    mat3 rotationOnly = mat3(modelMatrix);
    vDir = rotationOnly * position;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// =============== SKY FRAGMENT SHADER
// Creates the 4-color gradient with light pollution and effects
const skyFragmentShader = `
  precision highp float;

  // Four color stops for complex gradient
  uniform vec3 horizonColor;    // Bottom color (light pollution)
  uniform vec3 midLowColor;     // Lower-mid transition
  uniform vec3 midHighColor;    // Upper-mid transition
  uniform vec3 zenithColor;     // Top color (darkest sky)

  // Control where transitions happen (0-1 range)
  uniform float midLowStop;     // Where horizon transitions to mid-low
  uniform float midHighStop;    // Where mid-low transitions to mid-high

  // LIGHT POLLUTION SOURCES
  // Near village (NW-N, ~250m away)
  uniform vec3 village1Dir;        // Direction to village (normalized)
  uniform float village1Intensity; // Glow intensity (0.0-1.0)
  uniform float village1Spread;    // Angular spread in radians
  uniform float village1Height;    // Max height above horizon (0-1)

  // Distant village (SE, ~2km away)
  uniform vec3 village2Dir;        // Direction to distant village
  uniform float village2Intensity; // Much weaker intensity
  uniform float village2Spread;    // Broader spread
  uniform float village2Height;    // Lower height limit

  // DITHERING
  uniform float ditherAmount;      // How strong the dither effect is (0.0-0.01)

  // POLLUTION COLOR
  uniform vec3 pollutionColor;     // Color of light pollution glow

  // FOG INTEGRATION
  uniform vec3 fogColor;           // Scene fog color for blending
  uniform float fogDensity;        // Scene fog density for matching
  uniform float fogMax;            // Maximum fog opacity at horizon

  // HORROR GRADING
  uniform vec2 u_resolution;       // Viewport size for vignette
  uniform float u_time;            // Animation time in seconds
  uniform float u_horrorEnabled;   // 0.0 = off, 1.0 = on
  uniform float u_desat;           // Desaturation amount (0.0-1.0)
  uniform float u_greenTint;       // Green tint strength (0.0-1.0)
  uniform float u_contrast;        // Contrast adjustment (-0.5 to 0.5)
  uniform float u_vignette;        // Vignette strength (0.0-0.6)
  uniform float u_breatheAmp;      // Breathing amplitude (0.0-0.02)
  uniform float u_breatheSpeed;    // Breathing speed (0.0-1.0)

  // Note: Star field now handled by separate THREE.Points geometry (see ADR-003)

  varying vec3 vDir;  // World-space direction (same as used for light pollution)

  // Simple hash function for dithering noise
  float hash(vec2 p) {
    // This creates a pseudo-random value based on screen position
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // Luminance calculation for desaturation
  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  // Note: Star generation functions removed - stars now rendered via THREE.Points (see ADR-003)

  void main() {
    // Normalize the world-space direction
    vec3 dir = normalize(vDir);

    // Use Y component for altitude: 0 = horizon, 1 = straight up
    // Since we're using world-space direction, this is stable
    float altitude = clamp(dir.y, 0.0, 1.0);

    // SMOOTHSTEP: Creates smooth S-curve transitions
    // Now altitude=0 is TRUE VISUAL HORIZON, altitude=1 is zenith

    // Transition 1: Horizon to Mid-Low
    float t1 = smoothstep(0.0, midLowStop, altitude);
    vec3 col = mix(horizonColor, midLowColor, t1);

    // Transition 2: Mid-Low to Mid-High
    float t2 = smoothstep(midLowStop, midHighStop, altitude);
    col = mix(col, midHighColor, t2);

    // Transition 3: Mid-High to Zenith
    float t3 = smoothstep(midHighStop, 1.0, altitude);
    col = mix(col, zenithColor, t3);

    // ============ LIGHT POLLUTION CALCULATION ============
    // Calculate horizontal direction (ignore vertical component)
    vec3 horizDir = normalize(vec3(dir.x, 0.0, dir.z));

    // VILLAGE 1 (Near, NW-N, ~250m)
    float village1Alignment = dot(horizDir, village1Dir);
    // Convert alignment to glow intensity (falloff from center)
    float village1Glow = smoothstep(
      cos(village1Spread),  // Cutoff angle
      1.0,                  // Maximum at perfect alignment
      village1Alignment     // Current alignment
    ) * village1Intensity;

    // Fade with altitude (stronger near horizon)
    village1Glow *= smoothstep(village1Height, 0.0, altitude);

    // VILLAGE 2 (Distant, SE, ~2km)
    float village2Alignment = dot(horizDir, village2Dir);
    float village2Glow = smoothstep(
      cos(village2Spread),
      1.0,
      village2Alignment
    ) * village2Intensity;

    // Even stronger altitude falloff for distant source
    village2Glow *= smoothstep(village2Height, 0.0, altitude);

    // Add light pollution to base gradient
    col += pollutionColor * (village1Glow + village2Glow);

    // Note: Stars removed from fragment shader - now rendered via THREE.Points (see ADR-003)

    // Apply dithering to prevent color banding
    // Uses screen-space position for stable noise pattern
    float dither = hash(gl_FragCoord.xy);
    dither = (dither - 0.5) * ditherAmount; // Center around 0, scale by amount
    col += vec3(dither); // Add noise to break up gradients

    // CUSTOM FOG BLENDING - blend fog color based on altitude
    // Lower altitude = more fog (horizon gets fogged, zenith stays clear)
    float fogFactor = 1.0 - altitude; // Inverted: 1.0 at horizon, 0.0 at zenith
    fogFactor = pow(fogFactor, 2.0); // Strengthen the effect near horizon
    // Scale with fog density - denser fog = more sky obscured
    fogFactor *= clamp(fogDensity * 35.0, 0.0, fogMax); // 35 is empirical scale factor

    // Blend sky color with fog color
    col = mix(col, fogColor, fogFactor);

    // HORROR ATMOSPHERE GRADING (optional post-processing)
    if (u_horrorEnabled > 0.5) {
      // Ultra-subtle breathing effect (stronger near horizon)
      float breath = u_breatheAmp * sin(u_time * (1.0 + u_breatheSpeed * 5.0));
      float altWeight = 1.0 - altitude; // Stronger at horizon
      col *= 1.0 + breath * altWeight;

      // Desaturation - drain life from the scene
      float Y = luma(col);
      col = mix(col, vec3(Y), u_desat);

      // Slight green bias - sickly, unnatural tint
      col *= mix(vec3(1.0), vec3(0.94, 1.03, 0.96), u_greenTint);

      // Gentle contrast adjustment around mid-grey
      col = (col - 0.5) * (1.0 + u_contrast) + 0.5;

      // Screen-space vignette (darkens edges, strengthens silhouettes)
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float d = distance(uv, vec2(0.5));
      float vig = smoothstep(0.40, 0.80, d);
      col *= 1.0 - u_vignette * vig;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

// =============== STAR VERTEX SHADER
const starVertexShader = `
  attribute float size;
  attribute float brightness;

  uniform float u_sizeMin;
  uniform float u_sizeMax;
  uniform float u_brightness;
  uniform float u_pixelRatio;

  varying float vBrightness;
  varying vec3 vWorldPosition;   // Pass world position for horizon fade
  varying float vCalculatedSize; // Pass calculated size for smooth fade

  void main() {
    vBrightness = brightness * u_brightness;

    // Get world position before transformation
    vWorldPosition = position;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Calculate point size based on attributes and uniforms
    float starSize = mix(u_sizeMin, u_sizeMax, size);

    // Size attenuation: make distant stars smaller (perspective)
    float calculatedSize = starSize * (300.0 / -mvPosition.z);
    vCalculatedSize = calculatedSize; // Pass to fragment shader

    // FIX: Enforce 2-pixel minimum to prevent sub-pixel flickering
    // 2 logical pixels accounting for device pixel ratio
    float minPixels = 2.0 * u_pixelRatio;
    gl_PointSize = max(calculatedSize, minPixels);
  }
`;

// =============== STAR FRAGMENT SHADER
const starFragmentShader = `
  uniform float u_horizonFade;
  uniform bool u_useAntiAlias;
  uniform float u_fogDensity;    // Fog density for star fading
  uniform vec3 u_tintColor;      // Star color tint

  varying float vBrightness;
  varying vec3 vWorldPosition;   // Receive world position
  varying float vCalculatedSize; // Receive calculated size for smooth fade

  void main() {
    // Create circular star
    float dist = length(gl_PointCoord - 0.5);

    float alpha;
    if (u_useAntiAlias) {
      // Smooth anti-aliased edges
      alpha = smoothstep(0.5, 0.3, dist);
    } else {
      // Hard edges (for testing)
      alpha = dist < 0.5 ? 1.0 : 0.0;
    }

    // Apply star brightness
    alpha *= vBrightness;

    // CRITICAL FIX: Smooth fade based on calculated size
    // Stars that would be < 2 pixels fade out smoothly
    float sizeFade = smoothstep(0.0, 2.0, vCalculatedSize);
    alpha *= sizeFade;

    // Horizon fade based on star altitude
    float altitude = normalize(vWorldPosition).y; // Y is up, gives 0.0 at horizon, 1.0 at zenith
    float horizonFadeAlpha = smoothstep(0.0, u_horizonFade, altitude);
    alpha *= horizonFadeAlpha;

    // Fog-based fading - stars disappear in dense fog
    alpha *= exp(-u_fogDensity * 60.0 * (1.0 - altitude)); // 60 is empirical scale

    gl_FragColor = vec4(u_tintColor, alpha);
  }
`;

// =============== STAR GEOMETRY GENERATION
function generateStarGeometry(starCount, constants) {
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const brightnesses = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    // Generate points only in upper hemisphere (no stars below horizon)
    const theta = Math.random() * Math.PI * 2; // 0 to 2π (full circle)
    const phi = Math.random() * Math.PI * 0.5; // 0 to π/2 (upper hemisphere only)

    // Convert spherical to cartesian coordinates
    // Radius matches skydome
    const radius = constants.SKYDOME_RADIUS;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi); // Y is up
    const z = radius * Math.sin(phi) * Math.sin(theta);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Random size for each star (will be multiplied by uniforms)
    sizes[i] = Math.random();

    // Random brightness for each star
    brightnesses[i] = 0.3 + Math.random() * 0.7; // 30% to 100% brightness
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('brightness', new THREE.BufferAttribute(brightnesses, 1));

  return geometry;
}

/**
 * Creates the complete atmosphere system (sky dome + stars)
 * @param {Object} params - Configuration parameters
 * @returns {Object} Atmosphere components and controls
 */
export function createAtmosphere({ scene, renderer, camera, constants, defaults }) {
  const DEG2RAD = Math.PI / 180; // Local conversion factor

  // =============== SKYDOME SETUP
  const skyGeometry = new THREE.SphereGeometry(constants.SKYDOME_RADIUS, 32, 32);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      // Four color stops for realistic night gradient
      horizonColor: { value: new THREE.Color(defaults.skyHorizonColor) },
      midLowColor: { value: new THREE.Color(defaults.skyMidLowColor) },
      midHighColor: { value: new THREE.Color(defaults.skyMidHighColor) },
      zenithColor: { value: new THREE.Color(defaults.skyZenithColor) },

      // Control where color transitions happen
      midLowStop: { value: defaults.skyMidLowStop },
      midHighStop: { value: defaults.skyMidHighStop },

      // NEAR VILLAGE (NW-N, ~250m) - Noticeable glow
      village1Dir: { value: new THREE.Vector3(-0.7, 0, -0.7).normalize() }, // Northwest
      village1Intensity: { value: defaults.village1Intensity },
      village1Spread: { value: defaults.village1Spread * DEG2RAD },
      village1Height: { value: defaults.village1Height },

      // DISTANT VILLAGE (SE, ~2km) - Very subtle
      village2Dir: { value: new THREE.Vector3(0.7, 0, 0.7).normalize() }, // Southeast
      village2Intensity: { value: defaults.village2Intensity },
      village2Spread: { value: defaults.village2Spread * DEG2RAD },
      village2Height: { value: defaults.village2Height },

      // DITHERING - Prevents gradient banding
      ditherAmount: { value: defaults.skyDitherAmount },

      // POLLUTION COLOR
      pollutionColor: { value: new THREE.Color(defaults.pollutionColor) },

      // FOG INTEGRATION - Custom fog blending
      fogColor: { value: new THREE.Color(defaults.fogColor) },
      fogDensity: { value: defaults.fogDensity },
      fogMax: { value: defaults.fogMax },

      // HORROR GRADING - Post-processing effects
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_time: { value: 0.0 },
      u_horrorEnabled: { value: defaults.horrorEnabled ? 1.0 : 0.0 },
      u_desat: { value: defaults.horrorDesat },
      u_greenTint: { value: defaults.horrorGreenTint },
      u_contrast: { value: defaults.horrorContrast },
      u_vignette: { value: defaults.horrorVignette },
      u_breatheAmp: { value: defaults.horrorBreatheAmp },
      u_breatheSpeed: { value: defaults.horrorBreatheSpeed },
    },
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    side: THREE.BackSide, // Render inside of sphere
    depthWrite: false, // Don't write to depth buffer
    depthTest: false, // CRITICAL: Don't test depth at all
    fog: false, // MUST be false - fog on skydome with no depth causes black screen!
  });

  const skydome = new THREE.Mesh(skyGeometry, skyMaterial);
  skydome.renderOrder = -999; // CRITICAL: Render before everything else
  skydome.frustumCulled = false; // Never cull the sky
  scene.add(skydome);

  // =============== STAR SYSTEM SETUP
  const starMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_sizeMin: { value: defaults.starSizeMin },
      u_sizeMax: { value: defaults.starSizeMax },
      u_brightness: { value: defaults.starBrightness },
      u_horizonFade: { value: defaults.starHorizonFade },
      u_pixelRatio: { value: renderer.getPixelRatio() },
      u_useAntiAlias: { value: defaults.starAntiAlias },
      u_cameraPos: { value: camera.position }, // For potential future use
      u_fogDensity: { value: defaults.fogDensity },
      u_tintColor: { value: new THREE.Color(defaults.starTint) },
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false, // Don't write to depth buffer (stars are background)
    depthTest: true, // But DO test depth so objects can occlude stars
  });

  // Create stars
  const starGeometry = generateStarGeometry(defaults.starCount, constants);
  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.renderOrder = -1000; // Render before skydome
  stars.frustumCulled = false; // Never cull stars
  stars.visible = defaults.starEnabled;
  scene.add(stars);

  // =============== UPDATE FUNCTIONS
  /**
   * Update atmosphere each frame
   * @param {number} elapsedTime - Time since start in seconds
   */
  function update(elapsedTime) {
    // Update time for horror effects
    skyMaterial.uniforms.u_time.value = elapsedTime;

    // IMPORTANT: Skydome and stars follow camera to appear infinitely distant
    skydome.position.copy(camera.position);
    stars.position.copy(camera.position);
  }

  /**
   * Handle window resize
   */
  function onResize() {
    // Update pixel ratio for star rendering
    starMaterial.uniforms.u_pixelRatio.value = renderer.getPixelRatio();

    // Update resolution for horror vignette effect
    skyMaterial.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  }

  /**
   * Regenerate stars with new count
   * @param {number} count - New star count
   */
  function regenerateStars(count) {
    // Dispose old geometry
    stars.geometry.dispose();

    // Create new geometry
    const newGeometry = generateStarGeometry(count, constants);
    stars.geometry = newGeometry;
  }

  // =============== PUBLIC API
  return {
    // Three.js objects
    skydome,
    skyMaterial,
    stars,
    starMaterial,

    // Update functions
    update,
    onResize,
    regenerateStars,

    // Star control methods for GUI
    setStarBrightness: (value) => {
      starMaterial.uniforms.u_brightness.value = value;
    },
    setStarSizeMin: (value) => {
      starMaterial.uniforms.u_sizeMin.value = value;
    },
    setStarSizeMax: (value) => {
      starMaterial.uniforms.u_sizeMax.value = value;
    },
    setStarHorizonFade: (value) => {
      starMaterial.uniforms.u_horizonFade.value = value;
    },
    setStarAntiAlias: (value) => {
      starMaterial.uniforms.u_useAntiAlias.value = value;
    },
    setStarTintColor: (color) => {
      starMaterial.uniforms.u_tintColor.value.set(color);
    },
    setStarFogDensity: (value) => {
      starMaterial.uniforms.u_fogDensity.value = value;
    },

    // Sky control methods for GUI
    setFogDensity: (value) => {
      skyMaterial.uniforms.fogDensity.value = value;
      starMaterial.uniforms.u_fogDensity.value = value; // Also update star fog
    },
    setFogColor: (color) => {
      skyMaterial.uniforms.fogColor.value.set(color);
    },

    // Helper to update light pollution direction from azimuth
    updateVillageDirection: (villageNum, azimuth) => {
      const rad = azimuth * DEG2RAD;
      const dir = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize();
      if (villageNum === 1) {
        skyMaterial.uniforms.village1Dir.value = dir;
      } else {
        skyMaterial.uniforms.village2Dir.value = dir;
      }
    },
  };
}