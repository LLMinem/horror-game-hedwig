# Source geometry and terrain contract

Read this before interpreting site evidence, preparing Blender inputs or changing derived ground. [AGENTS.md](../AGENTS.md) owns project policy; the selected issue and its parent specification define the work. Use the [reference guide](../docs/local-references.md) to open or correct private inputs and the [Blender guide](../docs/assets/blender-workbench.md) for authoring, backup and acceptance.

## Geometry and evidence

`cemetery_final.geojson` is the immutable source map: WGS84 `[longitude, latitude]`, with stable `@id`, tags and original coordinates. Preserve those IDs in derivatives and discrepancy reports. `tools/map/index.html` embeds a snapshot, not a live importer. Neither source is a survey or a complete cemetery environment.

- Path lines are centre lines, not surfaces or an approved connected navigation network. Missing widths remain unknown; old suggested widths are not measurements.
- Authored hedge dimensions require photo/field validation. Individual graves, most trees, terrain, roof shapes and most object heights are absent.
- Start from canonical geometry and propose only bounded, evidence-supported corrections in derivatives. Do not silently reshape the source to fit a scene, or infer hidden grave positions, hedge gaps or trunks from schematic lines and foliage.
- Rejected agent interpretations under `.local/blueprint/archive/rejected-interpretation-2026-10-16/` are private history, not optional overlays or modeling inputs. This includes old interpretation JSON/GeoJSON, plan sheets, full `photo-evidence.json` and reports. Do not recover canopy envelopes, urn-bay outlines, lawns or construction instructions from them. The active builder uses canonical geometry and navigation-only `photo-index.json` instead.

Choose authority **by claim**, not one universal dataset:

| Claim | Evidence and limit |
| --- | --- |
| Camera position/direction | Owner corrections first, with verbatim notes and provenance. The camera location is not the photographed object's location. |
| Footprint/path edge | Stable source feature, locally compared with official aerial imagery and visible ground-photo edges. Roof outlines need not equal wall footprints. |
| Appearance/material/form | Directly inspected relevant ground photos. Index labels and agent confidence are not observations. |
| Ground elevation | Numeric DGM with its grid/datum contract. It does not measure kerbs, small steps or object heights. |
| Upper surfaces | DOM is epoch-specific roof/vegetation evidence, not ground or a current tree-height inventory. DOM minus DGM includes buildings. |

Official RGB/CIR are aerial imagery, not conventional satellite images. Foliage occludes features; CIR is qualitative vegetation evidence, not species identification or calibrated NDVI. Capture epochs can differ across a mosaic and from photos or terrain. Read acquisition metadata before comparing movable objects or vegetation. Existing photo coverage is not established as a calibrated, overlapping photogrammetric scan.

## Photo observations and corrections

Original observations remain in `.local/references/photos.json` and `cached-exif.json`; human corrections are separate in `positions.json`, agent assessments in `reviews.json`. Effective `placements.geojson` retains metadata and provenance:

- Position precedence is human correction, applied agent estimate, then observed GPS; unavailable coordinates remain `geometry: null`.
- A human row wins over an agent estimate for heading too. A numeric human heading is clockwise true north. **Missing/null human heading deliberately falls back to original EXIF and its T/M/unknown reference**, not the agent estimate.
- A human position resolves only the position review flag; a numeric human heading resolves the heading flag. Clearing a heading restores EXIF but does not resolve an open heading check. Removing a correction restores the lower layer and its pending flags.
- Preserve every owner note verbatim. A workflow's “confirmed” label does not override a note saying estimated or unclear. Agent estimates never become human confirmations.
- Device-reported GPS error groups and visual confidence are separate, neither surveyed accuracy. GPS DOP is not distance in metres. Missing pitch/roll tags remain missing. Position, heading, altitude and lens metadata do not supply calibrated pose; phone altitude is never terrain/world Z.

## Metric frame and raster placement

The actual private `.local/blueprint/site-frame.json` is authoritative for frame parameters: CRS, extent, origin and height offset. `.local/blueprint/derived/terrain-grid.json` describes the numeric grid; acquisition records under `.local/blueprint/sources/aerial/` and `sources/terrain/` retain requests, epochs, resolution, licences and checksums. Read these files rather than copying dataset values from historical reports.

The frame uses ETRS89 / UTM zone 32N (EPSG:25832) and DHHN2016 normal heights above NHN. The TIFF's horizontal CRS alone does not establish the vertical datum. With the contract's origin `(E0, N0)` and height offset `H0`:

