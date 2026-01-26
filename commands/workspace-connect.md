---
name: workspace-connect
description: Connect to running Coder workspace
---

# Workspace Connect Command

Connect to a running Coder workspace via SSH or Zed.

## Usage

```
/workspace-connect [workspace_name]
```

## Steps

1. **List available workspaces** if no name provided:
   ```bash
   coder list --output json | jq -r '.[] | "\(.name)\t\(.template_name)\t\(.status)"'
   ```

2. **Get workspace details**:
   ```bash
   coder show <workspace_name>
   ```

3. **Connect options**:

   **SSH (terminal)**:
   ```bash
   coder ssh <workspace_name>
   ```

   **SSH with tmux attach**:
   ```bash
   coder ssh <workspace_name> -t "tmux attach -t workspace"
   ```

   **Zed IDE** (recommended):
   ```bash
   # Ensure SSH config is set up
   coder config-ssh

   # Open in Zed
   zed ssh://coder.<workspace_name>/workspace
   ```

   **VS Code**:
   ```bash
   code --remote ssh-remote+coder.<workspace_name> /workspace
   ```

4. **Return connection info**:
   ```
   Workspace: <workspace_name>
   Status: Running
   Uptime: 2h 15m

   Connect via:
     SSH:     coder ssh <workspace_name>
     tmux:    coder ssh <workspace_name> -t "tmux attach -t workspace"
     Zed:     zed ssh://coder.<workspace_name>/workspace
     VS Code: code --remote ssh-remote+coder.<workspace_name> /workspace

   Web Access:
     Frontend: https://coder.ds.ke/<workspace_name>/apps/frontend
     Terminal: https://coder.ds.ke/<workspace_name>/terminal
   ```

## Examples

### Connect to specific workspace
```
/workspace-connect issue-123
```

### List and connect
```
/workspace-connect
# Shows list of workspaces, then asks which to connect to
```

## Notes

- Run `coder config-ssh` once to set up SSH access for Zed/VS Code
- tmux session contains: Claude Code pane, logs pane, interactive shell pane
- Use Ctrl+b d to detach from tmux without stopping Claude Code
