#!/usr/bin/env node
/**
 * ECC Advisor — UserPromptSubmit hook
 *
 * Two-phase analysis:
 *   1. Heuristics (<50ms) — writes a guaranteed-fast fallback insight
 *   2. LLM (Gordon) — rich session context → claude -p → overwrites with sharper insight
 *
 * Context passed to Gordon (mirrors vibe-log session-context-extractor pattern):
 *   - ORIGINAL MISSION: first user message (500 chars)
 *   - RECENT CONTEXT: last N conversation turns with actual content
 *   - Session metadata: message #, total messages, todos list, ctx%
 *
 * Runs async (non-blocking). Never fails. Always exits 0.
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { spawnSync } = require('child_process');

const RECENT_TURNS = 5; // conversation turns to include (user+assistant pairs)

// ── Phase 1: Heuristics (fast fallback) ──────────────────────────────────────
function heuristicInsight({ prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount }) {
  if (remaining != null) {
    const used = 100 - remaining;
    if (used >= 85) return '⚠️ Context critical — /compact now or open a fresh session';
    if (used >= 70) return 'Context filling — compact after this task to stay sharp';
  }

  if (sessionGoal && prompt.length > 10) {
    const goalWords   = new Set(sessionGoal.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const promptWords = new Set(prompt.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const overlap     = [...goalWords].filter(w => promptWords.has(w)).length;
    if (goalWords.size > 3 && overlap === 0) {
      const preview = sessionGoal.slice(0, 60);
      return `Drifting? Goal: "${preview}${sessionGoal.length > 60 ? '…' : ''}"`;
    }
  }

  if (todoTotal > 0) {
    if (todoDone === todoTotal) return `All ${todoTotal} tasks done — commit and start next milestone`;
    return `${todoDone}/${todoTotal} done — keep shipping`;
  }

  const trimmed = prompt.trim();
  if (trimmed.length > 0 && trimmed.length < 15) {
    return 'Short prompt — add context: what you tried and what you expect';
  }

  if (promptCount > 20 && todoTotal === 0) {
    return 'Long session — use /plan or TodoWrite to track progress';
  }

  return null;
}

// ── Parse transcript: original mission + last N turns ─────────────────────────
function parseTranscript(transcriptPath) {
  if (!transcriptPath) return { sessionGoal: null, promptCount: 0, recentTurns: [] };
  try {
    const normalized = transcriptPath.replace(/^~\//, `${os.homedir()}/`);
    const rawLines   = fs.readFileSync(normalized, 'utf8').trim().split('\n');

    let sessionGoal = null;
    let promptCount = 0;
    const allMessages = [];

    for (const line of rawLines) {
      let d;
      try { d = JSON.parse(line); } catch (e) { continue; }

      const role = d.message?.role;
      if (!role || d.isMeta) continue;
      if (role !== 'user' && role !== 'assistant') continue;

      // Extract text content
      let text = '';
      const content = d.message.content;
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content.filter(i => i.type === 'text').map(i => i.text).join('\n');
      }

      // Skip empty or meta-ish messages
      if (!text || text.includes('<command-name>') || text.includes('Caveat: The messages below were generated')) continue;

      if (role === 'user') promptCount++;

      // First user message = original mission
      if (role === 'user' && !sessionGoal) {
        sessionGoal = text.slice(0, 500).trim();
      }

      allMessages.push({ role, text });
    }

    // Collect last RECENT_TURNS * 2 messages (pairs), skipping first (already captured as mission)
    const recent = allMessages.slice(-RECENT_TURNS * 2);

    return { sessionGoal, promptCount, recentTurns: recent };
  } catch (e) {
    return { sessionGoal: null, promptCount: 0, recentTurns: [] };
  }
}

// ── Read todos with full item details ────────────────────────────────────────
function readTodos(claudeDir, sessionId) {
  const todosDir = path.join(claudeDir, 'todos');
  if (!sessionId || !fs.existsSync(todosDir)) return { todoTotal: 0, todoDone: 0, todos: [] };
  try {
    const files = fs.readdirSync(todosDir)
      .filter(f => f.startsWith(sessionId) && f.includes('-agent-') && f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return { todoTotal: 0, todoDone: 0, todos: [] };

    const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
    return {
      todoTotal: todos.length,
      todoDone:  todos.filter(t => t.status === 'completed').length,
      todos,
    };
  } catch (e) {
    return { todoTotal: 0, todoDone: 0, todos: [] };
  }
}

// ── Build rich context string (vibe-log style) ───────────────────────────────
function buildSessionContext({ prompt, remaining, promptCount, sessionGoal, recentTurns, todos }) {
  const parts = [];

  if (sessionGoal) {
    parts.push(`ORIGINAL MISSION:\n${sessionGoal}`);
  }

  if (recentTurns.length > 0) {
    const formatted = recentTurns.map(m => {
      const label = m.role === 'assistant' ? 'Assistant' : 'User';
      return `${label}: ${m.text.slice(0, 400)}`;
    }).join('\n\n');
    parts.push(`RECENT CONTEXT:\n${formatted}`);
  }

  const ctxLine = remaining != null ? `${Math.round(100 - remaining)}% context used` : 'context usage unknown';

  const todoLines = todos.length > 0
    ? todos.map(t => `  [${t.status === 'completed' ? 'x' : ' '}] ${t.subject || t.title || '(unnamed)'}`).join('\n')
    : '  (no todos tracked)';

  parts.push([
    `SESSION STATE:`,
    `- ${ctxLine}`,
    `- Message #${promptCount} in session`,
    `- Current prompt: "${prompt.slice(0, 200)}"`,
    `- Todos:\n${todoLines}`,
  ].join('\n'));

  return parts.join('\n\n---\n\n');
}

// ── Phase 2: Gordon LLM analysis ─────────────────────────────────────────────
function gordonInsight(ctx) {
  const claudeCli = process.env.CLAUDE_CLI_PATH || '/home/kn/.local/bin/claude';
  try { if (!fs.existsSync(claudeCli)) return null; } catch (e) { return null; }

  const sessionContext = buildSessionContext(ctx);

  const gordonPrompt =
    `You are Gordon, a tough-love coding coach (Gordon Ramsay energy — brutally honest, direct, but genuinely wants you to ship good work).\n\n` +
    `Analyze this developer's current session and give ONE sharp, specific insight.\n\n` +
    `${sessionContext}\n\n` +
    `Rules:\n` +
    `- Max 85 characters\n` +
    `- Plain text only (no quotes, no "Gordon:" prefix)\n` +
    `- Be specific to what they're actually doing, not generic\n` +
    `- Push them to deliver — urgency matters\n` +
    `- If they're on track, tell them what to watch out for next\n` +
    `- If they're drifting, call it out by name`;

  try {
    const result = spawnSync(
      claudeCli,
      ['-p', gordonPrompt, '--model', 'claude-haiku-4-5-20251001', '--max-tokens', '60'],
      { timeout: 3500, encoding: 'utf8' }
    );
    if (result.status === 0 && result.stdout) {
      const text = result.stdout.trim().replace(/^["']|["']$/g, '').split('\n')[0].trim();
      if (text.length >= 10 && text.length <= 120) return text;
    }
  } catch (e) { /* timeout or unavailable — fall through */ }

  return null;
}

