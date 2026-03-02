# Chief-of-Staff System — Implementation Plan
_Date: 2026-03-01_

## Vision

A personal AI chief-of-staff that triages all communication channels,
maintains relationship memory, enforces follow-through via hooks, and
runs a weekly holistic self-improvement review — built to make you 10x
more effective with minimal daily effort.

---

## Key Decisions (locked in)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | **Bun** | Faster, built-in `.env`, TypeScript native |
| Memory layer | **memU** (SQLite, local) | Purpose-built for agent memory; staged retrieval + LLM ranking beats raw vector search |
| Embeddings | **OpenRouter** | Single API key, model-flexible |
| Notifications | **Desktop** (notify-send / osascript) | No extra infra |
| Connectors | Gmail, Slack, GitHub, ClickUp, Notion | Slack/ClickUp/Notion via MCP; GitHub via `gh` cli; Gmail via `gogcli` |
| Scheduling | **Manual commands** (`/morning`, `/close-day`) | Full control, no cron complexity |
| Onboarding | Quick 15-min interview per user, asks for name + folder | Phased deepening via weekly review |
| Multi-user | **Separate private repos**, shared scaffold | `/onboard` asks name → creates `{name}-chief-of-staff` in user-specified folder |
| Testing | **Real data from day 1** | Start with Gmail only, expand connector-by-connector |
| DB in git | **No** — git-ignore `db/`, `*.sqlite` | Binary files are messy; commit markdown knowledge files only |
| Session resumability | **`claude --resume <session-id>`** | If session is closed mid-triage, resume exactly where left off |

---

## Repo Structure

```
{user-folder}/{name}-chief-of-staff/
├── .claude/
│   └── settings.json          # MCP servers: Slack, ClickUp, Notion + PostToolUse hooks
├── agents/
│   └── chief-of-staff.md      # Symlinked from ECC or copied
├── scripts/
│   ├── db.ts                  # memU client init (SQLite via Bun)
│   ├── embed.ts               # OpenRouter embedding wrapper
│   ├── notify.ts              # Desktop notification (notify-send / osascript)
│   ├── ingest/
│   │   ├── gmail.ts           # gogcli → classify → embed → store
│   │   └── github.ts          # gh cli → issues/comments → classify → embed → store
│   └── calendar-suggest.ts    # Free-slot calculator (gogcli calendar)
├── commands/
│   ├── morning.md             # /morning — full briefing
│   ├── close-day.md           # /close-day — EOD review + standup
│   ├── mail.md                # /mail — email-only triage
│   ├── slack.md               # /slack — Slack-only triage (via MCP)
│   ├── onboard.md             # /onboard — interview wizard
│   └── weekly-review.md       # /weekly-review — holistic 10x review
├── knowledge/
│   ├── SOUL.md                # Tone rules, communication style (committed)
│   ├── cos-contract.md        # What effectiveness means for this person (committed)
│   ├── model-of-me.md         # Agent's evolving portrait of the person (committed)
│   ├── relationships.md       # Per-person context (committed)
│   ├── todo.md                # Tasks + pending responses (committed)
│   ├── goals.md               # Your goals — overcommitment guard (committed)
│   ├── standups/              # standup-YYYY-MM-DD.md files (committed)
│   └── weekly/                # 2026-W{N}.md — weekly review snapshots (committed)
├── private/                   # git-ignored — raw exports, temp files
├── db/                        # git-ignored — memU SQLite data
├── .env                       # git-ignored — actual secrets
├── .env.example               # committed — keys template
├── .gitignore
├── package.json               # bun scripts
└── README.md
```

---

## Architecture

```
Incoming message (any channel)
         ↓
Ingest layer:
  Gmail   → gogcli (CLI)
  Slack   → Slack MCP (native Claude tool)
  GitHub  → gh cli (issues + comments + PRs)
  ClickUp → ClickUp MCP (read-only)
  Notion  → Notion MCP (read-only)
         ↓
4-tier classification  (skip / info_only / meeting_info / action_required)
         ↓
embed.ts  →  OpenRouter embedding API
         ↓
memU (SQLite)  ←── stores: message + embedding + metadata + tier + channel
         ↓
[For action_required]:
  memU.search(sender)   →  retrieve top-5 relevant past interactions
  read SOUL.md          →  tone rules
  read relationships.md →  sender context
         ↓
Draft reply  →  [Send] [Edit] [Skip]
         ↓
PostToolUse hook (enforced — cannot be skipped):
  1. relationships.md updated for sender
  2. todo.md updated (follow-up deadline set if needed)
  3. memU interaction record written
  4. Desktop notification if urgent
  5. git commit knowledge files
```

