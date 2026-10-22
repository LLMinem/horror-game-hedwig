# ADR-005: Separate authoring sources from shipped derivatives

**Status:** Existing arrangement, documented retrospectively. **Documentation date:** 2026-10-22.

Editable manufacturing sources and private reference material are separate from the derivatives shipped to the browser. Blender working files, raw vendor inputs and private evidence support authoring; selected runtime exports serve the game. Source material is not automatically suitable or licensed for public distribution merely because a derivative can be shipped.

This arrangement emerged historically. It was **not** an informed choice to sacrifice full-clone reproducibility: Micha did not know the alternatives. Do not recast the missing sources as a chosen advantage or as informed acceptance of recovery risk.

The consequences are real: a Git clone does not reproduce the complete authoring environment, and a Git push does not back up ignored inputs or editable sources. Recovering and regenerating assets requires those materials separately. Preserve source revisions and follow the approved backup policy through the [Blender workbench](../assets/blender-workbench.md); use [local references](../local-references.md) for private evidence access. These guides own current operations, not the historical instructions below.

**Supported history:** [The pipeline guide introduced on 2025-09-25](https://github.com/LLMinem/horror-game-hedwig/blob/b73bdeaf0e33f0edea0a5ad4a0be5db274345097/docs/assets/pipeline-guide.md) records local Blender working files and committed GLB derivatives, with Git LFS only mentioned as a possible later change. It establishes the arrangement, not an original deliberation among storage alternatives. The owner's clarification that it was historically emergent is recorded by this documentation reset on 2026-10-22.
