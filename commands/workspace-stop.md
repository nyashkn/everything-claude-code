---
name: workspace-stop
description: Stop a running Coder workspace (preserves state)
---

# Workspace Stop Command

Stop a running workspace. State is preserved and can be resumed with `/workspace-start`.

## Usage

```
/workspace-stop <workspace_name>
```

## Steps

1. **Verify workspace exists and is running**:
   ```bash
   coder show <workspace_name> --output json | jq -r '.status'
   ```

2. **Stop the workspace**:
   ```bash
   coder stop <workspace_name>
   ```

3. **Confirm stopped**:
   ```
   ✅ Workspace <workspace_name> stopped

   State preserved:
     - Git changes (uncommitted work saved)
     - Docker volumes (container data)
     - Workspace files (/workspace)

   To resume:
     coder start <workspace_name>
     # or
     /workspace-start <workspace_name>
   ```

## Examples

### Stop workspace
```
/workspace-stop issue-123
```

## Notes

- Stopped workspaces don't consume compute resources
- Docker containers inside the workspace are also stopped
- All uncommitted Git changes are preserved
- Restart with `/workspace-start` or `coder start`