---

## MCP Setup Strategy

Slack, ClickUp, and Notion are accessed via MCP servers — no custom ingest scripts needed.
The `/onboard` command guides the user through setting up each MCP end-to-end.

### MCP setup flow (inside `/onboard`):

```
For each MCP (Slack → ClickUp → Notion):
  1. Explain what it does and what access it needs
  2. Link to token/auth page
  3. Ask user to paste token/credentials
  4. Write to .env
  5. Add server config to .claude/settings.json
  6. Verify: run `claude` in the project folder, check MCP appears in /mcp list
  7. Run a test query via the MCP tool to confirm it works
  8. If session needs refresh → print session ID + instruct:
       "Close this session and resume with: claude --resume {session-id}"
```

This means if the user needs to restart Claude to pick up new MCP config,
they don't lose their onboarding progress — they resume exactly where they left off.

### `.claude/settings.json` MCP block (generated by `/onboard`):

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": { "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}", "SLACK_TEAM_ID": "${SLACK_TEAM_ID}" }
    },
    "clickup": {
      "command": "npx",
      "args": ["-y", "clickup-mcp-server"],
      "env": { "CLICKUP_API_KEY": "${CLICKUP_API_KEY}" }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@suedeapple/notion-mcp-server"],
      "env": { "NOTION_API_KEY": "${NOTION_API_KEY}" }
    }
  }
}
```

---

## Phase Plan

### Phase 0 — Scaffold + Onboarding Setup (~45 min total)

The `/onboard` command IS the scaffold. Two distinct halves: **tool setup** then **you setup**.

#### Half 1: Tool setup (deterministic)

1. Ask for name and preferred folder → create `{folder}/{name}-chief-of-staff/`
2. `git init` → `gh repo create {name}-chief-of-staff --private --source=. --push`
3. `bun init` + install memU
4. Check + install each tool in sequence:
   - `gogcli` → auth flow if needed
   - `gh` → install guide (OS-detected) + `gh auth login` if needed
   - Slack MCP → token setup → verify
   - ClickUp MCP → token setup → verify
   - Notion MCP → token setup → verify
5. At each MCP restart point, print session ID:
   ```
   Restart Claude to load new MCPs, then resume with:
     claude --resume {session-id}
   ```
6. Final infra check: `bun run scripts/db.ts` + `bun run scripts/embed.ts "test"`

#### Half 2: Getting to know you (alive, back-and-forth conversation)

This is NOT a form or structured interview. It's the beginning of an ongoing relationship.
The agent is genuinely trying to build a model of who you are — how you think, what drains
you, where you drop balls, what energises you. It gets richer every week.

```
Opening:
  "Before I set anything up, I want to understand how you actually work —
   not ideally, but really. Tell me about your week. What does a good one
   feel like? And honestly — where do things tend to slip?"

  → User talks freely. No structure, no form.
  → Agent listens for: energy patterns, pain points, relationships,
    communication style, where anxiety lives, what "done" means to them.

The agent follows threads, not a script:
  If they say "I keep dropping balls on follow-ups"
    → "Tell me more about that — is it specific people, or just volume?
        Do you mean you forget to reply, or you reply but don't track what happens next?"

  If they say "Slack is chaos"
    → "What makes it chaos — too many channels, wrong people messaging you,
        or you just can't find the important stuff?"

  If they mention a name
    → "You mentioned [Name] a couple of times — who are they to you?
        How do you like to show up in that relationship?"

  If they seem to skip over something important
    → "You went past that quickly — the bit about [X]. Is that actually fine,
        or is it one of those things you've just accepted?"

  This continues until the agent feels it genuinely understands the person.
  No fixed number of turns. Could be 5 exchanges, could be 15.

