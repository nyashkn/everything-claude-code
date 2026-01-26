# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**everything-claude-code** is a comprehensive Claude Code plugin repository containing battle-tested configurations, agents, skills, hooks, commands, and rules evolved over 10+ months of intensive daily use. This is a Node.js-based plugin system with cross-platform support (Windows, macOS, Linux).

**Tech Stack**: Node.js scripts, Markdown configurations, JSON config files

## Critical Architecture Concepts

### 1. Plugin Structure

This repo IS a Claude Code plugin - structured for installation via `/plugin marketplace add`. The plugin manifest at `.claude-plugin/plugin.json` defines component paths:
- Commands: `./commands` directory
- Skills: `./skills` directory
- Hooks: Loaded from `hooks/hooks.json` (auto-loaded by convention)

### 2. Cross-Platform Hook System

All hooks and scripts are written in **Node.js** (not bash) for Windows/macOS/Linux compatibility. Key libraries:
- `scripts/lib/utils.js`: Cross-platform file/path/system utilities
- `scripts/lib/package-manager.js`: Automatic package manager detection (npm/pnpm/yarn/bun)

Hook execution flow:
- PreToolUse → SessionStart → PostToolUse → Stop → SessionEnd → PreCompact
- All hooks receive JSON via stdin, output to stdout/stderr
- Use `readStdinJson()` from utils.js for hook input parsing

### 3. Package Manager Detection

Multi-level priority system (`scripts/lib/package-manager.js`):
1. Environment variable: `CLAUDE_PACKAGE_MANAGER`
2. Project config: `.claude/package-manager.json`
3. package.json: `packageManager` field
4. Lock file detection (pnpm-lock.yaml, yarn.lock, etc.)
5. Global config: `~/.claude/package-manager.json`
6. Fallback: First available manager

This allows hooks to generate correct commands across different projects automatically.

### 4. Memory Persistence Pattern

Session lifecycle hooks (`scripts/hooks/`) implement continuous context:
- `session-start.js`: Load previous context from `~/.claude/sessions/` on startup
- `session-end.js`: Persist session state when ending
- `pre-compact.js`: Save state before context compaction
- `evaluate-session.js`: Extract patterns into `~/.claude/skills/learned/`

### 5. Agent Orchestration

Specialized subagents in `agents/` directory with frontmatter metadata:
```markdown
---
name: agent-name
description: What it does
tools: Read, Grep, Glob, Bash
model: sonnet|opus|haiku
---
```

Agent usage rule: Complex features → planner agent, Code review → code-reviewer agent, TDD → tdd-guide agent. ALWAYS use parallel Task execution for independent operations.

### 6. Skills vs Commands

- **Skills** (`skills/`): Reusable knowledge/workflows loaded as context (markdown files or directories with SKILL.md)
- **Commands** (`commands/`): Slash commands that invoke agents or workflows (frontmatter with description)

Skills are passive knowledge; commands are active invocations.

### 7. Hook Matchers

Hooks use matcher expressions to trigger on specific tool calls:
```json
{
  "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx)$\"",
  "hooks": [...]
}
```

Common patterns: Block operations (exit 1), warn users (stderr), format/validate (modify then output).

## Essential Commands

### Testing
```bash
# Run all tests
node tests/run-all.js

# Run individual test suites
node tests/lib/utils.test.js
node tests/lib/package-manager.test.js
node tests/hooks/hooks.test.js
```

### Package Manager Setup
```bash
# Detect current package manager
node scripts/setup-package-manager.js --detect

# Set global preference
node scripts/setup-package-manager.js --global pnpm

# Set project preference
node scripts/setup-package-manager.js --project bun
```

Or use `/setup-pm` command in Claude Code.

### Development
This is a configuration repository - no build step required. Test changes by:
1. Installing plugin via `/plugin marketplace add`
2. Testing commands with `/command-name`
3. Verifying hooks trigger on tool use

## Key Patterns & Conventions

### Security-Conscious Utilities

`scripts/lib/utils.js` includes careful command execution:
- `commandExists()`: Validates command names (alphanumeric only) before checking PATH
- `runCommand()`: Uses execSync but documented for trusted commands only
- Never pass user-controlled input to shell commands without validation

### Hook I/O Pattern

Standard hook structure:
```javascript
const { readStdinJson, log, output } = require('./lib/utils');

async function main() {
  const input = await readStdinJson();

  // Process tool_input, tool_output, etc.
  log('[HookName] Message visible to user');

  // Return modified input or original
  output(input);
}

main().catch(err => {
  console.error('[HookName] Error:', err.message);
  process.exit(0); // Don't block on errors
});
```

### File Organization Philosophy

From `rules/coding-style.md`:
- MANY SMALL FILES over few large files
- 200-400 lines typical, 800 max per file
- High cohesion, low coupling
- Organize by feature/domain, not by type

### Immutability Requirements

