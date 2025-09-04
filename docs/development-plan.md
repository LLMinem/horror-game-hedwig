# Horror Game Development Plan - Methodical Approach

## Project Context

This game is deeply personal - it's about reconnecting with someone important through a shared creative project. The aesthetic quality matters as much as the functionality. We're building trust through small, verifiable wins.

**Core Principle:** Every phase must produce something that both works AND looks good enough to maintain enthusiasm.

---

## Development Philosophy

1. **Test Everything** - No claiming "it works" without verification
2. **Visual Priority** - Good-looking placeholder > ugly functional
3. **Incremental Progress** - Small commits at natural save points
4. **Frequent Check-ins** - Show progress regularly, get feedback
5. **Fix Before Moving On** - Never proceed with broken foundations

---

## Phase 1: Beautiful Foundation (Day 1 Morning)

**Goal:** A visually appealing Three.js scene that builds confidence

### Step 1.1: Project Setup (30 min)

- Initialize Three.js with Vite
- Create basic HTML structure
- Set up development server
- **TEST:** Browser shows a scene
- **COMMIT:** "Initial Three.js setup"

### Step 1.2: Atmospheric Scene (1 hour)

- Dark blue/purple gradient sky
- Subtle fog (start at 30m, fade to 60m - NOT heavy)
- Moonlight with soft shadows (PCFSoft)
- Ground plane with subtle grass texture
- **TEST:** Looks atmospheric, not foggy mess
- **COMMIT:** "Atmospheric night scene"

### Step 1.3: Camera Setup (30 min)

- First-person perspective at 1.7m height
- Smooth mouse look (not too sensitive)
- FOV 75 degrees
- **TEST:** Feels natural, not nauseating
- **COMMIT:** "First-person camera"

**Checkpoint:** Show brother - "This is the atmosphere we're going for"

---

## Phase 2: Movement That Feels Good (Day 1 Afternoon)

**Goal:** Smooth, responsive movement that works 100%

### Step 2.1: Basic WASD (1 hour)

- Forward/backward/strafe movement
- Walk speed 3.5 m/s
- Smooth acceleration/deceleration
- Movement relative to camera direction
- **TEST:** Can move in all directions smoothly
- **COMMIT:** "WASD movement working"

### Step 2.2: Sprint & Polish (30 min)

- Hold Shift to sprint (5.0 m/s)
- Sprint duration/fatigue system
- Subtle camera bob (optional)
- Footstep sounds
- **TEST:** Sprint feels good, audio syncs
- **COMMIT:** "Sprint and movement audio"

### Step 2.3: Movement Boundaries (30 min)

- Add temporary fence boundaries
- Simple collision detection
- Prevent walking through boundaries
- **TEST:** Can't leave play area
- **COMMIT:** "Collision boundaries"

**Checkpoint:** Show brother - "Look, we can walk around smoothly"

---

## Phase 3: The Cemetery Appears (Day 2 Morning)

**Goal:** Beautiful cemetery visualization without overlaps

### Step 3.1: Load GeoJSON (1 hour)

- Load cemetery_final.geojson
- Convert coordinates to local space
- Apply rotation (146°)
- **TEST:** Data loads, coordinates look right
- **COMMIT:** "GeoJSON loading"

### Step 3.2: Paths with Textures (2 hours)

- Generate path geometry from lines + width
- Gravel texture for paths (2.0m width)
- Asphalt for service roads (3.5m)
- Proper UV mapping
- NO OVERLAPS - verify visually
- **TEST:** Paths look natural, no z-fighting
- **COMMIT:** "Path generation from lines"

### Step 3.3: Hedges & Atmosphere (1 hour)

- Generate hedge geometry (1.0m × 1.5m)
- Dark green hedge texture
- Subtle wind shader (optional)
- Cast shadows
- **TEST:** Hedges frame paths nicely
- **COMMIT:** "Hedge generation"

### Step 3.4: Buildings & Polish (1 hour)

- Simple building geometry from polygons
- Dark windows, concrete texture
- Adjust lighting for mood
- Add ambient occlusion
- **TEST:** Cemetery feels real and atmospheric
- **COMMIT:** "Buildings and atmosphere"

**Checkpoint:** Show brother - "This is our cemetery"

---

## Phase 4: Core Interaction (Day 2 Afternoon)

**Goal:** Flashlight and water can mechanics

### Step 4.1: Flashlight System (1.5 hours)

- Spotlight attached to camera
- Toggle with F key
- Warm yellow light, not harsh white
- Subtle flicker animation
- Battery UI (top right, minimal)
- Linear drain over 20 minutes
- **TEST:** Light feels atmospheric, UI is clean
- **COMMIT:** "Flashlight system"

### Step 4.2: Darkness Timeline (1 hour)

- Gradual darkness over 10 minutes
- Start: twilight blue
- Middle: need flashlight
- End: pitch black except flashlight
- **TEST:** Progression feels natural
- **COMMIT:** "Darkness timeline"

### Step 4.3: Water Can UI (30 min)

- Water gauge (0-100)
- Clean, minimal design
- Interaction prompts ("E to water")
- **TEST:** UI doesn't clutter screen
- **COMMIT:** "Water can UI"

