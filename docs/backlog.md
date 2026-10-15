---
type: backlog
status: active
last_verified: 2026-10-10
---

# Hedwig backlog

The ordered milestone lives in [the active plan](asset-integration-plan.md). This file holds secondary risks and deferred work, not a competing roadmap.

## Before production depends on them

- Resolve independent source backup and demonstrate restoration; local snapshots and sibling blends are insufficient.
- Acquire/register bounded DGM1 and current DOP/TrueDOP clips with epoch, CRS, vertical datum, nodata and delivered licence. They are not verified local inputs yet.
- Review and confirm/correct photo camera locations, then determine visual coverage and a bounded first section. Agree target hardware/resolution before performance acceptance.
- Reconcile provenance of shipped HDRIs/grass textures, code licence metadata and release attribution before public redistribution. The cemetery pack's commercial-use permission is already confirmed.

## With the corresponding feature

- Shared coordinate/height contract, path junctions, collision and walkability: implement together with the site skeleton, not as disconnected systems.
- Visible loading/error state and asset readiness: current main only logs lamp/HDRI errors.
- Seeded variation and named review views: current stars/test props use random initialization; screenshots are not deterministic baselines.
- Environment lifecycle: review rapid HDRI-switch ordering, material arrays and PMREM render-target ownership when extending look-dev/load states.
- Player controller: replace flat height/bounds with terrain/collision queries; address input focus and per-frame allocations as part of that change.
- Shadows: ±18 m moon frustum is a local sandbox setup, not site-wide shadow coverage.
- Texture delivery: establish KTX2 conversion only when accepted content and measured cost justify it. Keep loader support separate from a claim of shipped KTX2 assets.

## Deliberately deferred

Gameplay/NPCs, interiors, weather/day-night systems, automatic deployment/VPS, MCP infrastructure, bulk asset conversion, framework/ECS rewrite and a new lint/test platform without a concrete need. Environmental audio remains a human scope choice. Bundle splitting should follow real loading requirements; the current large-chunk warning is not hidden by increasing its threshold.
