#!/usr/bin/env node

/**
 * Setup Symlinks for Claude Code Central Repository
 *
 * Creates symlinks from ~/.claude/ to this repository, making this folder
 * the single source of truth for all Claude Code configuration.
 *
 * Usage: node scripts/setup-symlinks.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Determine repository directory
const REPO_DIR = path.resolve(__dirname, '..');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');

const components = ['agents', 'commands', 'skills', 'rules', 'scripts'];

const isDryRun = process.argv.includes('--dry-run');

console.log('='.repeat(60));
console.log('Claude Code Symlink Setup');
console.log('='.repeat(60));
console.log(`Repository: ${REPO_DIR}`);
console.log(`Claude Dir: ${CLAUDE_DIR}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
console.log('='.repeat(60));
console.log('');

// Ensure ~/.claude directory exists
if (!fs.existsSync(CLAUDE_DIR)) {
  console.log(`Creating ${CLAUDE_DIR}...`);
  if (!isDryRun) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }
}

// Process each component
for (const component of components) {
  const source = path.join(REPO_DIR, component);
  const target = path.join(CLAUDE_DIR, component);

  console.log(`\n[${component}]`);

  // Check if source exists
  if (!fs.existsSync(source)) {
    console.log(`  ⚠️  Source not found: ${source}`);
    console.log(`  Skipping...`);
    continue;
  }

  // Backup existing directory (not symlink)
  if (fs.existsSync(target)) {
    const stats = fs.lstatSync(target);

    if (stats.isSymbolicLink()) {
      const currentTarget = fs.readlinkSync(target);
      console.log(`  ℹ️  Already a symlink to: ${currentTarget}`);

      if (currentTarget === source) {
        console.log(`  ✅ Already correctly linked`);
        continue;
      } else {
        console.log(`  🔄 Updating symlink...`);
        if (!isDryRun) {
          fs.unlinkSync(target);
        }
      }
    } else if (stats.isDirectory()) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backup = `${target}.backup-${timestamp}`;
      console.log(`  📦 Backing up existing directory to:`);
      console.log(`     ${backup}`);
      if (!isDryRun) {
        fs.renameSync(target, backup);
      }
    } else {
      console.log(`  ⚠️  Target exists but is not a directory or symlink`);
      console.log(`  Skipping...`);
      continue;
    }
  }

  // Create symlink
  console.log(`  🔗 Creating symlink:`);
  console.log(`     ${target} -> ${source}`);
  if (!isDryRun) {
    try {
      fs.symlinkSync(source, target, 'dir');
      console.log(`  ✅ Success`);
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
    }
  } else {
    console.log(`  ✅ Would create (dry run)`);
  }
}

// Ensure per-machine directories exist
console.log('\n[Per-Machine Directories]');
const perMachineDirs = ['sessions'];

for (const dir of perMachineDirs) {
  const dirPath = path.join(CLAUDE_DIR, dir);

  if (fs.existsSync(dirPath)) {
    console.log(`  ✅ ${dir}/ already exists`);
  } else {
    console.log(`  📁 Creating ${dir}/`);
    if (!isDryRun) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}

console.log('\n' + '='.repeat(60));
console.log('✅ Symlink setup complete!');
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('1. Run: node scripts/merge-hooks.js');
console.log('2. Verify: ls -la ~/.claude/');
console.log('3. Test by editing files in this repo');
console.log('\nAll edits in this folder now affect Claude Code directly!');
