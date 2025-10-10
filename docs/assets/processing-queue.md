---
type: checklist
status: active
created: 2025-10-10
last_verified: 2025-10-10
last_verified_commit: 2733f08
owned_by: human
supersedes: []
superseded_by: []
---

# Asset Processing Queue

Use this list to track which raw assets from `assets/source/raw/cemetery-pack` have been curated in Blender and exported to `public/assets/models/`.

## Ready / Exported
- [x] Street lamp (SM_StreetLamp_Simple.glb)

## In Progress / Next Up
1. Bench (`5111390_bench.fbx` + textures in `5111390_Bench/`)
2. Trees (select 3 hero variants from `5111390_trees.fbx` in `5111390_Trees/`)
3. Tombs (export individual picks from `5111390_tombs.fbx` and `5111390_tombs_*.fbx`)
4. Multi fountain (`5111390_multi_fountain.fbx`; assemble parts, plan water treatment)
5. Road & fence kit (`5111390_road_fences_kit.fbx` with `5111390_roads_fences_kit/` textures)
6. Stones (`5111390_stones.fbx` + `5111390_Stones/`)
7. Plants (`5111390_plants.fbx` + `5111390_Plants/`)

## Backlog / Nice-to-Have
- Candles, churches, cliffs, mausoleums, wall fountain, etc. (assess once core set is shipped)

## Notes
- Keep each asset’s working `.blend` in `assets/source/working/` using the naming convention `pack/<asset-name>.blend`.
- Export GLB with the Hedwig Draco preset (selected objects, tangents, Draco enabled).
- Record per-asset findings in the corresponding scratchpad under `docs/assets/`.
