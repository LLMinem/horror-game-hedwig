# Repository readiness

## Assessment

The entrance/hall pilot at `981fd64` is a useful foundation according to Micha's review, not finished or fully accurate modeling. Jagged path sections and irregular invisible barriers remain open; suspected foliage collision has not been established. The approved next work covers agent tooling, movement over all supported ground and a whole-cemetery ground foundation, as defined by the [active plan](asset-integration-plan.md). These changes are not implemented yet. Separate final source/browser art acceptance is not recorded. [Blueprint preparation](blueprint-preparation.md) owns the source contract, and the rejected 113 agent interpretations remain excluded.

The historical October 10 assessment below started from `main` at `3ec81deef975981d46279e4be8480308638905b2`. It used the October 4 strand note, revival handoff, technical readiness report and linked map/photo/material research. That preparation made no changes to `src/`, the canonical GeoJSON, existing Blender sources or the shipped lamp, and performed no commit, upload or deployment. Those statements describe that historical task, not later integration activity.

## Historical preparation findings

| Area | Initial problem | Preparation |
| --- | --- | --- |
| Agent entry | `AGENTS.md`, `CLAUDE.md`, README and Claude commands promoted gameplay, obsolete refactors or ignoring map data. | One policy entry in `AGENTS.md`, a current repo plan, concise startup/resume prompts and revised documentation agents. Historical lore and lamp instructions are explicitly historical. |
| Sources | Photo counts were documented, but the per-original index was not recoverable from the known cache. The map viewer lived in the Vault/Downloads. | A bounded read-only Photos query recreated a private manifest for 98 originals. All 98 JPEG proxies and a local gallery now exist. The offline map is in `tools/map/index.html`. |
| Blender | Blender was installed, but not on PATH. A global 4.5 export preset used an obsolete repository path and UI selection. | Explicit repo launcher, read-only inspection, disposable capability smoke and named-collection export. No global settings changed. |
| Node tooling | Many unused GIS/helper packages were direct dependencies. Version requirements and reliable root commands were unclear. | Retained Three.js 0.179.1 and lil-gui 0.20.0; kept Vite as a dev dependency and updated it to 7.3.6 with current compatible transitive packages. Added Node requirements and npm entry commands. |
| Local automation | A tracked machine-local Claude configuration invoked unpinned whole-tree formatting and an obsolete MCP prompt hook that logged prompts. | Removed the obsolete tracked configuration/hook. Future machine-local settings are ignored; no replacement daemon or automatic formatter was introduced. |
| Private files | Git ignores did not establish an HTTP boundary, and the whole working-source tree was not ignored. | `.local/` and working sources are ignored; Vite explicitly denies source/private paths and binds to loopback. `public/` remains the deliberate publication boundary. |

The workstation's npm minimum-release-age policy rejected Vite 7.3.7 because it was published on October 6. The preparation respected that policy and selected 7.3.6 rather than weakening global npm settings. Updating compatible transitive dependencies removed the advisory findings observed during installation.

## Historical preparation inventory

[Local references](local-references.md) contains source access and privacy rules. The following inventory describes preparation before pilot implementation, not the current runtime content:

| Material | Available locally | In the browser runtime |
| --- | --- | --- |
| Map | 140 features, including 96 path segments and five building/storage footprints. | Not rendered. The separate offline viewer supports inspection. |
| Private photos | 98 HEIC originals, about 548 MB; GPS and true-north heading in all 98. Private manifest and 98 JPEG proxies, about 114 MB, are ready. | None, intentionally. |
| Purchased pack | 24 FBX and 305 PNG textures, including PBR map families. | One exported lamp only. |
| Blender sources | Three `.blend` files and six saved backup versions. | Sources do not belong in the build. |
| Ground textures | Four JPEG files, colour/normal at 1K and 2K. | The scene loads the 2K pair. |
| Environment lighting | Six HDR files, three environments at 1K and 2K. | The selected 2K environment is loaded. |
| KTX2 | Decoder/loader support exists; no KTX2 assets or established converter are supplied. | None. |
| Terrain/aerial evidence | Official 20 cm TrueDOP RGB/CIR and 1 m numeric DGM/DOM, registered across a 520 m square; source-only private atlas and metric frame. | None; acquired for preparation only. |

