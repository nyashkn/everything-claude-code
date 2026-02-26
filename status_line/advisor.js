#!/usr/bin/env node
/**
 * ECC Advisor — UserPromptSubmit hook
 *
 * Two-phase analysis strategy:
 *   1. Heuristics (<50ms) — writes insight immediately as guaranteed fallback
 *   2. LLM via `claude -p` with Gordon tough-love persona — overwrites if response
 *      arrives before timeout (~3.5s)
 *
 * Runs async (non-blocking). Never fails — always exits 0.
 * Status line (statusline.js) reads the written file on next render.
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const os    = require('os');
const { spawnSync } = require('child_process');

// ── Phase 1: Heuristics (fast fallback) ──────────────────────────────────────
function heuristicInsight({ prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount }) {
  // Context window health — always surface this first
  if (remaining != null) {
    const used = 100 - remaining;
    if (used >= 85) return '⚠️ Context critical — /compact now or open a fresh session';
    if (used >= 70) return 'Context filling — compact after this task to stay sharp';
  }

  // Session goal drift detection
  if (sessionGoal && prompt.length > 10) {
    const goalWords   = new Set(sessionGoal.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const promptWords = new Set(prompt.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const overlap     = [...goalWords].filter(w => promptWords.has(w)).length;
    if (goalWords.size > 3 && overlap === 0) {
      const preview = sessionGoal.slice(0, 60);
      return `Drifting? Goal: "${preview}${sessionGoal.length > 60 ? '…' : ''}"`;
    }
  }

  // Todo progress
  if (todoTotal > 0) {
    if (todoDone === todoTotal) return `All ${todoTotal} tasks done — commit and start next milestone`;
    return `${todoDone}/${todoTotal} done — keep shipping`;
  }

  // Prompt quality hint
  const trimmed = prompt.trim();
  if (trimmed.length > 0 && trimmed.length < 15) {
    return 'Short prompt — add context: what you tried and what you expect';
  }

  // Long session without tracking
  if (promptCount > 20 && todoTotal === 0) {
    return 'Long session — use /plan or TodoWrite to track progress';
  }

  return null;
}

// ── Phase 2: Gordon LLM analysis ─────────────────────────────────────────────
function gordonInsight({ prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount }) {
  const claudeCli = process.env.CLAUDE_CLI_PATH || '/home/kn/.local/bin/claude';
  try { if (!fs.existsSync(claudeCli)) return null; } catch (e) { return null; }

  const ctxUsed  = remaining != null ? `${Math.round(100 - remaining)}%` : 'unknown';
  const context  = [
    `Context used: ${ctxUsed}`,
    `Todos: ${todoDone}/${todoTotal} done`,
    `Prompts this session: ${promptCount}`,
    sessionGoal
      ? `Session goal: ${sessionGoal.slice(0, 100)}`
      : 'No clear session goal',
    `Current prompt: "${prompt.slice(0, 120)}"`,
  ].join('\n');

  const gordonPrompt =
    `You are Gordon, a tough-love coding coach with Gordon Ramsay energy — brutally honest, direct, but genuinely helpful.\n\n` +
    `Session context:\n${context}\n\n` +
    `Give ONE sharp insight for this developer. Max 85 characters. ` +
    `Plain text only. No quotes around the response, no "Gordon:" prefix.`;

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
  } catch (e) { /* timeout or unavailable — fall through to heuristic */ }

  return null;
}

// ── Read todo stats from session todos dir ────────────────────────────────────
function readTodoStats(claudeDir, sessionId) {
  const todosDir = path.join(claudeDir, 'todos');
  if (!sessionId || !fs.existsSync(todosDir)) return { todoTotal: 0, todoDone: 0 };
  try {
    const files = fs.readdirSync(todosDir)
      .filter(f => f.startsWith(sessionId) && f.includes('-agent-') && f.endsWith('.json'))
      .map(f => ({ name: f, mtime: fs.statSync(path.join(todosDir, f)).mtime }))
      .sort((a, b) => b.mtime - a.mtime);
    if (!files.length) return { todoTotal: 0, todoDone: 0 };
    const todos = JSON.parse(fs.readFileSync(path.join(todosDir, files[0].name), 'utf8'));
    return {
      todoTotal: todos.length,
      todoDone:  todos.filter(t => t.status === 'completed').length,
    };
  } catch (e) { return { todoTotal: 0, todoDone: 0 }; }
}

// ── Parse transcript for session goal + prompt count ─────────────────────────
function parseTranscript(transcriptPath) {
  if (!transcriptPath) return { sessionGoal: null, promptCount: 0 };
  try {
    const normalized = transcriptPath.replace(/^~\//, `${os.homedir()}/`);
    const lines      = fs.readFileSync(normalized, 'utf8').trim().split('\n');
    let sessionGoal  = null;
    let promptCount  = 0;

    for (const line of lines) {
      let d;
      try { d = JSON.parse(line); } catch (e) { continue; }
      if (d.message?.role !== 'user' || d.isMeta) continue;

      promptCount++;

      if (!sessionGoal) {
        const content = d.message.content;
        if (typeof content === 'string') {
          sessionGoal = content.slice(0, 120).trim();
        } else if (Array.isArray(content)) {
          const text = content.filter(i => i.type === 'text').map(i => i.text).join(' ');
          sessionGoal = text.slice(0, 120).trim();
        }
      }
    }
    return { sessionGoal, promptCount };
  } catch (e) { return { sessionGoal: null, promptCount: 0 }; }
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

  const { todoTotal, todoDone }      = readTodoStats(claudeDir, sessionId);
  const { sessionGoal, promptCount } = parseTranscript(transcriptPath);

  const ctx = { prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount };

  // Phase 1: heuristics — write immediately so status line always has something
  const heuristic = heuristicInsight(ctx);
  if (heuristic) writeInsight(advisorDir, sessionId, heuristic);

  // Phase 2: Gordon LLM — overwrite with sharper insight if available
  const gordon = gordonInsight(ctx);
  if (gordon) writeInsight(advisorDir, sessionId, gordon);
}

main().catch(() => {}).finally(() => { process.exitCode = 0; });
