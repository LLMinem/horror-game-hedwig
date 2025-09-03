# Night-Scene Makeover: A Step-by-Step Guide for an AI Agent + a Total Beginner

**Context**  
- three.js: **r179.1** (modern pipeline: physically-correct lights by default, strict color management).  
- Goal: turn a too-bright/too-flat “indoor-ish” look into a **believable, playable moonlit cemetery**.  
- Collaboration style: **slow, methodical, one change at a time**. After each change the agent must pause, explain *why*, and ask for approval before moving on.  
- The human (Michael) is a **beginner** and wants to learn. The agent must give plain-language explanations and short acceptance tests for each step.

---

## Agent Collaboration Protocol (read carefully)

1. **Summarize before doing.** Read this guide, then summarize the plan back to Michael and produce a small TODO list with checkboxes.  
2. **One step per turn.** Implement **exactly one step**, then stop. Show the code as a **full, self-contained file** (not a diff).  
3. **Explain the why.** Before code, explain the concept(s) introduced in that step in beginner terms.  
4. **Call out manual actions.** If Michael must download a file or choose an asset, say so clearly and wait.  
5. **Acceptance test.** Tell Michael *what to look for on screen*. Ask for approval before continuing.  
6. **No cascade of changes.** Never jump to the next step without explicit “continue”.  
7. **Version awareness (r179).** Prefer up-to-date APIs; avoid outdated patterns.  
8. **Rollback friendly.** If something looks worse, revert to the previous working state.

---

## Why the current scene looks off (diagnosis)

- You used **RoomEnvironment** as image-based lighting (IBL). It’s an *indoor studio* probe: bright, neutral, and “daylighty.” Outdoors at night, IBL should be **faint and bluish**. Studio IBL makes objects look like plastic toys.  
- **ACES tone mapping** + exposure set high + bright IBL = milky highlights and low contrast.  
- Materials use **PBR** (`MeshStandardMaterial`), which expects:  
  - a reasonable **albedo** (base color not near black),  
  - **roughness/metalness** that matches the material,  
  - some **micro-detail** (normal/roughness maps).  
  Flat colors + very high roughness everywhere = bland, rubbery look.  
- **scene.background** (your gradient) **does not light** objects. Only **scene.environment** (a PMREM env map) contributes to PBR lighting.  
- Fog/sky banding and a perfectly flat ground amplify the artificial feel.

**So the fix** is not “add more lights” but **rebalance energy**: faint, cool IBL + a believable moon directional light + gentle sky bounce, correct exposure, and materials with micro-detail. Then sprinkle fog and shadows.

---

## Concepts in plain language (quick glossary)

- **IBL / environment map:** a panoramic image (usually HDR) that tells materials “what the world looks like” so they can reflect some of it. In three.js, assign it to `scene.environment` (as a PMREM texture).  
- **HDRI:** a high-dynamic-range panorama used for IBL. Night HDRIs exist (stars, city glow, moonlight).  
- **PMREM:** a filter that turns an HDRI into a format PBR shaders can sample efficiently.  
- **Albedo (base color):** the true color of a surface. Too dark = no light to reflect.  
- **Roughness/metalness:** sliders for how glossy/metallic a surface is. Stone: high roughness, zero metalness. Chrome: low roughness, full metalness.  
- **Tone mapping & exposure:** the “camera response curve” and “ISO” of your virtual camera. ACES is filmic; exposure is your main brightness knob.  
- **DirectionalLight:** like the sun or moon—light rays are parallel; good for long shadows.  
- **HemisphereLight:** simulates sky color from above and ground bounce from below.  
- **AmbientLight:** flat fill that lifts all shadows equally (use sparingly).  
- **Fog:** fades distant objects into a color; ties the ground to the horizon, hides the infinite plane.

---

## The plan (eight small steps)

You and the agent will move from “visible but wrong” → “moody and playable.”  
Each step includes: **(A) what you’ll learn, (B) what you’ll change, (C) acceptance test, (D) full code**.

> Directory assumption (Vite): static assets live in `/public`. Put textures/HDRIs there:
>
> ```
> public/
>   assets/
>     hdri/
>     textures/
> ```

---

### STEP 0 — Baseline snapshot + handy debug keys

**A. Learn:** We’ll add bracket keys `[` `]` to tweak exposure live.  
**B. Change:** Keep your current scene but add exposure hotkeys; confirm everything compiles.  
**C. Accept:** Press `]` → scene gets brighter; `[` → darker.

```js
// STEP 0: your existing main.js + exposure hotkeys (add to render setup)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
window.addEventListener('keydown', (e) => {
  if (e.key === ']') renderer.toneMappingExposure *= 1.06;
  if (e.key === '[') renderer.toneMappingExposure /= 1.06;
});
```