Photo metadata does not prove complete coverage or calibrated pose. The initial October10 preparation did not visually interpret photos; the later authorized reviews are recorded below. Raw assets, photographs and private derived maps remain outside Git and the web build.

## Historical pre-pilot code assessment

The preparation assessment found the existing module split adequate for bounded implementation. It recommended retaining the renderer, atmosphere and shared loaders while replacing the flat sandbox assumptions. A framework migration or ECS was not required.

The following were pre-pilot change points, not a current task list. Later implementation and verification are recorded below:

- **Site geometry and movement:** `World.js` constructs a flat plane and sample props. `PlayerController.js` fixes camera height and clamps a rectangle. Terrain sampling, placement and collision must share one site frame and height contract. No existing module supplies that contract.
- **Content loading and lifecycle:** `main.js` only logs lamp readiness/failure. `Environment.js` handles HDRIs separately and has no request-order guard for rapid switches. Its material traversal assumes a single material, and PMREM render-target lifetime needs review when asset loading is expanded. The explicit environment binding is a repo convention, not a general Three.js r179 requirement.
- **Reproducible review:** star/test-object initialization uses `Math.random()`. The GUI is useful for look development, but named views and seeded variation are still needed for stable art comparisons. The loop also has no stop/disposal lifecycle, which matters if later work introduces scene switching.
- **Performance:** the player allocates vectors in its update path, and the moon shadow frustum covers only a local area. Address those with movement/world expansion rather than changing visual behavior during preparation. Cloned props still cost draw calls; repeated site content will need instancing or another measured batching choice.

The existing content is also large for such a small scene. The browser resource observation showed roughly 18.4 MB for the lamp GLB, 7.1 MB for the active HDRI and 16.6 MB for the two grass maps, before decoder/code overhead. Those are local transfer observations, not an Internet loading benchmark. The pack provides asset-specific texture sets, but an approved material library for the actual site's paths, walls, grave types and vegetation still needs reference review. Optimize selected content after that review rather than batch-converting every source texture during preparation.

These are code-inspection findings and future change points, not reproduced failures of the present sandbox. No gameplay scaffold was added. The current grass/lamp scene remains the working baseline.

## Historical technical verification

The results below record the earlier readiness work. They are not new verification of the corrected atlas, visual acceptance of cemetery geometry or approval to model from the rejected traces.

