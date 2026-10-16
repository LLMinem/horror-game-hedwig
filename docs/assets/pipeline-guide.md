---
type: guide
status: active
last_verified: 2026-10-16
---

# Source to browser asset checklist

Use this after the [active plan](../asset-integration-plan.md) supplies a bounded, reference-supported asset brief. The [Blender workbench](blender-workbench.md) owns executable commands and export constraints; [local references](../local-references.md) owns source discovery. No remembered UI preset, MCP server or VPS transfer is required.

1. **Select evidence and inputs.** Prefer modelling the actual site from photos and reviewed positions. Reuse complex assets such as trees when they fit; choose pack pieces or additional models/textures only for a concrete need, with source/rights checks. Record photo IDs, corrected versus observed positions, uncertain dimensions and purpose. Keep originals immutable and follow the [approved backup policy](../asset-integration-plan.md#before-modifying-sources). The pack's commercial permission is confirmed, visual suitability is not.
2. **Author a new source revision.** Build new geometry or adapt a suitable source copy; the existing lamp/test objects are not required content. Preserve or explicitly relink texture paths. Inspect units, object hierarchy, hidden alternates and external dependencies. One unit represents one metre; ground the intended origin. Create a dedicated export collection with only the intended meshes and parent empties. Do not blindly apply every transform to an assembled hierarchy.
3. **Make exportable materials.** Base colour/emission colour use sRGB; numeric maps/masks use Non-Color. Check OpenGL versus DirectX normal-map conventions. Keep useful UVs/normals/tangents. Bake procedural/unsupported shader graphs where needed: Blender's node graph is not the glTF material contract.
4. **Review source appearance.** Compare a neutral view to the selected references and capture intended dusk/night response. Check silhouette, shading, detail and scale. A tiny capability smoke is not this art review.
5. **Export to `.local/exports/`.** Use explicit source, collection and destination through the workbench. Inspect the emitted GLB and check dimensions, axes, materials and texture payload. The workbench checks Draco structure but is not a full Khronos validator. Keep a reproducible command and concise asset record with the accepted revision.
6. **Review in the actual runtime.** Only approved distributable derivatives enter `public/assets/models/` / `public/assets/textures/`. Initialize shared loaders through `initAssetSystem({ renderer })`; follow the lamp pattern in `src/assets/Assets.js` and `src/assets/DevRoom.js`. Register the loaded root with `environment.registerAsset(root)` for this repository's explicit environment/intensity updates. This is a repo convention, not a general claim that Three.js cannot apply `scene.environment` automatically.
7. **Accept and record.** Verify GLB/decoder/texture HTTP responses, console, neutral/mood views, dimensions, download cost and frame/draw-call measurements. Obtain human visual acceptance. Record source revision, export command, tool versions, emitted paths, rights/attribution, image-map treatment and review outcome in the existing asset notes. Follow `AGENTS.md` for commits and pushes. Deployment and public release need separate authorization.

KTX2 plumbing exists but there are no delivered KTX2 assets or established conversion command yet. Introduce conversion only after material acceptance and measured texture/download need; source PNG/JPG maps remain separate. For repeated props, cloning shares mesh resources but does not itself reduce draw calls like `InstancedMesh` does.

## Entrance and hall source checkpoint

The pilot authoring tools operate on the prepared private inputs and create new source directories. They refuse an existing revision instead of overwriting manual work. The source-only atlas and DGM remain unchanged.

```sh
.local/blueprint-venv/bin/python tools/blender/pilot_inputs.py --revision NEW_REVISION
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec \
  --python-exit-code 1 --python tools/blender/pilot_scene.py -- \
  --source-dir assets/source/working/entrance-hall-pilot/NEW_REVISION
bash tools/blender/run.sh export \
  --source assets/source/working/entrance-hall-pilot/NEW_REVISION/entrance-hall.blend \
  --collection EXPORT_EntranceHall --output .local/exports/entrance-hall-NEW_REVISION.glb
```

`inputs.json` records editable dimensions, source IDs, material provenance and uncertainty. `walk.json` contains the authored ground and movement boundaries. Ground sampling uses the same north-west to south-east triangle diagonal as the visible mesh. Paving follows the same triangles at a 25 mm offset, and the hall platform is levelled in that shared grid. The original DGM is not modified.

The hall export contains only `EXPORT_EntranceHall`. `PRIVATE_References` contains the packed aerial plane, and `MOVEMENT_Review` contains separate obstruction outlines. Neither collection enters the GLB. The hall materials use authored 512 px colour and OpenGL normal maps, with sRGB and Non-Color treatment respectively. No private photo pixels or inscriptions are used.

Vegetation is a separate reusable GLB from `vegetation-r06/vegetation-r06.blend`, collection `EXPORT_PilotVegetation`. `tools/blender/pilot_vegetation.py` records the inspected pack selection. Two broadleaf forms use purchased pack meshes, and the clipped shrubs, hedge and conifer use authored geometry. Pack broadleaf/bark derivatives are 512 px, and the authored needle image is 256 px. An opaque inner shrub crown retains the dense silhouette when masked leaf cards minify away; close views still use the cards. The owner has confirmed commercial permission for the pack. Shape, species, height and placement remain visual estimates.

`tools/blender/pilot_render.py` opens a saved revision without changing it and renders the named source views. `--vegetation public/assets/models/pilot/vegetation.glb` includes the runtime prototypes at the authored placements. `--save-review` creates a separate `entrance-hall-review.blend` for inspection, preserving the export source. The saved Blender revision, its textures, input files and script copies belong in the approved local backup. See the active plan for the current review revision and the remaining human acceptance gate.
