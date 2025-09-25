# Hedwig Asset Pipeline Guide

Use this checklist whenever we curate raw vendor content into web-ready props.

## 1. Gather Inputs
- Copy relevant vendor FBX/OBJ + texture sets into `assets/source/raw/...` (keep source folder names intact).
- Note available PBR maps (baseColor, roughness, metalness, normal, emission, etc.).

## 2. Prepare the Blender Scene
- Duplicate `asset-import-template.blend` into `assets/source/working/<pack>/<asset-name>.blend`.
- Import all pieces; align, merge, or parent as needed. Keep the main origin at ground level.
- Hide unused variants but leave them in the file for later.

## 3. Materials & Shading
- Create or reuse `MAT_<Asset>_Master` materials.
- Wire PBR textures: BaseColor & Emission = sRGB, others = Non-Color.
- Enable Auto Smooth (~60°) and fix normals/shading issues.
- Keep glass/FX materials separate only if gameplay needs transparency.

## 4. Naming & Organization
- Meshes: `SM_<Asset>_*` (e.g., `SM_StreetLamp_Base`).
- Root empty for export sets: `SM_<Asset>_Simple`.
- Collections optional, but keep Outliner tidy for multi-part assets.

## 5. Export Prep
- Select only the objects to ship (usually root + visible meshes).
- `Ctrl+A` → apply Location, Rotation, Scale.
- Save the `.blend` before exporting.

## 6. Export (Hedwig Draco Preset)
- Use `File ▸ Export ▸ glTF 2.0` with the preset:
  - Format: glTF Binary (.glb)
  - Selected Objects, Apply Modifiers, UVs, Normals, Tangents
  - Draco Mesh Compression enabled
  - Animations, armatures, lights disabled
- Output to `public/assets/models/props/` as `SM_<Asset>_Variant.glb`.

## 7. Document & Commit
- Add notes to `docs/assets/<asset>-session-notes.md` (height, textures, export path).
- Commit GLB + docs (Blend files stay local unless we adopt Git LFS).
- Push to remote so the dev environment can pull the asset.

## 8. Optional Optimizations
- Batch downscale textures to 1 K once asset quality is approved.
- Generate KTX2 versions with `toktx` for runtime delivery.
- Update the doc with any compression steps performed.

Follow this guide for each prop; branch off new assembly plans only when an asset needs bespoke steps.
