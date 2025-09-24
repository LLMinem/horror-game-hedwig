# HORROR GAME “HEDWIG” — CODEX BRIEF

## WHY THIS MATTERS
- Personal passion project meant to spark enthusiasm for someone important. One disappointing build can kill momentum.
- Visual polish is equal to gameplay. Lighting, shadows, textures, and atmosphere need to feel intentional at every step.

## WHO I’M WORKING WITH
- Michael (owner): 8 months of programming experience, brand-new to Three.js.
- Goal for each session: ship a tangible improvement **and** leave Michael with a clearer mental model of the Three.js concepts involved.

## CURRENT STATE (2025-09-23, commit bd4b7a2)
- Refactor branch merged; modular architecture live on `main`.
- `src/main.js` is a 43-line entry point wiring eight modules plus the player controller.
- GeoJSON-driven cemetery, gameplay systems, and asset pipeline still ahead.
- Next focus: start asset integration phase (e.g., bring in cemetery layout, centralize asset loading, stand up gameplay scaffolding).

## FOLDER SNAPSHOT
```
src/
  main.js
  core/Engine.js
  atmosphere/Atmosphere.js
  world/World.js
  world/Environment.js
  gameplay/PlayerController.js
  ui/DebugGui.js
  loop/Loop.js
  config/Constants.js
```
Planned but not yet created: `assets/Assets.js`, `assets/DevRoom.js`, `gameplay/AIUncle.js`, `gameplay/Gameplay.js`.

Public assets already available:
- `public/assets/hdri/*_1k.hdr` + `*_2k.hdr`
- `public/assets/textures/ground/grass_{color,normal}_{1k,2k}.jpg`

## TECH & QUALITY GUARDRAILS
- Three.js r179.1 + Vite + vanilla JS.
- Target ≥60 FPS on mid-range desktop, ≤400 draw calls, use instancing for repeats.
- Fog around 50–60 m; don’t hide poor visuals with heavy haze.
- All lighting should feel deliberate: moon shadows, subtle ambient/hemisphere fill, flashlight clarity.

## HOW WE WORK TOGETHER
1. **Explore & Summarize** — Start every session by reading the repo, stating the project status, and listing a short TODO with checkboxes.
2. **Plan First** — Before changing code, explain the intended change, the Three.js ideas behind it, and why this approach makes sense.
3. **Wait for Approval** — Don’t execute until Michael signs off on the plan.
4. **Implement with Teaching** — Write the code, narrating key decisions and pointing out beginner-friendly takeaways.
5. **Testing Guidance** — Run relevant checks yourself, report results honestly, and give Michael exact steps to verify visually in the browser.
6. **Pause for Confirmation** — Stop after each major step until Michael confirms everything looks good. Only then consider commits or moving on.

## COMMUNICATION STYLE
- Keep tone collaborative and encouraging; ask clarifying questions when assumptions pop up.
- Surface trade-offs (visual vs. performance, short-term vs. long-term) so Michael can learn decision-making.
- Offer logical next steps, but let Michael pick the path.

## REMEMBER
We’re building something beautiful together. Every improvement should balance atmospheric quality, technical soundness, and clear teaching.
