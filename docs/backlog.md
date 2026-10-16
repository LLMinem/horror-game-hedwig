---
type: backlog
status: active
last_verified: 2026-10-16
---

# Hedwig backlog

The ordered milestone lives in [the active plan](asset-integration-plan.md). This file holds secondary risks and deferred work, not a competing roadmap.

## Before production depends on them

- Maintain the owner-approved local snapshots under `/Users/meeq/.backups/horror-game-hedwig/` and preserve new source revisions before session end. An additional off-device backup remains recommended, not a blocker for the approved pilot; see [current evidence](readiness.md#pilot-approval-and-backup-2026-10-16).
- Use the acquired and registered TrueDOP, DGM1 and DOM1 inputs through [Blueprint preparation](blueprint-preparation.md). Acquisition is complete; local geometry and unseen dimensions still need comparison in each modeled section.
- Use the imported owner photo corrections and retain their uncertainty notes. The approved entrance/hall pilot and later section choices belong to the [active plan](asset-integration-plan.md). Agree target hardware/resolution before performance acceptance.
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