| Check | Observed result | Limit |
| --- | --- | --- |
| Clean install/build | `npm ci --ignore-scripts --no-fund` and `npm run build` succeeded on Node 24.15.0, npm 11.20.0. JS bundle 722.82 kB, gzip 200.01 kB. | The >500 kB chunk warning remains. No full-level loading claim. |
| Package audit | `npm audit` reported zero vulnerabilities after the compatible tooling updates. | An advisory snapshot, not a complete security audit. |
| Dev server/browser | Root `npm run dev` starts Vite 7.3.6 at `127.0.0.1:3000`. Ordinary Chrome rendered lamp, grass, stars and GUI; console reported lamp and HDRI ready, with no page errors in the startup check. | No reconstructed level or visual art acceptance. |
| Browser timing | Chrome 155 / ANGLE Metal / Apple M3 Max, fixed 1280 × 720 render buffer, DPR 1: 241 frame intervals over about two seconds, mean 120.02 FPS, p95 10.1 ms. | Short stationary `requestAnimationFrame` observation. No new draw-call measurement, GPU-cost isolation or mid-range target proof. |
| Repo browser smoke | `npm run browser:smoke -- http://127.0.0.1:3000/` and default `npm run browser:smoke` against the production preview passed. An isolated Chrome/profile loaded the scene, captured the mouse, delivered trusted movement and released capture with Escape. Screenshots showed the changed view. The render buffer was 1280 × 720; lamp, HDRI, both textures and Draco decoder returned 200, with no page exceptions. | Full WASD/sprint speeds and art quality are not asserted. The pre-existing missing favicon returns 404 and is retained in the report, not treated as an asset-load failure. |
| Offline map | Opened through `file://`; 140 features, layer toggle/restore and actual funeral-hall selection worked. Zero resource requests, no page errors. Embedded map matched canonical GeoJSON after removing viewer annotations. | Map snapshot only, not terrain or runtime integration. |
| Photo tools | Status and inventory matched expected counts; cached-index recovery and unknown-ID rejection worked. All 98 proxies decoded, longest dimension at most 1600; no source EXIF/GPS/XMP/IPTC groups found in any proxy. | Metadata stripping does not remove visible inscriptions/faces or authorize publication. |
| HTTP source protection | Direct, `?raw` and `/@fs` requests for the private manifest returned 403. Raw texture and source-blend requests also returned 403. No private/source directories appeared in `dist/`. | Does not protect a separately started generic repo-root HTTP server or deliberate copying into `public/`. |
| Blender smoke | Blender 5.2.2 LTS rendered a 32 × 32 CPU image, exported Draco and reimported one mesh with twelve triangles and one-metre dimensions. The image was inspected. | GPU rendering and artistic material fidelity remain unproved. `Material.use_nodes` emits a Blender 6 deprecation warning on the current successful path. |
| Collection exporter | A disposable two-mesh fixture retained hidden members, excluded unrelated geometry and preserved positions/dimensions. Existing-output refusal and source-directory refusal worked. | Not a full glTF validator or material bake system. |
| Export frame regression | Independent review found the exporter's default frame-zero behavior. Reproduction exported x=0 instead of the saved frame's x=2; `export_current_frame=True` fixed it. The permanent smoke now checks the keyed frame-10 transform. | Static export freezes the selected frame; animation export is outside this tool. |
| Existing Blender source | Read-only opening of `street-lamp-simple.blend` succeeded; metre unit scale and all five relative texture paths were valid. | Hidden alternates require deliberate export-collection preparation. Other source scenes and visual source/export equivalence were not tested. |
| Source preservation | Eleven SHA-256 values for existing blends/backups, GeoJSON and the shipped GLB stayed unchanged across tooling checks. | Does not constitute an independent backup. |

Reference/privacy and Blender tooling received separate read-only code reviews. The reference review found no actionable defect; the Blender review's saved-frame finding was reproduced and fixed before completion.

`tools/browser-smoke.mjs` reuses the earlier direct-CDP procedure without its cache-specific paths. Run it against an already running local Vite server or production preview. It needs Node and ordinary Chrome, not a browser-testing package. `CHROME_BIN` selects another executable. The tool creates and removes an isolated temporary browser profile and saves only screenshots and a JSON report under `.local/browser-smoke-*`; the caller remains responsible for stopping Vite. Evidence includes `.local/browser-smoke-wHogRW/report.json` for the final production-preview check and `.local/blender-smoke/run-m2pxd3xm/report.json` for the final Blender regression smoke.

Final housekeeping removed disposable source fixtures and stopped the preparation dev/preview servers. Browser smoke processes closed their temporary profiles; private reference copies and local test evidence remain available. Git ignore checks covered 109 private/source paths, with no private source files tracked. Local Markdown links in the eleven current entry/workflow documents resolved.

## Current session handoff

Use `README.md`, the [active plan](asset-integration-plan.md) and its selected GitHub Issue for current work. The first pilot implementation is complete as a checkpoint; the remaining path/collision observations and agent-tooling limits are not dismissed by that result. Reuse existing source/setup evidence. Fresh clones still need the private workspace or documented recovery steps.

## Follow-up: photo metadata and authoring direction

The original JPEG wording obscured an important distinction: only embedded proxy metadata were removed; the ID-linked private manifest retained GPS, heading, altitude and camera observations. The reference CLI now refreshes known originals' metadata explicitly, generates a private offline photo-position editor, validates/imports manual corrections and exports effective placements as GeoJSON. Original observations and user corrections remain separate. See [the reference workflow](local-references.md#photo-position-workflow-verification) for exercised checks and commands.

Before the owner import, the dataset had 98 metadata-linked photos: 50 with reported horizontal error ≤5 m and 48 above that provisional threshold. Neither group was survey-verified. Camera heading is useful but not calibrated pose; phone altitude is not terrain. No photo locations were confirmed on Micha's behalf.

