# Neuer Friedhof source GeoJSON

Read the root `AGENTS.md` and `docs/asset-integration-plan.md`. `cemetery_final.geojson` is an unchanged WGS84 `[longitude, latitude]` source map, **not yet consumed by the game**. Use `tools/map/index.html` for offline inspection; that viewer embeds a 2026-10-04 snapshot and is not a live importer.

## Verified inventory

140 features: 119 LineStrings, six Polygons and 15 Points. Semantic counts: one cemetery boundary; 96 path/service/footway segments; five building/storage footprints; 17 hedges; four fences; four gates; two columbarium lines; eleven other points (seven water taps, bell tower, green waste, bicycle parking, toilet).

The boundary envelope is approximately 220 × 234 m; all features span approximately 227 × 243 m. These are local linear estimates, not surveyed dimensions. Historical 171 × 173 m / 89 paths / six buildings statements are not the measured inventory.

## Interpretation limits

- Path lines are centre lines, not surfaces or a ready-made connected navigation graph. Only one path has a width tag. Gravel 2 m / paving 2.5 m / service 3.5 m were old modelling suggestions, not measurements.
- All 17 hedges carry authored width 1 m and height 1.5 m; photo/field validation is outstanding.
- Individual graves, most trees, terrain relief, roof shapes and most building/fence heights are absent.
- Preserve `@id`, tags and original coordinates. Keep uncertainties in derived data; do not silently modify the source to fit a scene.
- A single site-frame contract must align map, terrain, Blender and Three.js. EPSG:25832 is the researched planar CRS; DHHN2016_NH is the proposed official-terrain datum. Origin, axes and transforms are not implemented. Test axes with known anchors; do not mistake Blender Z-up → glTF Y-up for a geospatial alignment.

Source SHA-256: `faa0de398279fca13e7c4946a1991db14257dda8082053c3a63a363020eddfca`.

## Attribution

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Exact original extract date/query is not established. Preserve provenance and assess database redistribution obligations before release. The standalone viewer contains only this map, not private photo coordinates.
