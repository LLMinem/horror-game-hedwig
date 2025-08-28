# Project Plan: First Playable Version

## Quick Start Strategy

**Goal:** Playable horror game on VPS within 7 days  
**Approach:** Vertical slice first, polish later  
**Testing:** Daily on VPS with real browsers

---

## Tech Stack (Locked In)

### Core
- **Three.js r170** (latest stable)
- **Vite** (bundler + dev server - fastest for rapid iteration)
- **No framework** (vanilla JS for speed)
- **No TypeScript** (for MVP - add later if needed)

### Quick Setup Commands
```bash
npm init -y
npm install three vite
npm install --save-dev @turf/turf  # for GeoJSON preprocessing
```

### File Structure
```
/src
  main.js                 # Entry point + game loop
  /core
    Game.js              # Main game class
    InputManager.js      # WASD + mouse
    ResourceLoader.js    # Assets + GeoJSON
  /world
    Level.js             # Map geometry from GeoJSON
    GeoProcessor.js      # Preprocess surfaces/hedges
    NavGraph.js          # Path graph for AI
  /player
    Player.js            # Movement + collision
    Flashlight.js        # Light management
    WaterCan.js          # Water resource
  /entities
    Husband.js           # Enemy AI
    Grave.js             # Target graves
    WaterTap.js          # Refill points
  /systems
    DarknessSystem.js    # Ambient light timeline
    AudioManager.js      # Spatial audio
    HUD.js               # Water/targets/flashlight UI
  /utils
    Constants.js         # All config values
    GeoUtils.js          # Lat/lon → local coords
/assets
  /audio
    wind-loop.mp3
    husband-mumble.mp3
  /textures
    grass.jpg
    gravel.jpg
    hedge.jpg
/config
  (JSON configs as per spec)
index.html
package.json
vite.config.js
```

---

## Development Phases (7 Days)

### Day 0: Foundation (4-6 hours)
**Goal:** Three.js scene with cemetery visible

1. **Setup** (1 hr)
   - Initialize npm project with Vite
   - Basic index.html with Three.js scene
   - Test local dev server

2. **GeoJSON Loader** (2 hrs)
   - Load `cemetery_game_final.geojson`
   - Convert WGS84 → local meters (origin at centroid)
   - Apply rotation (~146°)

3. **Basic Geometry** (2-3 hrs)
   - Ground plane (green)
   - Surface polygons (gravel/asphalt textures)
   - Hedge polygons (dark green boxes)
   - Building placeholders (gray boxes)
   
**Deliverable:** Static cemetery visualization running locally

---

### Day 1: Player Movement (8 hours)
**Goal:** Walk around cemetery with collision

1. **First-Person Camera** (2 hrs)
   - PointerLockControls setup
   - FOV 75, height 1.7m
   
2. **WASD Movement** (3 hrs)
   - Walk speed 3.5 m/s
   - Sprint implementation (5.0 m/s for 4s, fatigue to 2.8 m/s for 6s)
   - Smooth acceleration/deceleration
   
3. **Collision System** (3 hrs)
   - Player capsule (radius 0.35m)
   - Collision with hedges, buildings, fence
   - Simple raycasting or AABB checks
   
**Test:** Can walk entire cemetery, collisions work

---

### Day 2: Core Systems (8 hours)
**Goal:** Darkness, flashlight, water mechanics

1. **Darkness Timeline** (2 hrs)
   - Ambient light lerp: 0.6 → 0.3 → 0.0 over 10 min
   - Simple skybox color shift
   
2. **Flashlight** (3 hrs)
   - SpotLight attached to camera
   - 20 min linear drain (on-time only)
   - Flicker shader at <30%
   - Toggle with F key
   
3. **Water System** (3 hrs)
   - Can resource (0-100 units)
   - HUD display (top-right corner)
   - Hold E to water (placeholder interaction)
   - Partial water tracking
   
**Test:** Darkness works, flashlight drains, water UI visible

---

### Day 3: Interactables (8 hours)
**Goal:** Working graves and water taps

1. **Grave Placement** (2 hrs)
   - Place 200 graves (instanced boxes/crosses)
   - Mark 8 as targets (flowers visible)
   - Store water progress per grave
   
2. **Water Taps** (2 hrs)
   - Place 6 taps from GeoJSON
   - Refill interaction (hold E for 3s)
   - Visual feedback (progress ring)
   
3. **Interaction System** (4 hrs)
   - Raycast for nearest interactable
   - Hold-to-interact with progress
   - Cannot move while interacting
   - Flashlight off during watering
   
**Test:** Can water graves, refill at taps, progress persists

---

### Day 4: Enemy AI (8 hours)
**Goal:** Husband patrols and ends game on contact

1. **Navigation Graph** (3 hrs)
   - Build from path surfaces
   - Nodes every 8-10m
   - A* pathfinding or simple graph traversal
   
2. **Husband AI** (3 hrs)
   - Spawn at random path node
   - Wander between nodes
   - Speed 3.675 m/s
   - Avoid spawn area (12m radius)
   
3. **Detection & Game Over** (2 hrs)
   - Check distance to player each frame
   - ≤5m triggers game over
   - Simple fade to black + text
   
**Test:** Husband walks paths, game ends on contact

---

### Day 5: Audio & Polish (8 hours)
**Goal:** Atmospheric audio and core polish

