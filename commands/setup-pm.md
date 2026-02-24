---
description: Configure your preferred package manager (npm/pnpm/yarn/bun)
---

# Package Manager Setup

Configure your preferred package manager for Node.js projects.

**IMPORTANT**: This command only works in Node.js projects (those with package.json). For Python projects, this command is not applicable.

## How It Works

When you run `/setup-pm`, Claude Code will:

1. **Detect** if this is a Node.js project (checks for package.json)
2. **Analyze** which package manager is currently in use:
   - Check lock files (package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb)
   - Check package.json `packageManager` field
   - Check environment variable `CLAUDE_PACKAGE_MANAGER`
   - Check global/project config files
3. **Configure** your preference:
   - Global: Set preferred package manager for all projects
   - Project: Set package manager for current project only

## Available Package Managers

- **npm**: Default Node.js package manager
- **pnpm**: Fast, disk-efficient package manager
- **yarn**: Classic Yarn package manager
- **bun**: All-in-one JavaScript runtime & toolkit

## Configuration Options

### Set Global Preference
Creates `~/.claude/package-manager.json`:
```json
{
  "packageManager": "pnpm"
}
```

### Set Project Preference
Creates `.claude/package-manager.json`:
```json
{
  "packageManager": "bun"
}
```

### Environment Variable
Override all detection:
```bash
# macOS/Linux
export CLAUDE_PACKAGE_MANAGER=pnpm

# Windows PowerShell
$env:CLAUDE_PACKAGE_MANAGER = "pnpm"
```

## Usage Examples

When you invoke `/setup-pm`, Claude Code will interactively guide you through:
- Detecting current package manager
- Showing available options
- Setting global or project preferences
- Verifying the configuration

## Detection Priority

Claude Code checks in this order:
1. Environment variable: `CLAUDE_PACKAGE_MANAGER`
2. Project config: `.claude/package-manager.json`
3. package.json: `packageManager` field
4. Lock file detection
5. Global config: `~/.claude/package-manager.json`
6. Fallback: First available (pnpm > bun > yarn > npm)

## Detection Priority

When determining which package manager to use, the following order is checked:

1. **Environment variable**: `CLAUDE_PACKAGE_MANAGER`
2. **Project config**: `.claude/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: Presence of package-lock.json, yarn.lock, pnpm-lock.yaml, or bun.lockb
5. **Global config**: `~/.claude/package-manager.json`
6. **Fallback**: First available package manager (pnpm > bun > yarn > npm)

## Configuration Files

### Global Configuration
```json
// ~/.claude/package-manager.json
{
  "packageManager": "pnpm"
}
```

### Project Configuration
```json
// .claude/package-manager.json
{
  "packageManager": "bun"
}
```

### package.json
```json
{
  "packageManager": "pnpm@8.6.0"
}
```

## Environment Variable

Set `CLAUDE_PACKAGE_MANAGER` to override all other detection methods:

```bash
# Windows (PowerShell)
$env:CLAUDE_PACKAGE_MANAGER = "pnpm"

# macOS/Linux
export CLAUDE_PACKAGE_MANAGER=pnpm
```

## Run the Detection

To see current package manager detection results, run:

```bash
node scripts/setup-package-manager.js --detect
```
