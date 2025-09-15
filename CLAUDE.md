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
Current Phase: Ground Textures Implementation
Active Plan: docs/night-scene-makeover-guide.md
Next Priority: Ground texture with micro-detail
Last Verified: 2025-09-15 (1686556)
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

5. **Acceptance test.** Tell Michael *what to look for on screen*. Ask for approval before continuing.

6. **No cascade of changes.** Never jump to the next step without explicit "continue".

7. **Version awareness.** We use Three.js r179 - prefer up-to-date APIs; avoid outdated patterns.

8. **Rollback friendly.** If something looks worse, revert to the previous working state.

---

## PROJECT STRUCTURE (Planned - Not Yet Implemented)

Currently, we're working entirely in `src/main.js` during the learning/prototyping phase. The planned structure for later refactoring:

```
/src
  main.js              # Current working file (everything here for now)
  /core               # Future: Engine and game loop
  /world              # Future: Level generation from GeoJSON
  /player             # Future: Movement and controls
  /entities           # Future: Husband, graves, taps
  /systems            # Future: Darkness, audio, HUD
  /utils              # Future: Helpers and constants

/data
  cemetery_final.geojson  # Line-based map (DO NOT read directly - too much context)
  
/docs
  night-scene-makeover-guide.md  # CURRENT IMPLEMENTATION GUIDE
  development-plan.md             # High-level phases (reference only)
  spec.md                        # Technical specification (older, take with grain of salt)

/public/assets
  /hdri               # Night environment maps
  /textures           # Visual assets (to be added)
  /audio              # Sound effects (future)
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
- Clean, minimal UI
- Night HDRI for image-based lighting

---

## CRITICAL MAP INFORMATION

### DO NOT READ cemetery_final.geojson DIRECTLY

- It's 69KB of coordinates - will pollute context
- It's LINE-BASED, not polygons
- Generate geometry at runtime from lines + width

### Map Pipeline (Future Discussion)

The approach to converting the GeoJSON map is still to be determined. Options include:
1. Runtime generation from lines (original plan)
2. Alternative simplified approach
3. Manual placement for MVP

This will be discussed and decided when we reach that phase.

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
owned_by: plan-tracker|claude-context|doc-auditor|human
supersedes: [optional-old-doc.md]
superseded_by: [optional-new-doc.md]
---
```

This enables agents to quickly assess documentation state using `head -10`.

### Documentation Maintenance Agents

The project uses specialized subagents for documentation:

- **plan-tracker**: Updates planning documents after commits (tracks completion)
- **claude-context**: Maintains this file's managed sections (suggest-first mode)
- **doc-auditor**: Weekly consistency checks (report-only, no auto-fixes)

Agents only modify their designated sections. XML-style tags mark managed content.

---

## CURRENT DEVELOPMENT STATUS

<active-files>
- src/main.js - Primary implementation file
- docs/night-scene-makeover-guide.md - Current development guide
- docs/atmospheric-sky-implementation-plan.md - Completed reference
- CLAUDE.md - This file (project context)
</active-files>

<next-steps>
- Ground texture application (color + normal maps)
- Fog fine-tuning
- Shadow quality optimization
- Dev room for asset testing
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
- **View recent commits:** `git log -10`

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

- **CURRENT GUIDE:** `@docs/night-scene-makeover-guide.md` - The step-by-step implementation plan
- High-level overview: `@docs/development-plan.md` - General project phases
- Technical details: `@docs/spec.md` - Original spec (take with grain of salt)
- This file: `CLAUDE.md` - Project context and working principles

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