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
- `data/` — Line-based GeoJSON for runtime geometry generation
  - `cemetery_final.geojson` — line-based map with width metadata (69KB)
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

1. **Load GeoJSON at runtime:**
   - Convert coordinates to local meters (origin at centroid), rotate to principal axis (~146°).
   - **Paths:** Generate geometry from LineStrings + width metadata (2.0-3.5m).
   - **Hedges:** Generate from lines with 1.0m width, 1.5m height.
   - Buildings use polygons directly.
2. **Runtime:**
   - Z-order: ground (0.0) < hedges (0.01) < paths (0.02) < props (0.03).
   - Build **path graph** directly from LineStrings, nodes every **8–10 m**.
   - Player free movement with collisions; husband uses graph centerlines.

See `docs/spec.md` for exact thresholds and schemas.

---

## Data & Attributions

- Map derived from **OpenStreetMap** (ODbL). Attribute OSM contributors in credits.
- Real-world site: “Neuer Friedhof” (Bruchköbel). Use responsibly.

---

## Setup / Run

This repo intentionally avoids prescribing specific build tools. Use any static web server + bundling workflow you prefer.

- Load `data/cemetery_final.geojson` at runtime.
- Generate path/hedge geometry from LineStrings + width metadata.
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
