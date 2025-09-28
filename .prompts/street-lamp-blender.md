# Hedwig Street Lamp – Blender Polish Checklist (2025-09-28)

Context summary for the Blender MCP agent:
- Current exported asset lives at `public/assets/models/props/SM_StreetLamp_Simple.glb`.
- Game runtime now adds a warm point light inside the lantern and exposes emissive controls; we still need the source `.blend` updated so the asset reacts correctly when “off” vs. “on”.
- Target outcome: lamp head looks neutral/dim when off, glows convincingly when emissive/point light are active, and the metal cap blocks light bleed.

## Tasks
1. **Open working file**
   - Load the street-lamp working scene (expected at `assets/source/working/street-lamp/SM_StreetLamp_Simple.blend`; adjust if the file sits elsewhere).
   - Confirm objects keep the `SM_StreetLamp_*` naming convention and the export root is `SM_StreetLamp_Simple` with origin at ground level.

2. **Material tweaks**
   - Identify the lamp-head glass material (currently looks pale/yellow).
   - Darken the base/albedo color so, with emissive at 0, the glass reads as unlit (aim for ~20–30% brightness, slightly warm).
   - Add/adjust an **Emission** socket: feed the emissive texture if one exists or create a new color ramp (warm white), and expose an `Emission Strength` slider. Calibrate two useful values: 0 for “off”, 1–2 for “on”.
   - Ensure the metal cap uses an opaque material with zero transmission. Increase thickness or enable **Backface Culling** plus a **Solidify** modifier if needed to make it block internal light.

3. **Geometry check**
   - Verify the lamp head has inner geometry shielding the top; if not, add a simple interior disc/panel so the point light cannot leak through the roof.
   - Keep triangle count reasonable (<5 k for the full asset). Any added geometry should be light.

4. **Export prep**
   - Re-apply transforms (`Ctrl+A` → All Transforms) on modified meshes.
   - Confirm scale: total height ≈4.416 m.
   - Update the export preset **Hedwig Draco Export** if necessary so tangents + Draco compression remain enabled.

5. **Export + deliverables**
   - Export to `public/assets/models/props/SM_StreetLamp_Simple.glb` (overwrite existing).
   - If new texture maps were created (e.g., emissive), save them under `public/assets/textures/props/street_lamp/` with consistent naming (`SM_StreetLamp_Glass_Emissive_2k.png`) and note them in the session log.
   - Provide viewport renders: one with emissive strength 0 ([lamp off]) and one with emissive ≈1.5 ([lamp on]).

6. **Document findings**
   - Record any material names, emissive strength ranges, or geometry adjustments in `docs/assets/street-lamp-session-notes.md` (you can leave TODO markers for the coding team if needed).

## Acceptance checklist
- Glass appears noticeably darker when emissive strength is 0.
- With emissive ~1.5, the lamp head glows without the cap/roof glowing.
- Point light placed slightly below the roof (runtime will subtract 0.1 m) now sits inside the glass without shining through the metal.
- Re-exported GLB opens in Blender with no missing textures and imports cleanly in Three.js.
