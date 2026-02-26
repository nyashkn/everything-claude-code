#!/usr/bin/env node
/**
 * setup.js — Unified ECC Setup
 *
 * Single entry point to set up Everything Claude Code.
 * Auto-detects ECC_ROOT, prompts for profile/target dir,
 * then runs each setup step interactively.
 *
 * Usage:
 *   node scripts/setup.js                        # full interactive setup
 *   node scripts/setup.js --step symlinks        # run one step only
 *   node scripts/setup.js --profile ecc          # target a named profile
 *   CLAUDE_CONFIG_DIR=~/.claude-profiles/ecc node scripts/setup.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { spawnSync } = require('child_process');

// ─── Paths ───────────────────────────────────────────────────────────────────

const ECC_ROOT = process.env.ECC_ROOT || path.resolve(__dirname, '..');
const PROFILES_DIR = path.join(os.homedir(), '.claude-profiles');
const DEFAULT_CLAUDE_DIR = path.join(os.homedir(), '.claude');

// ─── Args ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const STEP_ARG = args.find((a, i) => args[i - 1] === '--step');
const PROFILE_ARG = args.find((a, i) => args[i - 1] === '--profile');
const DRY_RUN = args.includes('--dry-run');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

function hr(char = '─', width = 60) {
  console.log(char.repeat(width));
}

function section(title) {
  console.log('');
  hr();
  console.log(`  ${title}`);
  hr();
}

function run(script, extraEnv = {}) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would run: node ${path.relative(ECC_ROOT, script)}`);
    return { status: 0 };
  }
  const result = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    cwd: ECC_ROOT,
  });
  return result;
}

function runShell(cmd, extraEnv = {}) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would run: ${cmd}`);
    return { status: 0 };
  }
  const result = spawnSync('sh', ['-c', cmd], {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    cwd: ECC_ROOT,
  });
  return result;
}

function listProfiles() {
  if (!fs.existsSync(PROFILES_DIR)) return [];
  return fs.readdirSync(PROFILES_DIR).filter(d =>
    fs.statSync(path.join(PROFILES_DIR, d)).isDirectory()
  );
}

// ─── Step: Resolve target dir ─────────────────────────────────────────────────

async function resolveTargetDir() {
  // 1. Already set via env or --profile flag
  if (process.env.CLAUDE_CONFIG_DIR) {
    const dir = process.env.CLAUDE_CONFIG_DIR.replace('~', os.homedir());
    console.log(`  Using CLAUDE_CONFIG_DIR: ${dir}`);
    return dir;
  }

  if (PROFILE_ARG) {
    const dir = path.join(PROFILES_DIR, PROFILE_ARG);
    if (!fs.existsSync(dir)) {
      console.error(`  Profile '${PROFILE_ARG}' not found at ${dir}`);
      process.exit(1);
    }
    return dir;
  }

  // 2. Prompt
  const profiles = listProfiles();
  console.log('');
  console.log('  Where should ECC be installed?');
  console.log('');
  console.log('  0) ~/.claude (default, all projects)');
  profiles.forEach((p, i) => console.log(`  ${i + 1}) ~/.claude-profiles/${p}`));
  console.log(`  ${profiles.length + 1}) Enter custom path`);
  console.log('');

  const choice = (await ask(`  Choice [0-${profiles.length + 1}]: `)).trim();
  const idx = parseInt(choice);

  if (isNaN(idx) || idx === 0) return DEFAULT_CLAUDE_DIR;
  if (idx <= profiles.length) return path.join(PROFILES_DIR, profiles[idx - 1]);

  const custom = (await ask('  Enter full path: ')).trim().replace('~', os.homedir());
  if (!fs.existsSync(custom)) {
    fs.mkdirSync(custom, { recursive: true });
    console.log(`  Created: ${custom}`);
  }
  return custom;
}

// ─── Config file patching ─────────────────────────────────────────────────────

/**
 * Replace ${ECC_ROOT} placeholder in committed config files with the actual
 * ECC_ROOT path. Mirrors the ${CLAUDE_PLUGIN_ROOT} substitution done by
 * merge-hooks.js so config files can be committed with a portable placeholder.
 */
