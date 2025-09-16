---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Read, Glob, Grep, TodoWrite
argument-hint: [optional: specific focus area for this session]
description: Initialize new session with full project context and git history
---

# New Session: Project Context & Preparation

## Objective

Explore the project to gain a **deep understanding** of it, in order to prepare for further collaborative development.

## Required File Analysis

### 📋 Critical Project Files (READ THESE FIRST)

- **`CLAUDE.md`** - Most important project context and collaboration instructions
- **`docs/night-scene-makeover-guide.md`** - **HIGHEST PRIORITY** - Current active implementation guide
- **`docs/development-plan.md`** - High-level roadmap (take with grain of salt - somewhat outdated)
- **`docs/archive/atmospheric-sky-implementation-plan.md`** - Recently completed atmospheric sky implementation

### 🔍 Implementation Files

- **ALL files in the `src` directory** - Current implementation
- **`index.html`** - Entry point
- **`package.json`** - Dependencies and scripts
- **`.gitignore`** - Project exclusions

## ⚠️ Files to IGNORE

- `README.md` (outdated, could confuse you)
- `docs/spec.md` (older technical specification, take with grain of salt)
- Files in the `data` folder (legacy GeoJSON approach, no longer used)

## Understand Current State

1. Run `git status` to show the current repository state and any uncommitted changes.
2. Run `git log -15 --oneline` to show a high-level overview of recent commits.
3. Run `git log -10` to show detailed information about the 10 most recent commits.
4. Run `git branch --show-current` to identify the active branch.

### Additional Context (if included)

---

**After executing ALL tasks above** and building a comprehensive understanding of the project, consider this user message (if included):

$ARGUMENTS

---

## Expected Outcome

After completing this analysis, provide a comprehensive plan for today's development session based on:

- Current project state
- Recent progress from git history
- Identified next steps and priorities

### 🤝 Include in Your Response

- **Collaborative development approach** from CLAUDE.md (incremental development, educational focus)
- **Key project context** (horror game for reconnection, beginner-friendly Three.js learning)
- **Working principles** and communication style guidelines

ultrathink
