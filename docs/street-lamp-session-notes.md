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
