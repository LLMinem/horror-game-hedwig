# Hedwig — agent entry

`AGENTS.md` is the canonical entry point for agents; root `CLAUDE.md` is a relative symlink to it. `README.md` is the human entry point.

## Direction

Build a faithful, beautiful, walkable **Neuer Friedhof, Bruchköbel** at dusk/night. The current milestone is an **environment prototype**, not the former game MVP. Read [the active plan](docs/asset-integration-plan.md) before planning production work. It captures the accepted 2026-10-04 direction; older material under `docs/archive/` and the lore are history, not an implementation mandate.

The executable app is still a Three.js look-development sandbox: flat grass, atmosphere, first-person inspection, debug controls and one street lamp. GeoJSON is not rendered; terrain and collision are not implemented. Preserve that working baseline while adding evidence-backed features.

The lamp and sample props are disposable pipeline tests, not production references or mandatory assets. Prefer agent-authored, photo-backed geometry for the actual site; reusable complex vegetation may come from the local pack. Additional models/textures may be acquired when needed, with fit and licence checks.

## Start a session

1. Read `README.md`, `package.json` and the active plan; inspect existing working-tree changes before editing.
2. For photos, map, source assets or texture work, read `docs/local-references.md`. For terrain, site layout or Blender preparation, read `docs/blueprint-preparation.md`, including the owner's rejection of the earlier agent tracings. For Blender work, also read `docs/assets/blender-workbench.md` and `docs/assets/pipeline-guide.md`.
3. Read only the modules needed for the task; `src/main.js` is the composition root. `docs/readiness.md` records verified preparation and remaining gaps.
4. State the bounded task and verification. Follow the user's authorization: autonomous preparation may proceed end-to-end; scene production and art-direction choices need a specific brief. Explain new Three.js concepts briefly to Michael.

The reusable [session opener](.prompts/opener.md) and tool-specific commands under `.claude/commands/` lead to this policy. The repo needs no MCP servers or automatic formatting hooks. Machine-specific permissions belong in untracked `.claude/settings.local.json`.

## Sources and safety

- The Mac is the development and authoring workstation. No VPS, MCP server or Blender add-on is required.
- `assets/source/raw/` and `assets/source/working/` are local source material. Keep originals unchanged; author new revisions/copies. Follow the [approved local backup policy](docs/asset-integration-plan.md#before-modifying-sources) and [restore evidence](docs/readiness.md#pilot-approval-and-backup-2026-10-16); off-device protection remains unverified.
- `.local/` holds private reference manifests, photo proxies, exports and smoke evidence. It is ignored by Git and denied by the Vite dev server. Keep private material out of `public/`, `src/` and tracked docs. Ignoring a file is not a backup.
- `public/` is shipped wholesale. Only reviewed, redistributable runtime artifacts belong there. Raw marketplace content and private photos/GPS/inscriptions do not.
- The owner confirmed purchase and commercial permission for the cemetery pack. Select assets for visual fit; generic churches/mausoleums do not replace the real site's buildings.
- Preserve `data/cemetery_final.geojson` and its feature IDs. Read `data/CLAUDE.md` before interpreting geometry. Missing heights, widths and photo coverage are uncertainty, not permission to invent measured facts.

## Engineering and acceptance

- Vanilla JavaScript, Three.js r179.1 and Vite. Reuse the existing module seams; no framework/ECS rewrite ahead of an actual need.
- Blender sources produce GLB runtime assets, not vice versa. Base colour/emission are colour data; roughness/metalness/normal maps are non-colour data. Blender renders do not prove browser material fidelity or performance.
- Run the relevant commands and exercise changed behavior in the actual browser/CLI. Record failures and limits; a build is not visual acceptance. Use the coding agent's available native browser tooling. `npm run browser:smoke` provides an optional verified Chrome/CDP input check against a running local server.
- Preserve source look and browser look as separate human art gates. For the first reference-backed section, provide neutral comparison, dusk/night view and measured browser performance.
- 60 FPS and at most 400 draw calls are provisional targets, not achieved full-level guarantees. State hardware, browser and render resolution with measurements. Use instancing for repeated content; keep fog intentional rather than hiding unfinished work.
- Update the existing authoritative doc when scope or a workflow changes. Deployment and public release require explicit authorization; committing and pushing to the configured repository do not authorize either.

## Git workflow

- Commit completed, verified changes at meaningful checkpoints during a session. Each commit must contain one logical, independently understandable change and its directly related documentation/tests. Prefer several atomic commits over one session-sized bundle.
- Inspect the working tree and intended diff before staging. Stage explicit paths or hunks; preserve unrelated user work and keep ignored private sources, references and backups out of Git. Commit messages describe the change and its purpose.
- Push completed commits to the configured remote at session end by default, not after every edit. Push intended checkpoint tags explicitly. Report any failed commit/push and the remaining local state; never force-push or rewrite shared history without explicit approval.
- Implement modeling and related runtime/tooling changes on a feature branch, not `main`. The approved entrance/hall pilot uses `feat/entrance-hall-pilot`, starting at annotated tag `checkpoint/pre-entrance-hall-pilot`. Keep that tag fixed as the pre-implementation baseline; merge back only when Micha requests it.