- Blender: `x = E − E0`, `y = N − N0`, `z = H − H0`, one unit = one metre.
- Standard glTF conversion: `(x, y, z) → (x, z, −y)`. North becomes negative runtime Z. Apply this once, without another hand rotation.
- `site-local.json` contains projected local metres and stable source IDs. Do not interpret these as longitude/latitude or place projected numbers in RFC 7946 GeoJSON.
- Raster rows run **north to south**. Samples lie at pixel centres: for west/north bounds `W,N` and spacing `s`, centre `(c,r)` is `(W + (c + 0.5)s, N − (r + 0.5)s)`, then subtract the local origin. Do not place samples on outer raster edges.
- `terrain-local.npz` contains `height`, `x`, `y`; `terrain-local.csv` uses the same ordering. Heights are already local `H − H0`: **do not subtract the offset twice**.
- Phone true north and UTM grid north differ. The Atlas retains the original heading and projects a separate ray direction; neither supplies pitch or roll.

Use unannotated RGB/CIR with their `.pgw`/`.prj` placement for reference planes, not bordered plan sheets stretched to raster bounds. Printed SVG page units require explicit rescaling and a scale-bar check on import. Compare widely separated visible anchors and retain disagreements; coordinate round trips are not independent survey control.

## Derived ground is not source terrain

Keep acquired rasters unchanged. `tools/blender/pilot_inputs.py` prepares new pilot inputs; `spatial_inputs.py` prepares additive revisions from a private plan while copying the accepted ground/platform unchanged. Each source revision's `inputs.json` records dimensions, stable IDs, provenance and uncertainty. Runtime `public/assets/models/spatial/walk.json` is the integrated derived contract, not an authoritative measurement of the site. The accepted pilot contract remains preserved under `public/assets/models/pilot/`.

Its version-2 finite heightfield, paving offsets, solid obstacles and review views replace the obsolete path-derived walking mask. Runtime rejects version 1. Rendered ground and movement sampling must use the same north-west to south-east triangle diagonal, frame and height offset; paving follows those triangles at the recorded offset. Preserve deliberate platform adjustments and existing samples when extending ground. Platforms, kerbs and steps need separate evidence, not DOM or false-colour previews. Grid bounds define supported ground; the cemetery boundary is not permission to add invisible internal walking restrictions.

Spatial preparation subtracts the retained authored paving geometry, not its rounded walking approximation; mixing these creates microscopic duplicate strips. It excludes rounded walk rings with no polygon area and records their IDs in private inputs, without repairing self-intersecting area polygons. Previous source and baseline revisions remain unchanged. Whole-network review compares all canonical line IDs and actual geometric coverage, not just selection counts. Its [comparison contract](../docs/assets/blender-workbench.md#whole-site-and-photo-comparison) distinguishes technical export precision from unknown real-world positional/width accuracy.

For a bounded region, hand off the selected issue, relevant stable IDs, current frame/grid, unannotated imagery with capture limits, effective photo placements and verbatim notes, and an uncertainty list tied to evidence. Navigation groups are not work cards. Source/browser acceptance belongs to the [Blender guide](../docs/assets/blender-workbench.md).

## Rebuild and provenance

A fresh clone lacks private rasters, photo originals/cache/corrections and `.local/blueprint/photo-index.json`. Restore the private workspace first. The photo index contains `regions` with `id`, `label`, `photo_numbers`; it is navigation input, not interpretation evidence. Reuse the existing `.local/blueprint-venv/` environment; if absent, its requirements are `tools/blueprint/requirements.txt` and setup must follow project authorization policy.

```sh
npm run references -- map
.local/blueprint-venv/bin/python tools/blueprint/build.py
```

The builder needs acquired rasters, current placements and that photo index, not rejected interpretation files. Preserve acquired bytes because live services can change. Backup/recovery belongs to the [Blender guide](../docs/assets/blender-workbench.md#source-preservation-and-recovery).

The source map is © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL; the original extract date/query and manual-edit history are incompletely established. Preserve provenance and assess derived-database redistribution obligations. Official Hessen geodata catalogues identify [dl-zero-de/2.0](https://www.govdata.de/dl-de/zero-2-0), which permits use without restrictions or conditions. Retaining HVBG provenance and identifying modifications are project traceability practices, not additional conditions of that licence. OSM obligations remain separate. Private photos, notes and photo-linked derivatives remain outside Git and the web build under the [reference privacy rules](../docs/local-references.md#privacy-boundary).
