# CRITICAL PROJECT CONTEXT - READ FIRST

## ⚠️ THIS PROJECT IS PERSONAL AND IMPORTANT ⚠️

This horror game is being built to reconnect with someone important who rarely shows enthusiasm for anything. The visual quality matters as much as functionality. A single bad-looking build can kill all interest permanently.

## 👨‍💻 DEVELOPER CONTEXT

I am a beginner developer with 8 months of programming experience and ZERO experience with Three.js. This project serves two equally important purposes: building a beautiful horror game AND providing an interactive, patient learning environment for Three.js concepts. Every implementation should be explained in beginner-friendly terms, focusing on the WHY as much as the WHAT.

---

## MANDATORY WORKING PRINCIPLES

### 1. INCREMENTAL DEVELOPMENT

**This is the MOST IMPORTANT principle.** Our workflow is:

- A natural back-and-forth conversation
- I ask questions, you explain in a beginner-friendly way
- Stop and explain what was done and _why_ it was done that way

### 2. FOLLOW THE CURRENT PLAN

<project-status>
Current Phase: Refactor COMPLETE - Ready for merge
Active Plan: docs/pragmatic-refactor-plan.md (100% complete)
Next Priority: Merge to main branch, then asset integration
Last Verified: 2025-09-22 (1ba0274)
</project-status>

### 3. VISUAL QUALITY MATTERS

- This is NOT a prototype - it needs to look good
- Better to have less content that looks great
- Use proper lighting, shadows, textures
- No heavy fog that obscures everything
- Test visuals at each step

### 4. NEVER CLAIM SOMETHING WORKS WITHOUT TESTING

- Run the code
- Verify it actually works
- Report what you tested and the results
- Give me explicit testing instructions after every change
- Only commit after I confirm that nothing broke

---

## COLLABORATION PROTOCOL

1. **Summarize before doing.** Read relevant docs, summarize the plan back to me, produce a small TODO list with checkboxes.

2. **Explain the why.** Before writing code, explain the concept(s) introduced in that step in beginner terms. Focus on Three.js learning.

3. **Call out manual actions.** If I must download a file or choose an asset, say so clearly and wait.

4. **Acceptance test.** Tell me _what to look for on screen_.

5. **Version awareness.** We use Three.js r179 - prefer up-to-date APIs; avoid outdated patterns.

---

## PROJECT STRUCTURE

```
/src
  main.js              # Entry point
  /core
    Engine.js          # Renderer, scene, camera, clock, resize
  /atmosphere
    Atmosphere.js      # Sky + stars together (one visual system)
  /world
    World.js           # Fog, lights, ground, test objects
    Environment.js     # HDRI loading, envMap fixes for r179
  /gameplay
    PlayerController.js # Mouse look + WASD movement + flashlight
    AIUncle.js         # Future: Uncle pathing AI
    Gameplay.js        # Future: Game logic, win/lose conditions
  /assets
    Assets.js          # Asset loading utilities
    DevRoom.js         # Future: Asset testing area
  /ui
    DebugGui.js        # All lil-gui controls in one place
  /loop
    Loop.js            # Animation loop
  /config
    Constants.js       # SCENE_CONSTANTS + defaults

/docs                  # Project documentation (see <active-files> for current files)

/public/assets
  /hdri                # Night environment maps
  /textures            # Ground and asset textures
  /audio               # Sound effects (future)
```

---

## TECHNICAL REQUIREMENTS

### Core Stack

- **Three.js r179.1** (latest stable)
- **Vite** (dev server and bundler)
- **Vanilla JavaScript** (no framework)
- **No TypeScript** for MVP
- **lil-gui** for developer controls

### Performance Targets

- **60 FPS** on mid-range desktop
- **≤400 draw calls** maximum
- Instancing for repeated objects
- Fog distance ~50-60m (subtle, not heavy)

### Visual Standards

- Atmospheric lighting (moonlight, soft shadows)
- Quality textures (1024x1024 minimum)
- No z-fighting or overlapping geometry

---

## CURRENT DEVELOPMENT STATUS

<active-files>
- docs/pragmatic-refactor-plan.md - COMPLETE refactor plan (100% done)
- src/main.js - Ultra-clean 44-line entry point (refactored)
- All 12 modules successfully created and working
- AGENTS.md - This file (project context)
</active-files>

<next-steps>
- Merge refactor/pragmatic to main branch (immediate priority)
- Begin asset integration phase (post-merge)
- Consider future features (physical moon, clouds, Uncle AI)
- All refactor goals achieved (97.5% code reduction)
- All known issues fixed (HDRI switching, linear fog)
</next-steps>

---

## COMMON COMMANDS

- **Always** use `npm run dev -- --host` to run the dev server (accessible from network)
- **Format code:** `npx prettier --write "**/*.{js,json,md,html,css}"`
- **Check git status:** `git status`
- **View recent commits:** `git log -10 --format="%h %s%n%b%n---" --reverse`

---

## KEY FILES TO REFERENCE

Refer to the <active-files> section above for current working files and guides.

---

## REMEMBER THE GOAL

We're building something to make someone's face light up with enthusiasm. Every decision should support both technical excellence and visual appeal. Work methodically, test everything, explain clearly, and create something beautiful.

**Success = Working game + Beautiful visuals + Maintained enthusiasm + Three.js knowledge gained**
