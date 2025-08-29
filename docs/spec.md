# Cemetery Horror Game - Technical Specification

## 0. Overview & Scope (MVP)

### Premise

Explore a large cemetery at dusk. Water 8 specific graves using a can refilled at 6 taps. One roaming "husband" NPC patrols paths; contact ends run.

### Platform & Specs

- **Platform:** Desktop web (Three.js)
- **Session:** ~20–30 min
- **Map:** OSM-based "Neuer Friedhof" (≈171×173 m playable)
- **Win condition:** All 8 targets watered
- **Lose condition:** Contact with husband (≤5 m) → short cutscene → game over

### Core Loop

1. Plan route between targets and taps
2. Walk/sprint, manage light and water
3. Water graves (hold 5 s total per grave, partial allowed)
4. Avoid husband (audio proximity cues)
5. Repeat until 8/8 or caught

### Non-goals (MVP)

Mobile, interiors, complex AI, physics, item inventory, save system, complex shaders.

### Constraints

- ODbL attribution for OSM data
- One week to playable. Keep pipeline simple and data-driven

---

## 1. Mechanics Spec (Authoritative Numbers)

### Movement

- **Walk:** 3.5 m/s
- **Sprint:** 5.0 m/s for 4.0 s → fatigue 2.8 m/s for 6.0 s → cooldown 4.0 s (TBD if needed)
- **Jump:** None
- **Collision:** Fence, buildings, hedges (post-clip)

### Flashlight & Darkness

- **Ambient darkness timeline (real time):**
  - 0:00 - Dusk
  - 5:00 - "Need flashlight"
  - 10:00 - Ambient = 0 (stays dark)
- **Flashlight energy:** 20:00 of on-time (linear drain)
- **Behavior:** Flicker under 30%; off at 0%
- **Battery pickup:** 1 per run → sets energy to 100% (no respawn)
- **Battery spawn:** Random among 5 predefined points (configurable)

### Watering & Refill

- **Can capacity:** 0–100 units
- **Watering:** Hold; 100 units → 5.0 s (linear). Partial allowed; progress persists per grave
- **Refill:** At any of 6 taps: hold; 0→100 in 3.0 s (linear). Partial allowed
- **Restrictions:** Cannot move while watering/refilling; can look. Flashlight off while watering; on allowed while refilling (default ON/OFF persists)

### Interaction

- **Controls:** Single action key for interact/water/refill
- **HUD:** Water 0–100, Targets X/8, Flashlight %, minimal crosshair + radial progress during holds
- **Audio:** Wind/leaves base loop; husband mumbling cues; small chimes on progress events

### Failure & End

- **Game over:** Husband within 5.0 m of player center → short stare cutscene → "Der Onkel hat dich gefunden!" → restart

---

## 2. Level Pipeline (GeoJSON → Game)

### Files

- `data/cemetery_final.geojson` (line-based map, 69KB)

### World Transform

- **Units:** 1 unit = 1 m
- **Origin:** GeoJSON centroid (~50.172849°N, 8.935045°E)
- **Rotation:** Align to principal axis ≈146° (NW–SE)
- **Storage:** `level.json`: `{ origin_lat, origin_lon, rotation_deg, scale: 1 }`

### Runtime Geometry Generation (No Preprocessing Needed)

1. **Load GeoJSON** and convert coordinates to local meters
2. **Generate path geometry** from LineStrings:
   - Use line coordinates as centerline
   - Apply width: gravel 2.0m, paved 2.5m, service 3.5m
   - Extrude rectangular cross-section along path
3. **Generate hedge geometry** from LineStrings:
   - Width: 1.0m, height: 1.5m
   - Create as tube or extruded rectangle
4. **Buildings:** Use polygons directly
5. **Z-order:** ground (0.0) < hedges (0.01) < paths (0.02) < props (0.03)

### Navigation Graph

- Build directly from path LineStrings
- Sample points every 8–10m along lines
- Connect nodes at intersections
- Remove edges crossing closed gates/fence
- Mark tap nodes (nearest path point)

### Spawn

- **Location:** Inside main gate: 1.0 m inward, perpendicular to fence; facing gate
- **Resolution:** From gate feature @id + normal

