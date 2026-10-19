# Blueprint preparation

Micha authorized reference preparation on 2026-10-16, excluding Blender construction and runtime work. He subsequently rejected the 113 agent-drawn interpretations as broadly inaccurate and worse than the canonical GeoJSON, including urn bays, lawns and canopy geometry. That assessment is the current basis for preparation. Technical checks of files, coordinates and browser controls never proved visual accuracy.

The active atlas uses only the 140 canonical source features, official aerial imagery, numeric terrain and corrected private photo links. The canonical map is a working baseline with local uncertainty, not a survey or an approved production plan. Use it for bounded corrections and later sections, rather than another whole-site redraw.

Micha approved the entrance/hall pilot, including Blender and runtime work, on 2026-10-16. The first checkpoint is implemented, and he considers it a useful basis with open modeling and path/collision limits. The [active plan](asset-integration-plan.md#current-pilot-and-review) owns the current scope and linked issues. The source rules on this page remain binding; the earlier preparation-only restriction does not override the pilot approval.

## Start here

Open the private atlas on the prepared Mac:

```sh
open .local/blueprint/atlas.html
```

The atlas displays the 140 projected canonical source features without an interpretation layer. Switch between RGB imagery, infrared imagery, terrain shading and surface height. Select a photo to see its effective camera position, direction provenance and the owner's verbatim note. The 13 regional photo-index groups help find photos; they are not verified observations or construction work cards. The existing photo editor remains at `.local/references/map.html`; the atlas is read-only.

On narrow screens, the atlas has separate map, layer and photo panels. The bottom navigation stays visible. Tap a photo marker and "Ansehen" to inspect it, or choose a numbered photo from the list. "Auf Karte" shows its camera position and direction; the image opens in a full-screen viewer. Pinch and drag control the map. The source limits and unchanged owner notes remain available.

The rendered sheets are under `.local/blueprint/derived/`:

| File | Purpose |
| --- | --- |
| `sheet-context.png` | The cemetery and surrounding woodland, parking and gardens over a 520 m square. |
| `sheet-site.png` | The cemetery with canonical source geometry over the aerial image. |
| `sheet-north.png`, `sheet-south.png` | Source-only inspection views of each half. They retain the native aerial sampling rather than inventing finer imagery. |
| `site-plan-1-500.svg` | A source-only vector plan without the aerial image. At its original 560 mm square size, 280 m is represented at 1:500. Scaling the print changes that ratio; the scale bar remains usable. |
| `orthophoto-rgb.png`, `orthophoto-cir.png` | Unannotated reference images, each 2600 by 2600 pixels. The accompanying `.pgw` and `.prj` files preserve raster placement. |
| `terrain-local.npz`, `terrain-local.csv`, `terrain-grid.json` | Numeric local ground elevations and their grid contract. The coloured preview is not the height data. |

Keep the images without annotation for Blender reference planes. The bordered plan sheets are review documents, not textures that can be assigned the same bounds as the unbordered rasters.

## Why a layered plan

The [architectural visualization example](https://developers.openai.com/blog/architectural-visualization-with-astra) designs a new house. Its concept plan explicitly says it is not surveyed or construction-ready. The useful sequence is to review the plan before building and then compare the model in neutral views.

For an existing cemetery, coordinates and visible evidence must determine the plan. A generated illustration can invent a convincing grave row or smooth away a real junction. Our plan images are therefore derived from explicit geometry and georeferenced imagery. They are not a new source of measured dimensions.

Photogrammetry is not the primary preparation route. Several photo groups were taken while rotating at nearly the same position, and complete overlapping coverage is not established. [COLMAP's capture guidance](https://colmap.github.io/tutorial.html) requires overlapping views and useful camera movement. The existing photographs remain valuable appearance references without pretending that they form a calibrated 3D scan.

## Acquired evidence

| Source | Actual resolution | Capture date | Intended use |
| --- | --- | --- | --- |
| Hessen TrueDOP RGB | 0.20 m per pixel | Cemetery and western context: 2025-08-19. Eastern context from E495500: 2023-05-29. | Local checks of visible paths, roof outlines and surface boundaries against the source map. Foliage obscures objects below it. |
| Hessen TrueDOP CIR | 0.20 m per pixel | 2025-08-19 in all four queried provider tiles. | Qualitative vegetation inspection, not species identification or calibrated NDVI. |
| Hessen DGM1 | 1 m grid, Float32 heights | Airborne laser scan on 2020-04-01. | Ground elevation, excluding buildings and vegetation surfaces. |
| Hessen DOM1 | 1 m grid, Float32 heights | The same 2020-04-01 laser scan. | Older upper-surface evidence. DOM minus DGM includes roofs as well as vegetation. |
| Private ground photographs | 98 original files with working previews | 2025-08-31 | Facades, materials, forms, path edges and objects that an aerial view cannot resolve. |

The aerial imagery is from aircraft, not a conventional satellite image. It is the highest practical freely accessible native resolution established for this site during the acquisition. Sentinel-2's best 10 m sampling cannot resolve these paths and graves. Google imagery was not acquired as reconstruction input because its published reuse restrictions differ from the official open dataset.

The full acquired extent is 520 by 520 m, with at least about 132 m axis-aligned margin outside the existing map's envelope. The cemetery is entirely west of the RGB epoch boundary. The twelve-day gap between the site's aerial capture and the ground photographs is useful, but does not prove that movable objects stayed in place.

The DGM's height range inside the existing cemetery boundary is approximately 109.793 to 112.209 m NHN, a difference of 2.416 m. Those are sampled model values, not millimetre measurement accuracy. One-metre sampling does not resolve kerbs, grave borders or small steps. The 2020 surface model does not establish 2025 tree heights.

## Coordinate and height contract

`site-frame.json` under `.local/blueprint/` is the machine-readable contract.

| Quantity | Value |
| --- | --- |
| Horizontal coordinate system | ETRS89 / UTM zone 32N, EPSG:25832. |
| Extent, west/south/east/north | 495100, 5557570, 495620, 5558090 metres. |
| Local origin E0, N0 | 495360, 5557830 metres. |
| Vertical datum | DHHN2016 normal heights in metres above NHN, from the official product specifications. The TIFF's horizontal CRS alone does not encode this declaration. |
| Local height offset H0 | 111.5 m NHN. This is a convenient project offset, not a survey marker. |
| Blender axes | `x = E - E0`, `y = N - N0`, `z = H - H0`. One unit is one metre. |
| glTF and Three.js axes | `(x, y, z)Blender → (x, z, -y)runtime`. North becomes negative runtime Z. Apply the standard exporter conversion once. |

`site-local.json` uses local metres and contains only the 140 projected canonical source features, with stable source IDs. The canonical `data/cemetery_final.geojson` uses WGS84 longitude and latitude. Do not treat local-metre coordinates as longitude/latitude or put projected numbers into RFC 7946 GeoJSON. The builder neither reads nor exports interpretation geometry.

Rows of every acquired raster run from north to south. The RGB/CIR pixel centre at column `c`, row `r` is local `(−259.9 + 0.2c, 259.9 − 0.2r)`. The DGM centre is `(−259.5 + c, 259.5 − r)`. The terrain CSV has 520 rows and 520 columns; each value is already `H - 111.5`. The NPZ has arrays `height`, `x` and `y` with the same ordering. Do not subtract H0 twice or place the samples on the raster's outer edges.

Phone headings are relative to true north, while local +Y is UTM grid north. The atlas retains the true-north heading and computes a separate projected direction for its ray. Neither field supplies pitch, roll or calibrated camera pose. Phone altitude is not used as terrain height.

Numerical coordinate round trips and axis checks are distinct from independent survey control. Visible map/image comparisons must retain local disagreements rather than forcing all imagery to fit inaccurate OSM or camera positions.

## Authority and excluded material

The imported owner file is the standard for photo placement wherever it contains a row. It supplies 91 position records and 51 numeric headings. The seven remaining photos retain their previous effective sources. A null manual heading deliberately uses original EXIF instead of an agent estimate. Preserve all 14 verbatim owner notes. Notes that say estimated or unclear remain binding limits, even where the workflow labels a position confirmed.

Choose evidence according to the claim, rather than declaring one dataset authoritative for every purpose:

| Claim | Evidence and limit |
| --- | --- |
| Camera position or direction | Use owner corrections first, retaining verbatim notes and heading provenance. Camera coordinates do not locate the photographed object. |
| Object footprint or path boundary | Start from a stable canonical source ID and compare the official aerial image locally. Use ground photos to resolve visible edges and object identity. A roof outline is not necessarily a wall footprint. Correct only a specific, supported discrepancy. |
| Appearance, materials or form | Use the relevant ground photos. A regional index label or previous agent confidence score is not evidence that an object was observed. |
| Ground height or object height | Use DGM for ground elevation with the documented grid and offset. DGM does not measure object heights, and the 2020 DOM does not establish modern object or tree heights. |

The rejected `interpretation-north.json`, `interpretation-south.json`, `interpreted.geojson`, old derived plan sheets/SVG, full `photo-evidence.json` and historical interpretation/verification reports belong under `.local/blueprint/archive/rejected-interpretation-2026-10-16/`. They are retained as private history, not modeling inputs, optional overlays or approved observations. Do not recover canopy envelopes, urn-bay outlines, lawn boundaries or construction instructions from that archive.

Keep `data/cemetery_final.geojson` unchanged as the baseline. Retain its stable IDs when discussing uncertainty or proposing a local correction. A source path centre line is not a path surface or an approved navigation network. Hidden grave positions, hedge gaps, trunk positions and unresolved object dimensions remain unknown until relevant evidence supports a local decision.

## Context package for the next agent

Use this guide as the handoff; do not create another competing plan. Assemble the following package for one proposed region:

1. Include the selected issue and current scope from the [active plan](asset-integration-plan.md). The [archived pilot brief](archive/entrance-hall-pilot-plan-2026-10-16.md#decision-and-scope) retains the original bounds and exclusions. The project still aims to reproduce the actual cemetery at dusk or night, with an environment prototype before gameplay. Name the requested outputs for the current section rather than treating the old implementation sequence as new work.
2. Include the canonical GeoJSON and `site-local.json`, with the relevant stable source IDs. Include unannotated RGB/CIR, their capture dates and visibility limits, plus `site-frame.json` and the DGM grid contract above. Use source-only sheets for orientation, not as new measured evidence.
3. Include effective photo placements and verbatim owner notes, with original metadata and provenance available. Use `.local/blueprint/photo-index.json` to select a small region-specific photo set, then inspect those photos directly. The 13 groups contain only IDs, labels and photo numbers; the atlas embeds them as `data.photo_index`, not `photo_evidence`.
4. Include a short uncertainty list tied to source IDs and photo numbers. For each item, state the question, supporting or conflicting evidence and the human decision needed. If an object has no source ID, identify the nearby source feature and photo without inventing a footprint. Unknown areas need written limits, not speculative polygons.

The package is sufficient for the bounded pilot when the private inputs open, the relevant IDs/photos are identified, and visible anchors can be compared in the shared frame. Every proposed correction must cite evidence, and unresolved dimensions or occlusions must remain explicit. Micha has selected the entrance/hall pilot and approved its brief. Neither a complete whole-site redraw nor another review of all 98 photos is required.

## Bounded pilot and acceptance

First, compare the selected canonical features against RGB alone and the small photo set. Record local discrepancies without silently replacing source geometry. Do not infer a connected path surface, a closed urn structure or a tree inventory from a schematic map ring or foliage.

Second, apply the approved pilot's observable acceptance criteria. Require a neutral overhead source comparison and ground-level comparisons from named photo stations for the selected area. List supported local corrections and unresolved details. A visually plausible result without those comparisons is not acceptance.

Third, make authorized source changes in a new revision under the [local backup policy](asset-integration-plan.md#before-modifying-sources). Start from the current pilot, not the pre-implementation sandbox. Read the recorded restore evidence rather than reopening the old independent-destination blocker. Keep existing Blender files unchanged. No add-on or GIS server is needed.

For an authorized pilot, preserve the reference setup:

- Use metric units and scale length 1. Keep reference images and private evidence out of export collections. Place unannotated RGB across local x and y from −260 to +260, with north at y=+260; CIR uses the same bounds. Compare three widely separated visible anchors, including one on each side of the site, and record discrepancies rather than fitting a different scale to each object.
- Use the DGM `height`, `x` and `y` arrays or the documented CSV for ground. Keep source rasters unchanged. Constructed kerbs, steps and platforms need separate photo evidence; DOM and false-colour previews are not ground-height inputs.
- Use `site-local.json` for metre coordinates. The 1:500 SVG uses physical page units for printing, so an SVG import needs explicit rescaling and a 50 m scale-bar check. Ground sampling and future object placement must share the same height offset.

Keep source acceptance and browser acceptance separate. Source acceptance requires Micha's review of the pilot comparisons, local corrections and remaining uncertainty. Dusk/night appearance can be reviewed alongside neutral views, but should not hide mismatches. Photo positions and headings guide comparisons without supplying calibrated lens, pitch or roll.

Browser acceptance is a separate check within the approved pilot, not a reason to postpone all runtime work to another session. Follow the existing [Blender workbench](assets/blender-workbench.md) and [asset pipeline](assets/pipeline-guide.md). Establish export appearance, loading, collision, ground sampling and measured performance at a recorded hardware, browser and resolution. Local browser inspection of reviewed runtime derivatives is not public release or human art approval. A working atlas, valid geometry or passing CLI tests satisfies neither source visual acceptance nor runtime acceptance. Agents cannot approve production autonomously.

## Rebuild and recovery

The ordinary photo tooling still uses standard-library Python. Blueprint processing uses a separate local environment; it does not change application dependencies or global Python packages. Sheet rendering currently uses this Mac's system font `/System/Library/Fonts/Supplemental/Arial Unicode.ttf` for German text and arrows.

On a machine with the private acquired inputs restored:

```sh
uv venv .local/blueprint-venv
uv pip install --python .local/blueprint-venv/bin/python -r tools/blueprint/requirements.txt
npm run references -- map
.local/blueprint-venv/bin/python tools/blueprint/build.py
```

Reuse an existing environment rather than recreating it for each build. The builder needs cached source rasters, current effective photo placements and the private `.local/blueprint/photo-index.json` navigation input. Its shape is `{"regions":[{"id":"…","label":"…","photo_numbers":[1]}]}`; the restored index contains 13 groups. It does not need or read the archived interpretation files or old `photo-evidence.json`. A fresh Git clone alone is insufficient to rebuild the private pack.

Exact acquisition requests, source dates, licenses and checksums are in `.local/blueprint/sources/aerial/` and `sources/terrain/`. The corresponding reports under `.local/blueprint/research/` explain successful alternatives to stale metadata links. Preserve the acquired bytes because live services can change. The DGM and DOM flight date was tied to the numeric WCS data by exact comparison with the official downloadable source tiles.

The official geodata catalog identifies `dl-zero-de/2.0`. Keep HVBG provenance and mark modifications when displaying source credit. The OSM-derived source and any combined derived database retain separate ODbL considerations. Private photos, notes and photo-linked derivatives remain outside Git and the web build. `.local/` remains ignored and is not an independent backup. A Git push does not back up the private pack, including acquired rasters, photo corrections, the photo index or the rejection archive.

## Primary references

- [Hessen TrueDOP product and access](https://hvbg.hessen.de/landesvermessung/geotopographie/luftbilder/digitale-orthophotos-true-orthophoto).
- [Hessen geodata services](https://hvbg.hessen.de/geoinformation/geodateninfrastruktur/geoportal-hessen/geodatendienste-im-originaeren-format).
- [Hessen DGM](https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/digitale-gelaendemodelle) and [DOM](https://hvbg.hessen.de/landesvermessung/geotopographie/3d-daten/digitale-oberflaechenmodelle).
- [Hessen open-data conditions](https://hvbg.hessen.de/open-data), [data license zero](https://www.govdata.de/dl-de/zero-2-0) and [OpenStreetMap copyright](https://www.openstreetmap.org/copyright).
