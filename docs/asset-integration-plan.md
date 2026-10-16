---
type: plan
status: active
created: 2025-09-23
last_verified: 2026-10-16
---

# Hedwig — evidence-led environment revival

## Accepted direction

Reconstruct the actual Neuer Friedhof in Bruchköbel as faithfully and in as much visible detail as the evidence and browser performance allow, at dusk or night. The first milestone is an environment prototype: spatial structure, surfaces, assets, atmosphere, walkability, collision and loading. NPCs, watering/objectives, inventory, chase/failure systems and interiors are outside it. Audio is undecided.

Micha explicitly approved the entrance/hall pilot, its plan and the required runtime changes on 2026-10-16. The first textured, walkable browser checkpoint now exists on `feat/entrance-hall-pilot`. The session includes one requested heavy-subagent QA and selected fixes, then stops for Micha's visual review. Whole-site expansion, deployment and publication are not authorized.

Micha's follow-up prioritizes photo location review before choosing a polished section: retain original metadata, distinguish device-reported accuracy from verified positions, and let him correct uncertain camera locations on the map. Prefer agent-built, reference-backed models of the cemetery itself. Complex assets such as trees may use the existing pack; additional textures/models remain an option when needed after fit and licence checks. The existing lamp, Blender lamp sources and sample props are pipeline experiments, not authoritative references or required production content.

The 2026-10-15 visual review covered all 98 photos and left nineteen owner checks. On 2026-10-16 Micha supplied corrections and authorized autonomous map preparation using additional geodata and the photos, explicitly excluding Blender construction. His imported rows now have priority. He subsequently rejected the 113 agent-drawn traces, including urn bays, lawns and canopy geometry, as broadly inaccurate and worse than the canonical GeoJSON. Technical validation never established visual accuracy.

[Blueprint preparation](blueprint-preparation.md) is the authoritative guide for the source-only atlas, acquired sources, metric contract and next agent's context package. Retain the 140 canonical features as a working baseline with local uncertainty. Pause whole-site map expansion and do not commission a full redraw. The 13 regional photo-index groups help find photos, but do not supply trusted observations or modeling instructions.

## Current implementation

`src/main.js` now opens the entrance/hall pilot by default. `PilotWorld.js` loads the authored GLBs and movement data through the shared asset system. `PilotMovement.js` samples the authored terrain triangles and enforces the supported area, building outlines and barriers. The pilot has explicit loading/failure state, neutral/dusk controls and fixed walking/overhead views. The previous flat-ground lamp sandbox remains available at `?mode=sandbox`, without being loaded as a silent fallback.

Keep the renderer/atmosphere/asset-loader foundation. Replace sandbox assumptions incrementally when implementing real world layers; a framework migration or whole-app rewrite is not a prerequisite. See [readiness](readiness.md) for code risks and practical evidence.

## Evidence and authority

This repo plan condenses Micha's accepted direction from the local Vault, rather than requiring future sessions to rediscover it:

- `~/vaults/meeq-vault/2026-09-30-Arbeitsstraenge/04-Hedwig.md` (2026-10-04).
- `~/vaults/meeq-vault/03-Projects/Hedwig-and-Creative-Portfolio/Handoff-Hedwig-Revival.md` (2026-10-04).
- In that project folder: `Handoff-Hedwig-Readiness-2026-10-02.md` and `Research/06-neuer-friedhof-reconstruction-inputs.md` contain measured evidence and limits; `Research/05-astra-blender-threejs-workbench.md` contains workflow rationale.

The newer direction supersedes unsupported September proposals about 12 to 20 minutes of gameplay, artistic route compression, a VPS-first split, six buildings and a DEM supposedly available at that time. Terrain was actually acquired and registered on 2026-10-16. The source map still contains 140 objects, 96 path segments and five building/storage footprints. The 98 original photos do not establish exhaustive coverage or calibrated camera poses.