---

## 3. AI — Husband

### Rules

- **Movement:** Only on path graph (from `highway=path|footway|service`, blocked by closed gates/fence)
- **Speed:** 3.675 m/s (1.05× player walk). No sprint
- **Behavior:** Random path segments with bias toward areas containing targets (configurable weight)
- **Contact radius:** 5.0 m from player → end sequence
- **Audio:** Mumbling max radius 25 m; low drone under 10 m; stereo panning by relative angle

### Fairness

- No well anti-camping rules
- Does not enter within 12 m of spawn only
- Watering does not auto-cancel when he's close (player risk)

### Tuning (Configurable)

- Waypoint dwell 1–3 s random
- Turn rate limit during patrol to avoid jitter
- Optional "visit target graves sometimes" probability

---

## 4. Config Schema

All configs are small JSONs. Scalars are meters/seconds unless noted. IDs refer to GeoJSON @id where possible.

### level.json

```json
{
  "version": 1,
  "origin_lat": 50.172849,
  "origin_lon": 8.935045,
  "rotation_deg": 146,
  "scale": 1,
  "spawn_gate_id": "OSM_GATE_MAIN_ID_TBD",
  "spawn_offset_m": 1.0,
  "fog": { "near": 8, "far": 50 },
  "draw_order": ["ground", "hedge", "surface", "props"],
  "battery_spawn_point_ids": ["ID1", "ID2", "ID3", "ID4", "ID5"],
  "battery_count_per_run": 1,
  "tap_ids": ["TAP_ID_1", "TAP_ID_2", "TAP_ID_3", "TAP_ID_4", "TAP_ID_5", "TAP_ID_6"],
  "closed_gate_ids": ["..."]
}
```

### player.json

```json
{
  "walk_speed": 3.5,
  "sprint_speed": 5.0,
  "sprint_duration": 4.0,
  "fatigue_speed": 2.8,
  "fatigue_duration": 6.0,
  "sprint_cooldown": 4.0,
  "collision_radius": 0.35,
  "camera": { "fov": 75, "headbob": false, "mouse_sensitivity": 1.0 }
}
```

### flashlight.json

```json
{
  "max_energy_sec": 1200,
  "flicker_threshold": 0.3,
  "intensity_curve": "linear",
  "starts_on": true
}
```

### ambient.json

```json
{
  "darkness_timeline": [
    { "t": 0, "ambient": 0.6 },
    { "t": 300, "ambient": 0.3 },
    { "t": 600, "ambient": 0.0 }
  ],
  "skybox": "dusk_to_night",
  "wind_loop_db": -18,
  "leaves_loop_db": -20
}
```

### water.json

```json
{
  "can_max": 100,
  "water_grave_time_full": 5.0,
  "refill_time_full": 3.0,
  "allow_partial": true,
  "ui": { "show_crosshair_progress": true }
}
```

### ai_husband.json

```json
{
  "speed": 3.675,
  "contact_radius": 5.0,
  "avoid_spawn_radius": 12.0,
  "mumble_hear_max": 25.0,
  "drone_hear_min": 10.0,
  "waypoint_dwell_min": 1.0,
  "waypoint_dwell_max": 3.0,
  "target_bias_weight": 0.6,
  "turn_rate_deg_per_s": 180
}
```

### targets.json

```json
{
  "sets": [
    { "id": "A", "grave_ids": ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"] },
    { "id": "B", "grave_ids": ["..."] }
  ],
  "choose_one_random": true,
  "require_all_present": true
}
```

### audio.json

```json
{
  "master_db": -12,
  "categories": {
    "ambience": -18,
    "ui": -14,
    "husband": -10,
    "sfx": -12
  }
}
```

### debug.json

```json
{
  "show_navgraph": false,
  "show_colliders": false,
  "show_feature_bounds": false,
  "log_overlap_hotspots": true
}
```

---

## 5. Performance Budget & Quality Targets

