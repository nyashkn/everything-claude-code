# Quick Setup

Get Everything Claude Code running on a new machine in minutes.

## 1. Clone & Run Setup

```bash
git clone git@github.com:nyashkn/everything-claude-code.git
cd everything-claude-code

node scripts/setup.js
```

The setup wizard will:
- Ask where to install (`~/.claude` or a named profile like `~/.claude-profiles/ecc`)
- Create symlinks for skills, agents, commands, scripts
- Install language rules (choose typescript, python, etc.)
- Merge hooks into settings.json
- Install external skills (playwright-skill, humanizer, typescript-expert)
- Configure continuous learning v2
- Optionally add the statusline

## 2. Profile-Based Setup (Recommended)

If you use [claude-profiles](https://github.com/nyashkn/making_my_agentic_setup_brrrrrr):

```bash
# Create the profile first
make -C /path/to/making_my_agentic_setup_brrrrrr profile-create NAME=ecc

# Run setup targeting the profile
CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/setup.js

# Activate
claude-profile-use ecc
```

Add to `~/.zshrc` for persistence:
```bash
export CLAUDE_CONFIG_DIR=$HOME/.claude-profiles/ecc
```

## 3. Install External Skills

```bash
# All external skills (playwright-skill, humanizer, typescript-expert)
CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/install-external-skills.js

# Specific skill only
CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/install-external-skills.js playwright-skill

# Update cached repos
CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/install-external-skills.js --update
```

## 4. Per-Project Rules

Language rules (typescript, python) are installed per-project, not globally:

```bash
cd /your/project
CLAUDE_RULES_DIR=.claude/rules bash /path/to/everything-claude-code/install.sh typescript python
```

Or run the interactive wizard inside Claude: **"configure ecc"**

## 5. Re-run Individual Steps

```bash
node scripts/setup.js --step symlinks    # recreate symlinks
node scripts/setup.js --step rules       # install/change language rules
node scripts/setup.js --step hooks       # re-merge hooks
node scripts/setup.js --step skills      # install external skills
node scripts/setup.js --step v2          # configure continuous learning
node scripts/setup.js --step statusline  # add statusline
node scripts/setup.js --step verify      # check everything is wired up
```

## 6. Verify

```bash
CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/verify-setup.js
```

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `CLAUDE_CONFIG_DIR` | Target profile/install dir | `~/.claude-profiles/ecc` |
| `ECC_ROOT` | Path to this repo (auto-detected if unset) | `/path/to/everything-claude-code` |
| `CLAUDE_PACKAGE_MANAGER` | Override package manager | `bun` |
| `CLAUDE_HOMUNCULUS_DIR` | Override continuous learning store | `~/.claude/homunculus` |
