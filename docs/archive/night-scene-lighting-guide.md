# Complete Guide to Creating Realistic Night Scenes in Three.js

## A Beginner's Handbook for Horror Game Lighting

---

## Table of Contents

1. [Understanding the Problem](#understanding-the-problem)
2. [The Building Blocks of Night Lighting](#the-building-blocks)
3. [Specific Values and Settings](#specific-values-and-settings)
4. [Material Configuration for Night](#material-configuration)
5. [Atmospheric Effects](#atmospheric-effects)
6. [Performance Optimization](#performance-optimization)
7. [Complete Code Example](#complete-code-example)
8. [Common Mistakes to Avoid](#common-mistakes)

---

## Understanding the Problem

Creating a believable night scene in Three.js is challenging because:

- Too dark = players can't see anything (frustrating)
- Too bright = loses horror atmosphere (not scary)
- Wrong colors = looks artificial (breaks immersion)

The key is **balancing visibility with atmosphere** while maintaining performance.

---

## The Building Blocks of Night Lighting

### 1. **The Three-Light System**

Every good night scene uses THREE types of light working together:

#### A. **Moonlight (DirectionalLight)**

This is your main light source - the moon.

```javascript
const moonLight = new THREE.DirectionalLight(
  0x4488cc, // Color: Soft blue-white
  0.3, // Intensity: Low (0.2-0.5 for night)
);
moonLight.position.set(10, 30, 20); // High in sky, slightly in front
moonLight.castShadow = true; // Creates dramatic shadows
```

**Why these values?**

- Color `0x4488cc`: Blue-tinted white mimics real moonlight (which appears blue due to atmospheric scattering)
- Intensity `0.3`: Much dimmer than sunlight (which would be 1.0-2.0)
- Position `(10, 30, 20)`: In front of camera so we see lit surfaces, not shadows

#### B. **Sky Bounce (HemisphereLight)**

This simulates light bouncing between sky and ground.

```javascript
const hemisphereLight = new THREE.HemisphereLight(
  0x3a3a5a, // Sky color: Dark blue-gray
  0x1a1a2a, // Ground color: Very dark blue
  0.2, // Intensity: Subtle
);
```

**Why these values?**

- Sky color darker than ground = unnatural (sky is always brighter at night)
- Very low intensity = maintains darkness while preventing pure black

#### C. **Base Visibility (AmbientLight)**

This ensures nothing is pitch black.

```javascript
const ambientLight = new THREE.AmbientLight(
  0x222244, // Color: Very dark blue
  0.15, // Intensity: Minimal
);
```

**Why these values?**

- Blue tint = maintains night feeling (warm colors break the illusion)
- Low intensity = just enough to see in shadows

---

## Specific Values and Settings

### **Color Palette for Night Scenes**

Based on research from multiple production games:

| Element           | Hex Color | RGB            | Description      |
| ----------------- | --------- | -------------- | ---------------- |
| **Moonlight**     | `#4488CC` | (68, 136, 204) | Soft blue-white  |
| **Sky (top)**     | `#0A0A2E` | (10, 10, 46)   | Deep blue-purple |
| **Sky (horizon)** | `#050510` | (5, 5, 16)     | Almost black     |
| **Ambient**       | `#222244` | (34, 34, 68)   | Dark blue-gray   |
| **Fog**           | `#1A1A3E` | (26, 26, 62)   | Dark blue        |
| **Grass**         | `#2A3A2A` | (42, 58, 42)   | Dark green       |
| **Ground bounce** | `#080820` | (8, 8, 32)     | Very dark blue   |

### **Intensity Ranges**

| Light Type           | Day Value | Night Value | Horror Game Night |
| -------------------- | --------- | ----------- | ----------------- |
| **DirectionalLight** | 1.0-2.0   | 0.3-0.6     | 0.2-0.4           |
| **HemisphereLight**  | 0.6-1.0   | 0.2-0.4     | 0.15-0.25         |
| **AmbientLight**     | 0.4-0.6   | 0.1-0.2     | 0.05-0.15         |

---

## Material Configuration for Night

### **Ground Material (Grass/Dirt)**

```javascript
const groundMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a3a2a, // Dark green-gray
  roughness: 0.9, // Very rough (grass isn't shiny)
  metalness: 0.0, // No metal properties

  // Optional: Add slight self-illumination to prevent pure black
  emissive: 0x0a0a0a, // Very subtle glow
  emissiveIntensity: 0.1, // Barely visible
});
```

**Key Principles:**

- **High roughness** (0.8-1.0) = diffuse surface that scatters moonlight naturally
- **Zero metalness** = organic materials aren't metallic
- **Subtle emissive** = prevents complete darkness in shadows

### **Object Materials (Tombstones, Trees)**

```javascript
const objectMaterial = new THREE.MeshStandardMaterial({
  color: 0x4a4a5a, // Gray with slight blue tint
  roughness: 0.7, // Some roughness for realism
  metalness: 0.1, // Tiny bit for subtle highlights
});
```

---

## Atmospheric Effects

### **Fog Configuration**

Fog is CRITICAL for horror atmosphere. It adds depth and mystery.

```javascript
// Linear fog (easier to control)
scene.fog = new THREE.Fog(
  0x1a1a3e, // Color: Dark blue (matches sky)
  30, // Near: Start fading at 30 meters
  60, // Far: Complete fade at 60 meters
);

// OR Exponential fog (more realistic)
scene.fog = new THREE.FogExp2(
  0x1a1a3e, // Color: Dark blue
  0.02, // Density: Lower = see further
);
```

**Choosing Fog Type:**

- **Linear Fog**: Use when you need precise control over visibility distance
- **Exponential Fog**: More realistic, but harder to control exact distances

### **Sky Implementation**

```javascript
// Create gradient sky (more performant than skybox)
const canvas = document.createElement("canvas");
canvas.width = 2;
canvas.height = 512;
const ctx = canvas.getContext("2d");
const gradient = ctx.createLinearGradient(0, 0, 0, 512);

// Night sky gradient
gradient.addColorStop(0, "#0A0A2E"); // Top: Deep blue
gradient.addColorStop(0.5, "#050520"); // Middle: Darker
gradient.addColorStop(1, "#000000"); // Horizon: Black

ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 2, 512);

const skyTexture = new THREE.CanvasTexture(canvas);
scene.background = skyTexture;
```

---

## Performance Optimization

### **Shadow Settings**

Shadows are expensive but essential for depth.

```javascript
// Renderer setup
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

// Moon shadow configuration
moonLight.shadow.mapSize.width = 1024; // Lower = faster (512, 1024, 2048)
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100; // Don't render shadows beyond fog

// IMPORTANT: Only ONE light should cast shadows!
```

### **Material Optimization**

```javascript
// Use MeshPhongMaterial instead of MeshStandardMaterial for less important objects
const cheapMaterial = new THREE.MeshPhongMaterial({
  color: 0x3a3a3a,
  shininess: 5,
});

// MeshLambertMaterial for very distant objects
const distantMaterial = new THREE.MeshLambertMaterial({
  color: 0x2a2a2a,
});
```

**Material Performance Hierarchy:**

1. **MeshBasicMaterial**: Fastest, no lighting (use for UI, distant objects)
2. **MeshLambertMaterial**: Fast, basic lighting
3. **MeshPhongMaterial**: Moderate, good lighting
4. **MeshStandardMaterial**: Slowest, best quality (use sparingly)

---

## Complete Code Example

Here's a complete setup for a horror game night scene:

```javascript
import * as THREE from "three";

function setupNightScene(scene, renderer) {
  // 1. Configure renderer for night scenes
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8; // Darker for night
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // 2. Create gradient night sky
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#0A0A2E");
  gradient.addColorStop(0.4, "#050520");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);
  scene.background = new THREE.CanvasTexture(canvas);

  // 3. Setup three-light system
  // Moonlight
  const moonLight = new THREE.DirectionalLight(0x4488cc, 0.3);
  moonLight.position.set(10, 30, 20);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.width = 1024;
  moonLight.shadow.mapSize.height = 1024;
  moonLight.shadow.camera.near = 0.5;
  moonLight.shadow.camera.far = 100;
  moonLight.shadow.camera.left = -50;
  moonLight.shadow.camera.right = 50;
  moonLight.shadow.camera.top = 50;
  moonLight.shadow.camera.bottom = -50;
  scene.add(moonLight);

  // Sky bounce
  const hemiLight = new THREE.HemisphereLight(0x3a3a5a, 0x080820, 0.2);
  scene.add(hemiLight);

  // Base ambient
  const ambientLight = new THREE.AmbientLight(0x222244, 0.15);
  scene.add(ambientLight);

  // 4. Add fog for atmosphere
  scene.fog = new THREE.Fog(0x1a1a3e, 30, 60);

  // 5. Create ground with proper material
  const groundGeometry = new THREE.PlaneGeometry(500, 500);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a3a2a,
    roughness: 0.9,
    metalness: 0.0,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.1,
  });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}
```

---

## Common Mistakes to Avoid

### ❌ **Mistake 1: Moon in Wrong Position**

If the moon is behind the camera, you're looking at shadows.
✅ **Solution**: Position moon in front/side of main viewing angle

### ❌ **Mistake 2: Using Warm Colors**

Orange/yellow lights break the night illusion.
✅ **Solution**: Stick to blues and cool grays (except for fire/lamps)

### ❌ **Mistake 3: Too Many Shadow-Casting Lights**

Each shadow light multiplies render time.
✅ **Solution**: Only ONE directional light should cast shadows

### ❌ **Mistake 4: Material Colors Too Dark**

Black materials can't reflect any light.
✅ **Solution**: Use dark colors but never pure black (minimum 0x1a1a1a)

### ❌ **Mistake 5: Fog Color Doesn't Match Sky**

Creates unrealistic "floating fog" effect.
✅ **Solution**: Fog color should match or be slightly darker than horizon

### ❌ **Mistake 6: Intensity Values Too High**

Makes scene look like twilight, not night.
✅ **Solution**: Keep all intensities below 0.5 for true night

---

## Quick Reference Card

```javascript
// NIGHT SCENE RECIPE
// Copy these values for instant night atmosphere:

// Lights
DirectionalLight: color: 0x4488cc, intensity: 0.3
HemisphereLight: sky: 0x3a3a5a, ground: 0x080820, intensity: 0.2
AmbientLight: color: 0x222244, intensity: 0.15

// Materials
Ground: color: 0x2a3a2a, roughness: 0.9, metalness: 0
Objects: color: 0x4a4a5a, roughness: 0.7, metalness: 0.1

// Fog
Fog: color: 0x1a1a3e, near: 30, far: 60

// Renderer
toneMappingExposure: 0.8
shadowMap.type: PCFSoftShadowMap
```

---

## Summary

Creating a believable night scene requires:

1. **Three-light system** with proper intensities (all below 0.5)
2. **Cool color palette** (blues and grays, no warm colors)
3. **Proper material settings** (high roughness, low metalness)
4. **Atmospheric fog** matching the sky color
5. **Single shadow-casting light** for performance
6. **Moon positioned to illuminate the view**, not behind it

The secret is that night scenes need MORE thought than day scenes - you're fighting against darkness while maintaining atmosphere. Start with these values and adjust gradually until you achieve the perfect balance of visibility and horror atmosphere.