Read [local references](local-references.md) for source access and correction authority. For terrain, aerial imagery, plan geometry or the next Blender session, read [Blueprint preparation](blueprint-preparation.md). Official DGM1, DOM1 and TrueDOP clips with capture dates and licenses are acquired. Micha selected `/Users/meeq/.backups` for the pilot backup; see the backup policy below and the current restore evidence in [readiness](readiness.md#pilot-approval-and-backup-2026-10-16).

## Approved entrance and hall pilot

### Decision and scope

The approved section is the entrance, main approach, funeral hall, forecourt and immediately adjoining public walk around the hall. Use accurate local infrastructure first within that section, then recognizable architecture and a first material pass. Do not build every path before testing whether the reference-to-Blender-to-browser workflow produces a convincing place.

The alternative, a whole-site infrastructure pass, would expose scale and connectivity but would require widths for 96 source path segments before testing architectural or material quality. Only one segment has a width tag. An isolated urn bay would test a smaller model but would not exercise the requested arrival, architecture and walkable setting together. Micha accepted the entrance/hall section and its first review checkpoint.

Use a provisional authoring window of local Blender x from -50 to 30 m and y from -25 to 85 m. This 80 by 110 m window is a work limit, not a surveyed object boundary or a commitment to detail every object inside it. The playable pilot covers the entrance approach and hall surroundings. Stop side paths at explicit review limits rather than extending into the whole cemetery. Keep the shared site origin unchanged when later sections are added.

| Include in the first review | Exclude from the first review |
| --- | --- |
| DGM-based local ground, connected path surfaces, visible path edges and junctions. | All 96 paths, a complete tree inventory and full grave-field reconstruction. |
| Funeral-hall exterior with the steep roof, sloping window bands, low annex, entrance and visible facade divisions. | Interior, exact structural detailing and unsupported hidden facade detail. |
| A simple reference-backed bell-tower exterior as a nearby landmark, plus the entrance opening and necessary boundaries. | Detailed bell mechanism, every fence ornament, inscriptions and small cemetery props. |
| First usable paving, roof, wall and glass materials; selected vegetation needed for the approach and hall views. | A final photorealistic material library, full plant coverage or a pack church substituted for the real hall. |
| A browser walkthrough with ground following, solid barriers and neutral/dusk review modes. | Gameplay, NPCs, audio, deployment and public release. |

### Evidence and unresolved dimensions

Start from hall `way/362596059`, entrance gate `node/10836993157`, the relevant portion of approach `way/1165077095`, nearby branches `way/1165079380` and `way/1165079381`, and bell tower `node/10837322627`. Do not import the entire long approach source line as approved pilot scope; it continues to the southern service entrance. Adjacent building footprints supply context only where required by the selected views.

The original hall polygon has principal edge lengths of approximately 15.7 and 27.7 m. The source centre line from the entrance gate to its first approach bend is approximately 35.7 m. These are calculations from source geometry, not field measurements or approved wall dimensions.

Planning directly inspected the unannotated aerial overview and photos 1, 9, 13, 15, 17, 21, 26, 96 and 98. Photo numbers remain private-atlas lookup keys; do not copy the photos into tracked documents or runtime textures. Use photo 1 for the approach, 13 for the gable, 15 for the hall entrance and 17 for the adjoining tower/path view. Photos 21 and 26 support tower and side-facade details; 96 and 98 support entrance context.

Resolve the following during the bounded authoring pass:

- Compare visible path edges at the gate, straight approach, bend, forecourt and hall-side junctions. Record widths and uncertainty separately. Do not use one invented width for the entire centre line or assume that the source's `surface=asphalt` tag overrides visible paving.
- Compare roof outline and wall footprint separately. Roof height, pitch, eaves and annex heights remain estimates until supported by the views. Keep those dimensions editable and label their evidence; neither DGM nor phone altitude measures them.
- Use DGM for the general ground slope. Resolve local thresholds, kerbs and platforms from photos rather than draping a building over an uneven mesh or treating the one-metre grid as a kerb survey.
- Choose vegetation by visible silhouette, scale and density. Tree bases, species and clipped forms cannot be recovered reliably from aerial canopy blobs. Retain unknown placements as questions, not randomized claims about the real site.

### Authoring and material workflow

Use Blender's bundled Python and `bpy` through the existing background/factory-startup/disabled-autoexec invocation. No add-on, MCP server or GUI click automation is required. Create a small section-specific authoring script when implementation begins; do not build a general procedural cemetery generator.

Keep source parameters, evidence notes and generated geometry separate enough to revise dimensions without rewriting the whole scene. Save each accepted stage as a new `.blend` revision under the working source tree. Never regenerate over a manually revised source. Record the script/input revision and reproduce the selected export from that source.

Use separate collections for private references, exportable environment meshes and simple movement geometry. The existing exporter accepts named mesh/empty collections with UVs but refuses collection instances and other unsupported source objects. Keep reference planes, cameras and lights outside its export collection. For vegetation repeated in the browser, export reusable prototypes and apply instancing there rather than assuming Blender instances pass through this exporter.

Inspect the purchased pack before selecting materials or plants. Use its textures only when their pattern, colour and scale fit the photos; an asset atlas is not automatically a tiling ground material. For a missing surface, prefer a small authored tileable material or a suitable licensed PBR texture over forcing a mismatched pack texture. Bake procedural Blender effects into exportable image maps where needed. Private photos guide the work but are not pasted into runtime materials. Retain source/licence and colour-space records for every selected texture.

The initial pack check found `5111390_trees.fbx` and `5111390_plants.fbx` as candidates, not verified species or clipped hedge forms. Inspect those selected FBX files in a disposable Blender scene before reuse. The viewed `5111390_roads_fences_kit/Paving_BaseColor.png` shows irregular cobbles, which do not match the regular paving visible in the approach photos. The viewed church-module `wall_tille_BaseColor.png` shows weathered block masonry, not the hall's light wall finish or aggregate gable. The roof family is an asset UV atlas, not an established tiling roof material. Do not force those maps onto the hall merely to reuse the pack. The first likely authored or acquired surfaces are the photographed paving pattern, light wall finish, aggregate gable and roof covering; select them during the pilot rather than downloading a library now.

Defer the grave system until the section's scale and appearance have passed review. Later, build a small reusable set of reference-backed borders, slabs and stones, with instanced placements where justified by the evidence. Do not choose ornate generic graves solely because the pack contains them, reproduce personal inscriptions, or scatter invented graves to fill gaps.

### Browser integration

Bring a first geometry export into Three.js before spending the whole pass on materials. Use the existing shared GLTF/Draco loader and environment registration. Retain the renderer, atmosphere and useful debug controls; do not introduce an ECS, a physics framework or a second asset-loading system.

A GLB supplies visible geometry, not movement rules. Replace the pilot's flat-ground assumptions with a shared ground and obstruction contract. Sample the actual authored walking surface, including changes around paths and platforms. Block movement into hall walls, closed gates and other solid obstacles, and constrain movement to the supported pilot area. A free inspection camera is useful for comparison but does not satisfy the walkthrough requirement.

Keep detailed render meshes separate from simple walking and collision geometry. Avoid full-scene triangle queries or fresh vectors each frame. Do not combine a visually edited terrain surface with an unrelated raw-DGM height sampler. Preserve the standard Blender-to-glTF axis conversion exactly once.

Load the pilot as an explicit review mode alongside the existing sandbox initially. Do not silently substitute the lamp scene when pilot loading fails. Show loading/failure state and enable walking only after required ground and collision data are ready. Only reviewed runtime derivatives enter `public/`; private references and authoring files remain outside Vite's served paths. Local inspection is not permission to deploy or publish.

The smallest proposed movement implementation is a heightfield derived from the same authored ground as the render mesh, plus a few explicit horizontal building polygons and barrier segments. Match triangle interpolation and give any authored walking platform explicit precedence over the underlying ground. Use a player-radius assumption and swept movement or bounded substeps to prevent sprinting through thin barriers. Outside the supported ground, movement is refused rather than falling back to height zero. This pilot does not need jumping, gravity simulation or a general rigid-body solver.

Implementation belongs at the existing module interfaces:

| Module | Bounded change |
| --- | --- |
| `src/main.js` and a proposed `src/world/PilotWorld.js` | Compose the pilot, own its surface/obstruction queries and spawn, and gate movement on readiness. |
| `src/gameplay/PlayerController.js` | Replace fixed camera Y and rectangle-only movement in pilot mode; apply eye height over the accepted floor on spawn, movement and reset. Reuse temporary vectors. |
| `src/assets/Assets.js` and `src/world/Environment.js` | Add a named pilot loader through the existing loader/cache and handle material arrays when registering the new GLB. |
| `src/world/World.js`, `src/assets/DevRoom.js` and `src/ui/DebugGui.js` | Keep sandbox and pilot content separate while sharing lighting controls; add fixed review views and remove obsolete test-prop controls from the production path. |
| `tools/browser-smoke.mjs` | Extend the existing input smoke for the actual route, collision and measurement scenarios. Its current mouse-capture check does not prove WASD, terrain or barriers. |

### Execution and first human checkpoint

1. Resume the approved brief and read the recorded backup/restore evidence. Do not repeat completed setup checks or ask Micha to reselect the pilot. Use the existing source frame, corrected photo inputs and source-only atlas without another whole-site tracing pass.
2. Build the local ground, path surfaces and recognizable hall/tower forms. Check the overhead alignment and named photo views, then export to the browser immediately to expose scale, axes and walking problems.
3. Add the first materials and selected vegetation within the same scope. Compare neutral source and browser views before dusk lighting. Correct visible mismatches within this section instead of adding more regions.
4. Stop at the first reviewable, textured browser walkthrough. Present the saved `.blend`, the running local scene, fixed comparison views, measurements and unresolved estimates to Micha. Technical success allows continuing through this bounded pass, not beyond the checkpoint.

The checkpoint requires:

- A neutral overhead comparison with the aerial reference and ground-level comparisons using photos 1, 13, 15 and 17 as guides. Camera positions and headings do not imply calibrated lens, pitch or roll. Visible footprint/path discrepancies must be explained rather than hidden by vegetation, darkness or fog.
- A connected walk from the entrance to the hall and around the supported public surroundings. Exercise slopes, path/ground transitions, wall sliding, corners, closed barriers and pilot edges, including sprinting. There must be no falling through ground, walking through the hall or stepping onto its roof.
- Correct GLB, texture and decoder loading, visible loading errors, plausible material scale and no private reference files in the runtime. Compare neutral and dusk views in both Blender and the browser; a Blender render alone is insufficient.
- A recorded hardware/browser/render-buffer size, asset transfer size, draw calls and frame timing along the route. Start with this Mac and a fixed 1280 by 720 render buffer for repeatable pilot measurements, plus Micha's actual inspection size. The 60 FPS and 400 draw-call targets remain provisional rather than achieved full-level guarantees.

If essential source disagreements prevent a recognizable hall or connected route, report that specific blocker instead of claiming success from a generic building. Final visual acceptance belongs to Micha.

## Iteration across later sessions

These are deliverable stages, not promises that each fits exactly one chat session.

| Stage | Work and exit condition |
| --- | --- |
| First authoring session | Complete the bounded entrance/hall pilot above and stop for human source/browser review. |
| Following correction session | Apply Micha's corrections to proportions, paving, heights, plants and materials in the same section. Accept a reusable source/export workflow before expanding. |
| Spatial expansion | Extend terrain, main paths and building masses section by section in the same frame. Resolve local widths and junctions as each section becomes walkable; keep reviewed work unchanged unless evidence requires correction. |
| Cemetery content | Develop the small grave kit and selected vegetation library, then place reviewed repeated content with instancing. Add boundaries, urn areas and secondary structures in bounded passes. |
| Continuous environment review | Connect and refine the chosen route, review neutral and dusk appearance, and measure loading, collision and performance. Optimize measured costs before extending visual detail. |

Each session updates this plan with the accepted revision, exported artifact, reviewed area, remaining estimates and next bounded task. Keep evidence tied to stable source IDs and local photo numbers. Do not create competing roadmaps, overwrite earlier source revisions or repeat already established setup discovery.

## Before modifying sources

Keep raw pack files and existing `.blend` revisions immutable. Work in new revisions/copies and use the explicit [Blender workbench](assets/blender-workbench.md), not a remembered global export preset. The [pipeline checklist](assets/pipeline-guide.md) covers materials and browser reception. Local backups or Photos originals on the same Mac are not an independently restored backup. Git push does not back up the ignored private reference pack or acquired geodata.

Micha explicitly chose `/Users/meeq/.backups` for this pilot on 2026-10-16. Store timestamped snapshots beneath `/Users/meeq/.backups/horror-game-hedwig/`, outside the working repository. This owner-selected local recovery arrangement replaces the earlier independent-destination blocker for the approved pilot. It is not an off-device backup and does not protect against failure or loss of this Mac. Record actual copy/restore evidence and limitations in [readiness](readiness.md#pilot-approval-and-backup-2026-10-16).

Before changing valuable source revisions, preserve the current revision and its dependencies in a new snapshot. Back up each reviewable new `.blend` revision, its textures and authoring inputs before ending a session. Never overwrite the pre-pilot snapshot or silently prune older snapshots. Keep backup manifests, photo paths and restore outputs private. No automatic backup schedule is installed.

## Human decisions still needed

- The first pilot checkpoint awaits Micha's source and browser review. Correct the same section from that feedback before extending it.
- The local backup destination is approved. An off-device copy remains a resilience recommendation, not a renewed pilot approval gate.
- Confirm the eventual target hardware, browser, resolution and quality tier. The local pilot measurement setup above is a starting point, not that product decision.

Environmental audio remains deferred. No new reference acquisition, whole-site map redraw, installation or global permission change is a prerequisite established by this planning pass.
