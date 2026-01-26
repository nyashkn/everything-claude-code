---
name: workspace-delete
description: Delete a Coder workspace (permanent)
---

# Workspace Delete Command

Permanently delete a workspace. All data will be lost.

## Usage

```
/workspace-delete <workspace_name> [--force]
```

## Steps

1. **Check workspace status**:
   ```bash
   coder show <workspace_name>
   ```

2. **Confirm deletion** (unless --force):
   ```
   ⚠️  This will permanently delete:
     - All workspace files
     - Docker containers and volumes
     - Uncommitted Git changes

   Are you sure? (y/N)
   ```

3. **Delete the workspace**:
   ```bash
   coder delete <workspace_name> --yes
   ```

4. **Confirm deleted**:
   ```
   ✅ Workspace <workspace_name> deleted

   Freed resources:
     - 6GB workspace container
     - 8GB Docker-in-Docker sidecar
   ```

## Examples

### Delete with confirmation
```
/workspace-delete issue-123
```

### Delete without confirmation
```
/workspace-delete issue-123 --force
```

## Notes

- Deletion is permanent - commit and push any work first
- Use `/workspace-stop` if you want to preserve state
- Deleted workspaces cannot be recovered
