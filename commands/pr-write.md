# PR Write

Generate a PR description for the current branch.

$ARGUMENTS

## Usage

```
/pr-write              # auto-detect quick vs detailed
/pr-write quick        # force quick template (screenshots only)
/pr-write detailed     # force detailed template (includes video recording)
```

## What Happens

Spawns the `pr-writer` agent via Task tool to:
1. Analyze changed files and classify scope
2. Extract test scenarios from spec files
3. Capture screenshots (and video for detailed) via playwright-skill
4. Fill the appropriate template — project `.claude/templates/` overrides bundled defaults
5. Save to `.claude/pr-artifacts/{branch}/PR_DESCRIPTION.md`

Pass the variant from $ARGUMENTS ("quick" or "detailed") to the agent if provided.
After completion, display the output path and offer to open a PR via `gh pr create`.

## Prerequisites

- Dev stack running
- `playwright-skill` installed (run `node scripts/install-external-skills.js` if not)
