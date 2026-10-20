---
type: scratchpad
status: verified-runtime
created: 2025-09-30
last_verified: 2026-10-18
owned_by: human
supersedes: []
superseded_by: []
---

# Street Lamp Scratchpad (SM_StreetLamp_Simple)

Issue #10 is implemented in the `r03` source revision below. Older sections retain the original authoring history, not current export instructions. The lamp remains a disposable sandbox asset, not a reference for the real cemetery.

## Asset Summary
- **Current source**: `assets/source/working/street-lamp/r03/street-lamp.blend`; five dependencies beside it under `textures/`, referenced with source-relative `//textures/` paths.
- **Original source, unchanged**: `assets/source/working/cemetery-pack/street-lamp-simple.blend`
- **Export target**: `public/assets/models/props/SM_StreetLamp_Simple.glb`
- **Associated preset**: Hedwig Draco Export (glTF Binary, selected objects, tangents, Draco compression)
- **Related docs**: `docs/archive/street-lamp-assembly-plan.md`, `docs/assets/pipeline-guide.md`, `docs/archive/street-lamp-session-notes.md`

## Scene Structure (2025-09-30)
- **Root empty**: `SM_StreetLamp_Simple` (origin at ground level, 0/0/0)
- **Visible meshes**:
  - `SM_StreetLamp_Base` — base + pole, bounding box Z ≈ 0.0036 m → 3.4315 m
  - `SM_StreetLamp_Lantern` — lantern head, bounding box Z ≈ 3.4315 m → 4.4158 m
- **Hidden meshes**:
  - `SM_StreetLamp_BaseSmall` — alt base offset at X=2 m
  - `SM_StreetLamp_Support` — optional support arm offset at X=2 m
- **Triangle budget**: ~1.7 k current (plenty below 5 k target)
- **Lantern glass anchor measurements** (measure tool, 2025-09-30):
  - Top hex (ceiling) corner-to-corner: 0.334615 m
  - Bottom hex (floor) corner-to-corner: 0.116612 m

## Material Overview
- **Material**: `MAT_StreetLamp_Master` (Principled BSDF)
- **Texture set** (all under `assets/source/raw/cemetery-pack/5111390_Street_lamp/`):
  - `lamp_baseColor.png`
  - `lamp_metalness.png`
  - `lamp_roughness.png`
  - `lamp_normal.png`
  - `lamp_emission.png`
- **Current behavior**: Single material drives both metal and glass; emission texture keeps glass bright even when emissive strength is low (default 1.5).

## Target Outcomes (per 2025-09-28 checklist)
- Glass appears neutral/dim when emissive strength = 0; glows at ≈1–2 without bleeding through metal.
- Interior caps block light from leaking through roof or base opening.
- Updated GLB exports cleanly with textures intact.

## Session Plan – 2025-09-30
1. [x] **Phase 1 – Inspect textures & masks**
   - Preview base color/emission maps; confirm glass isolation.
   - Record measurements/normals for lantern interior reference.
2. [x] **Phase 2 – Material split using existing texture masks**
   - Branch glass vs metal shading in `MAT_StreetLamp_Master`.
   - Add emission control with 0 and ~1.5 presets.
3. [x] **Phase 3 – Add interior light blockers**
   - Modeled separate meshes `SM_StreetLamp_Lantern_TopPane` & `_BottomPane`; triangulated and UV-projected from view.
4. [x] **Phase 4 – Metal roof opacity check**
   - Added interior caps to block upward/ downward bleed; metal remains opaque, caps share metal shading.
5. [x] **Phase 5 – Cleanup & export prep**
   - Applied transforms, recalculated normals, verified overall height ≈4.416 m.
6. [x] **Phase 6 – Export & documentation**
   - Re-exported GLB with Hedwig Draco preset; updated notes/screenshots pending; scratchpad + backlog refreshed.

## Progress Log
- 2025-09-30 — Scratchpad created; plan approved by Michael; awaiting Phase 1 execution.

### Phase 1 Findings (2025-09-30)
- Emission map `lamp_emission.png` is a clean binary mask (0 for metal, 1 for glass); ~4.7% of pixels lit.
- Base color sampled luminance range ≈0.01–0.72, mean ≈0.14; glass panels are brightest region.
- Lantern bounding box: 3.4315 m → 4.4158 m (height ≈0.9843 m). Base section: 0.0036 m → 3.4315 m.
- Lantern vertex z-levels span 27 unique heights; lower rim radius ≈0.08 m, upper rim radius ≈0.22 m — confirms tapered hex profile for cap placement.
- Face normals check shows many downward-facing facets (as expected for roof panels); no anomalies spotted.
- Ready to proceed with Phase 2 material split using emission mask.

