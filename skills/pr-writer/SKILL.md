---
name: pr-writer
description: Generate PR descriptions with screenshots and video demos. Spawns the pr-writer agent which analyzes git changes, extracts test scenarios, and captures visuals via playwright-skill.
---

# PR Writer

Generates PR descriptions for feature/fix branches. Uses playwright-skill for screenshots and video demos of UI changes.

## Bundled Templates

Default templates live alongside this skill:
- `{this_skill_dir}/templates/PR_TEMPLATE.md` — detailed PRs (multi-component, includes video)
- `{this_skill_dir}/templates/PR_TEMPLATE_QUICK.md` — quick PRs (single component, screenshots only)

**Project override**: place your own `PR_TEMPLATE.md` / `PR_TEMPLATE_QUICK.md` in `.claude/templates/` and the agent will use those instead.

## Prerequisites

- `playwright-skill` installed (see `scripts/install-external-skills.js`)
- Dev stack running (`make start` or equivalent)

## Usage

Spawn the `pr-writer` agent via Task tool, or use the `/pr-write` command.
