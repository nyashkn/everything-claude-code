---
description: Rewrite a vague prompt into a specific, context-rich one using live session state, git history, and codebase grounding
---

# /enhance — Prompt Enhancer

$ARGUMENTS

## What This Command Does

Takes a rough, vague prompt and rewrites it into a specific, actionable one by grounding it in:
- Recently touched files (from git history)
- Current session focus (todos + recent turns)
- Actual file paths, function names, and line numbers from the codebase
- Existing patterns and constraints the implementation must respect

## When to Use

```
/enhance fix the auth bug
/enhance why is the raster filter slow
/enhance add pagination to the list
/enhance                           ← uses current session context if no args
```

Use it any time your prompt feels vague or underspecified. The enhanced version will be more useful to Claude — or to paste into a new session with full context.

## Instructions

When this command is invoked:

### Step 1 — Capture the raw intent

The user's rough prompt (from `$ARGUMENTS`) is the starting point. If no arguments provided, infer intent from the current session's active task and recent conversation.

### Step 2 — Gather context in parallel

Run these immediately and concurrently:

**A. Git history — recently touched files**
```bash
git diff --name-only HEAD~5 2>/dev/null || git diff --name-only HEAD~3 2>/dev/null || git status --short
```
Use this to find which files are actively being worked on. These are the most likely relevant files.

**B. Active todos**
Check the current TodoWrite task list: what's `in_progress`? What's `pending`? This reveals where in the workflow the user is.

**C. Keyword search** (if the prompt mentions a recognizable term)
If the raw prompt contains a word that could be a filename, function, class, or concept (e.g., "raster filter", "auth", "pagination"):
- Run `grep -r "<term>" --include="*.ts" --include="*.py" --include="*.go" -l` to find relevant files
- Read the top 1-2 most relevant files to identify specific function names and line numbers

**D. Current session focus**
From the conversation history: what was the last thing successfully completed? What was the user asking about before this invocation?

### Step 3 — Synthesize the enhanced prompt

Rewrite the vague prompt into a specific one that includes:

1. **Exact file path(s)** — not "the auth module" but `src/auth/session.ts:142`
2. **Specific function/component names** — not "the filter" but `applyRasterFilter()` in `lib/raster.py`
3. **Current state** — what's already been done this session that's relevant
4. **Constraints** — existing patterns (e.g., "follows immutable update pattern", "uses repository pattern", "must not break existing tests in `tests/auth/`")
5. **Success criteria** — what does "done" look like? (e.g., "the unit test in `tests/raster_test.py::test_filter_performance` should pass under 50ms")
6. **Scope boundaries** — what NOT to change, to prevent scope creep

### Step 4 — Present the result

Output the enhanced prompt in a copyable code block, preceded by a one-line summary of what context was used:

```
Context used: 3 recently modified files, active todo "fix filter perf", grep found applyRasterFilter() in lib/raster.py:87

Enhanced prompt:
```

```
[the enhanced prompt here — 3-8 sentences, specific and actionable]
```

Optionally, if the original prompt was extremely vague (< 5 words with no clear target), also show a 1-line explanation of what assumptions were made.

## Example

**Input:** `/enhance fix the auth bug`

**Context gathered:**
- `git diff --name-only HEAD~3` → `src/auth/session.ts`, `src/auth/middleware.ts`, `tests/auth/session.test.ts`
- Active todo: "Fix JWT expiry not being checked on refresh"
- grep "auth" → finds `validateSession()` at `src/auth/session.ts:89` and `refreshToken()` at `src/auth/middleware.ts:34`

**Enhanced output:**
```
In `src/auth/session.ts`, the `validateSession()` function (line 89) does not check token expiry before returning a valid session — it only checks the signature. Fix it to also verify `payload.exp > Date.now() / 1000` before allowing the session. The `refreshToken()` function in `src/auth/middleware.ts:34` has the same gap. Do not modify the token shape or the `generateToken()` function — only add the expiry check. The existing test at `tests/auth/session.test.ts` has a skipped test `"rejects expired tokens"` — unskip it and make it pass as the acceptance criterion.
```

## Tips

- Run `/enhance` at the start of a new sub-task to crystallize what you're about to ask
- The enhanced prompt is designed to be pasted into a fresh Claude session or used as-is
- If the enhanced prompt still feels off, add a follow-up: "more focused on X" and run again
- Works best when git history is populated (i.e., you've been working in the repo for a few commits)
