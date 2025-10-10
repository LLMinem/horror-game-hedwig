---
type: report
status: archived
created: 2025-09-09
last_verified: 2025-09-09
last_verified_commit: 123df19
owned_by: human
supersedes: []
superseded_by: ["docs/adr/003-switch-to-geometry-based-stars.md"]
---

# 🌟 Star Field Performance Analysis: Will Your MacBook Catch Fire?

## Why keep this document?
This memo captures the September 2025 investigation into a fragment-shader based star field that has since been superseded. We keep it so future readers understand the performance envelope that made us comfortable experimenting with heavy atmospheric shaders before ADR-003 locked in the geometry-based solution.

## Key takeaways (legacy implementation)
- The procedural fragment shader cost roughly **0.5–1.0 ms per frame** on an M1-class GPU at 1080p—safe within the 16.7 ms budget for 60 FPS.
- Most of the work came from a predictable set of operations (hash noise, light-pollution math, altitude falloff) that played nicely with modern GPUs.
- Even after adding placeholder props, shadows, and post-processing, total frame time projections stayed under **7 ms** on the target hardware, leaving ample headroom.

## What changed afterwards?
- ADR-003 documents the pivot to **THREE.Points** geometry for production. That approach is simpler to reason about, eliminates view-dependent artifacts, and keeps the performance wins from this analysis.
- The Dev Room now demonstrates the final star system; refer to `src/atmosphere/Atmosphere.js` for the authoritative implementation.

## Archived Q&A
**Q: Was the fragment shader approach dangerous for laptops?**  
A: No. GPU parallelism kept the per-frame cost well below 1 ms.

**Q: Do we need the math breakdown anymore?**  
A: Not day-to-day. If you want the original deep dive (GPU vs CPU, operation counts, optimisation tricks), recover commit `123df19` from git history.

**Q: How do we evaluate new sky experiments now?**  
A: Profile with Chrome DevTools or the WebGL Inspector, but start from the geometry-based baseline. Use this archive only for historical comparisons.

---

_Archived September 2025 after ADR-003 replaced the fragment shader implementation._