CRITICAL rule enforced across all code:
- NEVER mutate objects or arrays
- ALWAYS create new objects with spread syntax
- See `rules/coding-style.md` for examples

### TDD Workflow

Enforced via `/tdd` command and tdd-guide agent:
1. Define interfaces first
2. Write FAILING tests (RED)
3. Implement minimal code (GREEN)
4. Refactor while keeping tests green (REFACTOR)
5. Verify 80%+ coverage (100% for critical code)

NEVER write implementation before tests.

## Important File Locations

- **Hook implementations**: `scripts/hooks/` (Node.js)
- **Shared utilities**: `scripts/lib/` (Node.js modules)
- **Hook config**: `hooks/hooks.json` (loaded automatically)
- **Test suite**: `tests/` (Node.js test files)
- **Agent definitions**: `agents/*.md` (markdown with frontmatter)
- **Skills**: `skills/*/SKILL.md` (can be directories or single files)
- **Commands**: `commands/*.md` (markdown with frontmatter)
- **Rules**: `rules/*.md` (always-follow guidelines)
- **MCP configs**: `mcp-configs/mcp-servers.json`

## Plugin Installation Methods

Users can install this plugin via:
1. `/plugin marketplace add affaan-m/everything-claude-code` then `/plugin install`
2. Manual addition to `~/.claude/settings.json` extraKnownMarketplaces and enabledPlugins
3. Manual copy of individual components to `~/.claude/` directories

## Context Window Management

Critical constraint: 200k context window can shrink to 70k with too many MCPs enabled.

Rule of thumb:
- Have 20-30 MCPs configured
- Keep under 10 enabled per project
- Under 80 tools active
- Use `disabledMcpServers` in project config

## Cross-Platform Considerations

When writing new scripts or hooks:
- Use Node.js, not shell scripts
- Use `path.join()` for all paths
- Use utilities from `scripts/lib/utils.js` for file operations
- Test on Windows/macOS/Linux before committing
- Use `spawnSync` with argument arrays (not `execSync`) for user input

## Git Workflow

From `rules/git-workflow.md`:
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` in commits
- Never commit console.log statements (hooks will warn)
- Never commit hardcoded secrets (security rules apply)

## Common Pitfalls

1. **Don't use bash hooks** - All hooks must be Node.js for cross-platform support
2. **Don't mutate data** - Immutability is enforced; create new objects instead
3. **Don't skip TDD RED phase** - Tests must fail before implementing
4. **Don't enable all MCPs** - Context window limitation is real
5. **Don't create random .md files** - Hook blocks unnecessary documentation files
6. **Don't run dev servers without tmux** - Hook requires tmux for log access

## Parallelization Strategies

Everything-claude-code supports three complementary dimensions of parallelization for maximum productivity. These patterns are referenced in the [Longform Guide](https://x.com/affaanmustafa/status/2014040193557471352) and enable Claude Code to handle complex, multi-faceted work efficiently.

### 1. Temporal Parallelization (Cascade with HANDOFF)

**Definition**: Sequential execution with structured context passing between specialized agents.

**When to use**: Complex features requiring multiple perspectives (planning → implementation → review → security).

**Pattern**: Agent A → HANDOFF → Agent B → HANDOFF → Agent C

Each agent receives structured context from the previous agent via a HANDOFF document:

```markdown
## HANDOFF: [previous-agent] -> [next-agent]

### Context
[Summary of what was done]

### Findings
[Key discoveries or decisions]

### Files Modified
[List of files touched]

### Open Questions
[Unresolved items for next agent]

### Recommendations
[Suggested next steps]
```

**Example workflow**:
```
/orchestrate feature "Add user authentication"

Executes: planner → tdd-guide → code-reviewer → security-reviewer

1. Planner analyzes requirements, creates plan
   Output: HANDOFF: planner -> tdd-guide

2. TDD Guide reads handoff, writes tests, implements
   Output: HANDOFF: tdd-guide -> code-reviewer

3. Code Reviewer checks quality, suggests improvements
   Output: HANDOFF: code-reviewer -> security-reviewer

4. Security Reviewer audits for vulnerabilities
   Output: Final Report
```

**Benefits**:
- Context continuity across specialized agents
- Each agent builds on previous work
- Structured handoffs prevent information loss
- Expertise applied at appropriate stages

**Limitation**: Sequential (must wait for previous agent to complete)

**Reference**: `commands/orchestrate.md` for full HANDOFF format

### 2. Concurrent Parallelization (Parallel Agents)

**Definition**: Multiple agents analyzing the same task independently from different perspectives.

**When to use**: Independent code analysis requiring multiple viewpoints (security + performance + types).

**Pattern**: Launch multiple Task calls in a single message

**Example**:
```markdown
# Single message with 3 parallel Task invocations:

Task 1: Security analysis of auth implementation
Task 2: Performance profiling of database queries
Task 3: Type safety verification of API layer
```

From `rules/agents.md`:
```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth.ts
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utils.ts

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

