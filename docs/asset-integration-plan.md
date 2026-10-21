---
type: plan
status: active
created: 2025-09-23
last_verified: 2026-10-21
---

# Hedwig environment direction and next sessions

## Accepted direction

Reconstruct Neuer Friedhof in Bruchköbel as faithfully as the available evidence and browser performance allow, at dusk or night. The entrance/hall and whole-cemetery ground prototype is accepted. Micha has approved planning the next milestone: a complete exterior environment at quality option B, with convincing materials and vegetation, varied representative grave fields, and high detail fidelity for the funeral hall/chapel, large wooden bell tower and other recognizable landmarks. Desktop/laptop browsers are the target, not mobile devices. Gameplay, NPCs and interiors remain outside this milestone. Deployment and public release require separate authorization.

Prefer reference-backed, agent-authored site geometry. Reuse complex assets where they fit, with source and licence checks. Keep the canonical GeoJSON and stable IDs unchanged. [Blueprint preparation](blueprint-preparation.md) owns the site frame, terrain and corrected photo inputs. The rejected agent tracings remain excluded.

Micha authorizes selective purchases within a EUR 50 total budget for new assets across the project. Agents may select assets that save substantial work, improve achievable quality, reduce iteration or reduce his review burden. Prefer buying suitable complex assets over lengthy hand-authoring when those benefits justify the cost. Track taxes, fees and remaining budget; seek further approval before exceeding EUR 50. Check fit and licence, reuse existing assets where suitable, and request owner attention only for necessary payment/account actions or material unresolved choices. The budget is not a spending target.

Micha reports that the project is about a year old or older, with at least roughly nine months of inactivity before development resumed in recent weeks. Treat inherited technical choices as open to evidence-based improvement, not as fixed requirements or proof that a rewrite is needed. The goal is a coherent, manageable project and useful agent tooling.

The current intention is to build the full game with Three.js. Micha may later consider Unreal Engine or another engine if actual resource scale, visual quality, performance or gameplay needs justify it. This is not a permanent stack commitment, but no engine migration, comparison project or preparatory abstraction is currently requested.

## Current pilot and review

The first entrance/hall implementation brief has reached its requested textured browser checkpoint. Micha reviewed the pilot and considers it a useful basis for continued work. He explicitly did not describe the modeling as finished or fully accurate.

The supported-ground movement and whole-cemetery terrain milestone is implemented. Paths no longer define invisible walking corridors. Visible hall, gate and trunk obstacles remain, together with safety at the finite terrain edge. Two entrance approach width changes now taper instead of ending in square steps. The suspected foliage collision was never established and is not claimed as a separate diagnosed fix.

The current source is `assets/source/working/entrance-hall-pilot/r06-site/entrance-hall.blend`, with `entrance-hall-review.blend` beside it. It preserves all old pilot ground samples and adds a 239 × 253 sample heightfield across the cemetery and surrounding margin. Vegetation still comes from `vegetation-r06/vegetation-r06.blend`. Runtime derivatives remain under `public/assets/models/pilot/`. The old sources and `checkpoint/pre-entrance-hall-pilot` remain unchanged. Heights, widths, species and facade details remain estimates; final human art acceptance is outstanding.

