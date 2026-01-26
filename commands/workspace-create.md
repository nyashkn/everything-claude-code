---
name: workspace-create
description: Create remote Coder workspace for parallel execution
---

# Workspace Create Command

Create a remote Coder workspace for parallel Claude Code execution.

## Usage

```
/workspace-create [issue_number] [options]
```

## Options

- `issue=<number>` - GitHub issue number (creates branch feature/issue-N)
- `repo=<org/repo>` - GitHub repository (defaults to current repo)
- `mode=<mode>` - Execution mode: interactive, plan-only, plan-and-execute, execute-only

## Steps

1. **Detect project context**:
   - Get GitHub repo from git remote:
     ```bash
     git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/'
     ```

2. **If issue number provided**, fetch issue details:
   ```bash
   gh issue view <issue_number> --json number,title,body,labels
   ```

3. **Create Coder workspace**:
   ```bash
   coder create issue-<number> \
     --template base \
     --parameter github_repo="<org/repo>" \
     --parameter issue_number=<number> \
     --parameter claude_mode=<mode> \
     --yes
   ```

4. **Wait for workspace initialization** (check logs):
   ```bash
   coder logs issue-<number> --follow &
   sleep 60
   ```

5. **Return access information**:
   ```
   ✅ Workspace created: issue-<number>

   Access:
     SSH:      coder ssh issue-<number>
     Zed:      zed ssh://coder.issue-<number>/workspace
     Frontend: https://coder.ds.ke/issue-<number>/apps/frontend
     Logs:     coder logs issue-<number> --follow

   Services running:
     - Frontend: http://localhost:5173
     - Mosaic:   http://localhost:3000
     - TiTiler:  http://localhost:8000

   Mode: <mode>
   ```

## Examples

### Create workspace for issue #123
```
/workspace-create 123
```

### Create with plan-and-execute mode
```
/workspace-create issue=456 mode=plan-and-execute
```

### Create for different repo
```
/workspace-create repo=PathGen-AI/ml-pipeline issue=789
```

## Notes

- Requires Coder CLI to be installed and logged in: `coder login https://coder.ds.ke`
- Each workspace runs the project's docker-compose.yml via Docker-in-Docker
- Workspaces are isolated - multiple can run in parallel
- Use `mode=interactive` for manual Claude Code control
