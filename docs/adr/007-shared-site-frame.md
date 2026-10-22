# ADR-007: Share one metric site and height frame

**Status:** Accepted contract. **Retrospectively documented:** 2026-10-22.

Map-derived geometry, terrain samples, Blender sources and browser exports share one metric coordinate and height frame. Geographic source coordinates, projected local coordinates and exported runtime coordinates are different representations of the same site, not interchangeable numbers.

A shared origin, axes, vertical datum and height offset prevent independently authored objects and walking heights from drifting apart. Apply the defined axis conversion and height offset once; an extra hand rotation or repeated subtraction can produce internally plausible but mismatched terrain, models and movement. Raster sample placement matters as well as overall bounds.

The [data contract](../../data/README.md) is the sole operational authority for exact constants, transforms, raster ordering and height interpretation. A consistent transform does not make the underlying evidence survey-accurate; retain local discrepancies instead of forcing sources into agreement.

**Supported history:** [The source-only Atlas preparation on 2026-10-16](https://github.com/LLMinem/horror-game-hedwig/blob/c3d5ee4372d8d763b35dc69999f0bba0f18f78d2/docs/blueprint-preparation.md) records the shared frame and warns against double conversion and offset application. This is evidence of the established contract, not a reconstructed original debate about alternative coordinate systems.
