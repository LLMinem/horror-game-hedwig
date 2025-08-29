# CRITICAL PROJECT CONTEXT - READ FIRST

## ⚠️ THIS PROJECT IS PERSONAL AND IMPORTANT ⚠️

This horror game is being built to reconnect with someone important who rarely shows enthusiasm for anything. The visual quality matters as much as functionality. A single bad-looking build can kill all interest permanently.

---

## MANDATORY WORKING PRINCIPLES

### 1. NEVER CLAIM SOMETHING WORKS WITHOUT TESTING
- Run the code
- Verify it actually works
- Report what you tested and the results
- If unsure, say "I need to test this"

### 2. INCREMENTAL DEVELOPMENT ONLY
- Small, working pieces
- Commit at natural save points
- Never move forward with broken code
- Fix immediately if something breaks

### 3. VISUAL QUALITY MATTERS
- This is NOT a prototype - it needs to look good
- Better to have less content that looks great
- Use proper lighting, shadows, textures
- No heavy fog that obscures everything
- Test visuals at each step

### 4. FOLLOW THE PLAN
- Read: `@docs/development-plan.md`
- Work through phases sequentially
- Don't skip ahead
- Each phase has specific checkpoints

### 5. USE TODO LIST RELIGIOUSLY
- Track every task
- Mark items complete when done
- Update if plans change
- Never work without tracking

---

## PROJECT STRUCTURE

```
/src
  main.js              # Entry point
  /core               # Engine and game loop
  /world              # Level generation from GeoJSON
  /player             # Movement and controls
  /entities           # Husband, graves, taps
  /systems            # Darkness, audio, HUD
  /utils              # Helpers and constants

/data
  cemetery_final.geojson  # Line-based map (DO NOT read directly - too much context)
  CLAUDE.md              # This file

/config               # JSON configuration files

/docs
  spec.md              # Technical specification
  development-plan.md  # Phased development approach
  project-plan-draft.md # Original planning

/assets
  /audio              # Sound effects and ambience
  /textures           # Visual assets
```

---

## TECHNICAL REQUIREMENTS

### Core Stack
- **Three.js r170** (latest stable)
- **Vite** (dev server and bundler)
- **Vanilla JavaScript** (no framework)
- **No TypeScript** for MVP

### Performance Targets
- **60 FPS** on mid-range desktop
- **≤400 draw calls** maximum
- Instancing for repeated objects
- Fog distance ~50-60m (not heavy)

### Visual Standards
- Atmospheric lighting (moonlight, soft shadows)
- Quality textures (1024x1024 minimum)
- No z-fighting or overlapping geometry
- Clean, minimal UI

---

## CRITICAL MAP INFORMATION

### DO NOT READ cemetery_final.geojson DIRECTLY
- It's 69KB of coordinates - will pollute context
- It's LINE-BASED, not polygons
- Generate geometry at runtime from lines + width

### Map Pipeline
1. Load GeoJSON
2. Convert coordinates to local meters
3. Apply 146° rotation
4. Generate geometry from lines:
   - Paths: 2.0-3.5m width
   - Hedges: 1.0m width, 1.5m height
5. Build navigation graph from path centerlines

---

## CURRENT PHASE TRACKING

**Current Phase:** [Check development-plan.md]
**Last Working Commit:** [Update when committing]
**Known Issues:** [Track any problems]

---

## TESTING CHECKLIST (USE EVERY TIME)

Before claiming anything works:
- [ ] Code runs without errors
- [ ] Feature actually functions
- [ ] Visuals look good
- [ ] Performance is acceptable
- [ ] No console errors or warnings

---

## COMMON PITFALLS TO AVOID

1. **Movement not working** → Test WASD in all directions, verify camera-relative
2. **Overlapping geometry** → Generate from lines, not polygons
3. **Too much fog** → Start at 30m, fade to 60m
4. **Ugly lighting** → Use soft shadows, warm colors
5. **Claiming fixes** → Always verify with actual testing

---

## COMMUNICATION STYLE

When reporting:
- Be specific: "WASD movement works, tested all directions at 3.5 m/s"
- Show visuals: "The cemetery looks atmospheric with subtle fog"
- Admit uncertainty: "I need to test if sprint works"
- Request feedback: "Should I proceed to the next phase?"

---

## KEY FILES TO REFERENCE

- Game specification: `@docs/spec.md`
- Development phases: `@docs/development-plan.md`
- Map data info: `@data/CLAUDE.md`

---

## REMEMBER THE GOAL

We're building something to make someone's face light up with enthusiasm. Every decision should support both technical excellence and visual appeal. Work methodically, test everything, and create something beautiful.

**Success = Working game + Beautiful visuals + Maintained enthusiasm**