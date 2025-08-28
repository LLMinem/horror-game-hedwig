# Horror Game — “Hedwig” (Three.js MVP)

Desktop-only browser horror set in a real cemetery. One-week push to a playable MVP.  
Core loop: plan routes, manage water and light, avoid the husband, water 8 graves.

- **Engine:** Three.js (web)
- **Map:** OSM-based “Neuer Friedhof” (≈171 × 173 m playable)
- **Session:** ~20–30 min
- **Win:** water 8/8 target graves
- **Lose:** contact with husband (≤5 m)

---

## Contents

- `docs/spec.md` — single, dense spec (mechanics, level pipeline, AI, configs, budgets, tests)
- `data/` — GeoJSON and optional script for buffering/regeneration
  - `cemetery_game_final.geojson` — authoritative map
  - `buffer-surfaces.js` — optional line→polygon buffer tool (Turf)
- `config/` — JSON configs (optional; see spec for schemas)
  - `level.json`, `player.json`, `flashlight.json`, `water.json`, `ai_husband.json`, `targets.json`, `audio.json`, `debug.json`
- `src/` — game code (WIP)
- `assets/` — audio/textures/models (WIP)

> Keep the spec dense and up to date. Do not duplicate content across files.

---

## Controls (MVP)

- **WASD:** move
- **Shift (hold):** sprint (4.0 s), then fatigue (6.0 s)
- **E / Mouse1 (one action):** interact (water/refill/pickup)
- **F:** flashlight toggle
- **Esc:** pause (if implemented)

---

## Key Mechanics (numbers)

- **Watering:** 0→100 units in **5.0 s** (partial allowed; per-grave progress persists). Player can look but not move; flashlight turns off while watering.
- **Refill:** any of **6 taps**, 0→100 in **3.0 s** (partial allowed).
- **Flashlight:** **20:00** on-time total; flicker <30%; off at 0%. One battery per run resets to 100%.
- **Darkness curve (real time):** 0:00 dusk → 5:00 needs flashlight → 10:00 ambient 0 (stays dark).
- **Husband:** path-only patrol, **3.675 m/s**, contact radius **5.0 m**. Cannot pass closed gates/fence.

Full details in `docs/spec.md`.

---

## Level Pipeline (summary)

1. **Preprocess GeoJSON (offline):**
   - Reproject to local meters (origin at centroid), rotate to principal axis (~146°).
   - **Surfaces:** union by class; remove slivers `<0.20 m²`.
   - **Hedges:** clip against surfaces; remove slivers `<0.05 m²`. Hedges must never cover paths.
   - Subtract buildings from surfaces. Closed gates block nav edges.
2. **Runtime:**
   - Draw order: ground < hedges < surfaces < props.
   - Build **path graph** from path lines (or surface skeleton), nodes every **8–10 m**.
   - Player free movement with collisions; husband uses graph (no wells logic).

See `docs/spec.md` for exact thresholds and schemas.

---

## Data & Attributions

- Map derived from **OpenStreetMap** (ODbL). Attribute OSM contributors in credits.
- Real-world site: “Neuer Friedhof” (Bruchköbel). Use responsibly.

---

## Setup / Run

This repo intentionally avoids prescribing specific build tools. Use any static web server + bundling workflow you prefer.

- Place `docs/spec.md`.
- Place `data/cemetery_game_final.geojson`.
- (Optional) Run `buffer-surfaces.js` via `npx` when regenerating from raw OSM (see `data/` README notes in spec).
- Implement configs in `/config` as needed; defaults live in code if missing.

> The game should run from `/src` with your chosen bundler/server. Keep environment-specific steps out of the spec; document them here if needed.

---

## Performance Targets (MVP)

- **60 FPS** on mid-range desktop GPU
- ≤ **400** draw calls in busiest view
- Instancing for repeated props (graves)
- Fog far ≈ **50 m**; keep materials simple; avoid heavy shadows

---

## Test Pass (must-have)

- Spawn inside main gate; movement OK
- Darkness timeline matches 0–5–10 min
- Flashlight drain/on-time works; battery resets to 100%
- All 6 taps refill in 3.0 s; partial works
- Watering 5.0 s to full; partial persists per grave
- Husband respects paths/gates; game over at ≤5 m
- Win on 8/8 targets; lose on contact
- Meets performance target in worst case

(Details and edge cases in `docs/spec.md`.)

---

## Roadmap (post-MVP)

- Add “lady” ghost (teleport/LOS)
- Grave auto-placement + curated target sets
- Track-A geometry pipeline (lines+widths; min hedge width enforcement)
- Audio pass, materials pass, accessibility (subtitles, FOV)

---

## License

- Code: MIT (suggested; confirm before release)
- Data: © OpenStreetMap contributors (ODbL)
