---
type: plan
status: active
created: 2025-09-23
last_verified: 2026-10-10
---

# Hedwig — evidence-led environment revival

## Accepted direction

Reconstruct the actual Neuer Friedhof in Bruchköbel as faithfully and in as much visible detail as the evidence and browser performance allow, at dusk or night. The first milestone is an environment prototype: spatial structure, surfaces, assets, atmosphere, walkability, collision and loading. NPCs, watering/objectives, inventory, chase/failure systems and interiors are outside it. Audio is undecided.

The Mac is the authoritative coding and Blender workstation. VPS deployment, cloud rendering and MCP infrastructure are deferred. Preparation is authorized; this is not an authorization to autonomously build the cemetery or pick its polished route.

Micha's follow-up prioritizes photo location review before choosing a polished section: retain original metadata, distinguish device-reported accuracy from verified positions, and let him correct uncertain camera locations on the map. Prefer agent-built, reference-backed models of the cemetery itself. Complex assets such as trees may use the existing pack; additional textures/models remain an option when needed after fit and licence checks. The existing lamp, Blender lamp sources and sample props are pipeline experiments, not authoritative references or required production content.

On 2026-10-15 Micha explicitly authorized the agent to inspect every private photo and estimate camera positions and headings from visible evidence. That review is complete for all 98 photos. The private map now separates agent estimates from human confirmations and marks nineteen photos for owner follow-up. This authorization does not extend to scene production.

## Current implementation

`src/main.js` composes an operational Three.js sandbox: renderer, custom sky/stars/fog/grading, HDRI environment, lights, flat grass plane, first-person inspection, debug GUI and a Draco street-lamp GLB. The GeoJSON has no runtime consumer. Terrain, site collisions, data-driven placement, loading UI and a reconstructed route do not exist yet.

Keep the renderer/atmosphere/asset-loader foundation. Replace sandbox assumptions incrementally when implementing real world layers; a framework migration or whole-app rewrite is not a prerequisite. See [readiness](readiness.md) for code risks and practical evidence.

## Evidence and authority

This repo plan condenses Micha's accepted direction from the local Vault, rather than requiring future sessions to rediscover it:

- `~/vaults/meeq-vault/2026-09-30-Arbeitsstraenge/04-Hedwig.md` (2026-10-04).
- `~/vaults/meeq-vault/03-Projects/Hedwig-and-Creative-Portfolio/Handoff-Hedwig-Revival.md` (2026-10-04).
- In that project folder: `Handoff-Hedwig-Readiness-2026-10-02.md` and `Research/06-neuer-friedhof-reconstruction-inputs.md` contain measured evidence and limits; `Research/05-astra-blender-threejs-workbench.md` contains workflow rationale.

The newer handoff supersedes the September research proposals: 12–20 minutes, artistic route compression, a VPS-first split, six buildings and an already available DEM are **not accepted current facts**. The 2026-10-04 inspection counts 140 map objects, 96 path segments and five building/storage footprints. The identified photo set is 98 originals with GPS and true-north heading, not proof of exhaustive coverage or calibrated camera poses.

Read [local references](local-references.md) for actual source paths, commands, map access and gaps. Photos stay private. OSM supplies plan structure; photos establish visible appearance. DGM1/TrueDOP clips, their metadata and an independent source backup still need to be established.

## Next work, in order

1. **Resolve reference uncertainties.** The individual visual review is complete. Use the private map's owner, position and heading filters to resolve the remaining flagged components. Agent estimates are not surveyed positions or human confirmations. Original measurements remain alongside them, and incomplete map features must not be treated as exact anchors. Use the resulting coverage and landmark evidence to propose a bounded production brief. A polished section still needs Micha's direction.
2. **One coordinate contract and spatial skeleton.** Preserve source GeoJSON. Establish a shared local-metre frame for map, terrain, Blender exports and runtime placement. The research proposes EPSG:25832 and DHHN2016_NH; origin, vertical offset and concrete axis transform still need a tested contract. Validate at least three independent anchors. Do not confuse geodetic height with phone altitude or silently mirror the site when moving between Z-up Blender and Y-up glTF/Three.js.
3. **Connected site and movement.** Build boundary, path network, exterior building masses and hedge/gate logic from evidence. Ground sampling, object placement and player movement must share the same height model. Test a continuous entrance → main path → side path → evidence-selected destination → return route; major boundaries/buildings must be non-traversable.
4. **Polish one supported section.** Match recognizable silhouettes, surfaces, vegetation and details. Simple geometry is useful for layout checks, not the final artistic style. Use instancing for repeated assets and authored, evidence-backed forms for distinctive buildings/props. Classify important claims as observed, estimated or representative.
5. **Accept Blender and runtime separately.** Produce a neutral photo-comparison view, dusk/night view and the same section in Three.js. Measure frame times/draw calls/loading on stated hardware, browser, resolution and quality. Agree the performance tier before calling it accepted. The old 60 FPS / ≤400 draw-call goals are provisional budgets.

A full spatial skeleton and one polished continuous route are the first milestone, not a demand to detail every grave before showing a useful section.

## Before modifying sources

Keep raw pack files and existing `.blend` revisions immutable. Work in new revisions/copies and use the explicit [Blender workbench](assets/blender-workbench.md), not a remembered global export preset. The [pipeline checklist](assets/pipeline-guide.md) covers materials and browser reception. Local backups or Photos originals on the same Mac are not an independently restored backup.

## Human decisions still needed

- Photo location confirmations/corrections first; first visible section, polished route and destination later, based on reviewed coverage.
- Target desktop/browser/resolution and quality tier.
- Independent backup destination and restore proof before valuable source edits.
- Whether environmental audio belongs in this milestone.

These do not block repo preparation or read-only reference work. Missing heights, texture families and unseen facades should be recorded, not guessed away.