// ── Write insight ─────────────────────────────────────────────────────────────
function writeInsight(advisorDir, sessionId, insight) {
  const advisorFile = path.join(advisorDir, `${sessionId}.json`);
  try {
    fs.writeFileSync(advisorFile, JSON.stringify({ insight, timestamp: Date.now(), sessionId }));
  } catch (e) { /* non-fatal */ }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;

  let data;
  try { data = JSON.parse(input); } catch (e) { return; }

  const sessionId      = data.session_id;
  const prompt         = data.prompt || '';
  const transcriptPath = data.transcript_path;
  const remaining      = data.context_window?.remaining_percentage ?? null;

  if (!sessionId) return;

  const homeDir    = os.homedir();
  const claudeDir  = process.env.CLAUDE_CONFIG_DIR || path.join(homeDir, '.claude');
  const advisorDir = path.join(claudeDir, 'status-advisor');

  fs.mkdirSync(advisorDir, { recursive: true });

  const { todoTotal, todoDone, todos } = readTodos(claudeDir, sessionId);
  const { sessionGoal, promptCount, recentTurns } = parseTranscript(transcriptPath);

  const ctx = { prompt, remaining, todoTotal, todoDone, todos, sessionGoal, promptCount, recentTurns };

  // Phase 1: heuristics — write immediately so status line always has something
  const heuristic = heuristicInsight(ctx);
  if (heuristic) writeInsight(advisorDir, sessionId, heuristic);

  // Phase 2: Gordon LLM — overwrite with richer, context-aware insight
  const gordon = gordonInsight(ctx);
  if (gordon) writeInsight(advisorDir, sessionId, gordon);
}

main().catch(() => {}).finally(() => { process.exitCode = 0; });
