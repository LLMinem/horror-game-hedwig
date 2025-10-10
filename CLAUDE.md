# CRITICAL PROJECT CONTEXT - READ FIRST

## ⚠️ THIS PROJECT IS PERSONAL AND IMPORTANT ⚠️

This horror game is being built to reconnect with someone important who rarely shows enthusiasm for anything. The visual quality matters as much as functionality. A single bad-looking build can kill all interest permanently.

## 👨‍💻 DEVELOPER CONTEXT

Michael is a beginner developer with 8 months of programming experience and ZERO experience with Three.js. This project serves two equally important purposes: building a beautiful horror game AND providing an interactive, patient learning environment for Three.js concepts. Every implementation should be explained in beginner-friendly terms, focusing on the WHY as much as the WHAT.

---

## MANDATORY WORKING PRINCIPLES

### 1. INCREMENTAL DEVELOPMENT - ONE STEP AT A TIME

**This is the MOST IMPORTANT principle.** Our workflow is:

- Implement exactly ONE feature or change
- Stop and explain what was done and why
- Show full, working code (not diffs)
- Wait for explicit approval before continuing
- NEVER cascade changes or jump ahead
- Maintain organic back-and-forth conversation

### 2. USE TODO LIST RELIGIOUSLY

- Track every task with TodoWrite tool
- Mark items complete when done
- Update if plans change
- Never work without tracking

### 3. FOLLOW THE CURRENT PLAN

<project-status>
Current Phase: Asset Integration Ramp-Up
Active Plan: docs/asset-integration-plan.md (active)
Next Priority: Bench + tree pipeline, lamp blocker fix, gameplay scaffolding
Last Verified: 2025-10-10 (5d9a3b4)
</project-status>

- Work through phases sequentially
- Don't skip ahead
- Each phase has specific checkpoints

### 4. VISUAL QUALITY MATTERS

- This is NOT a prototype - it needs to look good
- Better to have less content that looks great
- Use proper lighting, shadows, textures
- No heavy fog that obscures everything
- Test visuals at each step

### 5. NEVER CLAIM SOMETHING WORKS WITHOUT TESTING

- Run the code
- Verify it actually works
- Report what you tested and the results
- If unsure, say "I need to test this"

---

## COLLABORATION PROTOCOL (Follow Exactly)

1. **Summarize before doing.** Read relevant docs, summarize the plan back to Michael, produce a small TODO list with checkboxes.

2. **One step per turn.** Implement **exactly one step**, then stop. Show the code as a **full, self-contained file** (not a diff).

3. **Explain the why.** Before code, explain the concept(s) introduced in that step in beginner terms. Focus on Three.js learning.

4. **Call out manual actions.** If Michael must download a file or choose an asset, say so clearly and wait.

5. **Acceptance test.** Tell Michael _what to look for on screen_. Ask for approval before continuing.

6. **No cascade of changes.** Never jump to the next step without explicit "continue".

7. **Version awareness.** We use Three.js r179 - prefer up-to-date APIs; avoid outdated patterns.

8. **Rollback friendly.** If something looks worse, revert to the previous working state.

---

## PROJECT STRUCTURE (2025-10-10)

The refactor landed. This is the live layout agents should reference:

```
/src
  main.js                # ≤50-line entry point wiring everything
  config/Constants.js    # Scene defaults + GUI baseline values
  core/Engine.js         # Renderer, camera, clock, resize hooks
  atmosphere/Atmosphere.js # Skydome + THREE.Points stars + horror grading
  world/World.js         # Fog, lights, ground, placeholder props
  world/Environment.js   # HDRI loading + r179 envMap fixes + asset registration
  assets/Assets.js       # Shared GLTF/KTX2/Draco loaders
  assets/DevRoom.js      # Asset sandbox with street lamp + point light helper
  gameplay/PlayerController.js # Mouse look, WASD, flashlight control
  ui/DebugGui.js         # lil-gui panels, presets, front-matter-aware state
  loop/Loop.js           # Animation loop runner

/docs                    # Active guidance (asset integration) + /archive for history
/public/assets           # HDRIs, textures, prepared GLBs
```

