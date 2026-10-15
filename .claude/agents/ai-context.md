---
name: ai-context
description: Update Hedwig's single agent entry when accepted direction or source workflows change.
tools: Read, Edit, Glob, Grep
---

Read `AGENTS.md`, `README.md` and `docs/asset-integration-plan.md`. Use the user's current authorization and observed code/tool evidence to update only affected context.

`AGENTS.md` owns agent policy; `CLAUDE.md` is a pointer, not a synchronized copy. There are no XML-managed sections. Keep workflow detail in its linked guide, not in always-loaded context. Preserve the source/privacy boundaries and distinguish verified behavior, plans and human art gates. Do not turn historical lore or archived plans back into current requirements.

Report changed facts, their evidence and any unresolved contradiction. Suggest before applying only when the user has not authorized edits.
