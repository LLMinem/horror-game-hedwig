---
type: plan
status: active
created: 2025-09-23
last_verified: 2026-10-16
---

# Hedwig — evidence-led environment revival

## Accepted direction

Reconstruct the actual Neuer Friedhof in Bruchköbel as faithfully and in as much visible detail as the evidence and browser performance allow, at dusk or night. The first milestone is an environment prototype: spatial structure, surfaces, assets, atmosphere, walkability, collision and loading. NPCs, watering/objectives, inventory, chase/failure systems and interiors are outside it. Audio is undecided.

The Mac is the authoritative coding and Blender workstation. VPS deployment, cloud rendering and MCP infrastructure are deferred. Preparation is authorized; this is not an authorization to autonomously build the cemetery or pick its polished route.

Micha's follow-up prioritizes photo location review before choosing a polished section: retain original metadata, distinguish device-reported accuracy from verified positions, and let him correct uncertain camera locations on the map. Prefer agent-built, reference-backed models of the cemetery itself. Complex assets such as trees may use the existing pack; additional textures/models remain an option when needed after fit and licence checks. The existing lamp, Blender lamp sources and sample props are pipeline experiments, not authoritative references or required production content.

The 2026-10-15 visual review covered all 98 photos and left nineteen owner checks. On 2026-10-16 Micha supplied corrections and authorized autonomous map preparation using additional geodata and the photos, explicitly excluding Blender construction. His imported rows now have priority. He subsequently rejected the 113 agent-drawn traces, including urn bays, lawns and canopy geometry, as broadly inaccurate and worse than the canonical GeoJSON. Technical validation never established visual accuracy.

[Blueprint preparation](blueprint-preparation.md) is the authoritative guide for the source-only atlas, acquired sources, metric contract and next agent's context package. Retain the 140 canonical features as a working baseline with local uncertainty. Pause whole-site map expansion and do not commission a full redraw. The 13 regional photo-index groups help find photos, but do not supply trusted observations or modeling instructions.

## Current implementation

`src/main.js` composes an operational Three.js sandbox: renderer, custom sky/stars/fog/grading, HDRI environment, lights, flat grass plane, first-person inspection, debug GUI and a Draco street-lamp GLB. The GeoJSON has no runtime consumer. Terrain, site collisions, data-driven placement, loading UI and a reconstructed route do not exist yet.

Keep the renderer/atmosphere/asset-loader foundation. Replace sandbox assumptions incrementally when implementing real world layers; a framework migration or whole-app rewrite is not a prerequisite. See [readiness](readiness.md) for code risks and practical evidence.

## Evidence and authority

This repo plan condenses Micha's accepted direction from the local Vault, rather than requiring future sessions to rediscover it:

- `~/vaults/meeq-vault/2026-09-30-Arbeitsstraenge/04-Hedwig.md` (2026-10-04).
- `~/vaults/meeq-vault/03-Projects/Hedwig-and-Creative-Portfolio/Handoff-Hedwig-Revival.md` (2026-10-04).
- In that project folder: `Handoff-Hedwig-Readiness-2026-10-02.md` and `Research/06-neuer-friedhof-reconstruction-inputs.md` contain measured evidence and limits; `Research/05-astra-blender-threejs-workbench.md` contains workflow rationale.

The newer direction supersedes unsupported September proposals about 12 to 20 minutes of gameplay, artistic route compression, a VPS-first split, six buildings and a DEM supposedly available at that time. Terrain was actually acquired and registered on 2026-10-16. The source map still contains 140 objects, 96 path segments and five building/storage footprints. The 98 original photos do not establish exhaustive coverage or calibrated camera poses.

Read [local references](local-references.md) for source access and correction authority. For terrain, aerial imagery, plan geometry or the next Blender session, read [Blueprint preparation](blueprint-preparation.md). Official DGM1, DOM1 and TrueDOP clips with capture dates and licenses are now acquired. An independently restored source backup remains unverified.

## Next work, in order

1. Select a small diagnostic pilot with Micha. Compare relevant canonical source IDs against official aerial imagery and a small set of corrected photos. An urn-bay pilot could demonstrate a better reference-to-model workflow; entrance/hall is an alternative. Use the guide's uncertainty list and acceptance criteria, not rejected geometry or archived work cards.
2. Prepare the agreed inputs and coordinate contract. Preserve source GeoJSON, owner notes and stable IDs. Use `site-frame.json`, the acquired DGM and documented raster grid. Numerical registration is distinct from independent survey control; record local disagreements rather than silently fitting the sources together.
3. Begin a bounded source model only after Micha authorizes the brief and an independent source backup restore is demonstrated. Make local corrections only with cited evidence. Keep unknown dimensions and obscured areas explicit. The current preparation authorizes no Blender or runtime work.
4. Accept source appearance and browser behavior separately. Micha reviews neutral overhead and named photo-station comparisons before production approval. Later runtime work must demonstrate export appearance, loading, ground sampling, collision and measured performance on agreed hardware, browser, resolution and quality. The old 60 FPS / ≤400 draw-call goals remain provisional.

The eventual environment milestone includes a full spatial skeleton and one polished continuous route. It is not the next authorized task. Pilot findings and human review must determine whether and how to expand beyond the selected area.

## Before modifying sources

Keep raw pack files and existing `.blend` revisions immutable. Work in new revisions/copies and use the explicit [Blender workbench](assets/blender-workbench.md), not a remembered global export preset. The [pipeline checklist](assets/pipeline-guide.md) covers materials and browser reception. Local backups or Photos originals on the same Mac are not an independently restored backup. Git push does not back up the ignored private reference pack or acquired geodata.

## Human decisions still needed

- Select the diagnostic pilot and authorize its bounded modeling brief and source acceptance criteria. Resolve only uncertainties relevant to that work; the later polished route remains a separate decision.
- Target desktop/browser/resolution and quality tier.
- Independent backup destination and restore proof before valuable source edits.
- Whether environmental audio belongs in this milestone.

These do not block repo preparation or read-only reference work. Missing heights, texture families and unseen facades should be recorded, not guessed away.