Agent builds a picture in real time, then surfaces it:
  "OK here's what I'm hearing — tell me if any of this is off..."

  🔋 Energy: You do your best thinking in the morning. After 3pm you're
     in execution mode, not decision mode.

  🎯 What matters most right now: [extracted from conversation]

  😰 Where you drop balls: follow-ups with people you respect but
     aren't working with daily. You don't forget them — you overthink
     the reply and it never goes.

  📡 Communication style: Direct with your team, more considered with
     investors and partners. You hate small talk but you're good at it
     when it matters.

  🔑 Key relationships flagged: [names + context from conversation]

  "Does this feel accurate? What's wrong or missing?"
  → User refines. Agent updates its picture.

Agent proposes structure from the picture (AskUserQuestion options):
  Questions are derived from what was said — not generic.
  e.g. if they mentioned overthinking replies:
  → "For the people you tend to overthink replies to — should I draft
     those first and show you, or flag them and ask if you want help?"

  e.g. if they mentioned mornings as focus time:
  → "Should /morning be brief (< 2 min scan) or full triage?
     [Quick scan — just what needs action today | Full briefing — everything]"

Agent writes the knowledge files:
  SOUL.md          ← tone, style, energy patterns, communication rules
  relationships.md ← everyone mentioned + context
  goals.md         ← extracted priorities, what a "yes" gets measured against
  model-of-me.md   ← deeper portrait: how they think, what drains/energises
                      them, where they tend to slip. THIS is the living document.

  Shows SOUL.md preview: "Here's how I'd describe your communication style..."
  → "Does this sound like you? [Yes | Let me adjust a few things]"

