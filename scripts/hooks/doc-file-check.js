#!/usr/bin/env node
/**
 * PreToolUse Hook: doc-file-check
 *
 * Warns (never blocks) when Claude tries to create a non-standard .md/.txt
 * file. Runs async so it never holds up Claude Code.
 *
 * Allowed without warning:
 *   - Standard root docs: README, CLAUDE, AGENTS, CONTRIBUTING, CHANGELOG,
 *     LICENSE, SKILL, QUICK_SETUP, UNINSTALL, ROADMAP, SETUP-SUMMARY
 *   - Anything inside .claude/ dirs (commands, agents, skills, plans, rules,
 *     templates — all legitimate Claude Code components)
 *   - Anything inside docs/, skills/, rules/, commands/, agents/ dirs
 *   - Anything inside .planning/ dirs (GSD planning files)
 *   - Non-.md/.txt files (no-op)
 */

const MAX_STDIN = 1 * 1024 * 1024; // 1MB
let data = '';
let done = false;

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk;
});

process.stdin.on('end', () => {
  if (done) return;
  done = true;

  let input = {};
  try { input = JSON.parse(data); } catch { /* pass through on bad JSON */ }

  const filePath = (input.tool_input?.file_path || '').replace(/\\/g, '/');

  if (shouldWarn(filePath)) {
    process.stderr.write(`[DocCheck] WARNING: Non-standard documentation file: ${filePath}\n`);
    process.stderr.write(`[DocCheck] If intentional, ignore this warning.\n`);
  }

  // Always pass through — never block
  process.stdout.write(data);
  process.exit(0);
});

process.stdin.on('error', () => {
  process.stdout.write(data);
  process.exit(0);
});

function shouldWarn(filePath) {
  if (!filePath) return false;

  // Only flag .md and .txt files
  if (!/\.(md|txt)$/i.test(filePath)) return false;

  // Allow standard named docs (case-insensitive)
  const basename = filePath.split('/').pop();
  if (/^(README|CLAUDE|AGENTS|CONTRIBUTING|CHANGELOG|LICENSE|SKILL|QUICK.SETUP|UNINSTALL|ROADMAP|SETUP.SUMMARY|VERIFICATION|RESEARCH|HANDOFF|PLAN)\.(md|txt)$/i.test(basename)) {
    return false;
  }

  // Allow anything inside a .claude/ directory
  // Covers: .claude/commands/, .claude/agents/, .claude/skills/,
  //         .claude/plans/, .claude/rules/, .claude/templates/
  if (/(?:^|\/)\.claude\//.test(filePath)) return false;

  // Allow docs/, skills/, rules/, commands/, agents/, .planning/ dirs
  if (/(?:^|\/)(docs|skills|rules|commands|agents|\.planning)\//.test(filePath)) return false;

  return true;
}
