# Uninstall Guide

This guide explains how to uninstall the symlink-based Claude Code setup.

## Quick Uninstall

To remove all symlinks and clean up:

```bash
# Preview what will be removed (dry run)
node scripts/uninstall.js --dry-run

# Execute uninstall
node scripts/uninstall.js
```

You'll be prompted to confirm before any changes are made.

## Uninstall Options

### 1. Basic Uninstall (Default)

Removes symlinks and hooks:

```bash
node scripts/uninstall.js
```

**What it does:**
- ✅ Removes symlinks from `~/.claude/` (agents, commands, skills, rules, scripts)
- ✅ Removes hooks from `~/.claude/settings.json` that point to this repo
- ✅ Cleans up backup files in repo
- ✅ Backs up settings.json before modifying

**What it keeps:**
- ⏭️ This repository (everything-claude-code/)
- ⏭️ Learned data (homunculus/, skills/learned/)
- ⏭️ Session history (~/.claude/sessions/)
- ⏭️ Original directories in ~/.claude/ (if they were backups)

### 2. Uninstall and Restore Backups

Removes symlinks and restores original directories:

```bash
node scripts/uninstall.js --restore-backups
```

**What it does:**
- ✅ Everything from basic uninstall
- ✅ Restores `~/.claude/agents/` from backup (if exists)
- ✅ Restores `~/.claude/commands/` from backup (if exists)
- ✅ Restores `~/.claude/skills/` from backup (if exists)
- ✅ Restores `~/.claude/rules/` from backup (if exists)
- ✅ Restores `~/.claude/scripts/` from backup (if exists)

**Use when:** You want to go back to your pre-symlink Claude Code setup.

### 3. Uninstall but Keep Hooks

Removes symlinks but leaves hooks in settings.json:

```bash
node scripts/uninstall.js --keep-hooks
```

**What it does:**
- ✅ Removes symlinks from `~/.claude/`
- ✅ Cleans up backup files
- ⏭️ Keeps hooks in settings.json

**Use when:** You want to manually review and clean up hooks later.

### 4. Dry Run (Preview Only)

See what would be removed without making changes:

```bash
node scripts/uninstall.js --dry-run
```

**What it does:**
- ℹ️ Shows all actions that would be taken
- ℹ️ No files are modified
- ℹ️ No symlinks are removed

**Use when:** You want to verify what will be removed before executing.

## Complete Removal

To completely remove everything related to this setup:

### Step 1: Uninstall symlinks

```bash
node scripts/uninstall.js --restore-backups
```

### Step 2: Delete this repository

```bash
cd ..
rm -rf everything-claude-code
```

### Step 3: (Optional) Clean up Claude Code directory

```bash
# Backup first
cp -r ~/.claude ~/.claude.backup

# Remove learned data
rm -rf ~/.claude/skills/learned/*
rm -rf ~/.claude/homunculus/*

# Or remove entire ~/.claude/ directory (CAUTION: loses all settings)
# rm -rf ~/.claude
```

## What Gets Removed

### Symlinks Removed
- `~/.claude/agents` → repo/agents
- `~/.claude/commands` → repo/commands
- `~/.claude/skills` → repo/skills
- `~/.claude/rules` → repo/rules
- `~/.claude/scripts` → repo/scripts

### Hooks Removed (unless --keep-hooks)
All hooks in `~/.claude/settings.json` that reference scripts in this repository.

### Backup Files Cleaned
- `skills/continuous-learning-v2/config.json.backup-*`
- `skills/continuous-learning-v2/hooks/observe.sh.backup-*`
- `skills/continuous-learning-v2/scripts/instinct-cli.py.backup-*`
- `skills/continuous-learning-v2/agents/start-observer.sh.backup-*`
- `.gitignore.backup-*`

## What Stays

### In Repository
- ✅ homunculus/ (v2 learned instincts and evolved skills)
- ✅ skills/learned/ (v1 learned skills)
- ✅ All setup scripts
- ✅ All configuration files

### In ~/.claude/
- ✅ sessions/ (session history)
- ✅ settings.json (with hooks removed or kept based on options)
- ✅ Original directories (if --restore-backups used)
- ✅ plugins/, cache/, configs/, etc.

## Troubleshooting

### Symlinks won't remove

**Problem:** Permission denied when removing symlinks.

**Solution:**
```bash
sudo node scripts/uninstall.js
```

### Backups not found

**Problem:** `--restore-backups` shows "no backup found".

**Solution:** Backups were created during initial setup. If they don't exist:
- Check `~/.claude/` for directories named `agents.backup-*`, etc.
- Manually restore from your own backups
- Or reinstall Claude Code fresh

### Hooks still appear after removal

**Problem:** Hooks still in settings.json after uninstall.

**Solution:**
```bash
# Manually edit settings.json
vim ~/.claude/settings.json

# Or restore from backup
cp ~/.claude/settings.json.backup-* ~/.claude/settings.json
```

## Reinstalling

To reinstall after uninstalling:

```bash
# Run setup again
node scripts/setup-symlinks.js
node scripts/merge-hooks.js
node scripts/setup-v2.js
node scripts/verify-setup.js
```

## Getting Help

If you encounter issues:
1. Run with `--dry-run` first to see what would happen
2. Check `~/.claude/` for backup files
3. Manually inspect symlinks: `ls -la ~/.claude/`
4. Review settings.json: `cat ~/.claude/settings.json`

## Options Summary

| Option | Description |
|--------|-------------|
| `--dry-run` | Preview changes without executing |
| `--keep-hooks` | Don't remove hooks from settings.json |
| `--restore-backups` | Restore original directories from backups |

## Examples

```bash
# Preview uninstall
node scripts/uninstall.js --dry-run

# Basic uninstall
node scripts/uninstall.js

# Uninstall and restore original setup
node scripts/uninstall.js --restore-backups

# Uninstall but keep hooks configured
node scripts/uninstall.js --keep-hooks

# Preview uninstall with restore
node scripts/uninstall.js --dry-run --restore-backups
```
