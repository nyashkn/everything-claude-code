---
name: project-scaffold
description: >
  Interactive new project wizard. Guides you step-by-step through creating a
  new project from 70+ templates — React, Next.js, FastAPI, Flutter, Go, Rust,
  Spring Boot, T3 Stack, Chrome extensions, monorepos, and more. Asks about
  framework, database, testing, CI/CD, and DevOps, then scaffolds the full
  structure using native CLI tools. Optionally pass a project name to skip
  the first question. Usage: /project-scaffold [project-name]
---

$ARGUMENTS

Use the **project-scaffolding** skill to run the interactive project wizard.

## Setup Check

Before starting, verify the skill is available:
- Look for `project-scaffolding/SKILL.md` in the active skills directory
- If not found, tell the user to run:
  ```bash
  CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/install-external-skills.js project-scaffolding
  ```

## Wizard Flow

Use **AskUserQuestion** at each step to gather input interactively. Do not ask all questions at once — present each step only after the previous answer is confirmed.

### Step 1 — Project Name
If `$ARGUMENTS` is provided, use it as the project name and skip this question.
Otherwise ask: "What would you like to name your project?"

### Step 2 — Project Category
Ask the user to pick a category:
```
1) Static Website (HTML/CSS/Tailwind/Landing page)
2) Frontend Web (React, Next.js, Vue, Svelte, Astro, Remix…)
3) Mobile / Desktop (React Native, Expo, Flutter, Tauri, Electron)
4) Backend JS/TS (Express, NestJS, Fastify, Hono, tRPC)
5) Backend Python (FastAPI, Django, Flask)
6) Backend Go (Gin, Fiber, Echo)
7) Backend Rust (Axum, Actix, Rocket)
8) Backend Java (Spring Boot, Quarkus)
9) Full-Stack (T3 Stack, MERN, PERN)
10) Library / CLI Tool
11) Browser Extension (Chrome, Firefox, VS Code plugin)
12) Serverless (Cloudflare Workers, AWS Lambda, Vercel Functions)
13) Monorepo (Turborepo, Nx, pnpm workspace)
```

### Step 3 — Framework / Type
Based on the category, present the relevant framework options from the project-scaffolding skill's wizard-options reference.

### Step 4 — Core Configuration
Ask for:
- **Location** — directory to create the project in (default: current directory)
- **Description** — short one-liner
- **Author** — name/email
- **License** — MIT / Apache-2.0 / GPL-3.0 / ISC / Unlicense (default: MIT)

### Step 5 — Framework-Specific Options
Follow the project-scaffolding skill's Step 3 workflow. Load `references/wizard-options.md` from the skill for available options per framework. Key decisions:
- Language/SDK version
- Package manager (respect `CLAUDE_PACKAGE_MANAGER` env if set, else ask)
- TypeScript (yes/no for JS frameworks)
- CSS framework (Tailwind / CSS Modules / none)
- Database + ORM (if applicable)
- Auth (if applicable)
- Testing (unit + e2e)

### Step 6 — DevOps
Ask about:
- **Linting/formatting** — ESLint+Prettier / Biome / Ruff / etc.
- **Pre-commit hooks** — husky+lint-staged / pre-commit / none
- **Docker** — yes / no
- **CI/CD** — GitHub Actions / GitLab CI / none

### Step 7 — Confirm & Scaffold
Show a summary of all choices and ask: "Ready to scaffold? [Y/n]"

On confirmation, scaffold the project using native CLI tools per the skill's CLI Integration table, falling back to `scripts/scaffold.py` for custom structures.

## Post-Scaffold Steps

After the project is created:

1. **Init git**
   ```bash
   git init <project-dir>
   cd <project-dir>
   git add .
   git commit -m "feat: initial project scaffold"
   ```

2. **Seed .claude/**
   Create `.claude/CLAUDE.md` with:
   ```markdown
   # <project-name>

   <description>

   ## Stack
   - Framework: <framework>
   - Language: <language>
   - Package Manager: <pm>
   - Database: <db or N/A>
   - Testing: <testing tools>

   ## Common Commands
   - Install: `<pm> install`
   - Dev: `<pm> run dev`
   - Test: `<pm> run test`
   - Build: `<pm> run build`
   ```

3. **Report**
   Print a summary of:
   - Project location
   - Structure created
   - Next steps (install deps, run dev server)
