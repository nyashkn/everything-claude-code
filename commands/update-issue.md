---
name: update-issue
description: Update GitHub issue with progress (for remote Claude Code execution)
---

# Update Issue Command

Post progress update to the GitHub issue associated with this workspace.

## Usage

```
/update-issue [status] [message]
```

Status options: `in-progress`, `completed`, `blocked`, `needs-review`

## Steps

1. **Get workspace context** (from startup script metadata):
   ```bash
   WORKSPACE_NAME=$(cat /tmp/workspace-name 2>/dev/null || echo "unknown")
   ISSUE_NUMBER=$(cat /tmp/issue-number 2>/dev/null || echo "")
   GITHUB_REPO=$(cat /tmp/github-repo 2>/dev/null || echo "")
   ```

2. **If no issue number**, abort:
   ```
   ⚠️  No issue number associated with this workspace.
   Use: gh issue comment <number> --body "message"
   ```

3. **Gather current state**:
   ```bash
   # Get modified files
   git status --short

   # Get commit summary
   git log --oneline -5

   # Get current branch
   git branch --show-current
   ```

4. **Format update message**:
   ```markdown
   ## 🤖 Update from `<workspace_name>`

   **Status**: <status_emoji> <status>

   **Branch**: `<branch_name>`

   **Progress**:
   <user_message or auto-generated summary>

   **Files Changed**:
   ```
   <git status output>
   ```

   **Recent Commits**:
   <git log output>

   ---
   [View Workspace](https://coder.ds.ke/<workspace_name>) |
   [Frontend](https://coder.ds.ke/<workspace_name>/apps/frontend)
   ```

5. **Post comment**:
   ```bash
   gh issue comment $ISSUE_NUMBER --body "$UPDATE_MESSAGE"
   ```

6. **Confirm**:
   ```
   ✅ Posted update to issue #<number>
   View: https://github.com/<repo>/issues/<number>
   ```

## Status Emojis

| Status | Emoji |
|--------|-------|
| in-progress | 🔄 |
| completed | ✅ |
| blocked | 🚫 |
| needs-review | 👀 |

## Examples

### Simple status update
```
/update-issue in-progress "Working on backend configuration"
```

### Mark as completed
```
/update-issue completed "All changes implemented and tested"
```

### Report blocker
```
/update-issue blocked "Need clarification on API endpoint format"
```

## Notes

- Only works in workspaces created with an issue number
- Uses gh CLI (authenticated via /opt/secrets/github-token.env)
- Updates are visible to anyone watching the issue
