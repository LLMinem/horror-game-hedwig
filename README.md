# Hedwig

A Three.js project aiming to reconstruct **Neuer Friedhof, Bruchköbel**, faithfully at dusk/night. The next milestone is a beautiful, walkable environment, not the former gameplay MVP.

**Current app:** the entrance and funeral-hall pilot is the default review scene. It has a textured hall/tower exterior, local terrain, connected paving, instanced vegetation and ground-following movement. Micha considers it a useful foundation, not finished modeling. Jagged paths and unexpected collision boundaries remain open in [#15](https://github.com/LLMinem/horror-game-hedwig/issues/15). Neutral/dusk and fixed views are available; the lamp sandbox remains at `?mode=sandbox`. See [the active plan](docs/asset-integration-plan.md) and [verification evidence](docs/readiness.md).

## Start from the repo root

Use Node 22.12+ or Node 24+ as declared in `package.json` (verified here with Node 24.15.0 / npm 11.20.0).

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. The server is loopback-only, uses a fixed port and does not automatically open a browser. Stop it with Ctrl+C. `npm run build` creates `dist/`; `npm run preview` serves that build at <http://127.0.0.1:4173>. Neither command deploys anything.

The default URL and `?mode=pilot` open the pilot. Click the scene for mouse capture; WASD moves, Shift sprints, F toggles the flashlight and Esc releases the mouse. The review panel selects the approach, gable, entrance, tower, cemetery gate and overhead views. Overhead is inspection only, so select a ground view or "Walk from entrance" to resume walking. Neutral mode removes fog for comparison. The retained GUI supplies lighting controls, and `?mode=sandbox` opens the lamp scene.

For a reproducible Chrome/CDP walkthrough, start `npm run preview` after building, then run `npm run browser:smoke` in another terminal. For the dev server, use `npm run browser:smoke -- http://127.0.0.1:3000/`. The pilot check covers the connected route, terrain/render agreement, hall barriers, sliding, limits, reset and actual WASD/sprint input at a 1280 × 720 render buffer. It captures neutral/dusk views and route performance under `.local/browser-smoke-*`. Pass a URL ending in `?mode=sandbox` for the retained sandbox input check.
The check starts an isolated visible Chrome with a temporary profile and closes both afterward; it never uses personal browser profiles. `CHROME_BIN` overrides the default macOS Chrome executable. The caller owns the dev/preview server. The measurements cover the pilot only, not the full cemetery.

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

The source map is included in Git. This prepared Mac also has **98 JPEG proxies plus their GPS, heading, altitude and camera metadata in ID-linked private JSON sidecars** under `.local/references/`; the HEIC originals stay unchanged in Photos. The JPEGs omit embedded metadata, not the reference dataset. **A fresh clone does not contain the private files, acquired geodata or purchased raw pack.** [Local references](docs/local-references.md) explains commands, correction import and source safety. [Blender workbench](docs/assets/blender-workbench.md) documents executable discovery, read-only source inspection and collection export without an add-on or MCP service.

The individual review covers every photo, and Micha's imported corrections are now authoritative wherever supplied. The private photo map keeps original observations, agent estimates and human corrections separate. See [owner corrections](docs/local-references.md#owner-corrections-and-blueprint-preparation).

The [active plan](docs/asset-integration-plan.md) schedules agent-tooling improvements, natural walking over supported ground and a [whole-cemetery ground foundation](https://github.com/LLMinem/horror-game-hedwig/issues/19) before further detailed modeling. Concrete tasks and status live in [GitHub Issues](https://github.com/LLMinem/horror-game-hedwig/issues); the repo keeps direction, workflow contracts and verification records. Read [Blueprint preparation](docs/blueprint-preparation.md), the current [readiness record](docs/readiness.md), and use `.local/blueprint/atlas.html` for reference comparison. Reuse existing setup evidence. The rejected 113 agent interpretations remain excluded; the 13 photo-index groups are navigation aids, not trusted work cards.

The guide defines the next agent's context package, separate source/browser acceptance gates and the private rejection archive. Rebuilding requires the private `photo-index.json`, acquired rasters and photo inputs, not the rejected traces or old `photo-evidence.json`. Opening the prepared atlas requires only a browser. A fresh clone lacks the private pack, and a Git push does not back it up.

## Where things belong

| Path | Role |
| --- | --- |
| `src/main.js` | Composition root for the current runtime modules. |
| `src/core/`, `src/atmosphere/`, `src/world/` | Renderer, atmosphere, shared lighting, pilot loading/movement and retained sandbox ground. |
| `src/assets/` | Shared loaders and street-lamp Dev Room. |
| `src/gameplay/PlayerController.js` | Grounded first-person movement, view transitions and flashlight. |
| `src/ui/`, `src/config/`, `src/loop/` | Debug controls, defaults and animation loop. |
| `data/cemetery_final.geojson` | Unchanged OSM-derived source. The bounded pilot uses its projected derivative; see the [interpretation contract](data/CLAUDE.md). |
| `tools/` | Offline map, private-reference commands and Blender scripts. |
| `assets/source/raw/`, `assets/source/working/` | Ignored local marketplace and Blender sources; not runtime assets or a backup. |
| `.local/` | Ignored private references, derived previews/exports and smoke evidence. |
| `public/` | Redistributable runtime files; copied wholesale into the production build. |

The Vite dev server denies `.local/`, `.cache/`, source directories, private docs and Photos-library paths. Do not serve the entire repo with a generic HTTP server, put private references in `public/`, or assume `.gitignore` protects HTTP access.

## Documentation entry points

- [AGENTS.md](AGENTS.md): canonical policy entry for coding agents; root `CLAUDE.md` is a symlink to it. Git checkpoint and pilot branch are documented there.
- [Active plan](docs/asset-integration-plan.md): accepted direction, next-session order and scope.
- [Readiness](docs/readiness.md): analysis, changes, exercised checks and known limits.
- [Source/reference access](docs/local-references.md) and [asset pipeline](docs/assets/pipeline-guide.md): use for reference and content work.
- [GitHub Issues](https://github.com/LLMinem/horror-game-hedwig/issues): work packages, acceptance criteria and status. Items labeled `deferred` are outside the next session.
- `docs/archive/`, old lamp notes and lore: historical context, not current production instructions.

## Verification and release limits

After a runtime change, build and inspect the actual browser: assets/decoder requests, console, lamp, ground, presets, input and resize as applicable. After tooling changes, run the affected CLI against disposable outputs and check source safety. `npm audit` covers package advisories, not visual correctness. There is no general unit-test suite or global auto-format hook; the Blender smoke includes a saved-frame export regression check.

60 FPS and ≤400 draw calls are provisional goals. A tiny scene on an M3 Max is not proof of a full cemetery on mid-range hardware. Record device, browser, render-buffer resolution and workload with performance results.

Map data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Pilot terrain derives from Hessen HVBG DGM1 under [dl-zero-de/2.0](https://www.govdata.de/dl-de/zero-2-0), with a locally levelled hall platform. The owner confirmed the cemetery pack's purchase and commercial permission. Existing sandbox grass/HDRI provenance and the intended code licence still need release review (`package.json` retains historical ISC metadata; no code licence grant is established here). Private reference photos and readable personal details are not publication assets.
