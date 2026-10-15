# Hedwig

A Three.js project aiming to reconstruct **Neuer Friedhof, Bruchköbel**, faithfully at dusk/night. The next milestone is a beautiful, walkable environment, not the former gameplay MVP.

**Current app:** a working look-development sandbox with sky/stars/fog, HDRI lighting, first-person inspection, debug GUI, flat grass and one Draco street lamp. The map, terrain and collisions are not implemented in the scene yet. See [the active plan](docs/asset-integration-plan.md) for accepted scope and [readiness](docs/readiness.md) for preparation evidence and gaps.

## Start from the repo root

Use Node 22.12+ or Node 24+ as declared in `package.json` (verified here with Node 24.15.0 / npm 11.20.0).

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. The server is loopback-only, uses a fixed port and does not automatically open a browser. Stop it with Ctrl+C. `npm run build` creates `dist/`; `npm run preview` serves that build at <http://127.0.0.1:4173>. Neither command deploys anything.

Click the scene for mouse capture; WASD moves, Shift sprints, F toggles the flashlight and Esc releases the mouse. The GUI supplies lighting presets and lamp controls. Use the coding agent's available native browser tooling for inspection.

For a reproducible Chrome/CDP input check, start `npm run preview` after building, then run `npm run browser:smoke` in another terminal. For the dev server, use `npm run browser:smoke -- http://127.0.0.1:3000/`. It checks asset loading, mouse capture, trusted mouse movement and Escape at a 1280 × 720 render buffer, and saves screenshots/report under `.local/browser-smoke-*`.
The check starts an isolated visible Chrome with a temporary profile and closes both afterward; it never uses personal browser profiles. `CHROME_BIN` overrides the default macOS Chrome executable. The caller owns the dev/preview server. The check does not prove all WASD speeds or full-level performance.

## References and Blender

```sh
open tools/map/index.html                # offline map; no external tiles
npm run references -- status             # local photo/source availability
npm run references -- inventory          # raw, working and runtime file inventory
open .local/references/index.html        # private local photo gallery on this Mac
npm run references -- map                # private photo map with metadata and corrections
open .local/references/map.html
npm run blender:version
npm run blender:smoke                    # disposable CPU render + Draco round trip
```

The source map is included in Git. This prepared Mac also has **98 JPEG proxies plus their GPS, heading, altitude and camera metadata in ID-linked private JSON sidecars** under `.local/references/`; the HEIC originals stay unchanged in Photos. The JPEGs themselves omit embedded metadata, not the reference dataset. The private photo map supports reviewing and correcting positions without overwriting original measurements. **A fresh clone does not contain these private files or the purchased raw pack.** [Local references](docs/local-references.md) explains commands, correction import, source paths, accuracy limits and missing terrain/aerial inputs. [Blender workbench](docs/assets/blender-workbench.md) documents executable discovery, read-only source inspection and explicit collection export. No MCP service, add-on, Python virtual environment or VPS is required.

## Where things belong

| Path | Role |
| --- | --- |
| `src/main.js` | Composition root for the current runtime modules. |
| `src/core/`, `src/atmosphere/`, `src/world/` | Renderer, sky/grading, lighting/flat ground and HDRI management. |
| `src/assets/` | Shared loaders and street-lamp Dev Room. |
| `src/gameplay/PlayerController.js` | Inspection movement/flashlight, not a gameplay system. |
| `src/ui/`, `src/config/`, `src/loop/` | Debug controls, defaults and animation loop. |
| `data/cemetery_final.geojson` | Unchanged OSM-derived source; [interpretation contract](data/CLAUDE.md). |
| `tools/` | Offline map, private-reference commands and Blender scripts. |
| `assets/source/raw/`, `assets/source/working/` | Ignored local marketplace and Blender sources; not runtime assets or a backup. |
| `.local/` | Ignored private references, derived previews/exports and smoke evidence. |
| `public/` | Redistributable runtime files; copied wholesale into the production build. |

The Vite dev server denies `.local/`, `.cache/`, source directories, private docs and Photos-library paths. Do not serve the entire repo with a generic HTTP server, put private references in `public/`, or assume `.gitignore` protects HTTP access.

## Documentation entry points

- [AGENTS.md](AGENTS.md): single policy entry for coding agents; `CLAUDE.md` points there.
- [Active plan](docs/asset-integration-plan.md): direction, implementation sequence and human decisions.
- [Readiness](docs/readiness.md): analysis, changes, exercised checks and known limits.
- [Source/reference access](docs/local-references.md) and [asset pipeline](docs/assets/pipeline-guide.md): use for reference and content work.
- [Backlog](docs/backlog.md): secondary risks/deferred work, not a competing roadmap.
- `docs/archive/`, old lamp notes and lore: historical context, not current production instructions.

## Verification and release limits

After a runtime change, build and inspect the actual browser: assets/decoder requests, console, lamp, ground, presets, input and resize as applicable. After tooling changes, run the affected CLI against disposable outputs and check source safety. `npm audit` covers package advisories, not visual correctness. There is no general unit-test suite or global auto-format hook; the Blender smoke includes a saved-frame export regression check.

60 FPS and ≤400 draw calls are provisional goals. A tiny scene on an M3 Max is not proof of a full cemetery on mid-range hardware. Record device, browser, render-buffer resolution and workload with performance results.

Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. The owner confirmed the cemetery pack's purchase and commercial permission. Existing grass/HDRI provenance and the intended code licence still need release review (`package.json` retains historical ISC metadata; no code licence grant is established here). Private reference photos and readable personal details are not publication assets.