- **FPS:** 60 on mid-range desktop GPU
- **Draw calls:** ≤ 400 total in busy view; use instancing for graves/props
- **Triangles:** Target ≤ 1.0–1.5 M in view; graves ≤ 400 tris each (instanced variants)
- **Textures:** Typical 1024² props, 2048² atlas max; compressed where possible
- **Shadows:** Off or baked/fake; use blob/hemisphere lighting + fog
- **Fog/view distance:** 50 m far (config)
- **Audio loudness:** Master around -12 dBFS, ambience lower (-18 to -20 dBFS)

---

## 6. Build & Runbook

### Project Structure (Suggested)

```
/data
  cemetery_game_final.geojson
  buffer-surfaces.js
/config
  level.json
  player.json
  flashlight.json
  water.json
  ai_husband.json
  targets.json
  audio.json
  debug.json
/src
  core/
  level/
  ai/
  ui/
  audio/
/assets
  textures/
  audio/
  models/
```

### Map Update Flow

1. Edit raw OSM/export (if needed)
2. Run preprocess (union surfaces, clip hedges, subtract buildings, mark gates)
3. Rebuild navgraph from path lines
4. Launch and verify: draw order, collisions, navgraph visualization
5. Log overlap hotspots to CSV (if any) for later Track A cleanup

### Swapping GeoJSON

- Replace file in `/data`, run preprocess, re-export metrics (surface counts, overlap m²)

### Attribution

- Include OSM contributors in credits

---

## 7. Test Plan / Acceptance (MVP)

### Must Pass

- Spawn inside gate, facing it; gate closed; movement works
- Darkness curve matches 0–5–10 min timings
- Flashlight drains on-time; battery resets to 100%
- All 6 taps refill; 0→100 in 3.0 s; partial refill works
- Watering any grave: 0→100 in 5.0 s; partial persists; flashlight disables while watering
- Husband stays on path graph; cannot cross closed gates; contact ≤5 m ends run
- Audio cues scale with distance
- Win triggers on 8/8; lose triggers on contact
- FPS target met in worst-case view

### Edge Cases

- Cancel watering/refill mid-hold retains progress
- Flashlight off during watering; resumes prior state afterward
- Battery cannot be picked twice; spawns at one of configured points
- Player cannot leave fence bounds; hedges/buildings collide as expected
- No navgraph edges through closed gates

---

## 8. Vision

### Experience

Grounded, intimate horror by scarcity and sound. Navigation tension from darkness, limited water, and an ever-present human presence.

### Design Pillars

1. **Route pressure:** Choose between safe refills vs efficient paths
2. **Sensory load:** Light and sound inform safety, not HUD spam
3. **Fair but fragile:** One mistake can end a 20-min run
4. **Data-driven:** Every number adjustable without code

### Evolvability

- Add "lady" ghost later (teleporting, line-of-sight breaks)
- Swap target sets, tune darkness/flashlight, vary husband bias
- Replace cemetery data without code changes (same schema)

---

## 9. Phases & Milestones (1 Week)

### Day 1 — Skeleton & Data

- Load GeoJSON, apply world transform, draw ground/surfaces/hedges/buildings
- Implement preprocess (union/clip/subtract/sliver cull)
- Basic camera + movement

### Day 2 — Systems

- Watering/refill mechanics + HUD
- Darkness timeline + flashlight energy + battery spawn

### Day 3 — AI & Graph

- Build path graph; husband patrol on graph; gate blocking
- Audio cues (mumble/drone)

### Day 4 — Targets & Win/Lose

- Target set loader (from `targets.json`), progress tracking
- Game over cutscene + win screen. Polish interaction prompts

### Day 5 — Performance & Polish

- Instancing for graves/props (placeholder for now)
- Fog tuning, audio mix, collision pass

### Day 6 — Bugfix & Test

- Acceptance checklist, overlap hotspot logging, navgraph debug

### Day 7 — Buffer & Nice-to-haves

- Optional small props pass (benches, lamps)
- Tune numbers; finalize credits/attribution

---

## 10. Open TBDs (Tracked)

- [ ] `spawn_gate_id` exact @id
- [ ] Battery spawn point IDs
- [ ] Grave placements (200) and target sets
- [ ] Sprint cooldown necessity/number
- [ ] Track A pipeline (lines+widths rebuffer with min hedge width) after MVP