function patchConfigFiles() {
  const configs = [
    path.join(ECC_ROOT, 'skills', 'continuous-learning', 'config.json'),
  ];

  for (const configPath of configs) {
    if (!fs.existsSync(configPath)) continue;
    const original = fs.readFileSync(configPath, 'utf8');
    if (!original.includes('${ECC_ROOT}')) continue;
    const patched = original.replaceAll('${ECC_ROOT}', ECC_ROOT);
    fs.writeFileSync(configPath, patched, 'utf8');
    console.log(`  ✅ Patched ECC_ROOT in ${path.relative(ECC_ROOT, configPath)}`);
  }
}

// ─── Step: Symlinks ───────────────────────────────────────────────────────────

async function stepSymlinks(claudeDir) {
  console.log('\n  Creates symlinks: skills/ agents/ commands/ scripts/');
  console.log(`  Target: ${claudeDir}`);
  const go = (await ask('  Run? [Y/n] ')).trim().toLowerCase();
  if (go === 'n') return;
  run(path.join(__dirname, 'setup-symlinks.js'), { CLAUDE_CONFIG_DIR: claudeDir });
  patchConfigFiles();
}

// ─── Step: Rules ──────────────────────────────────────────────────────────────

async function stepRules(claudeDir) {
  const rulesDir = path.join(ECC_ROOT, 'rules');
  const available = fs.readdirSync(rulesDir)
    .filter(d => d !== 'common' && fs.statSync(path.join(rulesDir, d)).isDirectory());

  console.log('\n  Installs language-specific rules + common rules into the target.');
  console.log(`  Available: ${available.join(', ')}`);
  console.log('  (Common rules always included)');

  const input = (await ask(`  Languages to install (space-separated, or "none"): `)).trim();
  if (input === 'none' || input === '') return;

  const langs = input.split(/\s+/).filter(Boolean);
  runShell(
    `CLAUDE_RULES_DIR="${path.join(claudeDir, 'rules')}" bash "${ECC_ROOT}/install.sh" ${langs.join(' ')}`,
    { CLAUDE_CONFIG_DIR: claudeDir }
  );
}

// ─── Step: Hooks ──────────────────────────────────────────────────────────────

async function stepHooks(claudeDir) {
  const settingsPath = path.join(claudeDir, 'settings.json');
  const exists = fs.existsSync(settingsPath);
  console.log(`\n  Merges ECC hooks into settings.json`);
  console.log(`  Target: ${settingsPath} ${exists ? '(exists)' : '(will create)'}`);
  const go = (await ask('  Run? [Y/n] ')).trim().toLowerCase();
  if (go === 'n') return;
  run(path.join(__dirname, 'merge-hooks.js'), { CLAUDE_CONFIG_DIR: claudeDir });
}

// ─── Step: External skills ────────────────────────────────────────────────────

async function stepExternalSkills(claudeDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'external-skills.json'), 'utf8'));
  const skills = manifest.skills || [];

  console.log('\n  Installs external skills via git clone → symlink:');
  skills.forEach(s => console.log(`    - ${s.name}: ${s.description}`));
  console.log('');

  const input = (await ask('  Install all, specific names, or none? [all/name.../none] ')).trim().toLowerCase();
  if (input === 'none' || input === '') return;

  const env = { CLAUDE_CONFIG_DIR: claudeDir, ECC_ROOT };
  if (input === 'all') {
    run(path.join(__dirname, 'install-external-skills.js'), env);
  } else {
    for (const name of input.split(/\s+/)) {
      run(path.join(__dirname, 'install-external-skills.js'), { ...env });
      // pass name as argv — re-invoke with extra arg
      if (!DRY_RUN) {
        spawnSync(process.execPath, [path.join(__dirname, 'install-external-skills.js'), name], {
          stdio: 'inherit',
          env: { ...process.env, ...env },
          cwd: ECC_ROOT,
        });
      }
    }
  }
}

