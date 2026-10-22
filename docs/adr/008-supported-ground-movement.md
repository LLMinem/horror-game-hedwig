# ADR-008: Walk on supported ground, not invisible path corridors

**Status:** Accepted. **Owner decision recorded:** 2026-10-17. **Retrospectively documented:** 2026-10-22.

All rendered, supported terrain is walkable, including grass and any surrounding terrain margin. Paths describe paving, not invisible movement corridors. Retain collisions for represented, intentionally solid obstacles such as buildings, trunks, walls and closed gate parts, plus safety at the actual supported terrain edge.

The former pilot boundary and the cemetery polygon must not become hidden walking fences inside supported ground. A feature listed in the source map does not justify an invisible obstacle where that feature has not been represented. Rendered ground and movement support must agree; extending one without the other is not terrain expansion.

This replaces the path-restricted interpretation after owner reports of unexplained barriers. It defines movement semantics, not a permanent interpolation, collision or physics algorithm. Representative browser traversal and obstacle checks establish behavior; passing a selected route does not disprove problems elsewhere. Suspected foliage collisions were not established as the cause.

## Supported history

- [Issue #15](https://github.com/LLMinem/horror-game-hedwig/issues/15) records the owner's 2026-10-17 walking decision and rejection of invisible path corridors.
- [Issue #19](https://github.com/LLMinem/horror-game-hedwig/issues/19) records whole-cemetery terrain coverage without a new polygon restriction.
- [The recorded plan update](https://github.com/LLMinem/horror-game-hedwig/commit/1236ef6) joins those requirements; [PR #20](https://github.com/LLMinem/horror-game-hedwig/pull/20) records their implementation and later owner browser acceptance. That acceptance does not claim a fully modeled cemetery or authorize deployment.
