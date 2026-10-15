---
type: guide
status: active
created: 2026-10-10
owned_by: human
---

# Local Blender workbench

This is preparation tooling, not authorization to build the cemetery. The Mac is the source workstation. The current authority is `~/vaults/meeq-vault/2026-09-30-Arbeitsstraenge/04-Hedwig.md` and its linked `Handoff-Hedwig-Revival.md` (2026-10-04). Future production needs a bounded reference-supported brief and human visual approval; the target is an environment prototype, not the former gameplay plan.

## Commands from the repository root

No installation, Python environment, add-on, MCP service or daemon is needed. The Python script runs inside Blender's bundled Python with `bpy`, not system Python.

```sh
bash tools/blender/run.sh version
bash tools/blender/run.sh smoke
```

The launcher resolves **`BLENDER_BIN` first**, then `/Applications/Blender.app/Contents/MacOS/Blender`, then `blender` on `PATH`. An invalid explicit override fails rather than silently falling back. The override is one executable path or command name, not a shell command with arguments:

```sh
BLENDER_BIN='/Applications/Blender.app/Contents/MacOS/Blender' bash tools/blender/run.sh smoke
```

Every operation starts in background mode with factory startup and automatic embedded Python execution disabled. Python exceptions produce exit code 1. Source opens additionally specify `use_scripts=False` and `load_ui=False`. These controls avoid saved UI/preferences/scripts; they are **not a sandbox for untrusted Blender files or Python**. No global presets or preferences are changed.

### Disposable capability smoke

`smoke` creates a unique `.local/blender-smoke/run-*` directory and prints its path. It creates only an in-memory one-metre cube, camera, material and light, then:

1. Renders a **32 × 32 Cycles CPU** PNG, one sample, four threads, no denoising.
2. Exports a selected cube with Draco level 6.
3. Reads the GLB JSON and requires `KHR_draco_mesh_compression` on every primitive and in `extensionsRequired`.
4. Clears the disposable scene and reimports the GLB; requires one mesh, twelve triangles, approximately one-metre dimensions and the selected frame's location. A keyed transform distinguishes frame 10 from frame zero, guarding static-export correctness.
5. Writes `report.json` with the actual Blender version, build hash and results beside `smoke.png` and `smoke.glb`.

An optional `--output .local/blender-smoke/my-new-run` must name a **new** directory; existing directories are refused. Smoke output under `public/` or `assets/source/` is refused. No original source is opened or saved. These tiny artifacts are disposable local evidence, not production assets. A failed run may retain partial artifacts for diagnosis and does not emit a PASS report. A passing smoke proves neither GPU rendering nor the usability of existing `.blend` files, photorealism, browser loading or performance. This is a small structural round trip, not the Khronos glTF Validator.

### Inspect an explicit source, then export an approved collection

Read-only inspection reports the active scene's objects, material image paths, unit scale and available collection names. It does not render, repair, save or modify the source file:

```sh
bash tools/blender/run.sh inspect \
  --source assets/source/working/cemetery-pack/street-lamp-simple.blend
```

Do not guess that the lamp root **object** `SM_StreetLamp_Simple` is also a collection. Inspect first. The old manual guide relied on UI selection and allowed collections to be optional; this workbench deliberately does not reuse that selection. A future approved source-copy preparation can create a small collection containing only the intended export objects and their parent empties.

For a separately prepared source revision with an explicitly named `EXPORT_ApprovedProp` collection, the command shape is:

```sh
bash tools/blender/run.sh export \
  --source .local/blender-sources/approved-prop.blend \
  --collection EXPORT_ApprovedProp \
  --output .local/exports/approved-prop.glb
```

That source and collection are illustrative; the workbench does not create them or claim they already exist. Preserve relative texture/library references when preparing a copy; moving only a `.blend` may break `//` paths. Copy the necessary source hierarchy or explicitly relink **the copy**, never the originals.

Export behavior:

- Requires an explicit `.blend`, exact collection name and `.glb` output. Includes **all objects in that collection and its descendants, even hidden objects**. Hidden alternates in the old lamp file must not be included accidentally.
- Allows 1–500 mesh/empty objects with at least one mesh. Refuses other object types, instances, external parents, constraints, armature modifiers, missing mesh UVs, non-unit scene scale and missing file-backed material images. Movie/sequence/tiled/viewer image inputs need a separate bake/curation step.
- Uses a fresh in-memory scene/view layer and explicit selection, not saved Outliner exclusions or UI selection. Preserves object transforms and the source scene's current frame; does not normalize origins, apply object transforms destructively or repair topology.
- Exports GLB with modifiers, UVs, normals, tangents, materials, Y-up and Draco level 6; no animations, skinning, morph targets, cameras or lights. Ordinary modifiers are evaluated, not baked into the original source. Modifier dependencies/geometry-node complexity still require review; 500 objects is not a polygon or texture-memory budget.
- Validates the staged GLB's actual Draco extension before publishing. A fresh output is published with an atomic no-clobber operation. Existing output is refused unless `--overwrite` is explicitly given; then only the derived GLB is replaced. Symlink outputs and any output inside `assets/source/` are refused even with `--overwrite`.
- Never calls a `.blend` save operator. Source data changes only in the disposable Blender process. The export report is printed to stdout together with Blender's logs, not written into the source. No GLB reimport or visual validation is implied for production export; review it separately in Blender and the actual browser runtime.

Keep exports in `.local/exports/` until approved. The tool accepts an explicit runtime GLB destination for a future authorized publication, but **does not authorize overwriting the existing lamp** or publish files automatically. `.local/` is local-only preparation evidence, not a backup or web asset directory.

## Units, axes and materials

