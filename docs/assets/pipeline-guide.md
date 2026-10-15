---
type: guide
status: active
last_verified: 2026-10-10
---

# Source to browser asset checklist

Use this after the [active plan](../asset-integration-plan.md) supplies a bounded, reference-supported asset brief. The [Blender workbench](blender-workbench.md) owns executable commands and export constraints; [local references](../local-references.md) owns source discovery. No remembered UI preset, MCP server or VPS transfer is required.

1. **Select evidence and inputs.** Prefer modelling the actual site from photos and reviewed positions. Reuse complex assets such as trees when they fit; choose pack pieces or additional models/textures only for a concrete need, with source/rights checks. Record photo IDs, corrected versus observed positions, uncertain dimensions and purpose. Keep originals immutable; independent source backup must be established before valuable authoring. The pack's commercial permission is confirmed, visual suitability is not.
2. **Author a new source revision.** Build new geometry or adapt a suitable source copy; the existing lamp/test objects are not required content. Preserve or explicitly relink texture paths. Inspect units, object hierarchy, hidden alternates and external dependencies. One unit represents one metre; ground the intended origin. Create a dedicated export collection with only the intended meshes and parent empties. Do not blindly apply every transform to an assembled hierarchy.
3. **Make exportable materials.** Base colour/emission colour use sRGB; numeric maps/masks use Non-Color. Check OpenGL versus DirectX normal-map conventions. Keep useful UVs/normals/tangents. Bake procedural/unsupported shader graphs where needed: Blender's node graph is not the glTF material contract.
4. **Review source appearance.** Compare a neutral view to the selected references and capture intended dusk/night response. Check silhouette, shading, detail and scale. A tiny capability smoke is not this art review.
5. **Export to `.local/exports/`.** Use explicit source, collection and destination through the workbench. Inspect the emitted GLB and check dimensions, axes, materials and texture payload. The workbench checks Draco structure but is not a full Khronos validator. Keep a reproducible command and concise asset record with the accepted revision.
6. **Review in the actual runtime.** Only approved distributable derivatives enter `public/assets/models/` / `public/assets/textures/`. Initialize shared loaders through `initAssetSystem({ renderer })`; follow the lamp pattern in `src/assets/Assets.js` and `src/assets/DevRoom.js`. Register the loaded root with `environment.registerAsset(root)` for this repository's explicit environment/intensity updates. This is a repo convention, not a general claim that Three.js cannot apply `scene.environment` automatically.
7. **Accept and record.** Verify GLB/decoder/texture HTTP responses, console, neutral/mood views, dimensions, download cost and frame/draw-call measurements. Obtain human visual acceptance. Record source revision, export command, tool versions, emitted paths, rights/attribution, image-map treatment and review outcome in the existing asset notes. Publish or commit only when requested.

KTX2 plumbing exists but there are no delivered KTX2 assets or established conversion command yet. Introduce conversion only after material acceptance and measured texture/download need; source PNG/JPG maps remain separate. For repeated props, cloning shares mesh resources but does not itself reduce draw calls like `InstancedMesh` does.
