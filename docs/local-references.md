# Local references

The reference tools prepare access to existing evidence. They do not interpret photographs, choose a route, build a scene, or approve an asset for production. The current target is an environment prototype, not the former gameplay loop.

Run the commands below from the repository root. Python 3 uses only its standard library. Metadata refresh uses the installed `exiftool` command, and photo conversion also uses macOS `sips`. The tool does not install software, contact a service, export from iCloud, or modify source files.

## Open the map

Open `tools/map/index.html` directly in a browser, for example with `open tools/map/index.html` on macOS. The standalone viewer embeds the map and needs no web server or external tiles. It contains no photographs. Its source is `data/cemetery_final.geojson`, not a terrain model.

The canonical map contains 140 features, including 96 path sections, one cemetery boundary, five building/storage footprints, 17 hedges, four fences, four gates, two columbaria and eleven other points. Those counts describe the file, not verified spatial accuracy. Only one path has a width tag. Individual graves, most trees, terrain relief and most object heights are absent. Hedge dimensions are authored tags, not verified measurements.

The October 4 viewer was imported from `~/vaults/meeq-vault/03-Projects/Hedwig-and-Creative-Portfolio/Research/assets/neuer-friedhof-karte-2026-10-04.html`. A separate delivery copy was found at `~/Downloads/Hedwig-Karte-2026-10-04.html`. The recorded GeoJSON SHA-256 is `faa0de398279fca13e7c4946a1991db14257dda8082053c3a63a363020eddfca`. The standalone HTML is a snapshot, so changes to the GeoJSON do not update it automatically.

The map is OSM-derived. Preserve OpenStreetMap contributor attribution and ODbL provenance when distributing derived data. The original extract date/query and the history of manually positioned hedges remain incompletely documented.

## Use the private photo manifest

The preparation created `.local/references/photos.json` with the known 98 candidate originals. It also retained `.local/references/cached-exif.json` so the metadata can be imported again without querying the library. Neither file belongs in Git or the runtime.

```sh
python3 tools/references/references.py status
open .local/references/index.html
```

`status` reads only the recorded original paths. It reports missing or unreadable files, the expected count, and cached metadata presence. It writes `status.json` and a local gallery page. A gallery without proxies is expected before conversion. The manifest records absolute source paths, file size, date, camera/lens information, GPS, heading and device-reported position error. Metadata remain cached until an explicit refresh, and `status` never calls ExifTool or queries Photos.

The original HEIC files remain inside the Photos library. On October 10, the bounded metadata query matched 98 files and all 98 paths existed, totalling 547,610,009 bytes. ExifTool reported GPS and a true-north image direction in all 98 files. The October 4 evidence records horizontal GPS error estimates of 2.50 m minimum, 4.88 m median and 42.84 m maximum. Such estimates and headings help find references, but they do not prove camera pose, object dimensions or survey accuracy. Phone altitude is not a terrain model.

The earlier per-file cache could not be located, although its aggregate results survived. A single read-only Photos database query therefore recreated the local index. Its scope was August 31, 2025 in `Europe/Berlin`, latitude 50.171 to 50.175 and longitude 8.932 to 8.938. It did not inspect unrelated photograph content or search for photos without GPS. The matching count does not prove complete coverage of the cemetery.

### Refresh metadata from the known originals

```sh
python3 tools/references/references.py refresh-metadata
```

The refresh reads only the source paths already recorded in `photos.json`. It does not query Photos or expand the current set of 98 candidates. It preserves photo IDs, previous metadata and manual corrections, and updates `cached-exif.json` and `photos.json`. Missing originals retain their previous metadata and are reported as unavailable.

The sidecar fields include capture date and time offset, GPS latitude/longitude, `GPSAltitude` with `GPSAltitudeRef`, image direction with its reference, and `GPSHPositioningError`. `GPSDOP` and `GPSMeasureMode` remain separate observations, because dilution of precision is not a distance in metres. Camera fields include make, model, lens, focal length, `FocalLengthIn35mmFormat`, `FNumber`, `ExposureTime`, dimensions and orientation. ExifTool also requests existing tags whose names contain pitch or roll, and retains only values actually returned. The absence of a tag is not replaced by an invented value or a calibrated pose.