Final onboarding question — the effectiveness contract:
  "Last thing. I want to make sure I'm improving in the right direction.
   What does it actually mean for me to be doing my job well for you?

   Not 'zero missed emails' — I mean: what would you feel, or stop feeling,
   if I was genuinely making a difference? What's the version of you I'm
   trying to help you become?"

  → User answers freely. Could be:
    "I stop lying awake thinking about who I haven't replied to"
    "I walk into every meeting actually prepared"
    "I have more time to think and less time firefighting"
    "The people I care about feel like I show up for them consistently"

  Agent reflects back:
  "So the measure of whether I'm working isn't throughput — it's whether
   you feel [X]. I'll use that as my north star. Every week I'll ask
   myself whether I'm actually moving you there."

  → Writes cos-contract.md:

    ## What effectiveness means for {name}

    ### The feeling I'm optimising for
    [extracted from their answer — the emotional/practical outcome they want]

    ### What I'll measure myself against
    - Are they walking into meetings prepared?
    - Are they lying awake less about dropped balls?
    - [specific signals extracted from their words]

    ### What "getting better" looks like week on week
    [agent's own framing of how it will improve towards this]

    ### This contract, version 1 — {date}
    [updated each week with a version note]
```

**`cos-contract.md`** is the self-improvement north star. Every weekly review
starts by re-reading it. Every proposed change is evaluated against it:
*"does this change move me closer to what {name} said matters?"*

**Checkpoint**: All MCPs verified, SQLite created, SOUL.md reads like the user,
`model-of-me.md` has at least 3 real insights, `cos-contract.md` has a definition
of effectiveness that the user recognises as true.

---

### Phase 1 — Gmail Pipeline (first connector)

Goal: Full end-to-end pipeline validation on real data.

- [ ] `scripts/ingest/gmail.ts`
  - `gogcli gmail search "is:unread -category:promotions" --max 20 --json`
  - Apply 4-tier classification
  - Generate embedding via `embed.ts` (OpenRouter)
  - Store in memU with metadata (sender, date, tier, channel=email)
- [ ] For `action_required`: query memU for top-5 past interactions with sender
- [ ] Load SOUL.md + relationships.md for tone + context
- [ ] Generate draft reply
- [ ] `commands/mail.md` wired and working
- [ ] PostToolUse hook skeleton enforcing checklist

**Checkpoint**: `/mail` → real unread Gmail classified → one `action_required` draft looks right → relationships.md updated → git commit.

---

### Phase 2 — MCP Connectors (Slack, ClickUp, Notion)

These use MCP tools directly — no custom ingest scripts. The agent calls MCP tools natively.

**Slack**
- [ ] `commands/slack.md` — uses Slack MCP tools: `conversations_history`, `search_messages`
- [ ] Classification + embed + store applied to DMs + @mentions last 4h
- [ ] Test: `/slack` surfaces a real DM needing reply

**ClickUp** (read-only)
- [ ] Wired into `/morning` — fetches tasks due today via ClickUp MCP
- [ ] Surfaces as `info_only` (context) or `action_required` (overdue + blocked)

**Notion** (read-only)
- [ ] Wired into `/morning` — recently updated pages fetched via Notion MCP
- [ ] Embedded and stored as reference context for draft replies

---

### Phase 3 — GitHub via `gh` cli

- [ ] `scripts/ingest/github.ts`
  - `gh issue list --assignee @me --json` — open issues assigned to me
  - `gh search issues --involves @me --json` — issues/PRs with my comments
  - `gh api notifications` — unread GitHub notifications
  - Classify + embed + store (most will be `info_only` or `action_required`)
- [ ] Wired into `/morning` as a feed item

**`gh` cli install check (inside `/onboard`)**:
```
1. Run `gh --version` → if missing:
   - macOS: "Run: brew install gh"
   - Linux: "Run: sudo apt install gh  OR  curl -fsSL https://cli.github.com/packages/..."
   - Windows: "Run: winget install --id GitHub.cli"
   Print the right command for the detected OS, wait for user to install, then re-check.
2. Run `gh auth status` → if not authenticated:
   - Run `gh auth login` interactively
   - Guide through browser flow
3. Verify: `gh api user --jq .login` → print "Connected as: {username}"
```

**Note**: No GitHub MCP needed — `gh` cli gives full access and is already authenticated.

---

### Phase 4 — Routines

**`/morning` command**
```
1. Parallel fetch via background agents:
   - Gmail ingest (gogcli)
   - Slack triage (Slack MCP)
   - GitHub notifications (gh cli)
   - ClickUp tasks due today (ClickUp MCP)
   - Today's calendar (gogcli calendar)
2. Notion context loaded for any meeting attendees
3. Desktop notification: "Morning briefing ready"
4. Briefing output:
   ┌─ Schedule (N events today)
   ├─ ClickUp: top 3 tasks due today
   ├─ Skipped: N auto-archived
   ├─ Info only: N (summaries)
   ├─ Action required: N (drafts ready)
   ├─ Stale pending > 48h: N
   └─ Overcommitment guard: flags if new asks conflict with goals.md
```

**`/close-day` command**
```
1. Scan action_required unanswered from today
2. Async standup prompt:
   "What did you ship today?"
   "What's blocked?"
   "What's tomorrow's #1 priority?"
3. Save to knowledge/standups/standup-YYYY-MM-DD.md
4. Set follow-up deadlines for unresolved items in memU
5. Desktop notification: "Day closed. N items pending tomorrow."
6. git commit all knowledge files
```

**Follow-up enforcer** (runs inside `/morning` and `/close-day`)
- memU query: messages where I was last recipient, no reply, > 48h
- Surfaces in briefing with pre-generated draft

**`/meeting-prep`** (bonus)
- Reads next calendar event via gogcli
- Fetches last 3 emails + Slack DMs with each attendee
- Queries memU for relationship context on attendees
- Generates one smart question per attendee

---

### Phase 5 — Weekly Self-Improvement Review (`/weekly-review`)

Not a performance report. A genuine check-in where the agent reflects on what
it's learning about the person — and does its own growth work. By week 4 it
should feel like it genuinely knows you.

```
1. Silent pre-analysis — agent reads everything before saying a word:
   - cos-contract.md: re-reads the effectiveness definition FIRST.
     This is the lens. Every observation is filtered through:
     "did this move {name} closer to what they said matters?"
   - memU: all interactions, response times, draft edit rate, message types
   - knowledge/standups/*.md: shipped vs planned, what kept getting pushed
   - relationships.md: who was reached, who was avoided, who came up repeatedly
   - todo.md: what completed, what recurs, what never moves
   - model-of-me.md: re-reads its own portrait — where are the gaps?
   - Ghosting: threads needing a reply that never came
   - Pattern detection: what messages always get edited? who always gets
     a delayed response? what kinds of asks always get a yes?

   The agent then asks itself one question before speaking:
   "This week — did I move them closer to the feeling they described in
    cos-contract.md, or further from it? What's the evidence either way?"

2. Agent opens with curiosity — not a report:
   "How was your week — really?"

   → Listens first. Follows what they say.
   → If they're flat: "What made it feel that way?"
   → If they're energised: "What clicked?"
   → If they mention dropping a ball: "Tell me more about that —
     was it volume, or something specific about that person/situation?"

3. Agent shares what it noticed — observations, not judgements:
   "I noticed a few things this week. Want to hear them?"

   Examples of specific, data-grounded observations:
   "You got 4 messages from [Name] and replied to none. That feels
    like it might be sitting somewhere. What's going on there?"

   "Every investor email draft I wrote, you rewrote the opening line.
    I think I'm getting the tone slightly off — can you show me one
    and tell me what you changed and why?"

   "Tuesday: 6 meetings, 0 deep work. Wednesday: same. You told me
    mornings are your best thinking time. I'm not protecting that."

   "You said yes to three new things this week. Two don't map to any
    of your goals. One came from [Name] — is that a relationship
    obligation or do you actually want to do it?"

4. Back-and-forth — agent asks, listens, updates its model:
   "What did I get wrong this week? Anything I flagged that was annoying?"
   "Was there something I missed that you wish I'd caught?"
   "Is there someone I should be paying more attention to?"
   "Has anything shifted in what matters most to you right now?"

   → model-of-me.md is updated from this conversation in real time.
   → The agent is genuinely learning, not just logging feedback.

5. Agent proposes specific changes — anchored to cos-contract.md:
   "Based on this week and what you told me effectiveness means for you,
    here's what I want to do differently:"

   Each change is explicitly tied to the contract:
   - "You said you want to stop lying awake about dropped balls.
      I missed [Name]'s thread for 4 days. I'm going to flag any
      thread from your top-10 contacts that goes 24h without a reply."

   - "You said you want to walk into meetings prepared.
      I didn't surface context before Tuesday's call with [Name].
      I'm going to auto-run /meeting-prep 30 min before any calendar event
      with a known contact."

   - "You said you want more time to think. I let Tuesday get to 6 meetings.
      I'm going to start flagging when your calendar has < 2h of unblocked
      time in a day — before it's too late to decline."

   → AskUserQuestion: "[Yes, try it | Tweak this one | Skip]" per change

   Agent ends with a cos-contract self-score:
   "On the thing you said matters most — [their effectiveness definition] —
    I'd give myself a [X]/10 this week. Here's why. Next week I want to be
    at [X+1] because of these specific changes."

6. Commits:
   - cos-contract.md updated with version note + self-score history
   - model-of-me.md updated (agent's evolving portrait)
   - SOUL.md updated if tone rules changed
   - relationships.md updated if context shifted
   - knowledge/weekly/2026-W{N}.md — what was surfaced, what changed,
     cos-contract self-score, what the agent now understands
   - git commit with week tag
```

**The loop**: onboarding defines the goal → every week the agent measures itself
against that goal → proposes changes driven by that goal → the goal itself evolves
as the person evolves. The chief of staff is always optimising for the right thing —
not generic productivity, but the specific outcome *this person* said matters.

---

### Phase 6 — PostToolUse Hook Enforcement

Hook intercepts send operations and enforces checklist before completion.

```javascript
// hooks/hooks.json matcher:
// tool == "Bash" && tool_input.command matches "gogcli.*send|conversations_add_message"

// On trigger: inject checklist as system reminder, exit 1 if incomplete

Mandatory checklist after every send:
1. ✅ relationships.md updated with interaction summary
2. ✅ todo.md updated (follow-up deadline if applicable)
3. ✅ memU interaction record written
4. ✅ git commit pushed (knowledge files)
```

---

## What Goes in Git vs What Doesn't

| File/Dir | In Git | Why |
|----------|--------|-----|
| `knowledge/SOUL.md` | ✅ | Your voice — version controlled |
| `knowledge/cos-contract.md` | ✅ | Effectiveness definition + self-score history |
| `knowledge/model-of-me.md` | ✅ | Agent's evolving portrait — most valuable file |
| `knowledge/relationships.md` | ✅ | Memory — version history is valuable |
| `knowledge/todo.md` | ✅ | Tasks — track changes over time |
| `knowledge/standups/*.md` | ✅ | Journal — historical record |
| `knowledge/weekly/*.md` | ✅ | Weekly review history |
| `scripts/` | ✅ | Code |
| `commands/` | ✅ | Code |
| `.env.example` | ✅ | Keys template (no values) |
| `.env` | ❌ | Secrets |
| `private/` | ❌ | Raw exports, temp files |
| `db/` | ❌ | SQLite binary |
| `*.sqlite` | ❌ | Same |
| `bun.lockb` | ✅ | Lock file |
| `node_modules/` | ❌ | Standard |

---

## Partner Setup

Once `{kn}-chief-of-staff` is validated:
1. Run `/onboard` again — it asks "what's your name?" and "where should I create the folder?"
2. Creates `{partner-name}-chief-of-staff/` in their chosen folder
3. Separate `gh repo create {partner-name}-chief-of-staff --private`
4. Separate `/onboard` interview → their own SOUL.md + relationships.md
5. Their own `.env` (their Gmail, Slack tokens if different workspace)
6. Both repos evolve independently — no shared data, same code structure

---

## Testing Strategy

**Real data from day 1**, one connector at a time.

### Phase acceptance criteria

| Phase | Connector | Success criteria |
|-------|-----------|-----------------|
| Phase 0 | Scaffold | All MCPs verified in `claude` session, SQLite created |
| Phase 1 | Gmail | `/mail` drafts a reply I'd actually send |
| Phase 2a | Slack | `/slack` surfaces a DM needing action |
| Phase 2b | ClickUp | `/morning` shows today's top tasks |
| Phase 3 | GitHub | `/morning` shows assigned issues |
| Phase 4 | Full `/morning` | Full briefing in < 60 seconds |
| Phase 5 | `/weekly-review` | Surfaces something I genuinely didn't notice |

Debug any connector standalone: `bun run scripts/ingest/gmail.ts --debug`

---

### Test layers

The system has two distinct parts that need different strategies:
- **Deterministic pipeline** (gogcli/gh → classify → embed → store → knowledge files) — fully testable
- **AI conversation** (onboarding, weekly review, drafts) — validated via outputs, not automatable

#### Layer 1 — Unit tests (pure functions, offline)

```
tests/unit/
  classify.test.ts          — 4-tier classification logic
  embed.test.ts             — embedding wrapper (mock OpenRouter)
  db.test.ts                — memU CRUD (test SQLite in /tmp)
  ingest/
    gmail.test.ts           — parse gogcli JSON → classify → shape (fixture input)
    github.test.ts          — parse gh cli JSON → classify → shape (fixture input)
  knowledge/
    relationships.test.ts   — update/append/format round-trip
    todo.test.ts            — follow-up deadline logic
    cos-contract.test.ts    — version increment + self-score append
```

External tool outputs are never called live — recorded once as fixtures and replayed:

```
tests/fixtures/
  gmail-inbox.json          — 20 real emails (anonymized) from gogcli
  gh-notifications.json     — gh api notifications output
  gh-issues.json            — gh issue list output
  slack-messages.json       — Slack MCP response shape
```

#### Layer 2 — Integration tests (full pipeline, no AI)

```
tests/integration/
  pipeline.test.ts          — fixture inbox → classify → embed (mocked) → memU → assert
  retrieval.test.ts         — seed memU with N interactions → query sender → assert top-k
  knowledge-update.test.ts  — run post-send checklist → assert file diffs
  hook.test.ts              — PostToolUse hook with mock send → assert checklist enforced
```

**`pipeline.test.ts`** is the most valuable test in the project:
```
Input:  gmail-inbox.json (20 emails)
Assert: - correct tier distribution (skip / info_only / action_required)
        - memU has 20 records
        - relationships.md has entries for action_required senders
        - todo.md has follow-up deadlines where tier == action_required
```

**`retrieval.test.ts`** validates the memory layer:
```
Seed:   100 interactions over 30 days, 5 senders, known content
Query:  "investor update" for known sender
Assert: correct message in top-3, relationship context loaded correctly
```

#### Layer 3 — Classification regression suite

Most critical for catching drift when changing models or prompts:

```
tests/classification-regression.test.ts

Dataset: 40-50 curated real messages (anonymized) with known expected tiers:
  "Thanks, got it"                                      → skip
  "Can we sync this week?"                              → action_required
  "FYI the deploy went through"                         → info_only
  "Waiting on your decision before we can proceed"      → action_required

Assert: >= 90% accuracy against expected tiers
```

This doubles as a **benchmark** when swapping models — run before and after, compare accuracy.

#### Layer 4 — Knowledge file format tests

Cheap to write, catches silent regressions after prompt changes:

```
tests/knowledge-format.test.ts

- SOUL.md has required sections: ## Tone, ## Communication style, ## Energy patterns
- cos-contract.md has: ## The feeling I'm optimising for, ## What I'll measure myself against
- model-of-me.md has at least 3 bullet-point insights
- relationships.md entries match expected schema (name, context, last-interaction)
```

#### Layer 5 — E2E (scriptable portion)

True E2E for `/morning`, `/mail`, `/weekly-review` can't be fully automated (they're Claude
Code conversations). But the pipeline outputs can be validated:

```bash
# tests/e2e/morning-pipeline.sh
# Uses fixture data, real memU, mocked OpenRouter

1. Reset test db (cp /dev/null db/test.sqlite)
2. Seed gmail fixture: bun run scripts/ingest/gmail.ts --fixture tests/fixtures/gmail-inbox.json
3. Assert: db has N rows, correct tier distribution
4. Assert: relationships.md was touched (git diff --name-only)
5. Assert: todo.md has a new entry
6. Assert: git log shows a commit
```

**Golden output tests** (after system is stable for a few weeks):
- Run command once manually with known fixture data
- Commit the resulting knowledge file state as golden files
- Re-run with same fixture → diff against golden → catch regressions

#### What can't be automated

Draft *quality* — whether the tone sounds right, whether the right things get flagged. That's
validated by using it on real data and noticing when something feels off. The classification
regression suite is the closest automated equivalent.

---

### Build priority

| Priority | Test | Why |
|----------|------|-----|
| 1 | `tests/fixtures/` — record real gogcli/gh outputs | Everything else depends on these |
| 2 | `classify.test.ts` — 40-message regression suite | Highest value, fastest feedback |
| 3 | `pipeline.test.ts` — fixture → memU → knowledge files | Validates whole data flow |
| 4 | `hook.test.ts` — PostToolUse enforcement | Same pattern as ECC hook tests |
| 5 | Knowledge format tests | Cheap, catches silent regressions |
| 6 | E2E golden output tests | After system is stable (week 4+) |

---

## Open Questions / Future

- **LINE / Messenger**: Deferred — needs Matrix bridge or Playwright. Add in v2.
- **Local embedding model**: Can replace OpenRouter with `nomic-embed` via Ollama for fully offline operation.
- **memU cloud**: They offer `memu.so` hosted — skip for now, keep local.
- **`/meeting-prep` auto-trigger**: Cron detects calendar events 30 min out and auto-prepares. Deferred.
- **Claw integration**: `/morning` could spin up a named Claw session (`CLAW_SESSION=morning-{date}`) for searchable briefing history.

---

## Required Installs + API Keys

```bash
# Runtime + tools
brew install bun gh gogcli
pip install memu   # check if JS/bun client exists first

# Verify
bun --version
gh auth status
gogcli --version

# .env (generated by /onboard)
OPENROUTER_API_KEY=      # embeddings
SLACK_BOT_TOKEN=         # Slack MCP
SLACK_TEAM_ID=           # Slack MCP
CLICKUP_API_KEY=         # ClickUp MCP
NOTION_API_KEY=          # Notion MCP integration token
# GitHub: no key needed — gh cli already authenticated
# Gmail: no key needed — gogcli auth flow
```
