# Phase 1: Beautiful Foundation - Detailed Plan

## Objective
Create a visually stunning Three.js scene that immediately captures interest and builds confidence. No gameplay yet - just pure atmosphere.

## Success Criteria
- ✅ Atmospheric night scene that looks better than Slender
- ✅ Smooth camera controls that feel natural
- ✅ No technical issues or console errors
- ✅ Your brother says "That looks good!"

---

## Step-by-Step Implementation

### Step 1.1: Project Setup (30 minutes)

#### Tasks:
1. **Initialize npm project**
   ```bash
   npm init -y
   npm install three vite
   npm install --save-dev @types/three  # For better IDE support
   ```

2. **Create Vite config**
   ```javascript
   // vite.config.js
   export default {
     server: { port: 3000 },
     build: { outDir: 'dist' }
   }
   ```

3. **Create folder structure**
   ```
   /src
     main.js
     /core
       Scene.js
     /utils
       Constants.js
   ```

4. **Basic HTML**
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <title>Horror Game</title>
     <style>
       body { margin: 0; overflow: hidden; }
       canvas { display: block; }
     </style>
   </head>
   <body>
     <script type="module" src="/src/main.js"></script>
   </body>
   </html>
   ```

5. **Package.json scripts**
   ```json
   "scripts": {
     "dev": "vite",
     "build": "vite build",
     "preview": "vite preview"
   }
   ```

**TEST:** Run `npm run dev`, see blank page at localhost:3000
**COMMIT:** "feat: initialize Three.js project with Vite"

---

### Step 1.2: Atmospheric Scene (1 hour)

#### Visual Goals:
- Deep blue/purple night sky (not pure black)
- Subtle fog that adds depth, not obscurity
- Moonlight creating long shadows
- Ground that looks like cemetery grass

#### Implementation:

1. **Scene Setup (main.js)**
   - Create renderer with antialiasing
   - Set tone mapping (ACESFilmic)
   - Enable shadows (PCFSoft)
   - Set pixel ratio for sharp rendering

2. **Sky Gradient**
   - Use hemisphere light for base ambience
   - Deep blue (0x0a0a2e) to purple (0x1e1e3f)
   - Very subtle, not overpowering

3. **Moonlight**
   - DirectionalLight positioned high and to the side
   - Soft blue-white color (0xc0d0ff)
   - Intensity around 0.5-0.8
   - Shadow camera configured for large area
   - Soft shadows with proper bias

4. **Fog Settings**
   ```javascript
   scene.fog = new THREE.Fog(0x0a0a2e, 30, 60);  // Start at 30m, end at 60m
   ```
   NOT heavy fog at 8m like before!

5. **Ground Plane**
   - Large plane (500x500m)
   - Grass texture with normal map
   - Subtle color variation (dark green)
   - Receives shadows

**TEST:** Scene looks atmospheric, can see clearly to ~40m
**COMMIT:** "feat: atmospheric night scene with moonlight"

---

### Step 1.3: Camera Setup (30 minutes)

#### Camera Goals:
- First-person perspective
- Natural field of view
- Smooth, responsive controls
- Proper height for adult character

#### Implementation:

1. **Camera Configuration**
   ```javascript
   const camera = new THREE.PerspectiveCamera(
     75,  // FOV
     window.innerWidth / window.innerHeight,
     0.1,  // Near
     100   // Far (matching fog distance)
   );
   camera.position.y = 1.7;  // Eye height
   ```

2. **Mouse Look Controls**
   - Use PointerLockControls
   - Sensitivity not too high (0.002)
   - Smooth damping for natural feel
   - Click to lock pointer

3. **Window Resize Handler**
   - Update camera aspect ratio
   - Update renderer size
   - Maintain quality on resize

**TEST:** Can look around smoothly, feels natural
**COMMIT:** "feat: first-person camera with smooth controls"

---

## Quality Checklist

Before showing to brother:

### Visual Quality
- [ ] Sky gradient visible and atmospheric
- [ ] Moonlight creates mood without being harsh
- [ ] Shadows are soft and realistic
- [ ] Fog adds depth, doesn't obscure
- [ ] Ground texture looks like grass
- [ ] Overall darker than daylight but not pitch black

### Technical Quality
- [ ] No console errors
- [ ] 60 FPS consistent
- [ ] Controls responsive
- [ ] No z-fighting or artifacts
- [ ] Proper antialiasing

### Feel
- [ ] Immediately atmospheric
- [ ] Better looking than Slender
- [ ] Makes you want to explore
- [ ] Sets horror mood without being ugly

---

## Textures Needed

1. **Grass Texture**
   - Diffuse map (dark grass)
   - Normal map for depth
   - Roughness map
   - Resolution: 1024x1024
   - Seamless tiling

Sources:
- Poly Haven (textures.com)
- Ambient CG
- Create simple one if needed

---

## Code Structure

```
/src
  main.js           # Entry point, game loop
  /core
    Scene.js        # Scene setup, lighting
    Camera.js       # Camera and controls
  /utils
    Constants.js    # All configuration values
```

Keep it simple for Phase 1. No over-engineering.

---

## Common Issues to Avoid

1. **Too Dark**
   - Add subtle ambient light
   - Moonlight should be visible

2. **Too Much Fog**
   - Start at 30m minimum
   - Should enhance, not hide

3. **Harsh Shadows**
   - Use PCFSoft shadows
   - Adjust shadow bias

4. **Poor Performance**
   - Check pixel ratio
   - Reduce shadow map size if needed

5. **Controls Too Sensitive**
   - Lower mouse sensitivity
   - Add damping

---

## Next Phase Preview

Once Phase 1 is complete and brother approves:
- Phase 2: WASD movement that works
- Must test in all directions
- Smooth acceleration
- Sprint system

But ONLY after Phase 1 looks great!

---

## Remember

**This first impression is CRITICAL.** If it doesn't look good, interest dies. Take time to tune the atmosphere. Better to spend an extra hour on lighting than rush to movement with an ugly scene.