**Benefits**:
- Faster feedback (no sequential wait)
- Multiple perspectives on same code
- Reduces total execution time
- Independent analyses can run simultaneously

**Limitation**:
- Higher context usage (all results in same session)
- Manual coordination of results required
- Best for < 5 parallel agents

**Reference**: `rules/agents.md` lines 29-40

### 3. Distributed Parallelization (Remote Workspaces)

**Definition**: Isolated execution across remote machines using Coder workspaces.

**When to use**: Large-scale parallel work on different issues/features simultaneously.

**Implementation**: Each workspace is a complete isolated environment:
- Docker container with full project setup
- Independent git branch (feature/issue-N)
- Separate Claude Code session
- Full environment (docker-compose.yml)
- No shared context window

**Available commands**:
- `/workspace-create [issue_number]` - Create remote workspace for GitHub issue
- `/workspace-start <workspace>` - Start execution
- `/workspace-status` - Check running workspaces
- `/workspace-connect <workspace>` - SSH/Zed/web access
- `/workspace-stop <workspace>` - Halt execution
- `/workspace-delete <workspace>` - Cleanup workspace

**Example workflow**:
```bash
# Create 3 workspaces for parallel issues
/workspace-create 123  # Feature: Add authentication
/workspace-create 456  # Feature: Add caching
/workspace-create 789  # Feature: Add logging

# Each workspace:
# - Clones repo in Docker container
# - Checks out feature/issue-N branch
# - Runs Claude Code session
# - Works independently with own context
```

**Benefits**:
- True parallelism (no shared context limits)
- Isolated environments (no conflicts)
- Scale to many issues simultaneously
- Git worktree equivalent for Claude Code
- Infrastructure-as-code (Coder templates)

**Limitation**: Requires Coder infrastructure setup

**Reference**: `commands/workspace-*.md` for full workspace lifecycle

### Choosing Your Strategy

Decision matrix for parallelization approach:

| Scenario | Recommended Strategy | Why |
|----------|---------------------|-----|
| Complex feature with multiple stages | Temporal (cascade) | Sequential expertise needed |
| Code review from multiple angles | Concurrent (parallel agents) | Independent perspectives |
| Multiple GitHub issues simultaneously | Distributed (workspaces) | True isolation required |
| Quick refactor or small task | No parallelization | Overhead not justified |
| Security + performance + quality review | Concurrent (parallel agents) | Same code, different lenses |
| Feature planning → implementation → review | Temporal (cascade) | Sequential dependency |
| 10+ issues in backlog | Distributed (workspaces) | Scale beyond context limits |

### Example: Full Feature Implementation

**Temporal - Sequential cascade**:
```bash
/orchestrate feature "Add authentication"

Result:
- planner → creates plan, identifies dependencies
- tdd-guide → receives plan, writes tests, implements
- code-reviewer → reviews implementation, suggests fixes
- security-reviewer → audits security, gives approval

Each agent receives HANDOFF document from previous
Context flows sequentially with structure
```

**Concurrent - Parallel analysis**:
```markdown
# Single message with 3 Task calls

Task 1: Security audit of authentication implementation
Task 2: Performance profiling of auth endpoints
Task 3: Type safety verification of auth types

Result:
- 3 independent reports generated simultaneously
- Manually merge insights and act on findings
- Faster than sequential review
```

**Distributed - Scale across issues**:
```bash
/workspace-create 123  # Feature A: Authentication
/workspace-create 456  # Feature B: Caching
/workspace-create 789  # Feature C: Logging

Result:
- 3 isolated Docker environments
- Each working on separate feature branch
- Independent Claude Code sessions
- No context window sharing
- True parallel development
```

### Combining Strategies

Most powerful pattern: **Distributed + Temporal**

```bash
# Create workspaces for 3 features
/workspace-create 123  # Auth feature
/workspace-create 456  # Cache feature
/workspace-create 789  # Logs feature

# Within each workspace, use temporal cascade
Workspace 123: /orchestrate feature "authentication"
Workspace 456: /orchestrate feature "caching"
Workspace 789: /orchestrate feature "logging"

# Result: 3 parallel cascades
# Each feature gets: planner → tdd → reviewer → security
# All running simultaneously in isolation
```

### Key Principles

1. **Temporal (cascade)** = Sequential expertise
2. **Concurrent (parallel)** = Multiple perspectives
3. **Distributed (workspaces)** = True isolation
4. **Combine** for maximum throughput

## Testing Changes

Before submitting contributions:
1. Run `node tests/run-all.js` to verify utilities work
2. Test hooks by triggering them in Claude Code session
3. Verify commands work via `/command-name`
4. Check cross-platform compatibility (especially Windows path handling)

## Related Documentation

- Shorthand Guide: https://x.com/affaanmustafa/status/2012378465664745795
- Longform Guide: https://x.com/affaanmustafa/status/2014040193557471352
- CONTRIBUTING.md: Contribution guidelines and formatting requirements
- README.md: Installation instructions and component overview