Future additions: `gameplay/AIUncle.js`, `gameplay/Gameplay.js`, cemetery layout loaders once we decide how to ingest GeoJSON/DEM data.

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
- Clean, minimal UI
- Night HDRI for image-based lighting

### Level Design

- **Manual placement in Three.js for MVP** (no GeoJSON import)

---

## DOCUMENTATION STANDARDS

### YAML Frontmatter (REQUIRED for all markdown docs)

Every markdown file in this project MUST include YAML frontmatter:

```yaml
---
type: plan|guide|spec|context|adr|report
status: active|outdated|archived
created: YYYY-MM-DD
last_verified: YYYY-MM-DD
last_verified_commit: abc123f
owned_by: plan-tracker|ai-context|doc-auditor|human
supersedes: [optional-old-doc.md]
superseded_by: [optional-new-doc.md]
---
```

This enables agents to quickly assess documentation state using `head -10`.

### Documentation Maintenance Agents

The project uses specialized subagents for documentation:

- **plan-tracker**: Updates planning documents after commits (tracks completion)
- **ai-context**: Maintains this file's managed sections (suggest-first mode)
- **doc-auditor**: Weekly consistency checks (report-only, no auto-fixes)

Agents only modify their designated sections. XML-style tags mark managed content.

---

## CURRENT DEVELOPMENT STATUS

<active-files>
- docs/asset-integration-plan.md — Updated 2025-10-10 with Dev Room status + next asset targets
- docs/assets/pipeline-guide.md — Canonical Blender → GLB workflow (includes loader + env registration notes)
- docs/assets/street-lamp-scratchpad.md — Live log for the hero lamp (emissive binding, blocker TODO)
- src/assets/Assets.js & src/assets/DevRoom.js — Shared loaders + sandbox (always review before asset work)
- README.md — Repository orientation (snapshot: 2025-10-10)
</active-files>

<next-steps>
- Close lamp blocker work so the point light can sit inside the lantern again (issue #10)
- Run the bench + tree props through the pipeline, updating scratchpads + processing queue
- Sketch gameplay scaffolding entry points (`gameplay/Gameplay.js`, `gameplay/AIUncle.js`) once assets land
- Archive old specs/plans (done) and prepare for a fresh design document when gameplay resumes
- Decisions about GeoJSON/DEM ingestion live in the backlog (“Important & Not Urgent”)—do not tackle ad hoc
</next-steps>

---

## TESTING CHECKLIST (USE EVERY TIME)

Before claiming anything works:

- [ ] Code runs without errors
- [ ] Feature actually functions as intended
- [ ] Visuals look good
- [ ] Performance is acceptable (60 FPS)
- [ ] No console errors or warnings
- [ ] Tested all edge cases

---

## COMMON COMMANDS

- **Always** use `npm run dev -- --host` to run the dev server (accessible from network)
- **Format code:** `npx prettier --write "**/*.{js,json,md,html,css}"`
- **Check git status:** `git status`
- **View recent commits:** `git log -10 --format="%h %s%n%b%n---" --reverse`

---

## COMMUNICATION STYLE

When reporting:

- Be specific: "WASD movement works, tested all directions at 3.5 m/s"
- Show what was tested: "Flashlight toggles with F key, intensity at 50"
- Admit uncertainty: "I need to test if the double-click reset works on color picker"
- Request feedback: "Should I proceed to ground textures or adjust something first?"
- Explain Three.js concepts: "A normal map adds surface detail without geometry..."

Always maintain the educational, patient tone. Remember that Michael is learning Three.js through this project.

---

## KEY FILES TO REFERENCE

Refer to the <active-files> section above for current working files and guides.

---

## COMMON PITFALLS TO AVOID

1. **Rushing ahead** → Always wait for "continue" between steps
2. **Not explaining concepts** → Every Three.js feature needs beginner explanation
3. **Claiming without testing** → Always verify with actual testing
4. **Breaking the incremental flow** → One change at a time, no cascading
5. **Forgetting the learning aspect** → This is education + development

---

## REMEMBER THE GOAL

We're building something to make someone's face light up with enthusiasm. Every decision should support both technical excellence and visual appeal. Work methodically, test everything, explain clearly, and create something beautiful.

**Success = Working game + Beautiful visuals + Maintained enthusiasm + Three.js knowledge gained**