### Generate the private photo map

```sh
python3 tools/references/references.py map
open .local/references/map.html
```

Use `map --threshold 5` to choose the grouping threshold in metres. The value must be positive and finite, and the default is 5. Generation uses the cached manifest and canonical `data/cemetery_final.geojson`. It does not read image content, query Photos, or need a server. The gallery links to the map, and photo previews use the local `proxies/PHOTO_ID.jpg` files.

The map distinguishes "niedriger gemeldeter Fehler (unbestätigt)" from "Standort prüfen". A device-reported horizontal error at or below the threshold is an unconfirmed grouping, not proof of a position within five metres. Missing, invalid or larger error estimates need review. Manual position confirmation is separate from the reported error group, and an uncertain photo can still be useful evidence after the user identifies its position.

Generation also writes `map-status.json` and `placements.geojson`. The statistics report valid, missing and invalid horizontal errors separately, along with minimum, median, maximum and group counts. The GeoJSON contains one feature per manifest ID, including photos without usable coordinates. A feature without either usable GPS or a correction has `geometry: null`, rather than a fabricated location.

### Save manual photo positions

First, use the private map to position and confirm photos, then export its JSON to a private local folder. Second, import the export and regenerate the map.

```sh
python3 tools/references/references.py import-positions "/private/path/photo-positions.json"
python3 tools/references/references.py map
```

The interchange format is `{"version":1,"photos":[...]}`. Each row requires `id`, `longitude`, `latitude`, `confirmed` and `note`. The ID must match `photos.json`, `confirmed` must be `true`, and `note` must be a string that may be empty. Longitude and latitude must be finite WGS84 numbers inside the canonical map's bounding box plus a 100 metre margin. The latitude margin is `100 / 111320` degrees, and the longitude margin divides that value by the cosine of the bounding box's middle latitude.

The optional `heading_deg` is either `null` or a finite value from zero inclusive to 360 exclusive. A numeric correction means a user-confirmed clockwise heading relative to true north. A missing or null value preserves the original heading and its original reference, which may be true north (`T`), magnetic north (`M`) or unknown.

Imports replace the complete correction set in `.local/references/positions.json`. IDs must be unique, and extra fields are rejected. The entire input is validated before an atomic file replacement, so an invalid import leaves the existing correction file untouched. An empty `photos` array explicitly clears the set. A missing correction file means no corrections, but malformed existing corrections cause an error instead of being silently reset. Preserve the malformed file for recovery and repair it before retrying.

Browser edits are not saved into the repository by opening the map. Keep the exported JSON until it has been imported. Map generation, metadata refresh and index recreation preserve `positions.json`. Reindexing fails if the new photo set would leave a correction pointing to an unknown ID.

In the map, select numbered photos and click a preview to open the full working JPEG in another tab. Filter by **Für Micha offen**, position, heading, agent changes or original GPS error. **Standort setzen** followed by a map click stores the camera location and the entered heading; dragging only pans. **Original-GPS + eingetragene Richtung übernehmen** accepts the observed position with the entered heading. Undo/reset affects only the selected photo. Download the complete manual correction set and verify its local file before acknowledging the download. Import the JSON with the command above and regenerate the map for the next session.

Position the **camera / photographer at capture time**, not the photographed object. The heading field is prefilled when an agent heading estimate exists. Clearing it explicitly restores original EXIF heading and reference, rather than inheriting the estimate. To resolve an open heading check without changing the angle, enter the original numeric heading and apply it. A blank heading does not resolve that check. No operation corrects pitch, roll or elevation.

### Use original and corrected metadata

`photos.json` and `cached-exif.json` retain the observations from the original files. Corrections are stored separately and never change EXIF or the originals. All 98 references remain recoverable through their IDs, source paths and matching proxy filenames without opening Photos.