1. **Spatial Audio** (3 hrs)
   - Wind/leaves ambient loop
   - Husband mumbling (25m radius)
   - Volume by distance
   
2. **HUD Polish** (2 hrs)
   - Water gauge
   - Target counter (X/8)
   - Flashlight battery bar
   - Crosshair with interaction prompts
   
3. **Win Condition** (1 hr)
   - Check if 8 targets watered
   - Victory screen
   
4. **Battery Pickup** (2 hrs)
   - Place at 1 of 5 random spots
   - Restore flashlight to 100%
   
**Test:** Full game loop works, audio creates tension

---

### Day 6: Optimization & Deployment (8 hours)
**Goal:** Runs at 60 FPS on target hardware, deployed to VPS

1. **Performance** (4 hrs)
   - Instanced rendering for graves
   - LOD for distant objects
   - Fog to limit draw distance (50m)
   - Texture compression
   - Profile with Chrome DevTools
   
2. **VPS Deployment** (2 hrs)
   - Build with Vite (`npm run build`)
   - Upload to VPS
   - Nginx config for static hosting
   - Test on multiple browsers
   
3. **Config System** (2 hrs)
   - Load JSON configs
   - Make key values tweakable
   - Debug mode with nav graph visualization
   
**Test:** 60 FPS on GTX 1060 equivalent

---

### Day 7: Bugfix & Balance (8 hours)
**Goal:** Stable, balanced, fun

1. **Playtesting** (4 hrs)
   - Full runs with family/friends
   - Note frustrations and bugs
   - Check all edge cases from spec
   
2. **Critical Fixes** (2 hrs)
   - Game-breaking bugs only
   - Collision glitches
   - Progress not saving
   
3. **Balance Tuning** (2 hrs)
   - Adjust speeds, distances
   - Darkness timing
   - Husband patrol patterns
   
**Final:** Playable build on VPS

---

## Rapid Development Tips

### Code Philosophy
- **No abstractions** - Write direct, simple code
- **Copy-paste is OK** - Refactor after MVP
- **Hardcode first** - Make configurable later
- **Test in browser constantly** - Every 30 min
- **Commit working states** - Can always roll back

### Quick Wins
1. Use Three.js examples as templates
2. Simple box geometry for everything initially  
3. Use dat.GUI for quick value tweaking
4. Console.log liberally (remove later)
5. Start with alert() for game over/win

### Asset Sources (Free)
- **Textures:** textures.com (free tier)
- **Audio:** freesound.org, zapsplat
- **Grass/gravel:** Poly Haven (CC0)
- **UI sounds:** Generate with sfxr

### Testing Checklist (Daily)
- [ ] Loads without errors
- [ ] Can walk full cemetery
- [ ] Flashlight works
- [ ] Can water at least one grave
- [ ] Can refill at tap
- [ ] Husband spawns and moves
- [ ] Game over works
- [ ] Runs at 60 FPS

---

## Deployment (VPS)

### Build Process
```bash
npm run build           # Creates dist/
scp -r dist/* meeq@188.34.153.87:~/projects/horror-game-hedwig/public/
```

### Nginx Config
```nginx
server {
    listen 80;
    server_name 188.34.153.87;
    root /home/meeq/projects/horror-game-hedwig/public;
    
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    location /assets {
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

### Quick Iteration
1. Dev locally with Vite hot reload
2. Test build locally
3. Deploy to VPS
4. Test on real devices
5. Share link for playtesting

---

## Risk Mitigation

### Biggest Risks
1. **GeoJSON complexity** → Preprocess offline, save simplified version
2. **Performance** → Start with fog, low poly, no shadows
3. **AI pathfinding** → Simple node-to-node, no complex avoidance
4. **Collision bugs** → Use simple sphere/AABB, not mesh-accurate
5. **Browser compatibility** → Test Chrome/Firefox only for MVP

### Fallback Options
- **Too slow?** Reduce grave count to 50
- **AI broken?** Make husband follow fixed patrol route
- **Collision issues?** Remove hedge collisions, keep only buildings
- **No time for audio?** Just wind loop + one mumble sound
- **Darkness broken?** Use simple fog instead

---

## Success Metrics

### Minimum Viable (Must Have)
- Loads and runs at 60 FPS
- Can complete full game loop
- Husband provides tension
- Water/flashlight resources work

### Good Enough (Should Have)  
- Audio adds atmosphere
- All 6 taps functional
- Proper win/lose screens
- Darkness progression feels right

### Stretch (Nice to Have)
- Multiple husband patrol patterns
- Footstep sounds
- Better grave models
- Hedge wind animation

---

## Next Steps After MVP

1. Add "lady" ghost (Week 2)
2. Improve graphics (Week 2)
3. Mobile support (Week 3)
4. Procedural grave placement (Week 3)
5. Multiple difficulty modes (Week 4)

---

## Questions to Resolve Before Starting

1. **Grave placement:** Manually place 200 graves or procedural generation along paths?
2. **Target selection:** Fixed 8 graves or random selection with constraints?
3. **Husband spawn:** Single spawn point or multiple possibilities?
4. **Asset style:** Realistic textures or stylized/low-poly?
5. **Save system:** Include checkpoint or always restart?

**Recommendation:** Start with simplest option for each, iterate based on playtesting.