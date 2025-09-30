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
2. [ ] **Phase 2 – Material split using existing texture masks**
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