In `placements.geojson`, `geometry` uses the human correction first, then an applied agent estimate, then observed GPS. Every feature retains the original `metadata`, source path and ID. `position_source` distinguishes `user_confirmed`, `agent_estimate` and `observed_gps`; agent estimates never set `user_confirmed`. `review` retains both assessment reasons, and `pending_review` lists unresolved components after human corrections. Original GPS accuracy groups remain independent of visual assessment. `effective_heading_deg`, `effective_heading_source` and `effective_heading_ref` identify the selected heading. A human row takes precedence over an agent estimate, including the explicit original-EXIF fallback for a null human heading.

GeoJSON coordinates contain only WGS84 longitude and latitude. Phone altitude remains metadata, never world Z. For metric scene work, use the acquired DGM and explicit coordinate/height contract in [Blueprint preparation](blueprint-preparation.md). A located photo and heading are not a calibrated camera pose.

### Visual review and owner follow-up

Micha explicitly authorized visual analysis of all 98 private photos on 2026-10-15. That authorization covers camera position and heading review in the current model session, not publication, unrelated photo access or scene production. Individual assessments are stored in `.local/references/reviews.json`, separately from human corrections in `positions.json`.

```sh
npm run references -- import-reviews .local/references/review-2026-10-15/reviewed-positions.json
npm run references -- map
open .local/references/map.html
```

The review import replaces the whole agent assessment set after validation. It does not change human corrections. Missing `reviews.json` means no visual review; malformed existing data fail visibly rather than resetting the set. Reindexing refuses to orphan review IDs. Keep both private JSON files when moving or backing up the workspace.

The version-1 review envelope contains `photos`. Each row has `id`, `number`, `position`, `heading`, `needs_review` and `evidence`. Position and heading each contain `status` (`adjusted`, `plausible`, `uncertain`), `confidence` (`high`, `medium`, `low`) and a nonempty `reason`. Position has `coordinates` in longitude/latitude order; heading has clockwise true-north `degrees`. Those values are non-null only for `adjusted` assessments. Low-confidence adjustments are rejected, and uncertain components must appear in `needs_review`. Confidence describes the visual assessment, not measured accuracy.

The owner queue uses separate position and heading flags. A saved human position resolves the position flag; a numeric human heading resolves the heading flag. Removing a human correction restores the agent/original layer and its pending flags. The browser download contains manual corrections only, because the agent assessments already live in their own file. Numbered photos, per-component reasons and filter counts make the remaining work visible without reading JSON.

The completed 2026-10-15 review covered every photo individually and applied five estimated positions and seven estimated headings. Its nineteen owner checks were the state before the subsequent human import. The private review directory retains those assessments and their evidence as history. Do not use its older counts instead of the current `map-status.json`.

### Owner corrections and blueprint preparation

On 2026-10-16 Micha supplied `foto-korrekturen.json` and asked that it become the standard. The validated import contains 91 positions and 51 numeric headings. Regenerated placements use every supplied row unchanged and keep original EXIF for a null human heading. Seven photos have no human row. Four workflow flags remain: position for photo43 and heading for44,88,97. Fourteen verbatim notes include additional estimates and uncertainty; confirmation does not override their meaning.

The later authorization includes private photo comparison for the blueprint, not publication or Blender construction. Micha subsequently rejected the 113 agent-drawn interpretations as broadly inaccurate. The read-only atlas at `.local/blueprint/atlas.html` now joins effective camera positions to official imagery, numeric terrain and only the 140 canonical source features. Human photo corrections and all verbatim notes remain active.

[Blueprint preparation](blueprint-preparation.md) owns acquisition, the metric frame, the next agent's context package and pilot acceptance criteria. The atlas's 13 regional groups come from private `photo-index.json` and contain only navigation links, not trusted observations or construction tasks. The rejected traces, old plans, full `photo-evidence.json` and historical interpretation reports belong under `.local/blueprint/archive/rejected-interpretation-2026-10-16/`, outside active modeling context. Continue importing camera corrections through this reference workflow, then regenerate both map and atlas. The atlas rebuild requires the private photo index, not archived interpretation inputs.

### Generate local working copies

Generate one proxy first when checking the tool, or omit `--limit` to create all missing proxies. A proxy is a smaller JPEG copy for local reference access.

```sh
python3 tools/references/references.py proxies --limit 1
python3 tools/references/references.py proxies
open .local/references/index.html
```

