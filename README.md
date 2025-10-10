# Horror Game — “Hedwig”

Desktop-first Three.js horror project set in the real “Neuer Friedhof” cemetery. We are currently in the **asset integration** phase: the refactored r179 scene runs at 60 FPS, the Dev Room proves the GLTF pipeline with a curated street lamp, and the next milestones revolve around bringing more props in and preparing gameplay scaffolding.

---

## Snapshot — 10 Oct 2025 (`5d9a3b4`)
- **Codebase:** `src/main.js` stays under 50 lines and wires eleven focused modules (Engine, Atmosphere, World, Environment, PlayerController, Assets, DevRoom, Debug GUI, Loop, Constants).
- **Assets:** Shared GLTF/KTX2/Draco loaders live in `src/assets/Assets.js`; `createDevRoom` auto-loads `SM_StreetLamp_Simple.glb` so we can study lighting and emissive behaviour before populating the cemetery.
- **Docs:** Active guidance is in `docs/asset-integration-plan.md`, `docs/assets/pipeline-guide.md`, and `docs/assets/street-lamp-scratchpad.md`. Older specs and plans moved to `docs/archive/` pending a fresh design pass.

---

## Repository Tour
- `docs/asset-integration-plan.md` — current roadmap for asset ingestion and world-building.
- `docs/assets/` — living workflow docs (pipeline checklist, scratchpads, processing queue).
- `docs/archive/` — historical plans/specs; consult only for context.
- `data/cemetery_final.geojson` — raw OSM lines + metadata (layout approach TBD; see backlog).
- `public/assets/` — HDRIs and prepared textures/models.
- `src/` — production modules (see “Architecture” below).

---

## Architecture (r179.1)
```
src/
  main.js                # Entry point + wiring (≤50 lines)
  config/Constants.js    # Scene defaults + GUI baseline values
  core/Engine.js         # Renderer, camera, clock, resize hooks
  atmosphere/Atmosphere.js # Skydome + THREE.Points stars + horror grading
  world/World.js         # Fog, lights, ground, placeholder props
  world/Environment.js   # HDRI loading + r179 envMap fix + asset registration
  assets/Assets.js       # Shared GLTF/KTX2/Draco loaders and cache helpers
  assets/DevRoom.js      # Neutral asset sandbox with lamp+light helper
  gameplay/PlayerController.js # Mouse look, WASD, flashlight control loop
  ui/DebugGui.js         # lil-gui panels, presets, state management
  loop/Loop.js           # Animation loop runner
```

---

## Controls (current build)
- **WASD:** move
- **Shift:** sprint (1.5× walk speed)
- **F:** toggle flashlight (spot light + emissive binding)
- **Esc:** release pointer lock

Gameplay systems beyond the Dev Room sandbox are still under construction; numbers from the archived spec are treated as placeholders until the new design is written.

---

## Asset Pipeline Highlights
1. Prepare meshes in Blender (see `docs/assets/pipeline-guide.md`).
2. Export Draco-compressed GLBs to `public/assets/models/...`.
3. Register the asset in code via `initAssetSystem({ renderer })`, `loadStreetLampInstance()` (or similar), and `environment.registerAsset(root)` so HDRI reflections apply in r179.
4. Log findings in the relevant scratchpad and tick items in `docs/assets/processing-queue.md`.

The Dev Room (`src/assets/DevRoom.js`) is the proving ground for scale, lighting, and emissive tuning before dropping props into the main world.

---

## Setup & Run
```bash
npm install
npm run dev -- --host   # exposes Vite dev server for remote testing
```

- The modular build assumes Vite; use the dev server for hot reloads and remote device checks.
- When deploying, run `npm run build` and serve the `dist/` folder with any static host.

---

## Performance & Testing Targets
- 60 FPS on a mid-range desktop GPU
- ≤400 draw calls in dense views (use instancing for repeated graves/props)
- Fog far plane ≈50 m; keep materials lean and avoid unnecessary dynamic shadows
- Before pushing changes: verify the Dev Room lamp controls (emissive slider + point light offset), run through GUI presets, and watch the browser console for warnings.

---

## Data & Attribution
- Map data derived from **OpenStreetMap** (ODbL) — credit contributors in-game.
- Additional height data (official DEM) is available locally; integration approach is still pending (see backlog).

---

## License
- Code: MIT (to be confirmed before release)
- Data: © OpenStreetMap contributors (ODbL)

Need orientation help? Start with `docs/asset-integration-plan.md` and the backlog, then explore the modules listed above.
