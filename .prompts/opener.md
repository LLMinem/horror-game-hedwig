# Hedwig Session Opener

Please deeply explore this repository so you understand the project’s context and current state before making changes. Follow these steps:

0. **High-level layout** – get a directory overview without flooding yourself with vendor folders.
   - Example commands: `fd --max-depth 2 --type d --exclude node_modules`, or `tree -L 2 -d` if available.

1. **Core orientation** – read the foundational docs:
   - `README.md`
   - `package.json`
   - `AGENTS.md`
   - `CLAUDE.md` (note differences; they should stay in sync)

2. **Active documentation sweep** – rely on YAML front matter to find what is live.
   - Run `rg "^status: active" -n docs`
   - For every file flagged as `status: active` (and the backlog), read the entire document.

3. **Source review** – inspect every module under `src/` and note responsibilities.
   - Use something like `fd -t f src` to list files, then open each in turn.

4. **Repository activity snapshot** – understand current changes and history.
   - `git status -sb`
   - `git log -20 --oneline`

5. **Context extras** – check other live cues such as `docs/assets/processing-queue.md` and `docs/backlog.md` to capture outstanding tasks or blockers.

6. **Report back** with:
   - A concise summary of the project’s current state.
   - Key active documents/modules reviewed and their roles.
   - Outstanding tasks, risks, or TODOs you spotted.
   - Any questions or clarifications needed before coding.
