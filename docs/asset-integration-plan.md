---
type: plan
status: active
created: 2025-09-23
last_verified: 2025-09-23
last_verified_commit: d8f1d33
owned_by: human
supersedes: []
superseded_by: []
---

# Asset Integration & World-Building Plan

## 1. Purpose

Provide a deliberate roadmap for bringing high-quality assets and authentic layout into the Hedwig horror scene while teaching Three.js fundamentals step by step. This plan aligns remote development (VPS) with local tooling (Mac + Blender/QGIS) and keeps visuals, performance, and learning goals in balance.

## 2. Current Snapshot

- **Codebase**: Modular Three.js scene running on Three.js r179.1 via Vite. Scene still uses placeholder tombs/trees/posts and a flat ground plane.
- **Data**:
  - `data/cemetery_final.geojson` – accurate but incomplete map (paths, fences, taps, some hedges/buildings).
  - Government DEM height data (stored locally on MacBook, not yet processed).
  - 90+ reference photos of the real cemetery (local).
- **Assets**: “The Cemetery Pack” (FBX/OBJ + 1–4 K textures) downloaded locally. Needs curation and optimization before entering the web build.
- **Infrastructure split**: Blender, raw assets, and geodata live on MacBook; coding happens on the VPS repo.

## 3. Options Overview

| Option                         | Pros                                                                 | Cons                                                                            | Notes                                           |
| ------------------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| Use GeoJSON directly           | Fast baseline layout, real-world scale, reuse existing data          | Sparse hedges/trees/props; requires width heuristics; still needs artistic pass | Good for skeleton once asset workflow is proven |
| Manual layout (Blender/QGIS)   | Highest visual fidelity; leverages photos; supports artistic choices | Tooling learning curve; time-intensive; risk of scope creep                     | Works best after we know which assets run well  |
| Height-field integration (DEM) | Realistic ground undulation                                          | Requires QGIS workflow, additional Three.js shader/mesh work                    | Do after layout decisions                       |
| Asset pack dev-room            | Lets us vet assets, control performance, craft lil-gui presets       | Needs Blender → GLB → compression pipeline; requires selective curation         | Recommended starting point                      |
| Gameplay-first                 | Immediate mechanics work                                             | Visuals remain placeholder, harder to judge tone                                | Defer until world feels believable              |

## 4. Recommended Sequence

1. **Build Asset Pipeline (Learning Focus: loaders, material workflow)**
   - Define folder conventions (`assets/source`, `public/assets/models`, etc.).
   - Establish Blender export preset (GLB + Draco, consistent scale).
   - Introduce KTX2 texture compression and Three.js loader wiring.
   - Prove the loop end-to-end with one hero asset (e.g., Victorian lamp) plus a tomb.
2. **Create Dev Room Sandbox (Learning Focus: scene composition, lighting)**
   - Add `assets/DevRoom.js` to spawn a neutral testing arena.
   - Load curated assets via the new pipeline.
   - Wire lil-gui groups for lighting/exposure/fog presets; capture export workflow for preset JSON.
3. **Decide on World Layout Approach (Learning Focus: data-driven vs manual authoring)**
   - Parse GeoJSON for boundary, paths, key POIs.
   - Evaluate complementing with manual placement using photo references.
   - Document chosen hybrid approach before implementation.
4. **Integrate Height Data (Learning Focus: terrain meshes, displacement)**
   - Clip DEM in QGIS, export heightmap.

- Implement height-modulated ground plane in Three.js.

5. **Gameplay Scaffolding (Learning Focus: state management, controllers)**
   - Introduce `gameplay/Gameplay.js` once the environment supports meaningful interactions.

## 5. Cross-Machine Workflow

- **Local (MacBook)**: Use Blender to curate assets; export compressed GLB + KTX2 packs; upload results to the repo (via git, rsync, or scp).
- **Remote (VPS)**: Integrate assets, run Vite, develop Three.js modules.
- Maintain a simple manifest (e.g., `docs/assets-import-log.md`) noting what was exported, polygon counts, texture sizes, and decisions. (To be created during pipeline work.)

## 6. Immediate Next Actions

1. Draft the detailed asset pipeline tasks (folder structure, conversion checklist, tooling command snippets).
2. Confirm transfer method from Mac → VPS (suggest git commit from Mac or `scp` uploads).
3. Implement minimal `assets/Assets.js` + loaders in codebase to accept the first curated asset.
4. Once the pipeline works, move on to Dev Room implementation.

## 7. Session Guidelines

- Treat each phase as a teaching opportunity: explain Three.js APIs, Blender steps, and performance considerations before executing.
- End every session with a recap, testing instructions, and explicit next-step options.
- Revisit this plan whenever scope questions arise; update the document as decisions evolve.

## 8. Open Questions for Later

- Which gravestone styles best match the real cemetery, and can we photo-reference sintered textures if the pack lacks suitable variants?
- How far should we push asset instancing vs. unique hero pieces before performance tanks?
- Do we need a separate nighttime LUT/post-processing stack or just lil-gui presets?
- What is the minimal viable set of props necessary to evoke the cemetery before expanding further?

---

Keep this plan alongside `AGENTS.md` to anchor future agent sessions.
