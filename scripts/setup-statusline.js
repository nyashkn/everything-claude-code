#!/usr/bin/env node

/**
 * Setup Custom Status Line for Claude Code
 *
 * Adds the custom status line configuration from examples/statusline.json
 * to ~/.claude/settings.json
 *
 * Usage: node scripts/setup-statusline.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_DIR = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
const statuslineSourcePath = path.join(REPO_DIR, 'examples', 'statusline.json');

const isDryRun = process.argv.includes('--dry-run');

console.log('='.repeat(60));
console.log('Claude Code Status Line Setup');
console.log('='.repeat(60));
console.log(`Settings:    ${settingsPath}`);
console.log(`Source:      ${statuslineSourcePath}`);
console.log(`Mode:        ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
console.log('='.repeat(60));
console.log('');

// Check if settings.json exists
if (!fs.existsSync(settingsPath)) {
  console.log('❌ Error: ~/.claude/settings.json not found');
  console.log('   Please create it first or run Claude Code to generate it.');
  process.exit(1);
}

// Check if statusline source exists
if (!fs.existsSync(statuslineSourcePath)) {
  console.log('❌ Error: examples/statusline.json not found in repository');
  process.exit(1);
}

// Read current settings
console.log('📖 Reading current settings...');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

// Read statusline config
console.log('📖 Reading statusline configuration...');
const statuslineSource = JSON.parse(fs.readFileSync(statuslineSourcePath, 'utf8'));

// Check if statusLine already exists
if (settings.statusLine) {
  console.log('⚠️  Status line already configured in settings.json');
  console.log('');
  console.log('Current configuration:');
  console.log(JSON.stringify(settings.statusLine, null, 2));
  console.log('');
  console.log('New configuration:');
  console.log(JSON.stringify(statuslineSource.statusLine, null, 2));
  console.log('');

  if (JSON.stringify(settings.statusLine) === JSON.stringify(statuslineSource.statusLine)) {
    console.log('✅ Status line is already up to date!');
    process.exit(0);
  } else {
    console.log('❓ Overwrite existing status line? (will backup first)');
    console.log('   Run with --force to overwrite, or manually update settings.json');

    if (!process.argv.includes('--force')) {
      console.log('');
      console.log('Exiting without changes. Use --force to overwrite.');
      process.exit(0);
    }
    console.log('   Overwriting with --force flag...');
  }
}

// Add statusLine
console.log('➕ Adding status line configuration...');
settings.statusLine = statuslineSource.statusLine;

// Preview the new statusLine
console.log('');
console.log('New status line configuration:');
console.log('  Type:        ' + statuslineSource.statusLine.type);
console.log('  Description: ' + statuslineSource.statusLine.description);
console.log('');

if (statuslineSource._comments?.output_example) {
  console.log('Example output:');
  console.log('  ' + statuslineSource._comments.output_example);
  console.log('');
}

// Write back
if (!isDryRun) {
  console.log('💾 Writing updated settings...');

  // Create backup
  const backupPath = settingsPath + '.backup-' + Date.now();
  fs.copyFileSync(settingsPath, backupPath);
  console.log(`   📦 Backup created: ${backupPath}`);

  // Write updated settings
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  console.log('   ✅ Settings updated successfully');
} else {
  console.log('ℹ️  Dry run - no changes made');
}

console.log('');
console.log('='.repeat(60));
console.log('✅ Status line setup complete!');
console.log('='.repeat(60));
console.log('');
console.log('Next steps:');
console.log('1. Restart Claude Code to see the new status line');
console.log('2. The status line will show:');
console.log('   - Username and current directory');
console.log('   - Git branch and dirty status (*)');
console.log('   - Context window remaining (%)');
console.log('   - Model name and current time');
console.log('   - Todo count if any exist');
console.log('');
console.log('Tip: To customize colors or format, edit examples/statusline.json');
console.log('     then run this script again with --force');
