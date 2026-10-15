# Repository readiness, 2026-10-10

## Assessment

The checkout is prepared for a new session to review photo locations, metadata and visual references before defining a specifically authorized implementation section. It is not a finished cemetery or an authorization to choose the route autonomously. The biggest initial problem was contradictory project context and inaccessible source knowledge, rather than the Three.js module structure.

The starting checkout was clean on `main` at `3ec81deef975981d46279e4be8480308638905b2`. The assessment used the October 4 strand note, revival handoff, technical readiness report and linked map/photo/material research. The preparation made no changes to `src/`, the canonical GeoJSON, existing Blender sources or the shipped lamp. No commit, upload or deployment was performed.

## Findings and changes

| Area | Initial problem | Preparation |
| --- | --- | --- |
| Agent entry | `AGENTS.md`, `CLAUDE.md`, README and Claude commands promoted gameplay, obsolete refactors or ignoring map data. | One policy entry in `AGENTS.md`, a current repo plan, concise startup/resume prompts and revised documentation agents. Historical lore and lamp instructions are explicitly historical. |
| Sources | Photo counts were documented, but the per-original index was not recoverable from the known cache. The map viewer lived in the Vault/Downloads. | A bounded read-only Photos query recreated a private manifest for 98 originals. All 98 JPEG proxies and a local gallery now exist. The offline map is in `tools/map/index.html`. |
| Blender | Blender was installed, but not on PATH. A global 4.5 export preset used an obsolete repository path and UI selection. | Explicit repo launcher, read-only inspection, disposable capability smoke and named-collection export. No global settings changed. |
| Node tooling | Many unused GIS/helper packages were direct dependencies. Version requirements and reliable root commands were unclear. | Retained Three.js 0.179.1 and lil-gui 0.20.0; kept Vite as a dev dependency and updated it to 7.3.6 with current compatible transitive packages. Added Node requirements and npm entry commands. |
| Local automation | A tracked machine-local Claude configuration invoked unpinned whole-tree formatting and an obsolete MCP prompt hook that logged prompts. | Removed the obsolete tracked configuration/hook. Future machine-local settings are ignored; no replacement daemon or automatic formatter was introduced. |
| Private files | Git ignores did not establish an HTTP boundary, and the whole working-source tree was not ignored. | `.local/` and working sources are ignored; Vite explicitly denies source/private paths and binds to loopback. `public/` remains the deliberate publication boundary. |

The workstation's npm minimum-release-age policy rejected Vite 7.3.7 because it was published on October 6. The preparation respected that policy and selected 7.3.6 rather than weakening global npm settings. Updating compatible transitive dependencies removed the advisory findings observed during installation.

## Source inventory and access

[Local references](local-references.md) contains commands, paths and privacy rules. The current inventory is:

| Material | Available locally | In the browser runtime |
| --- | --- | --- |
| Map | 140 features, including 96 path segments and five building/storage footprints. | Not rendered. The separate offline viewer supports inspection. |
| Private photos | 98 HEIC originals, about 548 MB; GPS and true-north heading in all 98. Private manifest and 98 JPEG proxies, about 114 MB, are ready. | None, intentionally. |
| Purchased pack | 24 FBX and 305 PNG textures, including PBR map families. | One exported lamp only. |
| Blender sources | Three `.blend` files and six saved backup versions. | Sources do not belong in the build. |
| Ground textures | Four JPEG files, colour/normal at 1K and 2K. | The scene loads the 2K pair. |
| Environment lighting | Six HDR files, three environments at 1K and 2K. | The selected 2K environment is loaded. |
| KTX2 | Decoder/loader support exists; no KTX2 assets or established converter are supplied. | None. |
| Terrain/aerial evidence | No registered DGM1 or current DOP/TrueDOP clip is supplied to this workflow. | None. |

Photo metadata does not prove complete visual coverage, precise positions or camera pose. Asset filenames do not prove suitability for the actual cemetery. The photographs were not visually interpreted or sent to a model during preparation. Marketplace originals and personal photographs should remain outside Git and the published build; reproducible tools and access instructions belong in the repo instead.

## Code assessment

The current module split is adequate for the next bounded implementation. `src/main.js` provides a clear composition root, asset loading has one shared path, and atmosphere/lighting can be retained while replacing the flat sandbox world. A framework migration, ECS or broad refactor would add risk without resolving the missing reference and coordinate decisions.

The actual development work should address these seams when introducing the corresponding feature:

