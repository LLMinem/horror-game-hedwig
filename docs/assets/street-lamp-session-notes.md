# Street Lamp Session Notes

- **Date:** 2025-09-24
- **Goal:** Prepare the simple two-part street lamp variant (body + lantern) for Hedwig’s Three.js pipeline.

## Plan Progress
- ✅ Step 1 – Alignment check: Confirmed `lamp_body` and `lamp_light` sit flush with numeric bounding-box verification.
- ✅ Step 2 – Transform & origin cleanup: Applied identity transforms and parented both meshes under `street_lamp_simple_root` at ground origin.
- ✅ Step 3 – Naming & visibility pass: Renamed meshes to `SM_StreetLamp_*` convention, kept optional variants hidden.
- ☐ Step 4 – Verification screenshot + measurements (pending).

## Noteworthy Details
- Export reminder: glTF export will include only selected/visible meshes (e.g., the simple variant), so hidden parts won’t hit runtime performance.
- Bounding height (simple variant): ~4.416 m top of lantern, base at ~0.0036 m above ground.

- ✅ Step 4 – Verification: Captured orthographic viewport screenshot for review; confirmed assembled height ≈4.416 m.
- 💡 Decision: Keep the simple lamp fully opaque for now (no separate glass material); the existing 1K PBR set is acceptable for the dev room and performance-friendly for Three.js.
- 📐 Current texture sizes: 2 K for base/metal/roughness/normal, 1 K for emission; no downscaling yet. We'll keep 2 K during asset prep and revisit 1 K + KTX2 once the full set of props is ready.
- 🔜 Next focus: lighting sanity pass → export prep → Draco GLB export (Selected Objects, tangents) → final documentation.
- 🗂️ Exported `SM_StreetLamp_Simple.glb` with the **Hedwig Draco Export** preset (Selected Objects, Apply Modifiers, UVs/Normals/Tangents, Draco compression). Output: `public/assets/models/props/SM_StreetLamp_Simple.glb`.
- 📦 Preset saved in Blender’s export panel for reuse across future assets.
- 🕹️ Runtime check (2025-09-26): Street lamp loaded in Dev Room; moonlight shadows show harsh banding/missing center section. Need to revisit lightmap/normal flow before final handoff.
- ✨ Follow-up: author an emissive pass (or baked point light) for the lantern glass so the top housing glows; currently renders dark in-engine.

## 2025-09-28 Runtime Integration Notes
- Added a controllable warm point light in the Three.js Dev Room to sell the lamp glow; default settings: intensity 35, range 22  m, decay 2.2, color `#fff2c0`.
- Point light currently auto-centers via bounding box. A slight Y offset (−0.1  m planned) may be required so the bulb sits inside the glass and stops lighting the metal cap.
- Moon directional light shadows still show low-resolution artifacts around the pole; scheduled tuning: increase shadow map size, tighten frustum, revisit bias/normal bias.
- GUI now exposes lamp light toggles plus future room for flicker/breathing effects.

### Future Atmosphere Ideas (for gameplay planning)
- Runtime flicker and intensity modulation (slow breathing, occasional sparks) once emissive channel exists.
- Consider progressive light degradation tied to gameplay milestones (e.g., graves watered) to heighten tension.

## 2025-10-06 Asset Polish Notes
- ⭐ Completed material split: glass darkens at emissive 0.1 and glows warmly at 1.5; emission strength exposed via Value node (`Emission Strength`).
- ⭐ Added interior blocker meshes (`SM_StreetLamp_Lantern_TopPane`, `_BottomPane`) to stop light bleed; triangulated + UV projected for tangent-safe export.
- ⭐ Rebuilt Hedwig Draco export preset and re-exported `public/assets/models/props/SM_StreetLamp_Simple.glb` with updated geometry.
- 📸 TODO: capture Blender viewport renders (emissive off/on) next session for docs.
- 🔄 Runtime follow-up: bind Dev Room GUI lamp slider directly to material emissive intensity (0.1 ↔ 1.5) and re-test point-light offset once new GLB lands.
- 🛠️ New TODO (2025-10-07): create a sealed interior light blocker (thin hexagonal prism) so internal point lights no longer brighten the outer roof; re-export GLB afterwards.
- 📉 Interim workaround (2025-10-09): Dev Room keeps the lamp light offset at 0.22 (above the roof) to avoid the harsh highlight; revisit when issue #10 is closed.