Photo positioning/coverage review now precedes section selection. Site geometry should preferably be authored from references; complex vegetation may reuse the pack, and additional suitable textures/models remain an option. Existing lamp sources and sample props are disposable experiments, not production requirements. The working runtime has not been changed or stripped prematurely.

Browser choice belongs to the coding agent's native environment. The existing direct Chrome/CDP smoke remains optional and unchanged. Repository-local browser-product recommendations were removed; no corresponding repo-local skill installation or skills lockfile was present to uninstall. Global installations/settings were left untouched.

## Authorized visual review, 2026-10-15

The following review counts predate the owner import and are superseded by the current correction records. They do not establish object geometry or visual acceptance.

Micha requested visual review of every private photo against the map and capture sequence. All 98 were inspected individually. The private review layer applies five estimated camera positions and seven estimated headings, and leaves nineteen photos flagged for owner review. Original measurements and human corrections remain separate from those estimates.

The map now identifies the pending component and shows a reason for each assessment. Twelve Python tests passed, and the actual Chrome page decoded all 98 previews with the expected review filters. Synthetic browser export/import and regeneration preserved human precedence and unresolved flags. Five sideways portrait proxies were also corrected by baking image orientation before metadata removal.

All original HEIC files, the metadata manifest/cache and canonical GeoJSON retain their pre-review SHA-256 values. No human confirmation was fabricated. The [reference workflow](local-references.md#visual-review-and-owner-follow-up) describes the schema and remaining owner work. No scene production or canonical map corrections were performed.

## Historical blueprint preparation, 2026-10-16

The owner correction import preserved 91 rows and 51 numeric headings. The first atlas contained all 98 photo links, 14 verbatim owner notes, 140 unchanged source features and 113 separate interpreted features. It also presented thirteen regional work cards. Micha's subsequent rejection supersedes those interpretations and cards as modeling guidance. The current atlas retains the sources and corrected photos, with 13 navigation-only photo-index groups.

Official TrueDOP RGB/CIR and numeric DGM1/DOM1 were acquired without accounts, paid orders or browser bot-check workarounds. Site imagery is from August 2025; eastern RGB context is from May 2023. The April 2020 height epoch was tied to actual WCS arrays by exact comparison against official downloadable tiles. [Blueprint preparation](blueprint-preparation.md) owns the detailed source and coordinate contract.

The first builder ran successfully, and the twelve existing reference tests passed. Numeric integration checks covered human precedence, notes, photo references, raster pixels without local resampling, terrain row direction/height offset, geometry validity and geographic export. All 98 original HEIC hashes, original metadata/cache and canonical GeoJSON matched their earlier preservation baseline. Those technical results never established that the traced objects matched the cemetery.

The first visible Chrome atlas loaded every raster and decoded all 98 photo previews. Photo filters returned 91 confirmed, 7 unconfirmed, 4 pending and 14 with notes. Region-card links, feature inspection, zoom, keyboard pan and pointer drag were exercised. Desktop and 390 px-wide layouts were inspected without horizontal overflow. Direct Chrome CDP capture/input supplied interaction evidence after other helpers timed out. Geometry-review wording in the old reports is superseded by Micha's rejection, regardless of the earlier checks.

The rejected traces, old plans/SVG, full `photo-evidence.json` and historical reports belong under `.local/blueprint/archive/rejected-interpretation-2026-10-16/`. They are historical records, not optional modeling inputs. A rebuild uses private `photo-index.json` instead of old interpretation/evidence inputs. A fresh clone is insufficient, and Git push does not back up the ignored private pack.

No Blender scene or runtime implementation was part of that preparation. An independent backup restore, a human-selected pilot brief and separate source/browser acceptance remain prerequisites.

## Source-only correction, 2026-10-16

The rebuilt atlas and plan sheets contain only the 140 projected canonical features. Their geometry and properties exactly match the source subset of the prior atlas, and all 98 effective photo records are unchanged. Eleven checksums matched across the correction, covering canonical GeoJSON, human corrections, original photo metadata, acquired source rasters and regenerated RGB/CIR PNGs and terrain CSV. The rejected geometry inputs and export are absent from active paths. Historical material is preserved in the rejection archive, with the owner's screenshot and a withdrawal notice.

The builder completed without the rejected inputs, and all twelve existing reference tests passed. In visible Chrome, the source layer started enabled and could be hidden completely. The interpretation control was absent. Regional photo navigation, an owner's verbatim note, source-object selection and framing were exercised. All five raster images returned status 200, and no page exceptions were recorded. The regenerated atlas, PNG sheet and SVG were visually inspected for source-only presentation. Thirty-seven local documentation links resolved.

The private record is `.local/blueprint/correction-verification.json`; the browser capture is `derived/browser-source-only.png` beneath the same directory. These checks establish the withdrawal and preservation of inputs. They do not approve individual GeoJSON features, photo-index associations or future model accuracy.

## Blender pilot planning, 2026-10-16

Micha initially requested workspace exploration and a reasoned pilot plan before construction. That planning pass proposed the bounded entrance/hall section, local infrastructure followed by recognizable architecture/materials, and a walkable browser review in the same authoring pass. The subsequent approval is recorded below. Plan approval is not approval of a yet-unbuilt model's appearance.

Planning inspected the unannotated aerial overview and nine selected ground photos directly, along with source features, the active workflow documentation, existing Blender reports and current runtime movement/asset seams. The source hall's principal polygon edges are approximately 15.7 and 27.7 m, and the source approach from the entrance gate to its first bend is approximately 35.7 m. Those calculations do not establish field dimensions, path widths or building height. Generic asphalt tags do not override visible paving.

The existing CPU render, Draco round trip, collection export and browser-input checks were not rerun. One uncovered authoring capability was exercised with Blender 5.2.2 LTS: create a disposable one-metre plane with UVs, a material and a packed generated image; save a new `.blend`; reopen it in a separate Blender process. Dimensions, position, unit scale, UVs, packed pixels, material link and custom revision metadata all survived. Both processes exited zero with empty stderr. The fixture opened no original sources.

The new private record is `.local/blender-smoke/authoring-bd2g6oh1/report.json`, alongside `disposable.blend`. This is save/reopen and local permission evidence only, not a rendered appearance test, GPU proof, independent backup or browser acceptance. No global Blender preferences, permissions or installations were changed. No runtime code, canonical geometry, existing source blends or marketplace originals were changed.

At the planning checkpoint, independent backup restoration remained outstanding. The planning pass did not repeat the earlier unavailable Time Machine check or treat its same-disk test file as a backup. The later owner-selected backup and its restoration are recorded below.

## Pilot approval and backup, 2026-10-16

Micha explicitly approved the entire entrance/hall pilot plan and the required runtime changes. He asked for implementation to begin in the next session and selected a project subfolder under `/Users/meeq/.backups` for backups. The next agent may proceed through the approved first review checkpoint without another scope/permission question. Broader expansion, public release and deployment remain excluded. His subsequent Git-workflow instruction authorizes atomic commits during work and pushes at session end; follow root `AGENTS.md`.

The pre-pilot snapshot is `/Users/meeq/.backups/horror-game-hedwig/pre-pilot-2026-10-16-shrwd9cf/`. Its layout is:

- `snapshot/project/` contains the project working tree and Git metadata, including uncommitted planning/approval documents, original GeoJSON, runtime assets, raw/working marketplace sources, private references, acquired rasters, rejected-history archive and existing smoke evidence.
- `snapshot/photo-originals/` contains only the 98 manifest-listed HEIC originals, with their suffix directories below the original Photos `originals/` root preserved. It is not a copy of the whole Photos library.
- `manifest.json` records SHA-256 checksums and exclusions. `verification.json` records the completed restore/usability checks. Both are private backup records, not runtime or repository assets.

The initial copy and full restore verified 1,048 files, approximately 2.95 GB of payload, against source and backup SHA-256 values. A separate restore-check directory was populated entirely from the snapshot. The restored reference CLI reindexed all 98 backed-up originals without changing human corrections. One restored HEIC decoded successfully through `sips`. Blender 5.2.2 opened the restored lamp source through the restored workbench; all five image dependencies resolved inside the restored project tree. No original source was opened for editing. The disposable restore-check directory was removed after verification; the snapshot and reports remain.

Reproducible dependencies and build caches are excluded: root `node_modules/`, `dist/`, `.cache/`, `.local/blueprint-venv/` and Python `__pycache__/` directories. Finder `.DS_Store` metadata is not part of content verification. Existing docs specify `npm ci` and the pinned blueprint environment recreation when recovery requires them. No installed applications, entire Photos library, unrelated home files or global configuration are backed up.

For recovery, copy `snapshot/project/` into a new working location and copy `snapshot/photo-originals/` into a durable private originals directory. Never run authoring or reindexing inside the snapshot itself. In the restored project, run `python3 tools/references/references.py index --metadata .local/references/cached-exif.json --originals-root /absolute/path/to/restored/photo-originals`. That relocation path was exercised in the disposable restore and retained the owner corrections.

The backup resides on the same filesystem as the working project. It protects against working-copy mistakes but does not provide independent hardware or off-device protection. Micha's chosen local arrangement replaces the earlier backup-destination gate for this pilot; it is not evidence that an off-device restore succeeded. No scheduled backup was installed. Save later reviewable `.blend` revisions and dependencies in new snapshots under the same project backup root, without overwriting this baseline.

The initial session closure changed only documentation and private backup/evidence files. At that point no pilot modeling, runtime implementation, commit, push or deployment had been performed.

### Version-control handoff

Micha subsequently requested commits and a push of the completed preparation, an annotated pre-implementation checkpoint, and a separate implementation branch. The checkpoint is named `checkpoint/pre-entrance-hall-pilot`; implementation belongs on `feat/entrance-hall-pilot`. Root `AGENTS.md` owns the Git workflow, and root `CLAUDE.md` is its symlink rather than a second policy file. The private backup above remains immutable and predates this Git handoff; Git does not replace snapshots of private sources.

## Initial pilot implementation check, 2026-10-16

The first source checkpoint is `r02/entrance-hall.blend` under `assets/source/working/entrance-hall-pilot/`. Its separate `entrance-hall-review.blend` includes vegetation for Blender inspection. The reusable vegetation source is `vegetation-r04/vegetation-r04.blend`. Sources, packed private reference planes, texture copies and authoring inputs remain ignored. The runtime contains only the two selected GLBs and `walk.json` under `public/assets/models/pilot/`.

The source authoring scripts preserved the canonical hall footprint and site frame. They use the actual DGM sample centres and one standard Blender-to-glTF axis conversion. The authored hall platform and paving share their ground calculation with movement. The pilot includes the approach, forecourt and a connected walk around the hall. It does not reconstruct the surrounding grave fields or interior.

The first actual Chrome route check passed in `.local/browser-smoke-IqU5Gg/report.json`. It crossed 21 route stations and compared 61 decoded terrain samples with the movement sampler, with a maximum discrepancy of 0.00272 m. The check exercised hall collision, sliding, supported limits, overhead-to-walk reset, trusted WASD and sprint input, mouse look and Escape. Walk and sprint travelled 3.10 m and 4.61 m respectively during one-second input windows, including acceleration.

The first build passed with the existing large-chunk warning. The retained production-preview sandbox passed its input check in `.local/browser-smoke-cLfxMQ/`. Blocking the hall GLB request in the production preview produced a visible failure message, disabled the player and added no pilot or substitute scene. The private failure evidence is `.local/pilot/loading-error.json`.

The first source renders are in `.local/pilot/r02/`, and the matching browser views are in `.local/browser-smoke-IqU5Gg/`. The private aerial crop is `.local/pilot/aerial-pilot.png`. Source and browser materials need separate visual acceptance. The initial route timing overlapped source rendering, so it is not the final performance measurement.

No installation, Blender capability smoke, reference regeneration or backup-restore setup was repeated. New source authoring, selected FBX inspection, source renders, GLB export and the changed browser paths were exercised directly.

## Final pilot checkpoint and single QA, 2026-10-16

The review revision is `r05/entrance-hall.blend`, with `r05/entrance-hall-review.blend` for combined inspection and `vegetation-r06/vegetation-r06.blend` as the reusable vegetation source. All paths are under `assets/source/working/entrance-hall-pilot/`. Earlier revisions remain intact. The active plan records the selected scope, paths and unresolved estimates.

One read-only `gpt-6-astra` QA, with high reasoning, inspected the private atlas, nine relevant photos, aerial alignment, source renders and saved browser evidence. It did not perform an independent interactive browser run. Its report is `.local/pilot/qa-review.md`. All five bounded findings were addressed:

- Dense gable shrubs now have a smaller, ground-reaching opaque inner crown; masked leaf cards retain the close silhouette without losing the whole mass at distance.
- A framed diamond joins the sloping gable window bands, with a central facade joint and varied lead subdivisions.
- Roof courses follow the eaves; paving UVs follow the approach/hall frame instead of world axes.
- Tower lamellae overlap rather than leaving large gaps. A visible soil bed, stone edge and shrubs explain the existing tower obstruction.
- A dedicated dusk preset retains readable architecture. Isolated browser probes left the paving bands unchanged with normal strength zero but removed them when shadow receiving was disabled. Raising the pilot's shadow normal bias to 55 mm resolved that artifact without disabling normal maps or shadows.

The gate comparison view was added, and ground-view source cameras now share the browser's 55-degree vertical field of view. Final source renders and the same-extent aerial/overhead comparison are in `.local/pilot/r05/`; final neutral/dusk browser captures are in `.local/browser-smoke-DoagFO/`. Fix verification was performed by the implementation agent. There was no second QA round and no human art acceptance.

### Exercised runtime and measurements

`npm run build` passed. `npm run browser:smoke -- 'http://127.0.0.1:4173/?mode=pilot'` passed against the final production preview. It exercised 21 route stations, ground contact, 61 decoded terrain comparisons, closed hall collision, angled-wall sliding, gate barriers, supported limits, overhead reset, trusted mouse/WASD/sprint and Escape. The final input windows travelled 3.07 m walking and 4.62 m sprinting; they include acceleration. The maximum decoded-ground/sampler discrepancy remained 0.00272 m. Required assets returned HTTP 200, with no browser warnings or JavaScript errors. The earlier sandbox and blocked-GLB failure checks remain applicable; those paths were not changed by the QA fixes.

The live review panel was also exercised through actual buttons and the view selector: neutral gate view, dusk lighting, overhead forcing neutral inspection, and reset returning to the supported entrance spawn. The only HTTP 404 in the final trace was the browser's automatic `/favicon.ico` request, not an application asset.

Hardware: Apple M3 Max, macOS 25.6, Chrome 155, ANGLE Metal. Both neutral-route measurements ran without concurrent Blender rendering, with 453 frame samples each:

| Render buffer | CSS viewport / DPR | Mean frame interval | p95 frame interval | Maximum draw calls |
| --- | --- | --- | --- | --- |
| 1280 × 720 | 1280 × 720 / 1 | 8.33 ms | 9.90 ms | 24 |
| 3456 × 1838 | 1728 × 919 / 2 | 8.33 ms | 9.90 ms | 24 |

These are browser `requestAnimationFrame` intervals, approximately 120 Hz, not GPU timer-query results. The route uses accelerated bounded spatial steps; trusted walking speed is checked separately. The second run reproduces the initially observed inspection window with explicit CDP metrics; its report is `.local/pilot/inspection-route.json`. The full-resolution dusk capture is `.local/pilot/inspection-dusk.png`. Neither result guarantees full-cemetery performance.

The final production request trace recorded 14,894,464 transferred bytes for the app bundle, shared HDRI, decoder and pilot resources, including browser-reported response overhead. The pilot resources account for 8,423,429 transferred bytes. Their uncompressed GLBs are 6,328,324 bytes for the hall/ground and 2,074,356 bytes for vegetation; images are embedded. The shared HDRI remains the other large download. No new external asset service or texture-compression toolchain was introduced.

### Private backup and operational limits

The final snapshot is `/Users/meeq/.backups/horror-game-hedwig/entrance-hall-r05-2026-10-16-l4gpd73o/`. Its manifest covers 204 files and 284,883,227 bytes: source revisions, textures, inputs, authoring scripts, runtime derivatives and private review evidence. Every copied file was compared by SHA-256. `.local/pilot/backup-r05.json` records the snapshot summary. The pre-pilot and first `r02` snapshots were not overwritten. This is same-filesystem protection, not an off-device backup or a new restore exercise.

No hard operational blocker remained. The following workarounds and warnings are relevant to future sessions:

- The general Python tool environment lacks Pillow. Image/terrain preparation used the existing `.local/blueprint-venv/`; no package installation or repeated setup smoke was needed.
- Native browser helper viewport requests did not reliably equal the observed viewport, and inspection screenshots may be downscaled by the helper. The issue was reported to the tool provider. Use the existing Chrome/CDP smoke for the fixed buffer; for another size, set CDP metrics and assert CSS size, DPR and renderer buffer within the same session. Direct CDP PNG capture preserves the render resolution.
- No language server was configured for this repository. Existing module seams and direct source inspection were used; no new tooling dependency was added.
- Blender 5.2.2 emitted `use_nodes` deprecation warnings for Blender 6 and a shared-image-sampler export warning. Export and browser loading succeeded; the warnings were not suppressed. Vite retained its greater-than-500-kB chunk warning (735.51 kB minified / 205.09 kB gzip).
- The inspected pack did not supply a faithful birch or the required clipped vegetation forms. Selected broadleaf meshes and authored conifer/shrub/hedge geometry are silhouette approximations, not species-accurate reconstructions. Source and browser look remain separate human review gates.

## Owner review and planning handoff, 2026-10-17

Micha described the pilot as good progress and a useful first version to build on. He did not approve every modeled detail or request an exhaustive polish inventory. He reported jagged path sections and irregular invisible barriers. Possible collision around tree foliage was his impression without clear evidence, so the cause remains open. The earlier passing route covered selected positions and does not establish correctness across the full supported area.

The next session is reserved for agent-tooling improvements and focused path/collision work before further production. GitHub Issues now own concrete tasks and status:

- #12 covers Python environment selection and language-server access; #13 covers reliable browser metrics and captures.
- #14 covers Blender API/sampler warnings; #15 groups path contours, unexpected barriers and the tree-collision suspicion.
- #16 covers measured loading cost, #17 vegetation fit and #18 independent backup. They are deferred rather than new prerequisites for the pilot.

The active plan links each issue and defines order and scope. The former first-pilot plan and Markdown backlog were archived. GitHub proposals #1, #5, #7 and #9 were closed as superseded or not planned, not as fully implemented. Historical reports #3, #4 and #10 remain deferred and were not re-diagnosed.

This handoff changed planning, guidance and issue state only. No runtime, authored geometry, source assets or canonical map data changed. No new browser benchmark, setup smoke or heavy QA was run. The prior source backup and measured evidence remain historical records, with the new owner feedback recorded separately.

Planning verification resolved 74 local Markdown links and heading anchors across 11 affected or linked documents. GitHub API reads confirmed the seven new issue bodies, titles, labels and states, plus the intended closure/deferment of the historical issues. No obsolete references to the removed standalone backlog or retired pilot-plan anchor remained in the repository search.

## Movement and ground planning decisions, 2026-10-18

Micha approved configuring OMP's browser where practical and retaining the existing Chrome check for useful project checks or gaps. He accepted focused Blender script/export fixes with documented warnings that are verified harmless. The agreed approaches are recorded in issues #13 and #14; neither issue is implemented or closed.

For movement, he rejected a thorough investigation of invisible shapes and approved walking across all supported ground with sensible solid-object collisions. [#15](https://github.com/LLMinem/horror-game-hedwig/issues/15) was revised accordingly. He also requested [#19](https://github.com/LLMinem/horror-game-hedwig/issues/19) for ground across the entire cemetery before detailed modeling expands.

Read-only source research found that the prepared terrain covers the cemetery with margin. The present pilot uses a cropped heightfield and narrower path-derived walking restrictions. The expansion can reuse the existing terrain pipeline and movement interface, but must preserve the local hall platform adjustment. The cemetery boundary guides coverage; it does not authorize another hidden movement boundary inside rendered, supported ground.

These are owner decisions and source-inspection findings, not new runtime evidence. No browser, terrain generation, export or movement verification was performed for this planning checkpoint. The active plan also records the owner's project-history context; the age and long pause alone do not establish that a stack rewrite is needed.
