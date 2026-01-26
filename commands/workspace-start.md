---
name: workspace-start
description: Start a stopped Coder workspace
---

# Workspace Start Command

Resume a previously stopped workspace with all its state preserved.

## Usage

```
/workspace-start <workspace_name>
```

## Steps

1. **Verify workspace exists and is stopped**:
   ```bash
   coder show <workspace_name> --output json | jq -r '.status'
   ```

2. **Start the workspace**:
   ```bash
   coder start <workspace_name>
   ```

3. **Wait for initialization**:
   ```bash
   # Monitor startup logs
   coder logs <workspace_name> --follow &
   sleep 30
   ```

4. **Verify services are running**:
   ```bash
   coder ssh <workspace_name> -- docker ps
   ```

5. **Return access information**:
   ```
   ✅ Workspace <workspace_name> started

   Restored state:
     - Git changes preserved
     - Docker volumes restored
     - Workspace files intact

   Access:
     SSH:      coder ssh <workspace_name>
     Zed:      zed ssh://coder.<workspace_name>/workspace
     Frontend: https://coder.ds.ke/<workspace_name>/apps/frontend
     tmux:     coder ssh <workspace_name> -t "tmux attach -t workspace"
   ```

## Examples

### Start stopped workspace
```
/workspace-start issue-123
```

## Notes

- Workspace state is fully preserved from when it was stopped
- Docker containers will be restarted automatically
- tmux session may need to be reattached
- Services may take a minute to become fully available
