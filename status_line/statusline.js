#!/usr/bin/env node
/**
 * ECC Status Line — Multi-line strategic status
 *
 * Line 1 (always):     [ctx_bar]  model  📂 dir branch*  time
 * Line 2 (if active):  ⟳ task_description
 * Line 3 (if advisor): 💡 strategic insight
 *
 * Architecture borrowed from:
 * - GSD: ctx bar scaled so 80% real usage = 100% display
 * - vibe-log-cli: hook writes insight file → status line reads it (async pattern)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync } = require('child_process');

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const R    = '\x1b[0m';
const DIM  = '\x1b[2m';
const BOLD = '\x1b[1m';
const rgb  = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

const CLR = {
  green:  rgb(64,  160, 43),
  blue:   rgb(30,  102, 245),
  yellow: rgb(223, 142, 29),
  orange: '\x1b[38;5;208m',
  red:    '\x1b[31m',
  cyan:   rgb(23,  146, 153),
  purple: rgb(136, 57,  239),
  gray:   rgb(76,  79,  105),
};

// ── Context bar (GSD pattern: 80% real = 100% visual) ────────────────────────
function ctxBar(remainingPct) {
  const rawUsed = Math.max(0, Math.min(100, 100 - remainingPct));
  const used    = Math.min(100, Math.round((rawUsed / 80) * 100));
  const filled  = Math.floor(used / 10);
  const bar     = '█'.repeat(filled) + '░'.repeat(10 - filled);
  const label   = `${used}%`.padStart(4);
  if (used < 63) return `${CLR.green}${bar}${label}${R}`;
  if (used < 81) return `${CLR.yellow}${bar}${label}${R}`;
  if (used < 95) return `${CLR.orange}${bar}${label}${R}`;
  return `\x1b[5m${CLR.red}💀${bar}${label}${R}`;
}

// ── Active task (from todos dir) ──────────────────────────────────────────────
function getActiveTask(claudeDir, sessionId) {
  if (!sessionId) return null;
  const todosDir = path.join(claudeDir, 'todos');
  if (!fs.existsSync(todosDir)) return null;
  try {
    const files = fs.readdirSync(todosDir)
      .filter(f => f.startsWith(sessionId) && f.includes('-agent-') && f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return null;
    const todos  = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
    const active = todos.find(t => t.status === 'in_progress');
    return active ? (active.activeForm || active.subject || null) : null;
  } catch (e) { return null; }
}

// ── Advisor insight (written by advisor.js hook) ──────────────────────────────
function getAdvisorInsight(claudeDir, sessionId) {
  if (!sessionId) return null;
  const f = path.join(claudeDir, 'status-advisor', `${sessionId}.json`);
  if (!fs.existsSync(f)) return null;
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (Date.now() - (d.timestamp || 0) > 10 * 60 * 1000) return null; // stale after 10min
    return d.insight || null;
  } catch (e) { return null; }
}

// ── Git branch + dirty status ─────────────────────────────────────────────────
function getGitInfo(dir) {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD',
      { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'], timeout: 500 }).toString().trim();
    const dirty  = execSync('git status --porcelain',
      { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'], timeout: 500 }).toString().trim();
    return { branch, dirty: dirty.length > 0 };
  } catch (e) { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    const homeDir   = os.homedir();
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');

    // Extract context from Claude Code's JSON payload
    const rawModel  = data.model?.display_name || 'claude';
    const model     = rawModel.replace(/^claude-/, '').replace(/-\d{8}$/, '');
    const dir       = data.workspace?.current_dir || process.cwd();
    const sessionId = data.session_id;
    const remaining = data.context_window?.remaining_percentage;
    const dirname   = path.basename(dir);
    const time      = new Date().toLocaleTimeString('en-US',
      { hour12: false, hour: '2-digit', minute: '2-digit' });

    // ── Line 1: ctx_bar  model  📂 dir branch*  time ─────────────────────────
    const bar    = remaining != null ? ctxBar(remaining) + '  ' : '';
    const git    = getGitInfo(dir);
    const gitStr = git
      ? ` ${CLR.green}${git.branch}${git.dirty ? CLR.yellow + '*' : ''}${R}`
      : '';

    const line1 = [
      bar,
      `${DIM}${model}${R}`,
      `  ${CLR.blue}📂 ${dirname}${R}${gitStr}`,
      `  ${CLR.gray}${time}${R}`,
    ].join('');

    // ── Line 2: active task ───────────────────────────────────────────────────
    const task  = getActiveTask(claudeDir, sessionId);
    const line2 = task ? `${CLR.cyan}⟳${R} ${BOLD}${task}${R}` : null;

    // ── Line 3: advisor insight ───────────────────────────────────────────────
    const insight = getAdvisorInsight(claudeDir, sessionId);
    const line3   = insight ? `${CLR.purple}💡${R} ${DIM}${insight}${R}` : null;

    process.stdout.write([line1, line2, line3].filter(Boolean).join('\n'));
  } catch (e) {
    // Silent fail — never break the status line
  }
});