Agent: stop here and ask for confirmation.

---

### STEP 1 — Clean baseline lights (no IBL yet)

**A. Learn:** With physically-correct lights (r179), intensities from old tutorials are misleading. We’ll set a cool moon, soft sky bounce, tiny ambient.  
**B. Change:** Remove RoomEnvironment. Set: `moon=0.8`, `hemi=0.25`, `ambient=0.05`, exposure 1.0.  
**C. Accept:** Scene looks **night-ish but readable**; distinct shadow direction; not milky.

**Full file:** (replace `src/main.js`)

```js
import * as THREE from 'three';

// --- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.style.margin = '0';
document.body.appendChild(renderer.domElement);

// exposure hotkeys
window.addEventListener('keydown', (e) => {
  if (e.key === ']') renderer.toneMappingExposure *= 1.06;
  if (e.key === '[') renderer.toneMappingExposure /= 1.06;
});

// --- scene + camera
const scene = new THREE.Scene();
// gradient sky (background only)
const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 2048;
const ctx = canvas.getContext('2d'); const g = ctx.createLinearGradient(0,0,0,2048);
g.addColorStop(0.0, '#0a0a2e'); g.addColorStop(0.5, '#0a0e2a'); g.addColorStop(1.0, '#000000');
ctx.fillStyle = g; ctx.fillRect(0,0,4,2048);
scene.background = new THREE.CanvasTexture(canvas);

scene.fog = new THREE.Fog(0x0b1133, 35, 90);

const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 120);
camera.position.set(0, 1.7, 15);

// --- lights (no environment lighting yet)
const moon = new THREE.DirectionalLight(0x9bb7ff, 0.8);
moon.position.set(12, 30, 16);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.near = 0.5; moon.shadow.camera.far = 120;
moon.shadow.camera.left = -60; moon.shadow.camera.right = 60;
moon.shadow.camera.top = 60; moon.shadow.camera.bottom = -60;
moon.shadow.bias = -0.001; moon.shadow.normalBias = 0.02;
scene.add(moon);

const hemi = new THREE.HemisphereLight(0x20324f, 0x0a0f18, 0.25);
scene.add(hemi);

const amb = new THREE.AmbientLight(0x1b1e34, 0.05);
scene.add(amb);

// --- ground
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({
    color: 0x3b4d3b, roughness: 0.85, metalness: 0.0,
    emissive: 0x0c0d10, emissiveIntensity: 0.08
  })
);
ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);

// --- test objects (stone, bark, metal, sphere)
function stone() { return new THREE.MeshStandardMaterial({ color: 0x7a808a, roughness: 0.65, metalness: 0.0 }); }
function bark()  { return new THREE.MeshStandardMaterial({ color: 0x3a2f26, roughness: 0.95, metalness: 0.0 }); }
function metal() { return new THREE.MeshStandardMaterial({ color: 0x7a7a7a, roughness: 0.6, metalness: 1.0 }); }

for (let i=0;i<5;i++){
  const t = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 0.3), stone());
  t.position.set(Math.random()*20-10, 1.25, Math.random()*20-10);
  t.castShadow = t.receiveShadow = true; scene.add(t);
}
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,6,8), bark());
trunk.position.set(2,3,0); trunk.castShadow = trunk.receiveShadow = true; scene.add(trunk);

for (let i=0;i<8;i++){
  const p = new THREE.Mesh(new THREE.BoxGeometry(0.15,3,0.15), metal());
  p.position.set(-20 + i*5, 1.5, -15);
  p.castShadow = p.receiveShadow = true; scene.add(p);
}
const sphere = new THREE.Mesh(new THREE.SphereGeometry(1,32,32),
  new THREE.MeshStandardMaterial({ color: 0x9aa2b5, roughness: 0.5, metalness: 0.0 })
);
sphere.position.set(5,1,5); sphere.castShadow = sphere.receiveShadow = true; scene.add(sphere);

// --- render loop + resize
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
renderer.setAnimationLoop(()=> renderer.render(scene, camera));
```

Agent: stop, ask for a screenshot. If “too dark,” tell Michael to tap `]` until readable.

---

### STEP 2 — Add **night HDRI** IBL (manual asset + code)

**A. Learn:** HDRI is a 360° image with brightness info. We PMREM it and set `scene.environment`. For r179 there is **no global environment intensity**; we’ll set **`envMapIntensity` per material** (utility provided).  
**B. Manual:** Michael downloads one *night* HDRI from **polyhaven.com → HDRIs → “night”** (e.g., *moonless_golf_2k.hdr* or *starlit_skies_2k.hdr*). Place it at:  
`public/assets/hdri/night_2k.hdr`  
**C. Change:** Load via `RGBELoader`, PMREM it, set low intensity (~0.15).  
**D. Accept:** Shadows stay dark; surfaces in shade no longer go pitch-black; overall vibe stays night.