The default maximum dimension is 1600 pixels. Use `--size 2048` for another size or repeat `--id PHOTO_ID` to select particular manifest entries. IDs are the original filename stems in `photos.json`. Existing proxies are reused, so a later `--size` value does not resize them. If a different size is needed, remove only the relevant generated JPEGs from `.local/references/proxies/` and run the command again.

The tool decodes each selected original with `sips`, reads the temporary JPEG's EXIF orientation and applies the required pixel rotation/reflection before stripping embedded metadata. The rich original metadata remain in `photos.json` and `cached-exif.json`. The proxy is published only after conversion and metadata removal succeed. Errors are reported per photo in `proxy-report.json`, and an unavailable source does not cause a cloud export. All image writes stay under `.local/`, and symlink output directories are refused. No original is overwritten.

Removing embedded metadata does not make an image safe to publish. Faces, inscriptions, portraits, plates and private property can remain visible. Proxies, galleries, maps, metadata, correction exports and GeoJSON placements remain private. Model inspection requires a specific owner authorization, such as the visual review above; routine preparation does not include that permission. Do not publish these files or serve them through Vite or a general repository-root HTTP server. Open the gallery and correction map as local files. For the owner-authorized read-only atlas on a phone, use the bounded [private phone access](blueprint-preparation.md#private-phone-access) workflow; it serves only that page and its referenced working images through Tailscale. A Git ignore rule alone does not provide HTTP access control.

### Recreate or relocate the index

Prefer the saved metadata over rediscovering library records.

```sh
python3 tools/references/references.py index \
  --metadata .local/references/cached-exif.json
```

If the library moved, add `--originals-root "/new/location/Photos Library.photoslibrary/originals"`. The tool remaps only the path component after `originals/`. It does not copy or move photographs.

Only when both local index and cached metadata are unavailable, explicitly identify the local library and run the same bounded read-only query.

```sh
python3 tools/references/references.py index \
  --photos-library "$HOME/Pictures/Photos Library.photoslibrary"
```

The library path is configurable and no personal absolute path is stored in tracked tool code. The Photos database schema is an Apple implementation detail. If it changes, the tool reports failure rather than broadening its search or exporting from iCloud. A count other than 98 is retained and reported as a discrepancy. Missing originals are recorded rather than silently discarded.

Exit code 0 means the operation completed. Index, status, refresh and proxy commands additionally require the expected locally available set for code 0. Code 1 means an incomplete set, failed conversion or missing inventory root. Code 2 means an input or tool error. Map generation and correction import work from cached data without requiring the originals to remain available.

## Inspect assets and textures

```sh
python3 tools/references/references.py inventory
open .local/references/inventory.json
```

The inventory contains relative filenames, byte sizes and extension counts for each configured root. It is a filesystem inventory, not a Blender import or a visual/material assessment. Use `--raw-root`, `--working-root` and `--runtime-root` if the source directories move.

| Location | Observed files on October 10 | Role |
| --- | --- | --- |
| `assets/source/raw/cemetery-pack/` | 24 FBX and 305 PNG | Immutable marketplace originals. |
| `assets/source/working/cemetery-pack/` | 3 `.blend` and 6 saved backup versions | Existing Blender source files, preserved unchanged. |
| `public/assets/models/` | 1 GLB | Existing runtime street-lamp proof asset. |
| `public/assets/textures/ground/` | 4 JPEG | Grass colour and normal maps at 1K and 2K. |
| `public/assets/hdri/` | 6 HDR | Three lighting environments at 1K and 2K. |

Pack texture filenames include base colour, normal, NormalDX, roughness, metalness and ambient occlusion. The October 4 inventory also records emissive and opacity maps. File names do not prove correct shader wiring. Confirm normal-map convention, colour space, opacity handling and browser appearance before approving a derived asset. Procedural Blender materials may need baking to image maps before glTF export.

Micha confirmed purchase and commercial-use permission for the pack on October 4. Missing purchase paperwork is not a permission blocker. Vendor identity and detailed source history are still useful provenance records, while the origins and attribution of the existing grass/HDRI files remain incomplete. Existing names or old recommendations do not establish their licence.

Prefer agent-built geometry for the site's buildings, paths, boundaries and other identifiable structures. Complex trees may come from the purchased pack. Additional textures or models remain an option when they fit the reference evidence, and the pack's churches and mausoleums are not substitutes for the actual cemetery buildings. Existing street-lamp files and test objects are experiments, not authoritative production content. Selected pilot assets have source/browser evidence in the current plan; no pack-wide visual suitability approval is implied.

## Missing inputs and backup limits

Official TrueDOP RGB/CIR, DGM1 and DOM1 are now registered under `.local/blueprint/`. Their capture dates, resolution, height datum, licenses and limitations are documented in [Blueprint preparation](blueprint-preparation.md). Remaining gaps include unseen geometry, local object dimensions and independently verified survey anchors, not basic access to terrain or aerial imagery.

The source directories and `.local/` are ignored. A Git push does not back up the private reference pack, photo corrections, acquired rasters, photo index or rejection archive. A fresh clone needs those private inputs restored separately before rebuilding the atlas. Saved `.blend1` to `.blend3` files are same-disk recovery copies. The October 2 evidence found Time Machine inclusion metadata, but its external destination could not be mounted and no independent restore was demonstrated. Generating a manifest, JPEGs or more local copies does not resolve that backup limitation.

For the approved entrance/hall pilot, Micha selected `/Users/meeq/.backups` on 2026-10-16. The [active plan](asset-integration-plan.md#before-modifying-sources) now defines the local snapshot policy, and [readiness](readiness.md#pilot-approval-and-backup-2026-10-16) records the actual restore check and recovery layout. This replaces the old independent-destination blocker for the pilot, without claiming protection from hardware loss. Use only the 98 manifest-listed originals when backing up Photos references; do not copy unrelated library content.

On 2026-10-18, Micha confirmed an external Time Machine drive and accepted it as sufficient independent protection. [#18](https://github.com/LLMinem/horror-game-hedwig/issues/18) is closed by owner acceptance, not by a new agent restore test. Do not reopen backup verification as a modeling prerequisite. Existing local snapshots and the public-repository privacy/licence rules remain in force.

Keep source evidence separate from `public/`. Only deliberately reviewed runtime derivatives should enter the web build. Source-to-runtime conversion needs a recorded source, transform, material/export settings and browser verification within the selected brief. The pilot's Blender/runtime work is approved, but a new section still needs a bounded brief.

## Evidence and integration checks

The current authority is `~/vaults/meeq-vault/2026-09-30-Arbeitsstraenge/04-Hedwig.md` and `Handoff-Hedwig-Revival.md` under the vault's `03-Projects/Hedwig-and-Creative-Portfolio/`. The detailed evidence is `Research/06-neuer-friedhof-reconstruction-inputs.md` in that project. Cached readiness counts and backup limits are in `~/.cache/hermes-coo/orchestration-2026-10-02/04-hedwig-phase-one-checkpoint.json`.

The following checks belong to integration. They do not require visual interpretation or displaying private photos to a model.

```sh
python3 -m unittest discover -s tools/references -p 'test_*.py'
python3 tools/references/references.py --help
python3 tools/references/references.py status
python3 tools/references/references.py refresh-metadata
python3 tools/references/references.py map --threshold 5
python3 tools/references/references.py inventory
python3 tools/references/references.py proxies --limit 1
```

Expect 98 available originals, 24 FBX, 305 PNG, three Blender files and six Blender backups. For the JPEG selected by `proxy-report.json` and the manifest order, inspect dimensions with `sips -g pixelWidth -g pixelHeight PATH_TO_PROXY` and metadata with `exiftool -G1 -a -s PATH_TO_PROXY`. The maximum dimension should be at most 1600, and GPS, EXIF, XMP and IPTC source metadata should be absent. File and JPEG structural fields are expected. Do not include private image content in test reports. Confirm the map opens offline and that the game server denies private/source paths before treating access protection as verified.

For the private map, also check correction export/import and reindex persistence. Reject unknown or duplicate IDs, nonfinite coordinates, positions outside the canonical bounds plus margin, invalid headings and malformed existing correction files. Confirm rejected imports leave `positions.json` unchanged. Check missing and invalid GPS/error metadata without inventing locations, and check that filenames or notes containing HTML/script characters remain inert. Use synthetic images for routine browser checks unless the owner has explicitly authorized private photo inspection.

Integration completed on 2026-10-10: `status` and `inventory` matched the counts above; cached-index recovery and unknown-photo-ID rejection were exercised. All **98 JPEG proxies** were generated locally (114,145,125 bytes total), decoded dimensions are at most 1600 pixels and ExifTool found no source EXIF/GPS/XMP/IPTC groups in any proxy. The gallery is ready at `.local/references/index.html`; photo content was not displayed to a model or visually interpreted. The offline map's layer controls and funeral-hall selection worked, with zero resource requests and no page errors; its embedded map was compared with the canonical GeoJSON. Direct, `?raw` and `/@fs` requests for private reference data, plus raw textures and a source blend, returned HTTP 403 from Vite. These checks do not make any of the images publication-safe.

### Photo-position workflow verification

The following historical preparation checks predate the authorized visual review and owner correction import above. Their confirmation counts are superseded. Technical workflow checks do not establish visual accuracy.

The follow-up refreshed metadata from exactly the 98 manifest paths, without a Photos database query. All 98 include altitude reference (`0`, EXIF above-sea-level), 35 mm-equivalent focal length (24 or 28 mm), aperture and exposure time in addition to GPS, true-north heading and horizontal error. No pitch/roll, GPS DOP or GPS measure-mode tags were returned. This is useful camera evidence, not a complete calibrated pose or a surveyed height model.

At the provisional 5 m threshold, 50 photos have lower reported error and 48 need priority location review; none has been manually confirmed by preparation. The measured horizontal-error range remains 2.4979–42.8415 m, median 4.8822 m.

Verification: eight synthetic Python tests passed (`python3 -m unittest discover -s tools/references -p 'test_*.py'`). A real Chrome `file://` smoke exercised filtering, pan without accidental placement, corrected placement, optional heading/note, download, reset, invalid-import rejection, browser reimport and Python import/regeneration. The downloaded browser JSON produced the same corrected position and heading in GeoJSON while retaining raw measurements; the regenerated page reopened with those corrections. Synthetic previews were visually checked at desktop and narrow viewport widths; opening a preview in a separate tab worked. The real private page displayed 98/50/48/0 total/low-error/review/confirmed entries, decoded its selected local proxy and made no HTTP(S) requests or page exceptions. Real photo content was not captured for model inspection; synthetic edits never entered the actual reference dataset.

SHA-256 checks across the complete workflow matched all 98 original HEIC files and the canonical GeoJSON before/after. No real location was inferred or corrected automatically. Private map, sidecars and proxies remain on this Mac; disposable synthetic browser fixtures were removed.

### Visual review verification, 2026-10-15

The counts below describe the historical state before the 2026-10-16 owner import. They do not override current owner corrections or validate the later rejected object interpretations.

Twelve Python regression tests passed, including independent agent position/heading estimates, human precedence, unresolved heading flags, malformed review rejection and portrait conversion. The image regression exposed two fixture setup issues (a JPEG with a HEIC suffix, then a test size that caused native upscaling); both were corrected before the final passing run.

The actual Chrome file-page decoded all 98 proxies and showed the expected 98 reviewed, 12 changed and 19 pending photos, with separate 16-position and 6-heading filters. The original and effective heading for the first photo were displayed separately. Five sideways portrait proxies were regenerated with pixel orientation applied before EXIF removal, and the resulting upright display was checked visually. Desktop and narrow layouts were inspected. The page produced no JavaScript exceptions or HTTP(S) requests during the check.

A separate synthetic browser session exercised partial confirmation, explicit original-heading fallback, agent-estimate restoration, undo, JSON download/reimport and regeneration. The exported manual correction survived Python import and page reopening while the agent review file stayed unchanged. Synthetic corrections were never imported into the real dataset.

SHA-256 checks matched all 98 HEIC originals, the original metadata manifest/cache and canonical GeoJSON before and after the review. The real dataset still has zero human confirmations. These checks prove data preservation and workflow behaviour, not the accuracy of visual estimates.