**Checkpoint:** Show brother - "The atmosphere is building"

---

## Phase 5: The World Comes Alive (Day 3)

**Goal:** Graves, water taps, and interaction

### Step 5.1: Grave Placement (2 hours)

- Place ~50 graves initially (not 200 yet)
- Simple but nice grave models
- Stone texture with wear
- Small variations in size/angle
- Flowers on 8 target graves
- **TEST:** Graves look respectful, varied
- **COMMIT:** "Grave placement system"

### Step 5.2: Water Taps (1 hour)

- Place 6 taps from GeoJSON
- Old metal tap models
- Rust/wear textures
- Dripping water particles (optional)
- **TEST:** Taps are findable, look good
- **COMMIT:** "Water tap placement"

### Step 5.3: Interaction System (2 hours)

- Raycast for nearest interactable
- Hold E to water/refill
- Progress ring animation
- Cannot move while interacting
- Flashlight off during watering
- Sound effects for water
- **TEST:** All interactions work smoothly
- **COMMIT:** "Interaction system complete"

**Checkpoint:** Show brother - "We can water graves now"

---

## Phase 6: The Threat (Day 4)

**Goal:** The husband AI that creates tension

### Step 6.1: Navigation Graph (2 hours)

- Build graph from path lines
- Visualize nodes (debug mode)
- Pathfinding algorithm
- **TEST:** Graph covers all paths
- **COMMIT:** "Navigation graph"

### Step 6.2: Husband Model & Animation (2 hours)

- Simple dark figure
- Walking animation
- Subtle idle movements
- Creepy but not comical
- **TEST:** Looks unsettling
- **COMMIT:** "Husband character"

### Step 6.3: AI Behavior (2 hours)

- Patrol along paths
- 3.675 m/s movement
- Mumbling sound (25m radius)
- Drone sound (10m)
- Detection at 5m
- **TEST:** Creates real tension
- **COMMIT:** "Husband AI patrol"

### Step 6.4: Game Over (1 hour)

- Detection triggers cutscene
- Husband stares at player
- Fade to black
- "Der Onkel hat dich gefunden!"
- Restart option
- **TEST:** Scary but not frustrating
- **COMMIT:** "Game over sequence"

**Checkpoint:** Show brother - "The horror element is here"

---

## Phase 7: Complete Game Loop (Day 5)

**Goal:** Win condition and full playability

### Step 7.1: Target System (1 hour)

- Track watered graves
- UI shows progress (X/8)
- Save progress per grave
- **TEST:** Progress persists correctly
- **COMMIT:** "Target tracking"

### Step 7.2: Win Condition (1 hour)

- Check for 8/8 completion
- Victory screen
- Completion time shown
- **TEST:** Can complete full game
- **COMMIT:** "Win condition"

### Step 7.3: Battery Pickup (1 hour)

- Place battery at random spot
- Glowing pickup effect
- Restores flashlight to 100%
- **TEST:** Pickup works, helps gameplay
- **COMMIT:** "Battery pickup"

### Step 7.4: Audio Polish (2 hours)

- Wind ambience loop
- Footstep variations
- Water sounds
- Creaking sounds
- Spatial audio working
- **TEST:** Audio enhances atmosphere
- **COMMIT:** "Audio system complete"

**Checkpoint:** Show brother - "The game is playable!"

---

## Phase 8: Polish & Performance (Day 6)

**Goal:** Beautiful, optimized experience

### Step 8.1: Visual Polish (2 hours)

- Better textures where needed
- Particle effects (leaves, dust)
- Improved lighting
- Post-processing (subtle)
- **TEST:** Looks professional
- **COMMIT:** "Visual polish pass"

### Step 8.2: Performance (2 hours)

- Instanced rendering for graves
- LOD for distant objects
- Texture optimization
- Draw call reduction
- **TEST:** Solid 60 FPS
- **COMMIT:** "Performance optimization"

### Step 8.3: More Graves (1 hour)

- Scale up to 200 graves
- Maintain performance
- **TEST:** Still runs at 60 FPS
- **COMMIT:** "Full grave population"

**Checkpoint:** Show brother - "It's beautiful and smooth"

---

## Phase 9: Final Testing (Day 7)

**Goal:** Bug-free, balanced experience

### Step 9.1: Full Playthrough Testing

- Complete game start to finish
- Test all edge cases
- Verify all mechanics
- Check for exploits

### Step 9.2: Balance Tuning

- Adjust speeds/timings
- Tweak difficulty
- Polish UI/UX

### Step 9.3: Final Build

- Production build
- Deploy to server
- Final testing

---

## Critical Success Factors

1. **Never proceed with broken features**
2. **Visual quality from the start**
3. **Test with brother at each checkpoint**
4. **Commit at every working state**
5. **Fix immediately if something breaks**

## Emergency Fallbacks

- If movement breaks → Revert to last working commit
- If performance tanks → Reduce grave count
- If AI is too complex → Simple patrol route
- If timeline too tight → Cut features, not quality

---

## Remember

This project matters because it's about connection, not just code. Every decision should support both technical excellence and visual appeal. The game needs to look good enough to maintain enthusiasm while being built properly to actually work.

**The goal:** When your brother sees the game, his face lights up again.
