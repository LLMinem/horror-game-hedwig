---
type: plan
status: active
created: 2025-09-23
last_verified: 2026-10-17
---

# Hedwig environment direction and next sessions

## Accepted direction

Reconstruct Neuer Friedhof in Bruchköbel as faithfully as the available evidence and browser performance allow, at dusk or night. The current milestone is a walkable environment prototype. Gameplay, NPCs, interiors and a whole-site rewrite are outside the current work. Deployment and public release require separate authorization.

Prefer reference-backed, agent-authored site geometry. Reuse complex assets where they fit, with source and licence checks. Keep the canonical GeoJSON and stable IDs unchanged. [Blueprint preparation](blueprint-preparation.md) owns the site frame, terrain and corrected photo inputs. The rejected agent tracings remain excluded.

## Current pilot and review

The first entrance/hall implementation brief has reached its requested textured browser checkpoint. Micha reviewed the pilot and considers it a useful basis for continued work. He explicitly did not describe the modeling as finished or fully accurate.

His feedback identifies jagged path sections and unexpected, irregular invisible barriers. He also suspects collision near tree foliage, but has no clear evidence for that interpretation. The path and barrier observations are accepted; their causes and the foliage suspicion remain unverified. [Issue #15](https://github.com/LLMinem/horror-game-hedwig/issues/15) owns the bounded investigation and correction. Passing the earlier selected route does not prove that all nearby walking areas work correctly.

The baseline is commit `981fd64` on `feat/entrance-hall-pilot`. The current export source is `assets/source/working/entrance-hall-pilot/r05/entrance-hall.blend`, with `entrance-hall-review.blend` beside it for combined inspection. Vegetation comes from `vegetation-r06/vegetation-r06.blend`. The runtime derivatives remain under `public/assets/models/pilot/`. Heights, widths, plant forms and some facade details remain estimates. Separate final source and browser art acceptance has not been recorded.

The [original pilot brief](archive/entrance-hall-pilot-plan-2026-10-16.md#decision-and-scope) preserves its authoring bounds, source IDs and estimates. [Readiness](readiness.md#final-pilot-checkpoint-and-single-qa-2026-10-16) records the completed single heavy QA, applied findings, measurements and source backup. Those records describe a first pilot, not full-site fidelity or complete collision coverage.

## Where planning lives

GitHub Issues own concrete work packages, acceptance criteria and their current status. This file owns direction, session order and scope decisions. Workflow guides own reusable commands and contracts. `docs/readiness.md` records exercised results and their limits. Do not maintain another task checklist in Markdown alongside the issues.

Before opening an issue, check for an existing matching item. Group related small observations into a useful work package rather than tracking every art blemish. Distinguish observed failures, suspected causes and optional solution ideas. Close an implemented issue with the relevant commit and exercised evidence; keep unresolved external dependencies visible. The `deferred` label means that an issue is retained but is not part of the next session.

The repository and its issues are public. Keep private photographs, metadata, inscriptions, source packs, credentials and unsanitized evidence local. Link to tracked guidance and summarize the relevant observation instead of uploading the private reference set.

The [previous Markdown backlog](archive/backlog-before-issues-2026-10-16.md) is archived. Historical GitHub proposals #1, #5, #7 and #9 were closed as superseded or not planned, not as fully implemented. Atmosphere and sandbox reports #3, #4 and #10 remain deferred and were not re-diagnosed during this planning session.

## Next session: agent tooling and pilot polish

The next session should improve the working environment for agents and correct the reported path/collision problems before further scene expansion. It should reuse the established setup and current pilot rather than reinstalling tools or restarting the site model.

| Order | Work package | Issue |
| --- | --- | --- |
| 1 | Make viewport, DPR and full-resolution browser evidence reliable. | [#13](https://github.com/LLMinem/horror-game-hedwig/issues/13) |
| 2 | Make Python environment selection and available language-server access explicit. | [#12](https://github.com/LLMinem/horror-game-hedwig/issues/12) |
| 3 | Resolve or precisely classify the Blender API and image-sampler warnings. | [#14](https://github.com/LLMinem/horror-game-hedwig/issues/14) |
| 4 | Correct representative jagged path joins and unexpected collision boundaries in the existing pilot. | [#15](https://github.com/LLMinem/horror-game-hedwig/issues/15) |

The order favors reliable evidence before geometry changes. The tools are not a new infrastructure project. If a harness limitation needs an external change, retain a verified local workaround and record the missing capability in its issue rather than waiting for an ideal global environment. A warning is not proof of a broken export, and silence is not proof of correctness.

For the path/collision work, inspect the visible surface, supported walking area and actual blocking constraint together. Use a small set of representative positions and neutral views. Correct the source and runtime contract indicated by the evidence, while retaining solid hall/gate barriers and safe pilot limits. The issue does not authorize a physics-framework migration, canonical-map smoothing or a full cemetery redraw.

End the session with exercised tool entrypoints, source revisions for any geometry changes, and before/after browser evidence for the affected walking cases. Record remaining limits without claiming that every model detail is finished. Reuse earlier setup evidence; run the changed paths, not the completed installation or initial heavy-QA round again. No exhaustive polish inventory is required.

## Following production sessions

After the focused preparation/polish pass, continue from the pilot rather than rebuilding it. Select one small adjoining path section with a representative grave-row edge from the existing photo coverage. Confirm that bounded brief before authoring it. The purpose is to prove a reusable grave/edge/material set connected to an understandable walking route, not to fill the entire cemetery at once.

Then extend connected sections in the same site frame, using instancing for repeated content. Improve local proportions and materials where new evidence or a selected view requires it. Minor remaining art defects need not block all progress, but basic walkability and source safety remain requirements.

The following issues are retained for the corresponding later need, not as gates for the next session:

- [#16](https://github.com/LLMinem/horror-game-hedwig/issues/16) covers measured loading cost and the bundle warning. Do not add texture conversion or split code merely to silence a warning.
- [#17](https://github.com/LLMinem/horror-game-hedwig/issues/17) covers vegetation fit when the plant set is expanded. Current forms are approximations, not a species inventory.
- [#18](https://github.com/LLMinem/horror-game-hedwig/issues/18) covers independent backup and recovery. The approved local backup remains valid for current work.

Review HDRI-switch ordering, PMREM ownership and scene disposal when extending the relevant loading or scene lifecycle. Assess seeded variation and wider shadow coverage with the views and area that need them. These are feature-linked design checks, not a new platform rewrite or an exhaustive backlog.

Agree target hardware, browser and resolution before claiming broader performance acceptance. Reconcile shipped grass/HDRI provenance, code-licence metadata and attribution before public release. Existing pack commercial permission does not establish the fit of every asset. Audio remains a separate scope choice.

## Before modifying sources

Keep raw pack files and existing Blender revisions unchanged. Author new revisions through the [Blender workbench](assets/blender-workbench.md) and [pipeline checklist](assets/pipeline-guide.md). Preserve source/browser appearance as separate review steps. Git does not back up ignored sources or private references.

Micha approved local snapshots beneath `/Users/meeq/.backups/horror-game-hedwig/`. Preserve valuable revisions before changing them and back up each reviewable new Blender revision, textures and authoring inputs before session end. Never overwrite the pre-pilot snapshot or silently prune older snapshots. Keep manifests and private recovery evidence local.

The local snapshots protect against working-copy mistakes, not loss of the Mac. The [recorded restore and copy evidence](readiness.md#pilot-approval-and-backup-2026-10-16) remains applicable. Off-device protection is a recommendation tracked in #18, not a reopened pilot approval gate. No automatic backup schedule is established.