**Full main.js (same as Step 1 with IBL additions near the top):**
```js
// ... keep Step 1 code, plus these two imports:
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';

// after scene/renderer creation:
const pmrem = new PMREMGenerator(renderer);
new RGBELoader()
  .load('/assets/hdri/night_2k.hdr', (hdr) => {
    const envTex = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    scene.environment = envTex;
    // dim environment contribution on all meshes
    setEnvIntensity(scene, 0.15);
  });

function setEnvIntensity(root, strength){
  root.traverse(obj=>{
    if (obj.isMesh && obj.material && 'envMapIntensity' in obj.material){
      obj.material.envMapIntensity = strength;
      obj.material.needsUpdate = true;
    }
  });
}
```

Agent: stop and ask Michael to confirm the HDRI path is correct and the look is **subtle** (not bright, not gray).

---

### STEP 3 — Ground **micro-detail** (color + normal map)

**A. Learn:** Flat colors read as plastic. A tiling **color map** + **normal map** gives grass “bite” under moonlight.  
**B. Manual:** Download two seamless textures (e.g., **AmbientCG**: `Grass005_1K_Color.jpg`, `Grass005_1K_NormalGL.jpg`). Save to:  
`public/assets/textures/grass_col.jpg`, `public/assets/textures/grass_nrm.jpg`  
**C. Change:** Apply, tile 16×, mark color map as sRGB.  
**D. Accept:** The ground shows fine detail; close to camera it no longer looks like painted plywood.

```js
import { TextureLoader, RepeatWrapping, SRGBColorSpace } from 'three';

// replace ground material from Step 1 with:
const loader = new TextureLoader();
const grassCol = loader.load('/assets/textures/grass_col.jpg');
const grassNrm = loader.load('/assets/textures/grass_nrm.jpg');
grassCol.colorSpace = SRGBColorSpace;      // only color maps are sRGB
[grassCol, grassNrm].forEach(t => { t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(16, 16); });

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({
    map: grassCol,
    normalMap: grassNrm,
    roughness: 0.9, metalness: 0.0,
    envMapIntensity: 0.1
  })
);
```

Agent: stop, ask for a look check (you should notice subtle texture and a nicer ground specular rolloff on very low angles).

---

### STEP 4 — Fog + sky polish

**A. Learn:** Fog binds the world to the horizon; your gradient can band if too low-res.  
**B. Change:** Keep the taller 2048px gradient; tune fog to `near=30–40, far=85–95` and align color to horizon.  
**C. Accept:** Distant objects soften toward the horizon; no harsh “cut line”.

```js
// Keep your 4x2048 gradient.
// Try a slightly darker fog:
scene.fog = new THREE.Fog(0x0a1030, 40, 90);
```

Agent: stop, confirm readability out to ~50–60m, with gentle fade after that.

---

### STEP 5 — Shadow tuning

**A. Learn:** Soft but defined moon shadows sell the mood. One shadow-casting light only.  
**B. Change:** Keep `mapSize=1024` (or 2048 if GPU allows), bias in `[-0.0005, -0.002]`, `normalBias≈0.02`. Fit shadow camera to the play area (±60 already good).  
**C. Accept:** No acne or peter-panning; shadows neither razor-thin nor blotchy.

*(You already have these values; in this step the agent just exposes them via lil-gui in the next step so you can poke them.)*

---

### STEP 6 — Add a tiny **Dev Panel** (lil-gui) for learning

**A. Learn:** Live sliders keep you focused and curious, great for ADHD brains.  
**B. Change:** Add lil-gui controls for exposure, light intensities, fog near/far, and a global “env intensity” function that walks the scene.  
**C. Accept:** You can nudge values while watching the scene; nothing crashes.

```js
// npm i lil-gui
import GUI from 'lil-gui';

const gui = new GUI();
const state = {
  exposure: renderer.toneMappingExposure,
  moon: moon.intensity,
  hemi: hemi.intensity,
  ambient: amb.intensity,
  fogNear: scene.fog.near, fogFar: scene.fog.far,
  env: 0.15
};

gui.add(state, 'exposure', 0.6, 1.6, 0.01).onChange(v => renderer.toneMappingExposure = v);
gui.add(state, 'moon', 0, 2, 0.01).onChange(v => moon.intensity = v);
gui.add(state, 'hemi', 0, 1, 0.01).onChange(v => hemi.intensity = v);
gui.add(state, 'ambient', 0, 0.3, 0.005).onChange(v => amb.intensity = v);
gui.add(state, 'fogNear', 5, 80, 1).onChange(v => scene.fog.near = v);
gui.add(state, 'fogFar', 40, 140, 1).onChange(v => scene.fog.far = v);
gui.add(state, 'env', 0, 1, 0.01).onChange(v => setEnvIntensity(scene, v));
```

