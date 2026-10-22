# Hedwig agent entry

This is the canonical agent entry. Root `CLAUDE.md` is a relative symlink to it; [README.md](README.md) is the human entry.

## Start from the selected issue

1. Read the README and the selected GitHub issue, including comments, its parent specification and native blockers. Follow recorded approvals rather than an obsolete status paragraph. A `ready-for-agent` label does not override blockers or required human acceptance.
2. Inspect existing working-tree changes and preserve unrelated work. Read the relevant modules, starting at `src/main.js` for runtime composition. Use `package.json`, configuration and tool help for executable facts rather than maintaining parallel prose inventories.
3. State the bounded task and verification. Work within its authorization; a tool being available does not authorize scene production, purchases beyond approved limits, deployment or public release.

## Read when needed

| Trigger | Required context |
| --- | --- |
| Photos, corrections, private sources or Atlas access | [Local references](docs/local-references.md) |
| Site layout, source-map interpretation, terrain or spatial placement | [Site data contract](data/CLAUDE.md), including excluded interpretations and uncertainty |
| Source changes, Blender, materials, export or source/browser visual review | [Blender and asset workflow](docs/assets/blender-workbench.md), including backup and acceptance rules |
| Domain language or a consequential design change | [Domain documentation rules](docs/agents/domain.md), the relevant glossary terms and ADRs |
| Story or character design | [Story draft](docs/lore-backstory.md); it is not a gameplay implementation report |

Private source material stays outside `public/`, `src/`, tracked documents and public tracker attachments. `public/` is shipped wholesale. Follow the linked reference and asset contracts before preparing anything for publication.

## Engineering and verification

Reuse existing module boundaries; avoid an engine/framework rewrite or speculative abstraction without a concrete approved need. Explain unfamiliar Three.js concepts briefly to Micha.

Exercise changed behavior in the actual browser or CLI. A build is not visual acceptance. After runtime changes, build and inspect relevant loading, controls and rendering; after tool changes, exercise the affected path with disposable outputs. Reuse existing setup evidence instead of repeating unrelated heavy QA. Record the commands, results and limits in the issue/PR. Source and browser art acceptance remain separate from agent verification; the asset workflow owns their procedure.

## Agent skills

Use the installed project skills in `.agents/skills/`; `skills-lock.json` records their provenance.

### Issue tracker

Use GitHub Issues. See [tracker operations](docs/agents/issue-tracker.md).

### Triage labels

Use the configured [label mapping](docs/agents/triage-labels.md).

### Domain docs

Use the single glossary and ADR collection configured in [domain documentation rules](docs/agents/domain.md).

## Documentation maintenance

Keep each statement with one information owner. Specs, tasks, session status, measurements and approvals belong in Issues/PRs; private evidence stays local. Repository docs contain durable context and necessary working contracts, not a second backlog or session diary. The README owns project-language policy.

Update or remove the affected contract when behavior changes. A new document needs a named purpose, an information responsibility not already covered elsewhere, and a clear reading trigger. Preserve original creative content, source provenance and licence evidence according to their purpose rather than deleting them as ordinary old notes.

## Git workflow

Use a task branch for changes; merge back only when Micha requests it. Preserve existing checkpoint tags, including `checkpoint/pre-entrance-hall-pilot`.

Commit completed, verified work at meaningful checkpoints as logical, independently understandable changes. Inspect the intended diff before staging explicit paths or hunks. Use conventional commit messages with a relevant scope. Keep ignored sources, references and backups out of Git.

Push completed commits to the configured remote at session end, not after every edit. Push intended checkpoint tags explicitly. Report any failed commit/push and remaining local state. Never force-push or rewrite shared history without explicit approval. A repository push or merge does not authorize deployment or public release.