The [original pilot brief](archive/entrance-hall-pilot-plan-2026-10-16.md#decision-and-scope) preserves its authoring bounds, source IDs and estimates. [Readiness](readiness.md#final-pilot-checkpoint-and-single-qa-2026-10-16) records the completed single heavy QA, applied findings, measurements and source backup. Those records describe a first pilot, not full-site fidelity or complete collision coverage.

## Where planning lives

GitHub Issues own concrete work packages, acceptance criteria and their current status. This file owns direction, session order and scope decisions. Workflow guides own reusable commands and contracts. `docs/readiness.md` records exercised results and their limits. Do not maintain another task checklist in Markdown alongside the issues.

Before opening an issue, check for an existing matching item. Group related small observations into a useful work package rather than tracking every art blemish. Distinguish observed failures, suspected causes and optional solution ideas. Close an implemented issue with the relevant commit and exercised evidence; keep unresolved external dependencies visible. The `deferred` label means that an issue is retained but is not part of the next session.

The repository and its issues are public. Keep private photographs, metadata, inscriptions, source packs, credentials and unsanitized evidence local. Link to tracked guidance and summarize the relevant observation instead of uploading the private reference set.

The [previous Markdown backlog](archive/backlog-before-issues-2026-10-16.md) is archived. Historical proposals #1, #5, #7 and #9 were closed as superseded or not planned. The current milestone also addresses atmosphere issues #3/#4 and sandbox lamp issue #10 through focused source and browser checks.

## Implemented milestone

The approved session combined #12/#13 tooling, #14 Blender warning classification, #15 natural walking and #19 whole-site ground. Browser checks now assert the viewport, DPR, drawing buffer and saved PNG dimensions, including high-resolution capture. JavaScript definitions/references work through the project language server, and Python roles remain separate.

The scene keeps the existing hall platform and site frame. Ground covers the cemetery with an approximately eight-metre margin, without a walking fence along the cemetery polygon. New review views expose distant areas and the full footprint. The expanded area is a ground foundation, not a detailed cemetery reconstruction.

Micha reviewed and tested the latest browser version, reported no unusual behavior and explicitly approved merging [PR #20](https://github.com/LLMinem/horror-game-hedwig/pull/20), which is now merged. The milestone is accepted as the current environment prototype, not as a finished detailed reconstruction. Source and browser evidence, performance conditions and remaining limits belong in [readiness](readiness.md). Deployment and public release still require separate authorization. The next production entry point is the first session ticket below; ticket creation itself has not started scene production.

## Following production sessions

The [whole-cemetery specification, #21](https://github.com/LLMinem/horror-game-hedwig/issues/21), is the single detailed milestone spec. Micha approved the entire spec, including its explicit defaults, and authorized ticket creation. The [approval and publication record](https://github.com/LLMinem/horror-game-hedwig/issues/21#issuecomment-6313191368) records that approval without rewriting the published spec. Thirteen native session sub-issues now exist. [Session 01, #22](https://github.com/LLMinem/horror-game-hedwig/issues/22), is the first ticket with no open issue blockers. No modeling or purchasing occurred during this planning step.

The accepted strategy is a bounded whole-site structural pass, a small adjoining grave/path/vegetation section demonstrating the intended finished browser quality, a first larger area with early realistic-density checks, then connected regional completion and final cohesion. Preserve and improve the existing pilot rather than rebuilding it. Each production package includes source work, export, browser integration and local polish. Landmark fidelity has its own acceptance gate; representative ordinary graves do not lower that requirement.

The native sub-issues own session outcomes, acceptance criteria and split conditions. Twelve tickets were created and the existing vegetation issue was reused for Session 03. Seventeen native blocking relationships encode actual prerequisites, not a mandatory serial order; a `ready-for-agent` label does not override open blockers or external acceptance prerequisites. The parent remains open and is not a blocker of its own children. The earlier estimate of roughly twelve to sixteen sessions is conditional, not a measured forecast or upper bound. Re-estimate after the accepted quality section and first larger area. This document does not duplicate the ticket checklist.

The existing follow-up issues are treated as follows:

- [#16](https://github.com/LLMinem/horror-game-hedwig/issues/16) stays deferred until the game is worth sharing and loading or package size is a significant problem. Then measure the relevant costs before choosing changes. It is not an automatic optimization gate before sharing, and a build warning alone does not justify texture conversion or code splitting.
- [#17](https://github.com/LLMinem/horror-game-hedwig/issues/17) is now Session 03, covering vegetation fit and the integrated representative section's visual approval. It is labelled `ready-for-agent`, no longer `deferred`, and is blocked by the preceding grave/path/material section. Its original scope and sourcing policy are preserved in its history. Use the approved project-wide asset budget where buying provides the stated benefits; current forms remain approximations until the new source/browser review.

Review HDRI-switch ordering, PMREM ownership and scene disposal when extending the relevant loading or scene lifecycle. Assess seeded variation and wider shadow coverage with the views and area that need them. These are feature-linked design checks, not a new platform rewrite or an exhaustive backlog.

Micha approved the mid-range hardware, browser, resolution and frame-time reference specified in #21. Actual access to that reference device is not established and remains a prerequisite for the formal density/performance acceptance. M3 Max measurements do not prove that target. Reconcile shipped grass/HDRI provenance, code-licence metadata and attribution before public release. Existing pack commercial permission does not establish the fit of every asset. Audio remains outside this milestone.

## Before modifying sources

Keep raw pack files and existing Blender revisions unchanged. Author new revisions through the [Blender workbench](assets/blender-workbench.md) and [pipeline checklist](assets/pipeline-guide.md). Preserve source/browser appearance as separate review steps. Git does not back up ignored sources or private references.

Micha approved local snapshots beneath `/Users/meeq/.backups/horror-game-hedwig/`. Preserve valuable revisions before changing them and back up each reviewable new Blender revision, textures and authoring inputs before session end. Never overwrite the pre-pilot snapshot or silently prune older snapshots. Keep manifests and private recovery evidence local.

The local snapshots protect against working-copy mistakes, not loss of the Mac. The [recorded restore and copy evidence](readiness.md#pilot-approval-and-backup-2026-10-16) remains applicable. Micha confirms an external Time Machine drive and accepts it as sufficient independent protection. [#18](https://github.com/LLMinem/horror-game-hedwig/issues/18) is closed at his request; no separate backup investigation or restore exercise is required. Current Time Machine coverage and recovery were not verified by the agents. Retain the local snapshots, and keep private or non-redistributable sources out of this public Git repository.