// ─── Step: Continuous Learning v2 ────────────────────────────────────────────

async function stepV2(claudeDir) {
  console.log('\n  Configures continuous learning v2 (instincts, observer agent)');
  console.log(`  Stores observations/instincts under: ${path.join(claudeDir, 'homunculus')}`);
  const go = (await ask('  Run? [Y/n] ')).trim().toLowerCase();
  if (go === 'n') return;
  run(path.join(__dirname, 'setup-v2.js'), { CLAUDE_CONFIG_DIR: claudeDir, ECC_ROOT });
}

// ─── Step: Statusline ─────────────────────────────────────────────────────────

async function stepStatusline(claudeDir) {
  const settingsPath = path.join(claudeDir, 'settings.json');
  console.log('\n  Adds statusline config to settings.json');
  console.log('  Shows: git branch, context %, model, time, todo count');
  const go = (await ask('  Run? [Y/n] ')).trim().toLowerCase();
  if (go === 'n') return;
  run(path.join(__dirname, 'setup-statusline.js'), { CLAUDE_CONFIG_DIR: claudeDir });
}

// ─── Step: Verify ─────────────────────────────────────────────────────────────

async function stepVerify(claudeDir) {
  console.log('\n  Verifies the installation — checks symlinks, hooks, skills');
  run(path.join(__dirname, 'verify-setup.js'), { CLAUDE_CONFIG_DIR: claudeDir });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STEPS = {
  symlinks:   stepSymlinks,
  rules:      stepRules,
  hooks:      stepHooks,
  skills:     stepExternalSkills,
  v2:         stepV2,
  statusline: stepStatusline,
  verify:     stepVerify,
};

async function main() {
  section('Everything Claude Code — Setup');
  console.log(`  ECC_ROOT: ${ECC_ROOT}`);
  if (DRY_RUN) console.log('  MODE: DRY RUN');

  const claudeDir = await resolveTargetDir();
  console.log(`\n  Installing to: ${claudeDir}`);

  // Single step mode
  if (STEP_ARG) {
    const fn = STEPS[STEP_ARG];
    if (!fn) {
      console.error(`  Unknown step: ${STEP_ARG}`);
      console.error(`  Available: ${Object.keys(STEPS).join(', ')}`);
      process.exit(1);
    }
    section(`Step: ${STEP_ARG}`);
    await fn(claudeDir);
    rl.close();
    return;
  }

  // Full setup
  section('Step 1: Symlinks');
  await stepSymlinks(claudeDir);

  section('Step 2: Rules');
  await stepRules(claudeDir);

  section('Step 3: Hooks');
  await stepHooks(claudeDir);

  section('Step 4: External Skills');
  await stepExternalSkills(claudeDir);

  section('Step 5: Continuous Learning v2');
  await stepV2(claudeDir);

  section('Step 6: Statusline (optional)');
  await stepStatusline(claudeDir);

  section('Step 7: Verify');
  await stepVerify(claudeDir);

  // Summary
  section('Setup Complete');
  console.log(`  Profile: ${claudeDir}`);
  console.log('');
  console.log('  Next steps:');
  console.log('  1. Add to your shell: export CLAUDE_CONFIG_DIR=' + claudeDir);
  console.log('  2. Or use your profile switcher: claude-profile-use <name>');
  console.log('  3. Start Claude Code and verify with /context');
  console.log('');
  console.log('  Re-run any step:');
  console.log(`    node scripts/setup.js --step <${Object.keys(STEPS).join('|')}>`);
  console.log(`    CLAUDE_CONFIG_DIR=${claudeDir} node scripts/setup.js`);
  console.log('');

  rl.close();
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  rl.close();
  process.exit(1);
});
