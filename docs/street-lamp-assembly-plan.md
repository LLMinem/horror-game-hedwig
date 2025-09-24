# Street Lamp Assembly & Export Plan

## 1. Reference & Scene Prep
- Organize the lamp meshes into their own collection for clarity.
- Switch to orthographic front view and enable snapping for accurate vertical alignment.
- Record initial measurements (bounding boxes, total height) to validate proportions after assembly.

## 2. Assemble the Lamp Geometry
- Move each mesh (`lamp_base_small`, `lamp_body`, `lamp_support`, `lamp_light`) so they stack correctly at the world origin.
- Use temporary empties or snapping targets to align contact points—base to pole, pole to support arm, support to lantern.
- Decide whether to keep parts separate (for future tweaks) or join into one mesh; if separate, parent them to an empty named `street_lamp_root`.

## 3. Transform & Pivot Cleanup
- Apply location, rotation, and scale on each mesh once assembled.
- Set the asset’s origin to ground level at the center of the base.
- Apply transforms on the parent empty if used.

## 4. Geometry QA
- Check shading: enable autosmooth or adjust custom normals; fix inverted faces.
- Remove doubles/non-manifold edges; optionally add a light bevel if silhouette needs softening.
- Inspect UVs to ensure shells are intact and non-overlapping.

## 5. Material & Texture Setup
- Create Principled BSDF materials wired to the pack’s PBR textures (BaseColor, AO, Roughness, Metalness, Normal, Emission).
- Configure normal map nodes with the correct tangent space (DX vs OpenGL).
- For the lantern glass/light mesh, set emission and transparency as needed while keeping physical values plausible.
- Verify texture color spaces (sRGB for albedo/emission, Non-Color for the rest).

## 6. Lighting Sanity Pass
- Drop in an HDRI or simple lights to preview highlights and overall response.
- Adjust roughness/metallic balance if visuals look off; ensure lantern glass reads properly.

## 7. Optimization Check
- Confirm triangle count meets budget; lightly decimate or dissolve hidden faces if necessary.
- Keep lantern glass separate if we foresee animation (e.g., flicker) later.

## 8. Export Prep
- Rename objects with clear prefixes (e.g., `SM_Lamp_Base`, `SM_Lamp_Glass`).
- Confirm world-scale accuracy (~3–4 m tall) with origin at (0,0,0).
- Disable unused modifiers and ensure no unapplied materials remain.

## 9. glTF/Draco Export
- Export as GLB using Draco compression, embedding geometry only.
- Include tangents and UVs; exclude helper empties/lights unless needed.
- Save GLB under `public/assets/models/props/` and copy textures to `public/assets/textures/props/street_lamp/`.

## 10. Texture Compression (Optional Recommended)
- Run `toktx` to produce `.ktx2` versions for color and auxiliary maps.
- Store compressed textures alongside originals and note results in the asset log.

## 11. Three.js Integration Checklist
- Document loader requirements (`GLTFLoader` + `DRACOLoader` + `KTX2Loader`).
- Provide placement guidance (origin alignment, suggested emissive intensity, optional point light position).

## 12. Validation & Handoff
- Share Blender viewport renders and GLB preview for review.
- Log asset details (tri count, texture list, compression status) for future reference.

