#!/usr/bin/env node
/**
 * ECC Advisor — UserPromptSubmit hook
 *
 * Fires on every prompt submitted in Claude Code.
 * Analyzes prompt + session context heuristically (no LLM, <50ms).
 * Writes strategic insight to $CLAUDE_CONFIG_DIR/status-advisor/{session_id}.json
 * Status line (statusline.js) reads that file on the next render.
 *
 * Runs async (non-blocking) — exits immediately after writing.
 * Never fails — always exits 0.
 *
 * Heuristics inspired by vibe-log-cli's session-context-extractor pattern:
 * - First prompt = session goal (track for drift detection)
 * - Context window health → compact warnings
 * - Todo state → progress tracking
 * - Prompt length → quality hints
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── Heuristic analysis engine ─────────────────────────────────────────────────
function analyze({ prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount }) {
  // Priority 1: context window critical — always surface this
  if (remaining != null) {
    const used = 100 - remaining;
    if (used >= 85) return '⚠️ Context critical — /compact now or open a fresh session';
    if (used >= 70) return 'Context filling — compact after this task to stay sharp';
  }

  // Priority 2: session goal drift detection
  // Compare keywords between original goal and current prompt
  if (sessionGoal && prompt.length > 10) {
    const goalWords   = new Set(sessionGoal.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const promptWords = new Set(prompt.toLowerCase().split(/\W+/).filter(w => w.length > 4));
    const overlap     = [...goalWords].filter(w => promptWords.has(w)).length;
    if (goalWords.size > 3 && overlap === 0) {
      const preview = sessionGoal.slice(0, 70);
      return `Drifting? Original goal: "${preview}${sessionGoal.length > 70 ? '…' : ''}"`;
    }
  }

  // Priority 3: todo progress
  if (todoTotal > 0) {
    if (todoDone === todoTotal) {
      return `All ${todoTotal} tasks done — commit your work and start the next milestone`;
    }
    return `${todoDone}/${todoTotal} tasks done — keep shipping`;
  }

  // Priority 4: prompt quality hint (very short = needs more context)
  const trimmed = prompt.trim();
  if (trimmed.length > 0 && trimmed.length < 15) {
    return 'Short prompt — add context: what you tried and what you expect';
  }

  // Priority 5: long session without todo tracking
  if (promptCount > 20 && todoTotal === 0) {
    return 'Long session — use /plan or TodoWrite to track progress';
  }

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

      // First user message = session goal
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

  const { todoTotal, todoDone }    = readTodoStats(claudeDir, sessionId);
  const { sessionGoal, promptCount } = parseTranscript(transcriptPath);

  const insight = analyze({ prompt, remaining, todoTotal, todoDone, sessionGoal, promptCount });

  if (insight) {
    const advisorFile = path.join(advisorDir, `${sessionId}.json`);
    try {
      fs.writeFileSync(advisorFile, JSON.stringify({ insight, timestamp: Date.now(), sessionId }));
    } catch (e) {}
  }
}

main().catch(() => {}).finally(() => { process.exitCode = 0; });