- Use metre-scale source geometry: one Blender unit = one metre, scene `scale_length = 1`. Inspection reports the source's unit system; the exporter refuses other scale factors rather than silently converting. A unit setting alone does not prove that imported FBX geometry was authored at the right physical size. Measure a known dimension.
- Blender is Z-up. Standard glTF Y-up conversion is **`(x, y, z) → (x, z, -y)`**; Three.js consumes that glTF orientation. Blender +Y therefore becomes runtime −Z. For the older reference proposal of runtime +Z north, Blender −Y would need to represent north. This workbench does not establish the cemetery's geospatial frame; never fix orientation by an unexplained hand rotation. Record the eventual site origin, axes and transform with its reference evidence.
- Prefer an intentionally grounded origin and check dimensions after export. The old lamp scratchpad reports approximately 4.416 m total height; that is historical source evidence, not a fresh measurement by this tool.
- glTF's PBR material model is not arbitrary Blender shader serialization. The lamp scratchpad describes Color Ramps, mask multiplication and mixed metallic/roughness/emission inputs; successful GLB export does **not** prove those nodes reproduce the intended material. Procedural/unsupported effects may require baked image textures and comparison in Three.js.
- Base colour and emission colour textures normally use sRGB; numeric roughness/metalness/AO/normal/mask maps use Non-Color. An emission **mask** may be Non-Color; do not confuse it with an emission colour map. Prefer the pack's OpenGL-style `*_Normal` maps for Blender/glTF; `*_NormalDX` requires the appropriate green-channel convention conversion, not blind substitution.
- The tool does not bake materials, create KTX2, downscale textures, infer normal conventions, fit site architecture, add collision or assess asset suitability. Confirm those choices against references and runtime budgets when production is authorized.

## Evidence and existing risks

| Evidence | Finding and limit |
| --- | --- |
| Non-destructive executable discovery, 2026-10-10 | `/Applications/Blender.app/Contents/MacOS/Blender --version` reports **5.2.2 LTS**, build `d13f752e3b9c`, Darwin. This is version discovery only, not a fresh render or GPU test. |
| Cached 2026-10-02 capability report | `~/.cache/hermes-coo/orchestration-2026-10-02/04-blender-check/result.json` records a CPU 32 × 32 render, Draco export/reimport, one mesh and twelve triangles on the same Blender build. Metal was enumerated, **not exercised**. Reuse this evidence rather than repeating environment discovery. The new repo smoke remains a separately executable check. |
| Legacy user preset, read only | `~/Library/Application Support/Blender/4.5/scripts/presets/operator/export_scene.gltf/Hedwgi_Draco_Export.py` line 4 targets `/Users/meeq/Projects/horror-game-hedwig/assets/source/working/cemetery-pack/street-lamp-simple.glb`. It omits the current `30-portfolio` directory and writes into the source tree rather than the runtime props directory. It also depends on selected objects and requests saved exporter settings. It has **not** been migrated or changed; the script replaces its role for this workflow. |
| Raw/working inventory | The 2026-10-10 filesystem inventory confirmed **24 FBX, 305 PNG, three `.blend` files and six `.blendN` backups**. The source names are `asset-import-template.blend`, `street-lamp-simple.blend`, `street-lamp-simple-backup.blend` and their saved versions. |
| Current source usability, 2026-10-10 | Parent ran read-only `inspect` on `street-lamp-simple.blend` with Blender 5.2.2: opens successfully, METRIC/scale 1, five referenced image files present through relative paths. `StreetLamp_Work` contains seven objects including hidden alternate meshes; the scene also has a reference camera. A dedicated export collection still needs deliberate preparation in a new revision. Source appearance and compatibility of the other blends remain unverified. |
| Source backup | Readiness found local snapshots and a configured but unreachable external Time Machine target, not an independently demonstrated restore. `.blend1`/`.blend2`/`.blend3`, a sibling backup and local snapshots are not an independent backup. Keep every existing raw file, original blend and saved backup immutable. Obtain a verified independent backup before future source-authoring work. |
| Rights and privacy | Micha confirmed purchase/commercial permission for the pack; that is not a blocker. Visual fit still requires comparison. Private reference photos, inscriptions and metadata must remain local and out of runtime assets and logs intended for publication. |

Parent integration on 2026-10-10 exercised the new smoke successfully: CPU PNG inspected, Draco round trip, twelve triangles, one-metre dimensions and frame-10 transform preserved. A separate disposable two-mesh source exercised collection export: hidden member included, unrelated mesh excluded, positions/dimensions retained, existing-output refusal and source-tree output refusal. Review found that Blender defaults static exports to frame zero; a failing-before/passing-after reproduction confirmed the fix (`export_current_frame=True`), now guarded by the smoke. Eleven hashes covering existing blends/backups, the original map and shipped lamp remained unchanged. The tiny render emits Blender's `Material.use_nodes` deprecation warning for Blender 6; the current 5.2 path succeeds. No production asset or GPU-render claim follows from these checks.

## Source pointers

- Repo workflow: [pipeline guide](pipeline-guide.md), [historical lamp scratchpad](street-lamp-scratchpad.md), [candidate queue](processing-queue.md). A candidate or historical checklist is not a production brief.
- Local vault: `~/vaults/meeq-vault/03-Projects/Hedwig-and-Creative-Portfolio/Handoff-Hedwig-Readiness-2026-10-02.md`, `Research/05-astra-blender-threejs-workbench.md`, `Research/06-neuer-friedhof-reconstruction-inputs.md` and the authority notes named above. Later 2026-10-04 direction supersedes older claims about rights and workstation decisions.
- Installed exporter option definitions: `/Applications/Blender.app/Contents/Resources/5.2/scripts/addons_core/io_scene_gltf2/__init__.py` (read to match the installed exporter; no add-on installation).
- Official behavior reference: [Blender CLI](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html), [glTF exporter](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html).
