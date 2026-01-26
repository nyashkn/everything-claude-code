---
name: workspace-status
description: List all Coder workspaces and their status
---

# Workspace Status Command

View status of all Coder workspaces.

## Usage

```
/workspace-status [workspace_name]
```

## Steps

1. **Fetch workspace list**:
   ```bash
   coder list --output json
   ```

2. **Format as table**:
   ```
   WORKSPACE         TEMPLATE    STATUS      UPTIME    OWNER
   ─────────────────────────────────────────────────────────
   issue-123         base        Running     2h 15m    njui
   issue-456         base        Stopped     -         njui
   test-workspace    base        Running     45m       njui
   ```

3. **If specific workspace provided**, show detailed info:
   ```bash
   coder show <workspace_name>
   ```

   Output:
   ```
   Workspace: issue-123
   Template:  base
   Status:    Running
   Uptime:    2h 15m
   Owner:     njui

   Parameters:
     github_repo:  PathGen-AI/policy_dashboard
     issue_number: 123
     claude_mode:  plan-and-execute

   Resources:
     CPU:    45%
     Memory: 3.2GB / 6GB
     Disk:   12GB / 50GB

   Access:
     SSH:      coder ssh issue-123
     Frontend: https://coder.ds.ke/issue-123/apps/frontend
   ```

4. **Show resource summary** for all running workspaces:
   ```bash
   # Get container stats from each workspace
   for ws in $(coder list -o json | jq -r '.[].name'); do
     coder ssh $ws -- docker stats --no-stream --format "{{.Name}}: CPU {{.CPUPerc}}, Mem {{.MemUsage}}" 2>/dev/null
   done
   ```

## Examples

### List all workspaces
```
/workspace-status
```

### Show specific workspace details
```
/workspace-status issue-123
```

## Notes

- Status values: Running, Stopped, Starting, Stopping, Failed
- Stopped workspaces can be restarted with `/workspace-start`
- Resource usage updates every 10 seconds in Coder UI
