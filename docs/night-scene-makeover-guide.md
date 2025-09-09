# Night-Scene Makeover: Implementation Guide & Progress

## 🎯 Current Progress

**Base Commit:** `15ca4ab` - ChatGPT's baseline night scene  
**Current Status:** Steps 0-3 complete, atmospheric sky Step 4 complete (WIP), mouse controls added  
**Latest Working:** `549400b` - Implemented procedural star field system (WIP due to issues)  
**Current Focus:** Fix star field issues (GitHub issue #4)

### ✅ Completed Steps

- **Step 0:** Exposure hotkeys → `742e16a` (used ü/ä for German keyboard)
- **Step 1:** Remove RoomEnvironment → `5131463` (proper night lighting)
- **Step 2:** Night HDRI with intensity → `e2bfd91` (fixed r179 bug with envMap)
  - Additional fixes: `eef2c15` (precision), `d957860` (key swap)
- **Step 3:** lil-gui Dev Panel → `716e148` (full controls with double-click reset)
- **Mouse Look Controls:** First-person camera → `8335bac` (pointer lock API with smooth rotation) [COMPLETE 2025-09-08]
- **Atmospheric Sky Step 1:** Four-stop gradient → `505d23f` (proper horizon alignment) [COMPLETE 2025-09-07]
- **Atmospheric Sky Step 2:** Dual-source light pollution → `f173843` (realistic village glow system) [COMPLETE 2025-09-08]
  - **Fine-tuning:** → `430fcea` (adjusted defaults for better realism)
- **Atmospheric Sky Step 3:** Dithering (anti-banding) → `345c9f9` (hash-based screen-space noise) [COMPLETE 2025-09-08]
- **Atmospheric Sky Step 4:** Procedural star field → `549400b` (DEPRECATED - See ADR-003) [2025-09-08]

### ⚠️ Current Issues (Priority)

- **GitHub Issue #4:** Star field bugs - stars reposition when camera moves, poor defaults, unnatural distribution [RESOLVED via ADR-003 - architectural change]

### 📋 Remaining Steps

**Atmospheric Sky Pipeline (Priority):**
- Atmospheric Sky Step 4a: Fragment shader stars [DEPRECATED - See ADR-003]
- Atmospheric Sky Step 4b: THREE.Points geometry-based stars [NEW APPROACH - PENDING]
- Atmospheric Sky Step 5: Atmospheric noise [PENDING]
- Atmospheric Sky Step 6: Horror atmosphere tuning [PENDING]

**Original Night Scene Steps:**
- Step 4: Ground texture micro-detail (was Step 3)
- Step 5: Fog tuning (was Step 4)
- Step 6: Shadow quality (was Step 5)
- Step 7: Dev room habit
- Step 8: Flashlight polish

---

## Original Guide with Progress Markers

**Context**

- three.js: **r179.1** (modern pipeline: physically-correct lights by default, strict color management).
- Goal: turn a too-bright/too-flat "indoor-ish" look into a **believable, playable moonlit cemetery**.
- Collaboration style: **slow, methodical, one change at a time**. After each change the agent **MUST** pause, explain _why_, and ask for approval before moving on.
- The human (Michael) is a **beginner** and wants to learn. The agent must give plain-language explanations and short acceptance tests for each step.

---

## Agent Collaboration Protocol (read carefully)

1. **Summarize before doing.** Read this guide, then summarize the plan back to Michael and produce a small TODO list with checkboxes.
2. **One step per turn.** Implement **exactly one step**, then stop. Show the code as a **full, self-contained file** (not a diff).
3. **Explain the why.** Before code, explain the concept(s) introduced in that step in beginner terms.
4. **Call out manual actions.** If Michael must download a file or choose an asset, say so clearly and wait.
5. **Acceptance test.** Tell Michael _what to look for on screen_. Ask for approval before continuing.
6. **No cascade of changes.** Never jump to the next step without explicit "continue".
7. **Version awareness (r179).** Prefer up-to-date APIs; avoid outdated patterns.
8. **Rollback friendly.** If something looks worse, revert to the previous working state.

---

## Why the current scene looks off (diagnosis)

- You used **RoomEnvironment** as image-based lighting (IBL). It's an _indoor studio_ probe: bright, neutral, and "daylighty." Outdoors at night, IBL should be **faint and bluish**. Studio IBL makes objects look like plastic toys.
- **ACES tone mapping** + exposure set high + bright IBL = milky highlights and low contrast.
- Materials use **PBR** (`MeshStandardMaterial`), which expects:
  - a reasonable **albedo** (base color not near black),
  - **roughness/metalness** that matches the material,
  - some **micro-detail** (normal/roughness maps).  
    Flat colors + very high roughness everywhere = bland, rubbery look.
- **scene.background** (your gradient) **does not light** objects. Only **scene.environment** (a PMREM env map) contributes to PBR lighting.
- Fog/sky banding and a perfectly flat ground amplify the artificial feel.

**So the fix** is not "add more lights" but **rebalance energy**: faint, cool IBL + a believable moon directional light + gentle sky bounce, correct exposure, and materials with micro-detail. Then sprinkle fog and shadows.

---

## Concepts in plain language (quick glossary)

- **IBL / environment map:** a panoramic image (usually HDR) that tells materials "what the world looks like" so they can reflect some of it. In three.js, assign it to `scene.environment` (as a PMREM texture).
- **HDRI:** a high-dynamic-range panorama used for IBL. Night HDRIs exist (stars, city glow, moonlight).
- **PMREM:** a filter that turns an HDRI into a format PBR shaders can sample efficiently.
- **Albedo (base color):** the true color of a surface. Too dark = no light to reflect.
- **Roughness/metalness:** sliders for how glossy/metallic a surface is. Stone: high roughness, zero metalness. Chrome: low roughness, full metalness.
- **Tone mapping & exposure:** the "camera response curve" and "ISO" of your virtual camera. ACES is filmic; exposure is your main brightness knob.
- **DirectionalLight:** like the sun or moon—light rays are parallel; good for long shadows.
- **HemisphereLight:** simulates sky color from above and ground bounce from below.
- **AmbientLight:** flat fill that lifts all shadows equally (use sparingly).
- **Fog:** fades distant objects into a color; ties the ground to the horizon, hides the infinite plane.

---

## The plan (eight small steps)

You and the agent will move from "visible but wrong" → "moody and playable."  
Each step includes: **(A) what you'll learn, (B) what you'll change, (C) acceptance test, (D) full code**.

> Directory assumption (Vite): static assets live in `/public`. Put textures/HDRIs there:
>
> ```
> public/
>   assets/
>     hdri/
>     textures/
> ```

---

### STEP 0 — Baseline snapshot + handy debug keys ✅

**Implemented:** Commit `742e16a`  
**What we learned:** German keyboard needs ü/ä instead of brackets  
**Current state:** ü increases exposure, ä decreases it

**A. Learn:** We'll add bracket keys `[` `]` to tweak exposure live.  
**B. Change:** Keep your current scene but add exposure hotkeys; confirm everything compiles.  
**C. Accept:** Press `]` → scene gets brighter; `[` → darker.

```js
// STEP 0: your existing main.js + exposure hotkeys (add to render setup)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
window.addEventListener("keydown", (e) => {
  if (e.key === "ü") renderer.toneMappingExposure *= 1.06; // German keyboard
  if (e.key === "ä") renderer.toneMappingExposure /= 1.06;
});
```

---

### STEP 1 — Clean baseline lights (no IBL yet) ✅

**Implemented:** Commit `5131463`  
**What worked:** Removed RoomEnvironment successfully, much darker and atmospheric

**A. Learn:** With physically-correct lights (r179), intensities from old tutorials are misleading. We'll set a cool moon, soft sky bounce, tiny ambient.  
**B. Change:** Remove RoomEnvironment. Set: `moon=0.8`, `hemi=0.25`, `ambient=0.05`, exposure 1.0.  
**C. Accept:** Scene looks **night-ish but readable**; distinct shadow direction; not milky.

---

### STEP 2 — Add **night HDRI** IBL (manual asset + code) ✅

**Implemented:** Commit `e2bfd91`  
**Key learning:** r179 bug - must set envMap directly on materials for intensity to work!  
**HDRIs downloaded:** 5 night environments (moonless_golf, satara variants, dikhololo, kloppenheim)  
**Current:** Using moonless_golf at 0.15 intensity

**A. Learn:** HDRI is a 360° image with brightness info. We PMREM it and set `scene.environment`. For r179 there is **no global environment intensity**; we'll set **`envMapIntensity` per material** (utility provided).  
**B. Manual:** Michael downloads one _night_ HDRI from **polyhaven.com → HDRIs → "night"** (e.g., _moonless_golf_2k.hdr_ or _starlit_skies_2k.hdr_). Place it at:  
`public/assets/hdri/night_2k.hdr`  
**C. Change:** Load via `RGBELoader`, PMREM it, set low intensity (~0.15).  
**D. Accept:** Shadows stay dark; surfaces in shade no longer go pitch-black; overall vibe stays night.

**Implementation notes:**

- Fixed r179 bug by setting material.envMap directly (not just scene.environment)
- Added +/- keys for live intensity adjustment (0.05 steps)
- Easy HDRI switching via HDRI_CHOICE variable

---

### STEP 3 — Add a **Dev Panel** (lil-gui) for live control 🚧

**NOTE: Moved up from original Step 6 for better development experience**

**A. Learn:** Live sliders keep you focused and curious, great for ADHD brains.  
**B. Change:** Add lil-gui controls for exposure, light intensities, fog near/far, environment intensity, and HDRI selection.  
**C. Accept:** You can nudge values while watching the scene; panel in top-right corner.

```js
// npm i lil-gui
import GUI from "lil-gui";

const gui = new GUI();
const state = {
  exposure: renderer.toneMappingExposure,
  envIntensity: 0.15,
  hdri: "moonless_golf",
  moon: moon.intensity,
  hemi: hemi.intensity,
  ambient: amb.intensity,
  fogNear: scene.fog.near,
  fogFar: scene.fog.far,
};

// Add controls with reset buttons
gui
  .add(state, "exposure", 0.5, 3.0, 0.01)
  .onChange((v) => (renderer.toneMappingExposure = v));
gui
  .add(state, "envIntensity", 0, 1, 0.01)
  .onChange((v) => setEnvIntensity(scene, v));
gui
  .add(state, "hdri", [
    "moonless_golf",
    "satara_night",
    "dikhololo_night",
    "kloppenheim_02",
  ])
  .onChange((v) => loadHDRI(v));
// ... more controls
```

---

### STEP 4 — Ground **micro-detail** (color + normal map) 📋

**Previously Step 3, moved to Step 4**

**A. Learn:** Flat colors read as plastic. A tiling **color map** + **normal map** gives grass "bite" under moonlight.  
**B. Manual:** Download two seamless textures (e.g., **AmbientCG**: `Grass005_1K_Color.jpg`, `Grass005_1K_NormalGL.jpg`). Save to:  
`public/assets/textures/grass_col.jpg`, `public/assets/textures/grass_nrm.jpg`  
**C. Change:** Apply, tile 16×, mark color map as sRGB.  
**D. Accept:** The ground shows fine detail; close to camera it no longer looks like painted plywood.

---

### STEP 5 — Fog + sky polish 📋

**Previously Step 4, moved to Step 5**

**A. Learn:** Fog binds the world to the horizon; your gradient can band if too low-res.  
**B. Change:** Keep the taller 2048px gradient; tune fog to `near=30–40, far=85–95` and align color to horizon.  
**C. Accept:** Distant objects soften toward the horizon; no harsh "cut line".

---

### STEP 6 — Shadow tuning 📋

**Previously Step 5, moved to Step 6**

**A. Learn:** Soft but defined moon shadows sell the mood. One shadow-casting light only.  
**B. Change:** Keep `mapSize=1024` (or 2048 if GPU allows), bias in `[-0.0005, -0.002]`, `normalBias≈0.02`. Fit shadow camera to the play area (±60 already good).  
**C. Accept:** No acne or peter-panning; shadows neither razor-thin nor blotchy.

---

### STEP 7 — Start the **Dev Room** habit 📋

**A. Learn:** A neutral testing pad accelerates all future asset work.  
**B. Change:** Add a tiny "drop zone" where the agent loads GLTFs from `/public/assets/devroom/` and lays them out on a grid with default **gray-blue PBR** if the model lacks textures.  
**C. Accept:** You can drop a model, see how it looks **under this exact night rig**, and tweak with the GUI.

---

### STEP 8 — Polish the **flashlight** 📋

**Note: Flashlight already exists, just needs tuning**

**A. Learn:** A spotlight attached to the camera. We'll keep it a **tool**, not a crutch.  
**B. Change:** Toggle with `F`, warm color, narrow cone, soft penumbra.  
**C. Accept:** When ON, bright cone with soft edges; when OFF, baseline scene stays playable.

Current implementation already has flashlight (F key), but intensity/angle may need adjustment via GUI.

---

## When to stop tuning (good baseline checklist)

- Without the flashlight, you can see silhouettes out to ~50–60 m.
- With the flashlight, details pop without bleaching the scene.
- Nothing feels "milky" (too bright IBL/exposure) or "inky" (no IBL/excess dark).
- Ground shows subtle texture; tombstones catch tiny speculars; shadows feel moon-cast.
- FPS is solid; no console errors.

---

## Appendix — Version notes (r152→r179, the bits that matter)

- **Color management tightened.** Use `renderer.outputColorSpace = THREE.SRGBColorSpace;` and mark **color textures** as sRGB (`texture.colorSpace = THREE.SRGBColorSpace`). Don't mark normal/roughness/metalness/AO as sRGB.
- **Physically-correct lighting is default** (since r155). Intensities from old articles often feel off; trust your eyes, the GUI, and exposure.
- **Environment intensity:** there is no `scene.environmentIntensity` in r179. Control via **`envMapIntensity` on materials** or traverse the scene and set it globally with a helper function.
- **Tone mapping:** ACES is a good default; use **exposure** (0.8–1.4) as your main knob.

---

## Implementation Notes & Lessons Learned

### r179 Environment Map Bug

In Three.js r179, `envMapIntensity` only works when `material.envMap` is set directly. Just using `scene.environment` isn't enough. We had to:

1. Set `scene.environment` for diffuse IBL
2. Also set `material.envMap` on each material for intensity control
3. This was fixed in r181+

### Key Bindings for German Keyboard

- ü/ä work better than brackets on German layout
- ü for increase (up), ä for decrease (down)
- +/- for environment intensity adjustment

### HDRI Selection Strategy

Downloaded 5 HDRIs for different moods:

- `moonless_golf` - Very dark (horror baseline)
- `satara_night_no_lamps` - Dark with stars
- `satara_night` - Dark with lamp glow
- `dikhololo_night` - Brighter for testing
- `kloppenheim_02` - Brightest

---

## What the agent should deliver each turn

1. **Explain the step in plain language** (2–5 sentences).
2. **List any manual actions** Michael must do (download/copy files) and wait.
3. **Show a full, working file** (e.g., `src/main.js`) that can be pasted in one go.
4. **Give a 10-second acceptance test** ("You should see X, Y, Z").
5. **Ask to continue or tweak.** Offer 2–3 tiny knobs to try.
6. **On issues**, propose a quick revert ("set exposure to 1.0; set env intensity to 0.0; does it help?").

---

## Final note

This is a lighting class disguised as a game. We're not "adding hacks"; we're **teaching the renderer what kind of night it is**: faint, cool sky; a single distant moon; tiny ambient bounce; materials with just enough micro-detail to catch that light. With the dev panel and dev room, you'll be able to audition any future asset in minutes.

Current focus: **Atmospheric sky enhancement** following the detailed plan in `atmospheric-sky-implementation-plan.md`

### Atmospheric Sky Implementation Status
**Step 1 COMPLETE (2025-09-07):** Four-stop gradient with proper horizon alignment  
**Step 2 COMPLETE (2025-09-08):** Dual-source light pollution system with physics-based falloff
- **Fine-tuned (2025-09-08):** Adjusted default values for more realistic appearance  
**Step 3 COMPLETE (2025-09-08):** Dithering (anti-banding) with hash-based screen-space noise
- **Eliminates color banding:** Smooth gradients across all display types
- **Minimal performance impact:** Single hash calculation per pixel
**Step 4a DEPRECATED (2025-09-09):** Fragment shader stars abandoned due to architectural flaws
- **Issues:** View-dependent recalculation, unstable brightness, unfixable camera movement bugs
- **Resolution:** ADR-003 documents switch to THREE.Points geometry-based approach
**Step 4b PENDING:** THREE.Points geometry-based stars (new implementation plan)
**Next:** Implement geometry-based star field before proceeding to atmospheric noise  
**Reference:** See `docs/atmospheric-sky-implementation-plan.md` for detailed progress tracking

### Additional Features
**Mouse Look Controls COMPLETE (2025-09-08):** First-person camera control with pointer lock API  
- Smooth horizontal/vertical rotation with clamped angles  
- Fixed horizontal inversion issue for natural feel  
- Integrated with existing WASD movement system
