# Private reference operations

Use this guide to find photos, import camera corrections or open the Atlas. Tools prepare access; they do not approve interpretations, assets or construction. [The data contract](../data/README.md) owns evidence priority, geometry, coordinates and terrain. [The Blender guide](assets/blender-workbench.md#source-preservation-and-recovery) owns backup/recovery. The selected issue and its parent specification supply the next work.

## Open existing evidence

Run commands from the repository root. Reference tools use standard-library Python; explicit metadata refresh needs installed `exiftool`, and proxy conversion needs macOS `sips`. They neither install software nor export from iCloud or modify originals.

```sh
open tools/map/index.html
python3 tools/references/references.py status
open .local/references/index.html
open .local/references/map.html
open .local/blueprint/atlas.html
```

The public offline source-map viewer embeds a snapshot without photographs or external tiles. `status` checks only manifest-listed originals and writes private `status.json` and gallery HTML; it does not query Photos or refresh metadata. Missing proxies explain an empty gallery. Current counts and pending flags come from the private manifests and `map-status.json`, not old reports.

The Atlas is read-only: select layers and photos to compare canonical features, official imagery, terrain and effective camera positions/notes. Regional groups only navigate photos. On a phone, the bottom navigation switches map/layers/photos; the photo viewer and camera-location action are distinct. The editable photo map remains `.local/references/map.html`.

For presentation-only changes, `python3 tools/blueprint/atlas.py render` uses existing private `site-local.json`. Data changes require the [full rebuild](../data/README.md#rebuild-and-provenance). The HTML alone is insufficient: adjacent raster previews and photo proxies are dependencies.

## Reproducible photo stations

With the blueprint environment and private references available, choose representative photo numbers explicitly:

```sh
npm run review:stations -- --photos 1,28,47,65,91 --output .local/spatial-review/stations.json
```

This creates a new private manifest and refuses to overwrite existing calibration. It seeds effective camera position/grid heading, oriented photo dimensions and lens-derived field of view. Eye height 1.7 m and zero pitch/roll are labelled assumptions, not measurements. Owner notes and source hashes remain attached.

Select the authored revision, station manifest and existing regional responsibility manifest in `.local/spatial-review/config.json`, with repository-relative keys `source_dir`, `stations` and `assignment`. `npm run review:spatial -- --preset photos` produces local side-by-side pairs; `--preset all` also includes the registered whole-site comparison and Atlas. See the [comparison contract](assets/blender-workbench.md#whole-site-and-photo-comparison) for output/privacy and completion limits.

Calibrate by preserving the private manifest and recording visible anchors, pose adjustments and remaining uncertainty. A plausible position/heading or matching aspect ratio alone is not a calibrated camera. Unresolved photo coverage, width measurements and targeted new photos belong in [#38](https://github.com/LLMinem/horror-game-hedwig/issues/38); do not regenerate over reviewed stations.

## Refresh and make working copies

```sh
python3 tools/references/references.py --help
python3 tools/references/references.py refresh-metadata
python3 tools/references/references.py proxies --limit 1
python3 tools/references/references.py proxies
python3 tools/references/references.py map
```

Refresh reads only known paths in `photos.json`, preserves IDs/manual corrections and previous metadata for missing originals, and updates `cached-exif.json`. It never expands the photo set. The map uses cached metadata and source geometry, not image inspection or a Photos query. Its configurable error threshold groups device-reported accuracy only; see the [data contract](../data/README.md#photo-observations-and-corrections) for interpretation.

Proxies are local JPEG derivatives, with orientation applied to pixels before embedded metadata are stripped. Rich metadata remain in the manifest/cache. Existing proxies are reused: changing `--size` does not resize them. To change size, remove only the selected generated JPEGs and regenerate. Use CLI options for selecting manifest entries. Per-photo failures appear in `proxy-report.json`; unavailable originals do not trigger cloud export. Output symlink directories are refused and originals are never overwritten.

## Correct camera positions

1. Open the private photo map, select a numbered photo and inspect its component-specific reasons. Place the **camera at capture time**, not the object shown. Dragging pans; the placement action followed by a map click changes position. The action accepting original GPS uses the entered heading. Undo/reset affects only the selected photo.
2. Enter a numeric heading when confirming direction. Clearing the field intentionally restores original EXIF, not an agent estimate; it does not resolve an open heading check. No operation corrects pitch, roll or elevation. Preserve verbatim notes and uncertainty.
3. Download the complete manual correction set to `.local/references/`, check that the file exists before acknowledging download, then import and regenerate:

```sh
python3 tools/references/references.py import-positions .local/references/photo-positions.json
python3 tools/references/references.py map
```

Import the editor's complete versioned export; the CLI validates its schema and bounds before replacing anything. [The data contract](../data/README.md#photo-observations-and-corrections) owns correction precedence and null-heading semantics.

**Imports replace the entire correction set**, not just changed rows. Validation completes before atomic replacement, so invalid input leaves `positions.json` untouched. An empty `photos` array explicitly clears it. Missing corrections mean no corrections; malformed existing corrections fail visibly—preserve the file for recovery, then repair it. Browser edits alone never save into the workspace; keep the downloaded JSON until imported. Refresh, map generation and reindexing preserve corrections, and reindexing refuses to orphan IDs. Rebuild the Atlas after changing reference data.

Agent visual assessments are a separate complete-set import:

```sh
python3 tools/references/references.py import-reviews .local/references/reviewed-positions.json
python3 tools/references/references.py map
```

Use the tool's review schema and existing private `reviews.json`: each photo has separate position/heading status, confidence, reasons, evidence and unresolved components. Only adjusted assessments carry non-null coordinates/degrees; low-confidence adjustments are rejected and uncertain components must remain flagged. Import does not change human corrections. Malformed reviews fail rather than resetting, and reindexing refuses orphaned review IDs. Browser correction downloads contain manual rows only. Model inspection requires owner authorization for the selected private scope, not merely permission to run these tools.

## Recover discovery inputs

Prefer cached metadata over library rediscovery:

```sh
python3 tools/references/references.py index --metadata .local/references/cached-exif.json
```

For relocated originals, add `--originals-root "$RESTORED_ORIGINALS"` with the chosen private directory. The tool remaps the suffix below `originals/`; it neither copies nor moves photos. Only if both index and cache are unavailable, identify the local library explicitly and use `index --photos-library "$PHOTOS_LIBRARY"`. This is the existing bounded read-only query, not permission to broaden discovery or inspect unrelated photos. Apple schema changes fail visibly. Missing originals and unexpected candidate counts are reported rather than discarded.

Exit 0 means completion; index/status/refresh/proxies also require the expected available set. Exit 1 means incomplete inputs, conversion failure or missing inventory roots; exit 2 means input/tool error. Map generation and correction import can use cached data without available originals.

For asset discovery, `python3 tools/references/references.py inventory` writes `.local/references/inventory.json`; CLI root overrides support relocated raw/working/runtime directories. This is a filename/size inventory, not material or visual approval. Follow the [Blender guide](assets/blender-workbench.md) for asset use.

## Private phone access

Use only the owner-authorized bounded Atlas server, never a generic repository-root server:

```sh
python3 tools/blueprint/atlas.py serve --port 4184
tailscale serve status
tailscale serve --bg --https=9443 http://127.0.0.1:4184
```

First confirm the HTTPS port is unused and preserve other Serve routes. Open the address printed by Tailscale on the connected phone. The endpoint follows the existing tailnet policy; it is not individual login or a public link. Never use Funnel. The Mac must stay awake and online.

The loopback server allowlists the Atlas and only raster/proxy files referenced by its current `site-local.json`; unknown paths, symlinks, browsing and writes are refused. It excludes originals, raw rasters, editor and metadata sidecars. The private page still embeds notes and positions. Page/file allowlists are snapshotted at startup: rebuild data, then restart the server after corrections.

An existing optional local session job has private configuration/logs in `.local/atlas-mobile/`; it is not a login item. If using that job rather than the interactive server:

```sh
launchctl kickstart -k gui/$(id -u)/local.hedwig.private-atlas
# After logout/restart, reload the existing configuration instead:
launchctl bootstrap gui/$(id -u) "$PWD/.local/atlas-mobile/local.hedwig.private-atlas.plist"
```

End only this endpoint with `tailscale serve --https=9443 off`; stop the interactive server or unload the existing job with `launchctl bootout gui/$(id -u)/local.hedwig.private-atlas`. Do not reset unrelated Tailscale services.

## Privacy boundary

Original photos, proxies, galleries, placements, manifests, corrections, review evidence and verbatim owner notes remain private. Metadata stripping does not remove visible faces, inscriptions, portraits, plates or private property. Preparation permission is not model-inspection or publication permission. Use synthetic imagery for routine browser workflow checks unless private inspection is authorized.

Keep these files outside Git, `public/`, Vite and general repository-root HTTP serving. Git ignore is not access control. The bounded Atlas endpoint above is the authorized private-viewing exception, not public hosting. A fresh clone lacks the private workspace; Git push and regenerated proxies are not backups. Recovery and preservation rules have one owner: the [Blender guide](assets/blender-workbench.md#source-preservation-and-recovery).
