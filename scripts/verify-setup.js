#!/usr/bin/env node

/**
 * Verify Symlink Setup for Claude Code
 *
 * Checks that all symlinks are correctly configured and points to common issues.
 *
 * Usage: node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_DIR = path.resolve(__dirname, '..');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const components = ['agents', 'commands', 'skills', 'rules', 'scripts'];

console.log('='.repeat(60));
console.log('Claude Code Setup Verification');
console.log('='.repeat(60));
console.log(`Repository: ${REPO_DIR}`);
console.log(`Claude Dir: ${CLAUDE_DIR}`);
console.log('='.repeat(60));
console.log('');

let allGood = true;
const issues = [];
const warnings = [];

// Check 1: Symlinks
console.log('[Checking Symlinks]');
for (const component of components) {
  const source = path.join(REPO_DIR, component);
  const target = path.join(CLAUDE_DIR, component);

  process.stdout.write(`  ${component.padEnd(12)} `);

  if (!fs.existsSync(target)) {
    console.log('❌ Missing');
    issues.push(`${component} not found in ~/.claude/`);
    allGood = false;
    continue;
  }

  const stats = fs.lstatSync(target);

  if (!stats.isSymbolicLink()) {
    console.log('❌ Not a symlink');
    issues.push(`${component} is not a symlink (may be old directory)`);
    allGood = false;
    continue;
  }

  const linkTarget = fs.readlinkSync(target);

  if (linkTarget !== source) {
    console.log(`⚠️  Points to: ${linkTarget}`);
    warnings.push(`${component} points to ${linkTarget} instead of ${source}`);
  } else {
    console.log('✅ Correct');
  }
}
console.log('');

// Check 2: Learned skills configuration
console.log('[Checking Learned Skills Configuration]');
const configPath = path.join(REPO_DIR, 'skills', 'continuous-learning', 'config.json');

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const expectedPath = path.join(REPO_DIR, 'skills', 'learned') + '/';

  process.stdout.write('  learned_skills_path '.padEnd(25));

  if (config.learned_skills_path === expectedPath) {
    console.log('✅ Points to repo');
  } else {
    console.log(`⚠️  ${config.learned_skills_path}`);
    warnings.push(`learned_skills_path should be ${expectedPath}`);
  }
} else {
  console.log('  ❌ Config file not found');
  issues.push('skills/continuous-learning/config.json not found');
  allGood = false;
}
console.log('');

// Check 3: Learned skills directory
console.log('[Checking Learned Skills Directory]');
const learnedDir = path.join(REPO_DIR, 'skills', 'learned');

if (fs.existsSync(learnedDir)) {
  const stats = fs.statSync(learnedDir);

  if (stats.isDirectory()) {
    console.log('  ✅ Directory exists in repo');

    // Check if it's writable
    try {
      fs.accessSync(learnedDir, fs.constants.W_OK);
      console.log('  ✅ Writable');
    } catch {
      console.log('  ❌ Not writable');
      issues.push('skills/learned/ exists but is not writable');
      allGood = false;
    }
  } else {
    console.log('  ❌ Not a directory');
    issues.push('skills/learned exists but is not a directory');
    allGood = false;
  }
} else {
  console.log('  ❌ Not found');
  issues.push('skills/learned/ directory not found in repo');
  allGood = false;
}
console.log('');

// Check 4: v2 Homunculus Structure
console.log('[Checking v2: Homunculus Structure]');
const homunculusDir = path.join(REPO_DIR, 'homunculus');

if (fs.existsSync(homunculusDir)) {
  console.log('  ✅ homunculus/ directory exists');

  // Check subdirectories
  const v2Dirs = [
    'instincts/personal',
    'instincts/inherited',
    'evolved/skills',
    'evolved/commands',
    'evolved/agents'
  ];

  for (const dir of v2Dirs) {
    const dirPath = path.join(homunculusDir, dir);
    if (fs.existsSync(dirPath)) {
      console.log(`  ✅ ${dir}/`);
    } else {
      console.log(`  ❌ ${dir}/ missing`);
      issues.push(`homunculus/${dir}/ not found`);
      allGood = false;
    }
  }
} else {
  console.log('  ⚠️  homunculus/ directory not found');
  warnings.push('Run: node scripts/setup-v2.js to configure v2');
}
console.log('');

// Check 5: v2 Configuration
console.log('[Checking v2 Configuration]');
const v2ConfigPath = path.join(REPO_DIR, 'skills/continuous-learning-v2/config.json');

if (fs.existsSync(v2ConfigPath)) {
  const v2Config = JSON.parse(fs.readFileSync(v2ConfigPath, 'utf8'));
  const expectedHomunculus = path.join(REPO_DIR, 'homunculus');

  const v2Paths = {
    'observation.store_path': v2Config.observation?.store_path,
    'instincts.personal_path': v2Config.instincts?.personal_path,
    'instincts.inherited_path': v2Config.instincts?.inherited_path,
    'evolution.evolved_path': v2Config.evolution?.evolved_path
  };

  let v2PathsCorrect = 0;
  for (const [key, value] of Object.entries(v2Paths)) {
    if (value && value.includes(expectedHomunculus)) {
      console.log(`  ✅ ${key} points to repo`);
      v2PathsCorrect++;
    } else {
      console.log(`  ⚠️  ${key}: ${value || 'not set'}`);
      warnings.push(`${key} should point to ${expectedHomunculus}`);
    }
  }

  if (v2PathsCorrect === 0) {
    warnings.push('v2 config not updated - run: node scripts/setup-v2.js');
  }
} else {
  console.log('  ⚠️  v2 config.json not found');
  warnings.push('skills/continuous-learning-v2/config.json not found');
}
console.log('');

// Check 6: Settings file
console.log('[Checking Settings]');
const settingsPath = path.join(CLAUDE_DIR, 'settings.json');

if (fs.existsSync(settingsPath)) {
  console.log('  ✅ settings.json exists');

  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    if (settings.hooks && Object.keys(settings.hooks).length > 0) {
      const hookCount = Object.values(settings.hooks).flat().length;
      console.log(`  ✅ ${hookCount} hooks configured`);
    } else {
      console.log('  ⚠️  No hooks configured');
      warnings.push('No hooks in settings.json - run merge-hooks.js');
    }
  } catch (err) {
    console.log(`  ❌ Invalid JSON: ${err.message}`);
    issues.push('settings.json is not valid JSON');
    allGood = false;
  }
} else {
  console.log('  ⚠️  settings.json not found');
  warnings.push('~/.claude/settings.json not found - run Claude Code once to generate it');
}
console.log('');

// Check 7: Per-machine directories
console.log('[Checking Per-Machine Directories]');
const sessionsDir = path.join(CLAUDE_DIR, 'sessions');

if (fs.existsSync(sessionsDir)) {
  console.log('  ✅ sessions/ exists');
} else {
  console.log('  ⚠️  sessions/ not found');
  warnings.push('~/.claude/sessions/ not found - will be created on first run');
}
console.log('');

// Check 8: Test edit workflow
console.log('[Testing Edit Workflow]');
console.log('  ℹ️  Try editing a file in repo:');
console.log(`     vim ${REPO_DIR}/agents/planner.md`);
console.log('  ℹ️  Changes should be immediately visible to Claude Code');
console.log('');

// Summary
console.log('='.repeat(60));
if (allGood && warnings.length === 0) {
  console.log('✅ All checks passed!');
  console.log('');
  console.log('Your setup is complete. Next steps:');
  console.log('1. Edit files in this repo folder');
  console.log('2. Changes reflect immediately in Claude Code');
  console.log('3. Learned skills save to skills/learned/ in repo');
  console.log('4. Commit and push to sync across machines');
} else {
  if (issues.length > 0) {
    console.log('❌ Issues found:');
    for (const issue of issues) {
      console.log(`   - ${issue}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
    console.log('');
  }

  console.log('Recommended actions:');
  if (issues.some(i => i.includes('symlink') || i.includes('not found'))) {
    console.log('  1. Run: node scripts/setup-symlinks.js');
  }
  if (warnings.some(w => w.includes('hooks'))) {
    console.log('  2. Run: node scripts/merge-hooks.js');
  }
  if (issues.some(i => i.includes('learned'))) {
    console.log('  3. Create: mkdir -p skills/learned');
    console.log('  4. Update: skills/continuous-learning/config.json');
  }
  if (warnings.some(w => w.includes('v2') || w.includes('homunculus'))) {
    console.log('  5. Setup v2: node scripts/setup-v2.js');
    console.log('  6. Update .gitignore: node scripts/update-gitignore-v2.js');
  }
}
console.log('='.repeat(60));