- **Site geometry and movement:** `World.js` constructs a flat plane and sample props. `PlayerController.js` fixes camera height and clamps a rectangle. Terrain sampling, placement and collision must share one site frame and height contract. No existing module supplies that contract.
- **Content loading and lifecycle:** `main.js` only logs lamp readiness/failure. `Environment.js` handles HDRIs separately and has no request-order guard for rapid switches. Its material traversal assumes a single material, and PMREM render-target lifetime needs review when asset loading is expanded. The explicit environment binding is a repo convention, not a general Three.js r179 requirement.
- **Reproducible review:** star/test-object initialization uses `Math.random()`. The GUI is useful for look development, but named views and seeded variation are still needed for stable art comparisons. The loop also has no stop/disposal lifecycle, which matters if later work introduces scene switching.
- **Performance:** the player allocates vectors in its update path, and the moon shadow frustum covers only a local area. Address those with movement/world expansion rather than changing visual behavior during preparation. Cloned props still cost draw calls; repeated site content will need instancing or another measured batching choice.

The existing content is also large for such a small scene. The browser resource observation showed roughly 18.4 MB for the lamp GLB, 7.1 MB for the active HDRI and 16.6 MB for the two grass maps, before decoder/code overhead. Those are local transfer observations, not an Internet loading benchmark. The pack provides asset-specific texture sets, but an approved material library for the actual site's paths, walls, grave types and vegetation still needs reference review. Optimize selected content after that review rather than batch-converting every source texture during preparation.

These are code-inspection findings and future change points, not reproduced failures of the present sandbox. No gameplay scaffold was added. The current grass/lamp scene remains the working baseline.

## Exercised verification

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

## Remaining prerequisites, not hidden setup tasks

1. Review photo locations and metadata on the private map; Micha can correct uncertain positions before choosing a first visible section. Establish reference coverage and asset/material fit before modelling recognizable architecture. Prefer authored site geometry; the lamp/test props are not production requirements.
2. Establish official terrain/aerial inputs and the shared metric coordinate/height contract. Existing phone altitude and estimated map widths are insufficient.
3. Provide a reachable independent backup destination and demonstrate restoration before valuable source authoring. The earlier Time Machine report did not prove an external restore; extra local copies do not resolve it.
4. Agree target hardware/browser/resolution and later measure the actual route. Before public release, reconcile code-licence metadata and grass/HDRI provenance. The pack's commercial permission is already confirmed.

For a new session, start with `README.md` and the [active plan](asset-integration-plan.md). Source access and Blender setup no longer require rediscovering paths from old conversations. Fresh clones still need the private source workspace or the documented recovery steps; private material is deliberately not part of Git.

## Follow-up: photo metadata and authoring direction

The original JPEG wording obscured an important distinction: only embedded proxy metadata were removed; the ID-linked private manifest retained GPS, heading, altitude and camera observations. The reference CLI now refreshes known originals' metadata explicitly, generates a private offline photo-position editor, validates/imports manual corrections and exports effective placements as GeoJSON. Original observations and user corrections remain separate. See [the reference workflow](local-references.md#photo-position-workflow-verification) for exercised checks and commands.

The live dataset has 98 metadata-linked photos: 50 with reported horizontal error ≤5 m and 48 above that provisional threshold. Neither group is survey-verified. Camera heading is useful but not calibrated pose; phone altitude is not terrain. No photo locations have been confirmed on Micha's behalf.

Photo positioning/coverage review now precedes section selection. Site geometry should preferably be authored from references; complex vegetation may reuse the pack, and additional suitable textures/models remain an option. Existing lamp sources and sample props are disposable experiments, not production requirements. The working runtime has not been changed or stripped prematurely.

Browser choice belongs to the coding agent's native environment. The existing direct Chrome/CDP smoke remains optional and unchanged. Repository-local browser-product recommendations were removed; no corresponding repo-local skill installation or skills lockfile was present to uninstall. Global installations/settings were left untouched.

## Authorized visual review, 2026-10-15

Micha requested visual review of every private photo against the map and capture sequence. All 98 were inspected individually. The private review layer applies five estimated camera positions and seven estimated headings, and leaves nineteen photos flagged for owner review. Original measurements and human corrections remain separate from those estimates.

The map now identifies the pending component and shows a reason for each assessment. Twelve Python tests passed, and the actual Chrome page decoded all 98 previews with the expected review filters. Synthetic browser export/import and regeneration preserved human precedence and unresolved flags. Five sideways portrait proxies were also corrected by baking image orientation before metadata removal.

All original HEIC files, the metadata manifest/cache and canonical GeoJSON retain their pre-review SHA-256 values. No human confirmation was fabricated. The [reference workflow](local-references.md#visual-review-and-owner-follow-up) describes the schema and remaining owner work. No scene production or canonical map corrections were performed.
