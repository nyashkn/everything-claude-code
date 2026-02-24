#!/usr/bin/env node

/**
 * Merge Hooks into Claude Code Settings
 *
 * Reads hooks from hooks/hooks.json and intelligently merges them into
 * ~/.claude/settings.json without creating duplicates.
 *
 * Replaces ${CLAUDE_PLUGIN_ROOT} with ~/.claude since scripts are symlinked.
 *
 * Usage: node scripts/merge-hooks.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_DIR = path.resolve(__dirname, '..');
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
const hooksSourcePath = path.join(REPO_DIR, 'hooks', 'hooks.json');

const isDryRun = process.argv.includes('--dry-run');

console.log('='.repeat(60));
console.log('Claude Code Hooks Merge');
console.log('='.repeat(60));
console.log(`Settings: ${settingsPath}`);
console.log(`Source:   ${hooksSourcePath}`);
console.log(`Mode:     ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
console.log('='.repeat(60));
console.log('');

// Check if settings.json exists
if (!fs.existsSync(settingsPath)) {
  console.log('❌ Error: ~/.claude/settings.json not found');
  console.log('   Please create it first or run Claude Code to generate it.');
  process.exit(1);
}

// Check if hooks source exists
if (!fs.existsSync(hooksSourcePath)) {
  console.log('❌ Error: hooks/hooks.json not found in repository');
  process.exit(1);
}

// Read current settings
console.log('📖 Reading current settings...');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

if (!settings.hooks) {
  settings.hooks = {};
  console.log('   ℹ️  No existing hooks section, creating new one');
}

// Read hooks from repo
console.log('📖 Reading hooks from repository...');
const hooksSource = JSON.parse(fs.readFileSync(hooksSourcePath, 'utf8'));

// Replace ${CLAUDE_PLUGIN_ROOT} with ~/.claude
// Since scripts are symlinked to ~/.claude/scripts, we use ~/.claude
const hooksJson = JSON.stringify(hooksSource);
const replaced = hooksJson.replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, CLAUDE_DIR);
const hooks = JSON.parse(replaced);

console.log('   ✅ Replaced ${CLAUDE_PLUGIN_ROOT} with ' + CLAUDE_DIR);
console.log('');

// Track changes
let added = 0;
let skipped = 0;
let updated = 0;

// Merge hooks intelligently
for (const [event, hooksList] of Object.entries(hooks.hooks || {})) {
  console.log(`[${event}]`);

  if (!settings.hooks[event]) {
    settings.hooks[event] = [];
    console.log(`  ℹ️  Creating new event hook list`);
  }

  // Process each hook configuration
  for (const hookConfig of hooksList) {
    const description = hookConfig.description || 'No description';

    // Check if hook already exists (by matcher and command)
    const existingIndex = settings.hooks[event].findIndex(existing => {
      // Match by matcher
      if (existing.matcher !== hookConfig.matcher) {
        return false;
      }

      // Match by hooks array content
      const existingHooksStr = JSON.stringify(existing.hooks);
      const newHooksStr = JSON.stringify(hookConfig.hooks);

      return existingHooksStr === newHooksStr;
    });

    if (existingIndex >= 0) {
      console.log(`  ⏭️  Skip: ${description}`);
      console.log(`     (already exists)`);
      skipped++;
    } else {
      // Check if same matcher exists but with different hooks (update case)
      const sameMatcherIndex = settings.hooks[event].findIndex(
        existing => existing.matcher === hookConfig.matcher
      );

      if (sameMatcherIndex >= 0) {
        console.log(`  🔄 Update: ${description}`);
        console.log(`     (matcher exists, updating hooks)`);
        if (!isDryRun) {
          settings.hooks[event][sameMatcherIndex] = hookConfig;
        }
        updated++;
      } else {
        console.log(`  ➕ Add: ${description}`);
        if (!isDryRun) {
          settings.hooks[event].push(hookConfig);
        }
        added++;
      }
    }
  }

  console.log('');
}

// Summary
console.log('='.repeat(60));
console.log('Summary:');
console.log(`  ➕ Added:   ${added} hooks`);
console.log(`  🔄 Updated: ${updated} hooks`);
console.log(`  ⏭️  Skipped: ${skipped} hooks (already exist)`);
console.log('='.repeat(60));

// Write back
if (!isDryRun && (added > 0 || updated > 0)) {
  console.log('');
  console.log('💾 Writing updated settings...');

  // Create backup
  const backupPath = settingsPath + '.backup-' + Date.now();
  fs.copyFileSync(settingsPath, backupPath);
  console.log(`   📦 Backup created: ${backupPath}`);

  // Write updated settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('   ✅ Settings updated successfully');
} else if (isDryRun) {
  console.log('');
  console.log('ℹ️  Dry run - no changes made');
} else {
  console.log('');
  console.log('ℹ️  No changes needed');
}

console.log('');
console.log('✅ Hooks merge complete!');
console.log('');
console.log('Next steps:');
console.log('1. Restart Claude Code to load new hooks');
console.log('2. Test by triggering hook matchers');
console.log('3. Check hook output in Claude Code');
