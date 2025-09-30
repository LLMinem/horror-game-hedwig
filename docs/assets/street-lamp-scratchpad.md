# Street Lamp Scratchpad (SM_StreetLamp_Simple)

## Asset Summary
- **Source blend**: `assets/source/working/cemetery-pack/street-lamp-simple.blend`
- **Export target**: `public/assets/models/props/SM_StreetLamp_Simple.glb`
- **Associated preset**: Hedwig Draco Export (glTF Binary, selected objects, tangents, Draco compression)
- **Related docs**: `docs/assets/street-lamp-assembly-plan.md`, `docs/assets/pipeline-guide.md`, `docs/assets/street-lamp-session-notes.md`

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
3. [ ] **Phase 3 – Add interior light blockers**
   - Model thin hex caps (top & bottom) within lantern; ensure they share metal shading.
4. [ ] **Phase 4 – Metal roof opacity check**
   - Solidify/Backface Culling as needed; verify no light transmission.
5. [ ] **Phase 5 – Cleanup & export prep**
   - Recalculate normals, reapply transforms, verify height ≈4.416 m.
6. [ ] **Phase 6 – Export & documentation**
   - Overwrite GLB, capture on/off renders, update session notes.

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