### Phase 2 Findings (2025-09-30)
- Added `Glass Mask` color ramp (emission texture in Non-Color) to isolate panes cleanly.
- Base color now routes through `Glass Multiply` (warm tint ≈[0.25,0.22,0.18]) and `BaseColor Mix`, dimming panes to ~20–25 % brightness while preserving texture detail; metal branch untouched.
- Metallic and roughness maps mix against constants (0 metal, ~0.12 roughness) so glass is non-metallic and slightly glossy; metal keeps texture-driven values.
- Emission color driven by mask × warm tint (#fff2c7-ish). A `Value` node labeled “Emission Strength” feeds Principled emission strength (default 0.1). Runtime calibration: 0.1 = off baseline, 1.5 ≈ on target glow (runtime should drive this linearly).
- Updated `Glass Mask` ramp: constant interpolation with white step at 0.8 to match emissive map values (ensures slider responds visibly).
- Runtime hook idea: expose emission strength via GLTF emissive factor (`MeshStandardMaterial.emissiveIntensity` in Three.js) so Dev Room GUI slider can lerp 0.1 → 1.5 and stay in sync with in-game brightness.
- All supporting texture nodes forced to correct color spaces (Metalness/Roughness/Emission → Non-Color).
- Ready for viewport check and Phase 3 geometry work.

### Phase 3 Findings (2025-10-06)
- Added top and bottom blocker panes as standalone meshes (`SM_StreetLamp_Lantern_TopPane`, `_BottomPane`) parented under `SM_StreetLamp_Simple`.
- Each pane triangulated and UV mapped via Project From View to satisfy tangent export requirements.
- Caps sit just inside glass; metal material applied so they read as opaque when emissive is 1.5.

### Phase 4 Findings (2025-10-06)
- Visual check in dark viewport confirmed caps block upward/downward light bleed while leaving mullion silhouettes intact.
- Metal roof thickness acceptable without extra Solidify; caps provide backup light-stop.

### Phase 5 Findings (2025-10-06)
- Applied transforms on base, lantern, caps, and root empty; recalculated normals on all meshes.
- Verified bounding height unchanged (≈4.416 m) after edits; triangle count still <5 k.

### Phase 6 Findings (2025-10-06)
- Hedwig Draco Export preset rebuilt (glb, selected objects, tangents, Draco level 6) and reused for final export.
- Overwrote `public/assets/models/props/SM_StreetLamp_Simple.glb`; runtime test pending but emissive slider ready (0.1 off → 1.5 on).
- To-do: capture on/off viewport renders during next Blender session.
- 🔄 Runtime follow-up: bind Dev Room GUI lamp slider directly to material emissive intensity (0.1 ↔ 1.5) and re-test point-light offset once new GLB lands.

## Historical Internal Light Blocker Proposal (2025-10-07; resolved below)
- **Tracking:** GitHub issue #10.
- **Problem:** With the point light positioned inside the lantern, the outer roof still catches harsh highlights; current blocker panes are single surfaces so light reaches the same triangles that form the roof shell.
- **Goal:** Add a shallow sealed “cap” inside the lantern so the bulb can sit at physical height (~0.45) without lighting the exterior metal.
- **Steps to perform in Blender:**
  1. Duplicate the blocker geometry and extrude it upward to form a thin hexagonal prism that closes the top (sides + lid). Aim for 1–2 cm thickness so the light has material to hit.
  2. Ensure the new blocker surfaces have inward-facing normals. Apply transforms (`Ctrl+A`) and recalc normals if anything flips.
  3. Assign the roof metal material to the blocker; verify the emission mask stays untouched so glass remains the only emissive region.
  4. Inspect for gaps between blocker and roof; close any seams so the point light cannot peek through.
  5. Re-export `SM_StreetLamp_Simple.glb` with the Hedwig Draco preset once satisfied and log results below.
- **Post-export test checklist:** In the Dev Room set lamp light height to 0.45, intensity 35; confirm roof stays dark while glass + emissive glow remain convincing.

### Historical Engine Workaround (2025-10-09; superseded)
- The former 0.22 m light offset placed the bulb above the glass cage. The r03 revision and current default restore the 0.45 m offset.

## Issue #10 implementation and review — 2026-10-18

### Source and runtime changes

- Read-only inspection found the root empty was not a collection. `StreetLamp_Work` also contained hidden alternate meshes; the reference camera was outside it. The new `EXPORT_StreetLamp` contains only the root, base, metal lantern, separated glass, bottom cap and new roof liner. Neither alternates, reference camera nor the superseded top pane enter the GLB.
- `tools/blender/street_lamp.py` creates a new revision directory and refuses an existing one. It copies all five source images and retains relative dependencies without changing the original blend/raw textures. The emission-mask UV samples identify exactly twelve glass triangles. Glass now has its own material; metal uses the original base-colour, roughness, metalness and OpenGL normal images directly instead of the old unsupported mixed shader graph.
- The sealed hexagonal roof liner spans source Z 4.118–4.132 m, radius 0.195 m, overlapping the measured inner roof lip while staying inside the 0.22 m exterior eaves. It has twenty triangles, nondegenerate UVs and inward-facing normals. Inspection confirmed a closed manifold and negative signed volume. It uses a non-emissive opaque material, not the old cap UVs that accidentally sampled the glass emission mask.
- The runtime bulb is at Y 3.965830 m: 0.45 m below the 4.415830 m lantern top, inside the glass cage. A 0.02 m shadow-camera near plane includes the liner only about 0.15 m above the bulb; Three.js's default 0.5 m would clip it. The shadow map is 1024² with small depth/normal bias and two-sided metal occlusion.
- Glass is transmissive in the source/export (0.7 transmission, 0.12 roughness). Three.js depth shadows do not model material transmission, so only the separated glass mesh skips shadow casting; all metal, including the physical liner, still casts and receives shadows. This is not whole-lamp shadow disabling or an exterior roof material hack.
- Only `MAT_StreetLamp_Glass` receives the existing intensity mapping: off = 0.1, on at light intensity 35 = 1.5. The exterior roof stays non-emissive.

### Reproduce authoring and export

Choose a new revision name rather than overwriting r03:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python tools/blender/street_lamp.py -- \
  --source assets/source/working/cemetery-pack/street-lamp-simple.blend \
  --revision-dir assets/source/working/street-lamp/NEW_REVISION
bash tools/blender/run.sh export \
  --source assets/source/working/street-lamp/NEW_REVISION/street-lamp.blend \
  --collection EXPORT_StreetLamp --output .local/exports/street-lamp-NEW_REVISION.glb
```

The exercised r03 export used Blender **5.2.2 LTS**, Draco level 6, five meshes/primitives, three materials and an 18,379,836-byte GLB. The approved derivative replaces the actual loader path `public/assets/models/props/SM_StreetLamp_Simple.glb`. All runtime images are embedded; source dependencies remain separate and backed up. One exporter sampler-consolidation warning remains when merging the roughness/metalness images; both image nodes have the same Linear/REPEAT sampler settings. It was not suppressed. The new liner exports with tangents and no triangulation warning.

### Exercised acceptance and limits

- Saved-source Cycles off/on renders at 768² and source topology/dependency report are local under `.local/lamp-review/`. These are source review evidence, not a claim of identical Blender/Three.js photometry or human art acceptance.
- Actual Chrome **148.0.0.0**, Apple M3 Max, sandbox at port 3103: the real GUI toggled the lamp off/on at intensity 35 and offset 0.45. Captured render buffers are **1280 × 800**, DPR 1; the browser screenshot preview's backing scale is not used as the measurement.
- Runtime material snapshots confirm glass 0.1 → 1.5 and the unchanged bulb position. The close exterior-roof pixel region has exactly zero RGB change between off/on; mean lit roof RGB is approximately 4.90/7.77/11.91 (8-bit). The sampled ground region brightens from mean RGB 11.04/29.46/9.04 to 45.46/71.78/17.66. Separate legacy-prop off/on captures show illuminated nearby mesh faces. The cage casts visible radial frame shadows; these are physical occluders, not a fully black ground patch.
- The GLB and Draco resources loaded through the actual asset system; browser errors were empty. A 120-frame sandbox sample measured median 16.7 ms, p95 16.8 ms, 15 draw calls and 6,732 rendered triangles. This is one lamp sandbox measurement, not full-cemetery performance acceptance.
- Local snapshots under the approved `/Users/meeq/.backups/horror-game-hedwig/` policy preserve the original source dependencies and the complete r03 revision, authoring script and review evidence. Git contains only code, these notes and the redistributable GLB; it is not the source backup. Human final art acceptance remains separate.
