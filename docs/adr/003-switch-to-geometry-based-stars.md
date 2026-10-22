# ADR-003: Switch from Fragment Shader to Geometry-Based Stars

**Status:** Accepted. **Recorded decision date:** 2025-09-09 (retained from the pre-reset record). **Retrospective condensation:** 2026-10-22.

The original skydome star implementation changed apparent star positions and brightness as the camera moved. Replace that implementation with fixed `THREE.Points` geometry: explicit celestial directions and a bounded point count make stability and rendering cost easier to inspect. This requires geometry storage and separate star rendering rather than continuing the existing full-sky procedural calculation.

The failure was specific to the old shader's coordinates and sampling, not an inherent limitation of fragment shaders. Point rendering also uses shaders; it is not a rejection of shaders in general. This decision establishes neither a seeded star catalogue nor a performance guarantee.

## Provenance

- [Original ADR](https://github.com/LLMinem/horror-game-hedwig/blob/2a369914f13277292486f59588c8a1f72b93a11d/docs/adr/003-switch-to-geometry-based-stars.md) and [recorded date correction](https://github.com/LLMinem/horror-game-hedwig/commit/9796184586d72f9a093fb3a76d5ff9cc2d3ab07d). The correction replaced the original "December 2024" with 2025-09-09; this condensation retains that corrected date.
- [Pre-reset record and corrected rationale](https://github.com/LLMinem/horror-game-hedwig/blob/de720ff15c42ce730c12bf9229c0d662f268bfdf/docs/adr/003-switch-to-geometry-based-stars.md), including the historical implementation notes and browser measurements. Those bounded measurements are not evidence for other hardware or a fully modeled cemetery.
