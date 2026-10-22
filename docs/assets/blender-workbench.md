# Blender source-to-browser workflow

Use this guide for authorized source changes, exports and visual review on the Mac. The selected issue and its parent specification supply the bounded task. Tool capability is not permission to expand scope, publish or deploy. [AGENTS.md](../../AGENTS.md) owns project authorization and verification policy.

[The data contract](../../data/README.md) owns source authority, frame, terrain and geometry interpretation. [Private reference operations](../local-references.md) owns discovery, correction and privacy. Start with relevant source IDs/photos and explicit uncertainties; a purchased church or mausoleum is not a substitute for the site's Chapel.

## Source preservation and recovery

Raw marketplace files and existing Blender revisions stay immutable. Author in a **new revision**, preserving relative texture/library dependencies. Moving only a `.blend` can break `//` paths: copy the required hierarchy or relink the copy, never originals. Source edits, exports and review renders are separate operations.

The owner-approved snapshot root is `~/.backups/horror-game-hedwig/`. Preserve valuable revisions before changing them. Before session end, snapshot each reviewable new Blender revision with its textures, authoring inputs and reproducibility records. Never overwrite the pre-pilot snapshot or silently prune older snapshots. Keep manifests and recovery evidence private. Git does not back up ignored sources or `.local/`; `.blendN` and same-disk copies protect against working-copy mistakes, not loss of the Mac.

