#!/usr/bin/env node

/**
 * Update .gitignore for Continuous Learning v2
 *
 * Adds exclusions for v2 noisy/personal files while tracking shared knowledge.
 *
 * Usage: node scripts/update-gitignore-v2.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '..');
const gitignorePath = path.join(REPO_DIR, '.gitignore');
const isDryRun = process.argv.includes('--dry-run');

console.log('='.repeat(60));
console.log('Update .gitignore for v2');
console.log('='.repeat(60));
console.log(`File: ${gitignorePath}`);
console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log('='.repeat(60));
console.log('');

const v2Exclusions = `
# Continuous Learning v2 - exclude noisy/personal files
homunculus/observations.jsonl
homunculus/.observer.pid
homunculus/observer.log
homunculus/instincts/personal/

# v2 - commit these (shared knowledge):
# homunculus/instincts/inherited/
# homunculus/evolved/
# homunculus/observations.archive/ (optional)
`;

// Read current .gitignore
let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

// Check if v2 exclusions already exist
if (gitignoreContent.includes('Continuous Learning v2')) {
  console.log('⚠️  v2 exclusions already exist in .gitignore');
  console.log('');
  console.log('No changes needed.');
  process.exit(0);
}

// Append v2 exclusions
gitignoreContent += v2Exclusions;

if (!isDryRun) {
  // Backup original
  const backupPath = gitignorePath + '.backup-' + Date.now();
  fs.copyFileSync(gitignorePath, backupPath);
  fs.writeFileSync(gitignorePath, gitignoreContent);
  console.log('✅ Updated .gitignore with v2 exclusions');
  console.log(`📦 Backup: ${path.basename(backupPath)}`);
} else {
  console.log('✅ Would update .gitignore (dry run)');
  console.log('');
  console.log('Would add:');
  console.log(v2Exclusions);
}

console.log('');
console.log('='.repeat(60));
console.log('✅ .gitignore update complete!');
console.log('='.repeat(60));
console.log('');
console.log('What gets synced to git:');
console.log('  ✅ homunculus/instincts/inherited/ (team patterns)');
console.log('  ✅ homunculus/evolved/ (generated skills/commands/agents)');
console.log('  ✅ homunculus/observations.archive/ (archived observations - optional)');
console.log('');
console.log('What stays local (not synced):');
console.log('  ❌ homunculus/observations.jsonl (raw observations)');
console.log('  ❌ homunculus/.observer.pid (process ID)');
console.log('  ❌ homunculus/observer.log (logs)');
console.log('  ❌ homunculus/instincts/personal/ (personal learning)');
