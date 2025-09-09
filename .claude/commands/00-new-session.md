---
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Read, Glob, Grep, TodoWrite
argument-hint: [optional: specific focus area for this session]
description: Initialize new session with full project context and git history
---

# New Session: Project Context & Preparation

## Current State
$ARGUMENTS

## Git Repository Status
!`git status`

## Recent Development History
!`git log -10`

## Current Branch Info
!`git branch --show-current`

## Objective
Explore the project to gain a deep understanding of it, in order to prepare for further collaborative development.

## Required File Analysis

### 📋 Critical Project Files (READ THESE FIRST)
- **`CLAUDE.md`** - Most important project context and collaboration instructions
- **`docs/night-scene-makeover-guide.md`** - Our current SOURCE OF TRUTH implementation guide
- **`docs/development-plan.md`** - High-level roadmap (take with grain of salt - somewhat outdated)

### 🔍 Implementation Files
- **ALL files in the `src` directory** - Current implementation
- **`index.html`** - Entry point
- **`package.json`** - Dependencies and scripts
- **`.gitignore`** - Project exclusions
- **Any other files you deem important**

## Additional Context Tasks

1. **Git History**: Run `git log -10` to understand recent progress
2. **File Discovery**: Use commands to find all other relevant game files
3. **Project Structure**: Build comprehensive understanding of architecture

## ⚠️ Files to IGNORE
- `README.md` (outdated, could confuse you)
- `docs/spec.md` (older technical specification, take with grain of salt)
- Files in the `data` folder (legacy GeoJSON approach, no longer used)

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