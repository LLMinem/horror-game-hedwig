---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(ls -la src/), Bash(find src -name "*.js" -exec grep -l "TODO\|FIXME\|XXX" {} \;), Read, Glob, Grep, TodoWrite
argument-hint: [optional: specific work area to focus on after compression]
description: Resume session after auto-compaction, intelligently rebuilding lost context
---

# Session Resume: Context Recovery After Compaction

## What We're Resuming

$ARGUMENTS

ultrathink

## 🧠 Deep Context Analysis

Analyze the compression summary above. You've been auto-compacted, which means you've lost detailed context. Your task is to:

1. **Identify what specific context might be missing** from the summary
2. **Determine which files contain critical implementation details** not captured in summary
3. **Understand what work was in progress** before compaction

## 📊 Current Git State

Run `git status` to show the current repository state and any uncommitted changes.

## 📝 Uncommitted Changes (if any)

Run `git diff --stat` to show a summary of uncommitted changes.

## 🔍 Recent Work Context

Run `git log -5` to show detailed information about recent commits and work context.

## 🎯 Strategic Context Recovery

Based on the summary and git state, now selectively read ONLY the files that will help you recover missing context:

### Core Context Files

Read `docs/atmospheric-sky-implementation-plan.md` - **HIGHEST PRIORITY** - Current active implementation guide
Read `CLAUDE.md` - Project context and collaboration instructions
Read `docs/night-scene-makeover-guide.md` - Previous implementation guide (still relevant context)

### Implementation State Discovery

Run `find src -name "*.js" -exec grep -l "TODO\|FIXME\|XXX" {} \;` to find files with incomplete work markers.

Run `ls -la src/` to see the current source directory structure.

## 🔄 Work Continuation Strategy

After analyzing the above:

1. **Identify exactly where work was interrupted**
2. **Read the specific implementation files** that were being modified
3. **Check for any incomplete TODOs** in the codebase
4. **Reconstruct your todo list** based on discovered context
5. **Verify understanding** by summarizing:
   - What was completed
   - What was in progress
   - What comes next per the guides

## ⚠️ Critical Questions to Answer

Before continuing work, explicitly answer:

- What feature/step was being implemented?
- Which files were being modified?
- What testing was completed?
- What was the next immediate task?

## Expected Response

Provide:

1. **Recovered Context Summary** - What you've determined from the analysis
2. **Missing Context Identified** - What the compression likely lost
3. **Files to Deep Read** - Specific files you need to examine in detail
4. **Reconstructed TODO List** - Based on discovered state
5. **Continuation Plan** - Exactly where to resume work

Remember: Follow CLAUDE.md principles - incremental development, one step at a time, educational focus.