Agent: stop; ask Michael to play with sliders for a minute and pick a favorite preset (write values down).

---

### STEP 7 — Start the **Dev Room** habit

**A. Learn:** A neutral testing pad accelerates all future asset work.  
**B. Change:** Add a tiny “drop zone” where the agent loads GLTFs from `/public/assets/devroom/` and lays them out on a grid with default **gray-blue PBR** if the model lacks textures.  
**C. Accept:** You can drop a model, see how it looks **under this exact night rig**, and tweak with the GUI.

```js
// simplistic devroom loader (place some .glb into /public/assets/devroom/)
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const models = ['tombstone_a.glb','bench.glb']; // edit to what you have
models.forEach((name, i) => {
  gltfLoader.load(`/assets/devroom/${name}`, (gltf) => {
    const root = gltf.scene;
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = o.receiveShadow = true;
        if (!o.material || !('roughness' in o.material)) {
          o.material = new THREE.MeshStandardMaterial({ color: 0x7f8899, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.2 });
        } else if ('envMapIntensity' in o.material) {
          o.material.envMapIntensity = 0.2;
        }
      }
    });
    root.position.set(-6 + i*3, 0, -2);
    scene.add(root);
  });
});
```

Agent: stop. If Michael has no models yet, skip loading but keep the code scaffold.

---

### STEP 8 — Add the **flashlight** (kept OFF by default)

**A. Learn:** A spotlight attached to the camera. We’ll keep it a **tool**, not a crutch.  
**B. Change:** Toggle with `F`, warm color, narrow cone, soft penumbra.  
**C. Accept:** When ON, bright cone with soft edges; when OFF, baseline scene stays playable.

```js
const flashlight = new THREE.SpotLight(0xfff2d0, 20, 35, Math.PI*0.1, 0.5, 2);
flashlight.visible = false; flashlight.castShadow = true;
scene.add(flashlight, flashlight.target);

window.addEventListener('keydown', (e)=>{
  if (e.key.toLowerCase() === 'f') flashlight.visible = !flashlight.visible;
});

const dir = new THREE.Vector3();
renderer.setAnimationLoop(()=>{
  if (flashlight.visible){
    flashlight.position.copy(camera.position);
    camera.getWorldDirection(dir).normalize();
    flashlight.target.position.copy(camera.position).add(dir.multiplyScalar(10));
  }
  renderer.render(scene, camera);
});
```

*(SpotLight intensity numbers can vary across versions; that’s why we added the GUI. If it’s blinding, turn it down.)*

Agent: stop; ask Michael to toggle and adjust to taste with the GUI.

---

## When to stop tuning (good baseline checklist)

- Without the flashlight, you can see silhouettes out to ~50–60 m.  
- With the flashlight, details pop without bleaching the scene.  
- Nothing feels “milky” (too bright IBL/exposure) or “inky” (no IBL/excess dark).  
- Ground shows subtle texture; tombstones catch tiny speculars; shadows feel moon-cast.  
- FPS is solid; no console errors.

---

## Appendix — Version notes (r152→r179, the bits that matter)

- **Color management tightened.** Use `renderer.outputColorSpace = THREE.SRGBColorSpace;` and mark **color textures** as sRGB (`texture.colorSpace = THREE.SRGBColorSpace`). Don’t mark normal/roughness/metalness/AO as sRGB.  
- **Physically-correct lighting is default** (since r155). Intensities from old articles often feel off; trust your eyes, the GUI, and exposure.  
- **Environment intensity:** there is no `scene.environmentIntensity` in r179. Control via **`envMapIntensity` on materials** or traverse the scene and set it globally with a helper function.  
- **Tone mapping:** ACES is a good default; use **exposure** (0.8–1.4) as your main knob.

---

## What the agent should deliver each turn

1. **Explain the step in plain language** (2–5 sentences).  
2. **List any manual actions** Michael must do (download/copy files) and wait.  
3. **Show a full, working file** (e.g., `src/main.js`) that can be pasted in one go.  
4. **Give a 10-second acceptance test** (“You should see X, Y, Z”).  
5. **Ask to continue or tweak.** Offer 2–3 tiny knobs to try.  
6. **On issues**, propose a quick revert (“set exposure to 1.0; set env intensity to 0.0; does it help?”).

---

## Final note

This is a lighting class disguised as a game. We’re not “adding hacks”; we’re **teaching the renderer what kind of night it is**: faint, cool sky; a single distant moon; tiny ambient bounce; materials with just enough micro-detail to catch that light. With the dev panel and dev room, you’ll be able to audition any future asset in minutes.

When you’re ready, have the agent start with **STEP 0** and go one step at a time.