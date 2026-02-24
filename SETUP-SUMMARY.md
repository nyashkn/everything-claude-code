# Setup Summary

Complete reference for the symlink-based Claude Code central repository.

## What Was Set Up

### Phase 1: Basic Symlink Setup ✅
- **Symlinks**: agents, commands, skills, rules, scripts → all point to this repo
- **Hooks**: 18 hooks merged into `~/.claude/settings.json`
- **v1 Learned Skills**: Save to `skills/learned/` in repo (git-tracked)

### Phase 2: Continuous Learning v2 ✅
- **v2 Structure**: homunculus/ directory with instincts, evolved, observations
- **v2 Config**: All paths point to repo (not ~/.claude/)
- **v2 Scripts**: Modified to read from config.json
- **Git Tracking**: Inherited instincts and evolved skills tracked

## Architecture

```
everything-claude-code/              # Your central repo (single source of truth)
├── agents/                          # Symlinked to ~/.claude/agents
├── commands/                        # Symlinked to ~/.claude/commands
├── skills/                          # Symlinked to ~/.claude/skills
│   ├── learned/                     # v1 learned skills (tracked)
│   └── continuous-learning-v2/      # Modified for repo paths
├── rules/                           # Symlinked to ~/.claude/rules
├── scripts/                         # Symlinked to ~/.claude/scripts
│   ├── setup-symlinks.js            # Create symlinks
│   ├── merge-hooks.js               # Merge hooks to settings.json
│   ├── setup-statusline.js          # Add custom statusline
│   ├── setup-v2.js                  # Configure v2
│   ├── update-gitignore-v2.js       # Update .gitignore for v2
│   ├── verify-setup.js              # Validate entire setup
│   └── uninstall.js                 # Remove everything
├── homunculus/                      # v2 continuous learning
│   ├── instincts/
│   │   ├── personal/                # Local (ignored)
│   │   └── inherited/               # Tracked (team patterns)
│   ├── evolved/                     # Tracked (generated skills/commands/agents)
│   │   ├── skills/
│   │   ├── commands/
│   │   └── agents/
│   └── observations.archive/        # Optional tracking
└── hooks/
    └── hooks.json                   # Source hooks (merged to settings)
```

## Quick Commands

### Setup (Initial Install)
```bash
# Basic setup
node scripts/setup-symlinks.js
node scripts/merge-hooks.js
node scripts/verify-setup.js

# v2 setup
node scripts/setup-v2.js
node scripts/update-gitignore-v2.js
node scripts/verify-setup.js

# Optional: statusline
node scripts/setup-statusline.js
```

### Verification
```bash
# Check everything is configured correctly
node scripts/verify-setup.js

# Check symlinks
ls -la ~/.claude/ | grep "^l"

# Check v2 config
cat skills/continuous-learning-v2/config.json
```

### Uninstall
```bash
# Preview uninstall
node scripts/uninstall.js --dry-run

# Uninstall (keeps learned data)
node scripts/uninstall.js

# Uninstall and restore backups
node scripts/uninstall.js --restore-backups

# Uninstall but keep hooks
node scripts/uninstall.js --keep-hooks
```

### Multi-Server Setup
```bash
# On new server/machine
git clone <your-repo> ~/claude-config
cd ~/claude-config
node scripts/setup-symlinks.js
node scripts/merge-hooks.js
node scripts/setup-v2.js
node scripts/verify-setup.js
```

## Benefits

### ✅ Single Source of Truth
- All Claude Code config in one repo
- Edit files here, changes reflect immediately
- No copying or manual syncing

### ✅ Git-Tracked Learning
- v1 learned skills in `skills/learned/`
- v2 inherited instincts in `homunculus/instincts/inherited/`
- v2 evolved skills/commands/agents in `homunculus/evolved/`
- Sync knowledge across machines via git

### ✅ Customizable
- Full control over all files
- Modify hooks, agents, skills without restrictions
- No upstream plugin dependencies

### ✅ Portable
- Clone repo + run setup = instant config
- Works on macOS, Linux, Windows (Node.js scripts)
- Automated setup scripts (no manual steps)

### ✅ Safe Uninstall
- Backup created before modifications
- Restore original setup if needed
- Non-destructive (keeps learned data)

## v2 vs v1 Comparison

| Feature | v1 (continuous-learning) | v2 (continuous-learning-v2) |
|---------|--------------------------|------------------------------|
| **Observation** | Stop hook (end of session) | PreToolUse/PostToolUse (every tool) |
| **Reliability** | ~50-80% capture | 100% deterministic |
| **Granularity** | Full skills | Atomic instincts |
| **Confidence** | None | 0.3-0.9 scoring |
| **Sharing** | None | Import/export instincts |
| **Evolution** | Direct to skills | Instincts → cluster → skills/commands/agents |
| **Commands** | None | `/instinct-status`, `/evolve` |

