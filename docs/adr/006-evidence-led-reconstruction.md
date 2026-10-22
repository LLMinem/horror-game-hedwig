# ADR-006: Reconstruct from evidence, not plausible traces

**Status:** Accepted direction. **Retrospectively documented:** 2026-10-22.

Use the unchanged source map and its stable feature IDs as the reconstruction baseline, comparing local discrepancies against official Hessen aerial imagery, numeric terrain and corrected ground photographs. No one source answers every question:

- The source map supplies recorded plan structure, not a survey or complete site inventory.
- Official aerial imagery helps compare visible boundaries and roofs; occlusion remains, and roof outlines need not be wall footprints.
- DGM supplies ground elevation, not small constructed details or object heights. DOM supplies dated upper-surface evidence, not current tree measurements.
- Ground photographs support appearance, materials and visible form. Owner corrections govern camera placement where supplied; camera coordinates do not locate the photographed object or establish calibrated pose.

Retain stable IDs, source dates, provenance, owner notes and unresolved uncertainty with local claims. The Atlas combines evidence for comparison; it does not turn a plausible interpretation into an approved construction plan. Source comparison and human visual acceptance remain distinct from technical file checks and browser acceptance.

Micha rejected the agent-drawn interpretation layer as inaccurate. Its traces, derived sheets and interpretation reports remain excluded from active modeling evidence, rather than becoming optional overlays or a second baseline. Corrections must be local and evidence-backed, not another unsupported whole-site redraw.

**Supported history:** [Source-only Atlas preparation on 2026-10-16](https://github.com/LLMinem/horror-game-hedwig/blob/c3d5ee4372d8d763b35dc69999f0bba0f18f78d2/docs/blueprint-preparation.md) records the rejection, evidence roles and uncertainty limits. The current [data contract](../../data/CLAUDE.md) owns exact data rules; [local references](../local-references.md) owns evidence access and correction operations. This record does not invent an earlier decision date.