The owner accepted external Time Machine protection in [#18](https://github.com/LLMinem/horror-game-hedwig/issues/18). Do not reopen backup investigation or require a new restore exercise as a modeling gate. This is owner acceptance, **not verified current coverage or recovery**.

The pre-pilot recovery layout separates `snapshot/project/` (workspace, Git metadata, sources and private references) from `snapshot/photo-originals/` (only manifest-listed originals, with their suffix directories). Its private `manifest.json` and `verification.json` record contents and exercised recovery. Dependency/build caches, installed applications, unrelated home files and the full Photos library are not included. Later revision snapshots have their own manifests: inspect them rather than assuming identical coverage.

Restore into a new working location, never operate inside a snapshot. Restore photo originals to a durable private directory, then use the [cached-index relocation procedure](../local-references.md#recover-discovery-inputs). Restore private raster/index inputs before an Atlas rebuild. Recreate dependencies only under project setup authorization. Exact snapshot names and historical restore results belong in the private recovery ledger, not this guide.

## Inspect before authoring or exporting

Run from the repository root:

```sh
bash tools/blender/run.sh --help
bash tools/blender/run.sh version
```

The launcher uses `BLENDER_BIN`, then the macOS application, then `blender` on PATH. An invalid explicit override fails; it is one executable path/name, not a shell command. Scripts run in Blender's bundled Python with `bpy`, not system Python. No MCP service, add-on, global preset or daemon is required.

Operations use background/factory startup with embedded auto-execution disabled; source opens also disable scripts and saved UI. Python exceptions return a failing exit code. These controls are **not a sandbox for untrusted files or Python** and do not change global preferences.

After selecting an existing source revision, inspect its objects, image paths, units and exact collection names:

```sh
bash tools/blender/run.sh inspect --source "$SOURCE_BLEND"
```

Inspection neither renders nor repairs/saves the source. An object name is not necessarily a collection name. Build a dedicated export collection containing only intended meshes and parent empties; keep private reference planes/images and review/collision helpers outside it. Inspect hidden alternates and external dependencies rather than trusting saved UI selection.

For the existing cemetery authoring entrypoints, `tools/blender/pilot_inputs.py --help` uses `.local/blueprint-venv/bin/python`; `pilot_scene.py`, `pilot_vegetation.py` and `pilot_render.py` run in Blender. Discover their arguments through their CLI in the appropriate interpreter. Revision preparation refuses existing destinations; choose a new revision. `inputs.json` records authored parameters and uncertainty. Rendering a saved source is distinct from saving a separate review blend. Current revision names and outputs belong to the selected issue, not permanent command examples.

## Prepare materials and export

Use metre-scale geometry and scene scale 1, with a deliberately grounded origin. A unit setting does not establish the actual scale of imported FBX: measure a known dimension. Follow the [frame/ground contract](../../data/README.md#metric-frame-and-raster-placement); do not apply another axis rotation or height offset. Preserve assembled hierarchies rather than blindly applying every transform.

- Base-colour and emission-colour images normally use sRGB; roughness, metalness, AO, normal and numeric masks use Non-Color. An emission mask is not emission colour.
- Prefer OpenGL normal maps for Blender/glTF. DirectX maps require the appropriate green-channel conversion, not blind substitution.
- glTF PBR is not arbitrary Blender node serialization. Bake procedural/unsupported effects to image maps when necessary, retaining useful UVs, normals and tangents. Compare cutouts, opacity, emissive response, repeated UVs and texture sampling in the browser.
- Warnings remain visible. The duplicate image-sampler warning was investigated for selected shared colour/alpha nodes in [#14](https://github.com/LLMinem/horror-game-hedwig/issues/14); that result does not clear a new asset with conflicting nodes/settings. Inspect its actual material/export. Historical version-specific fixes do not establish future Blender compatibility.

Export a deliberately prepared collection to a new local derivative:

```sh
bash tools/blender/run.sh export \
  --source "$SOURCE_BLEND" --collection "$EXPORT_COLLECTION" \
  --output .local/exports/review.glb
```

Important exporter boundaries:

- Includes **all collection descendants, even hidden objects**. It uses a fresh in-memory scene/view layer and explicit selection, not saved Outliner exclusions.
- Preserves transforms and the source scene's **current frame** for static export. It does not normalize origins or repair topology. Ordinary modifiers are evaluated; complex dependencies still need review.
- Requires supported mesh/empty objects, UVs, unit scene scale and available file-backed images. Instances, external parents, constraints, armatures and unsupported image types require deliberate source curation; an object-count limit is not a polygon or memory budget. Inspect CLI/implementation for exact current validation limits and export parameters.
- Exports static GLB materials/geometry with the standard Y-up conversion and Draco, excluding animations, skinning, morph targets, cameras and lights. It checks the staged Draco extension before publication, not full Khronos validity or visual fidelity.
- Publishes atomically without clobbering. Existing output requires explicit `--overwrite`, which replaces only the derivative. Symlink outputs and source-tree destinations are refused even then.
- **Never saves a `.blend`**. In-memory source changes die with the process; the report is stdout, not a source edit. Production export does not imply reimport or visual validation.

Keep derivatives in `.local/exports/` until authorized for runtime integration. The exporter accepting a runtime destination does not authorize replacing an existing asset. It does not bake materials, create KTX2, resize textures, infer normals, add collision or assess site fit. KTX2 loader plumbing alone is not an established conversion pipeline; introduce conversion after accepted materials and measured need. Cloning shares resources but does not itself reduce draw calls like instancing.

## Separate source and browser acceptance

1. **Source review:** compare a neutral overhead view against source geometry/imagery, plus ground views against selected photo stations. Record supported corrections and unresolved dimensions/occlusion. Dusk/night views complement neutral comparisons; they must not hide mismatches. Photo stations are not calibrated cameras. Obtain human source acceptance, not merely a successful render. By default, this acceptance precedes runtime integration. An explicit owner-approved exception in the selected issue may permit an unaccepted local browser review candidate first; it does not waive either human acceptance.
2. **Runtime integration:** only derivatives checked for privacy, redistribution rights and export correctness enter `public/assets/`. Require human source acceptance first unless the selected issue records the review-only exception above. Follow the shared loader and asset-registration conventions in `src/assets/Assets.js` and `src/assets/DevRoom.js`: initialize through `initAssetSystem({ renderer })`, and register the root with `environment.registerAsset(root)` for repository-specific intensity/environment updates. Keep private references and source dependencies out of the web build.
3. **Browser review:** check GLB/decoder/texture responses, console, dimensions/axes, neutral and mood appearance, loading cost, collision and ground sampling. Capture comparable views and measure the selected issue's performance criteria. Human browser/art acceptance is separate from source acceptance and from technical smoke results. Local runtime inspection is not public release.
4. **Record:** retain the accepted source revision, inputs, export command, actual tool versions, emitted paths, image-map treatment, rights/attribution, evidence and human outcome in the selected issue/private asset record as appropriate. Snapshot sources and dependencies under the policy above. Agents cannot approve production autonomously.

Review-only candidates stay on the task branch and are clearly marked unaccepted. Preserve the accepted baseline and stop for the required owner reviews. A review-only exception does not authorize merge, ticket closure, downstream production, deployment or public release.

### Browser smoke and measurement

Use an already running local dev server or production preview; the caller stops it afterward. For example, with the preview running at its default local port:

```sh
npm run browser:smoke -- 'http://127.0.0.1:4173/?mode=pilot'
npm run browser:smoke -- --width 1728 --height 919 --dpr 2 --headless 'http://127.0.0.1:4173/?mode=pilot'
```

This uses Node and ordinary Chrome (`CHROME_BIN` can select the executable), creates/removes an isolated temporary browser profile, and writes screenshots/report under `.local/browser-smoke-*`. It accepts a local URL plus width/height/DPR/headless options; **`--help` is unsupported**. `tools/browser-smoke.mjs` owns the argument contract. `?mode=sandbox` selects the retained sandbox check, not cemetery acceptance.

Assert CSS viewport, DPR, renderer buffer and saved PNG dimensions in the **same session**. Apply metric overrides before startup/reload because renderer DPR is set at startup. Harness previews may be downscaled even when saved captures are correct; direct CDP capture with an explicit viewport clip and PNG-header checks avoids confusing the two. Crop saved full-resolution images for close inspection.

Record hardware/GPU, browser, rendering mode, route, resolution, DPR, duration and concurrent load. Browser `requestAnimationFrame` intervals are display-limited frame observations, not GPU timer queries. Bounded route jumps do not establish trusted walking speed; check input separately. Sparse-scene M3 Max results do not establish the mid-range hardware/density target in #21, and a passing selected route does not prove every collision or visual detail.

### Capability smoke is not acceptance

`bash tools/blender/run.sh smoke` creates unique disposable output under `.local/blender-smoke/`: a tiny CPU render, Draco export/reimport and structural assertions for dimensions and saved-frame transforms. An explicit output must be new and outside source/runtime trees. Failures may retain partial evidence without a PASS report. This proves neither GPU rendering, existing source usability, material fidelity, photorealism, browser loading nor performance. Reuse recorded capability evidence unless the selected task calls for exercising it.

## Rights and release gate

Owner-confirmed purchase/commercial-use permission for the existing pack is not a missing-paperwork blocker and does not establish asset fit. Inspect reused geometry/materials against the selected evidence. New assets need source and licence checks; consult the purchasing authorization in [#21](https://github.com/LLMinem/horror-game-hedwig/issues/21) and [#17](https://github.com/LLMinem/horror-game-hedwig/issues/17) for the project-wide budget and owner-only payment/account actions.

Preserve OSM and HVBG attribution/provenance under the [data contract](../../data/README.md#rebuild-and-provenance). Existing sandbox grass/HDRI provenance and the intended code licence remain unresolved; historical ISC metadata in `package.json` does not establish a project-code licence grant. [The retained rights findings in #33](https://github.com/LLMinem/horror-game-hedwig/issues/33#issuecomment-6343457870) own those open limits. Names, legacy recommendations and successful loading are not licence evidence. Public redistribution requires its own authorization and resolution of applicable rights requirements.