## v2 vs Homunculus Plugin

| Factor | v2 (Your Repo) | Homunculus Plugin |
|--------|----------------|-------------------|
| **Control** | Full (in your repo) | External (upstream updates) |
| **Symlinks** | Compatible | Plugin-based (complex) |
| **Customization** | Unlimited | Limited (fork required) |
| **Commands** | `/instinct-status`, `/evolve` | `/homunculus:status`, etc. |
| **Path Conflicts** | None | Both use ~/.claude/homunculus/ |

**Verdict**: v2 in your repo is better for symlink-based setup.

## What Gets Synced to Git

### ✅ Tracked (Synced Across Machines)
- agents/
- commands/
- skills/ (including learned/)
- rules/
- scripts/
- hooks/hooks.json
- homunculus/instincts/inherited/
- homunculus/evolved/

### ❌ Ignored (Local Only)
- homunculus/observations.jsonl
- homunculus/.observer.pid
- homunculus/observer.log
- homunculus/instincts/personal/
- sessions/ (stays in ~/.claude/)

## Available Commands (v2)

Once v2 is set up and hooks are active:

- `/instinct-status` - View all learned instincts with confidence scores
- `/instinct-export [id]` - Export instinct to share with team
- `/instinct-import [path]` - Import team instinct
- `/evolve` - Cluster instincts into skills/commands/agents

## Troubleshooting

### Symlinks not working
```bash
# Check symlinks
ls -la ~/.claude/

# Re-create symlinks
node scripts/setup-symlinks.js
```

### Hooks not firing
```bash
# Check hooks in settings.json
cat ~/.claude/settings.json | grep -A5 hooks

# Re-merge hooks
node scripts/merge-hooks.js
```

### v2 not saving to repo
```bash
# Check v2 config
cat skills/continuous-learning-v2/config.json

# Re-run v2 setup
node scripts/setup-v2.js

# Verify setup
node scripts/verify-setup.js
```

### Learned skills not appearing
```bash
# Check v1 config
cat skills/continuous-learning/config.json

# Check directory exists
ls -la skills/learned/

# Check permissions
ls -ld skills/learned/
```

## Advanced: Custom Statusline

The custom statusline shows:
- Username and current directory
- Git branch with dirty status (*)
- Context window remaining (%)
- Model name and time
- Todo count

Setup:
```bash
node scripts/setup-statusline.js
```

Example output:
```
njui:~/projects/myapp develop* ctx:73% sonnet-4.5 16:34 todos:3
```

## Files Created

### Setup Scripts
- `scripts/setup-symlinks.js` - Create symlinks
- `scripts/merge-hooks.js` - Merge hooks to settings.json
- `scripts/setup-statusline.js` - Add custom statusline
- `scripts/setup-v2.js` - Configure v2
- `scripts/update-gitignore-v2.js` - Update .gitignore
- `scripts/verify-setup.js` - Validate setup
- `scripts/uninstall.js` - Remove everything

### Documentation
- `UNINSTALL.md` - Uninstall guide
- `SETUP-SUMMARY.md` - This file

### Backups Created
- `~/.claude/settings.json.backup-*` (by merge-hooks.js)
- `~/.claude/agents.backup-*` (by setup-symlinks.js)
- `~/.claude/skills.backup-*` (by setup-symlinks.js)
- `skills/continuous-learning-v2/config.json.backup-*` (by setup-v2.js)
- Plus backups for observe.sh, instinct-cli.py, start-observer.sh

## Next Steps

1. **Test the setup**:
   - Edit a file in repo: `vim agents/planner.md`
   - Changes should be immediately visible in Claude Code

2. **Test v2 learning**:
   - Run a Claude Code session
   - Make some edits (triggers observation hooks)
   - Check `homunculus/observations.jsonl` for entries
   - Run `/instinct-status` after a few sessions

3. **Commit to git**:
   ```bash
   git add .
   git commit -m "feat: symlink-based central repository with v2"
   git push
   ```

4. **Set up on other machines**:
   - Clone repo
   - Run setup scripts
   - Pull learned skills from git

## Support

For issues:
1. Run `node scripts/verify-setup.js` to check configuration
2. Check UNINSTALL.md for uninstall instructions
3. Review CLAUDE.md for project documentation
4. Check ~/.claude/debug/ for Claude Code logs
