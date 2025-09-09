---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(ls -la src/), Bash(find src -name "*.js" -exec grep -l "TODO\|FIXME\|XXX" {} \;), Read, Glob, Grep, TodoWrite
argument-hint: [optional: specific work area to focus on after compression]
description: Resume session after auto-compaction, intelligently rebuilding lost context
---

# Session Resume: Context Recovery After Compaction

## Objective

Recover lost context after auto-compaction and resume development exactly where work was interrupted.

## Required File Analysis

### 📋 Critical Project Files (READ THESE FIRST)

- **`CLAUDE.md`** - Project context and collaboration instructions
- **`docs/atmospheric-sky-implementation-plan.md`** - **HIGHEST PRIORITY** - Current active implementation guide
- **`docs/night-scene-makeover-guide.md`** - Previous implementation guide (still relevant context)

### 🔍 Implementation Files

- **`src/main.js`** - Primary implementation file
- **Any other modified files identified through git status**

## Understand Current State

1. Run `git status` to show uncommitted changes and working directory state.
2. Run `git diff --stat` to show summary of uncommitted changes.
3. Run `git log -10 --oneline` for high-level overview of recent work.
4. Run `git log -5` for detailed view of recent commits.
5. Run `find src -name "*.js" -exec grep -l "TODO\|FIXME\|XXX" {} \;` to find files with incomplete work markers.
6. Run `ls -la src/` to see current source directory structure.

## Context Recovery Tasks

1. **Read the compression summary** to understand what was being worked on.
2. **Identify the exact step** in `atmospheric-sky-implementation-plan.md` that was in progress.
3. **Read any files with uncommitted changes** to understand modifications made.
4. **Reconstruct the todo list** based on discovered state using TodoWrite tool.

### Additional Context (if included)

---

**After executing ALL tasks above** and recovering full context, consider this user message (if included):

$ARGUMENTS

---

## Expected Outcome

After completing this analysis, provide:

1. **Current Implementation Step** - Exact position in atmospheric-sky-implementation-plan.md
2. **Work Status** - What was completed vs in-progress
3. **Reconstructed TODO List** - Clear next steps based on recovered context
4. **Continuation Point** - Exactly where to resume work

### 🤝 Remember

- Follow CLAUDE.md principles (incremental development, one step at a time)
- Maintain educational focus for Three.js learning
- Wait for explicit approval before continuing to next steps

ultrathink