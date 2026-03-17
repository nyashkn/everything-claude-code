#!/usr/bin/env node

/**
 * Setup Continuous Learning v2 for Central Repository
 *
 * Modifies v2 scripts to read from config.json and creates repo structure.
 *
 * Usage: node scripts/setup-v2.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const REPO_DIR = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');

console.log('='.repeat(60));
console.log('Continuous Learning v2 Setup');
console.log('='.repeat(60));
console.log(`Repository: ${REPO_DIR}`);
console.log(`Mode:       ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
console.log('='.repeat(60));
console.log('');

// 1. Create homunculus directory structure
console.log('[Creating Directory Structure]');
const dirs = [
  'homunculus/instincts/personal',
  'homunculus/instincts/inherited',
  'homunculus/evolved/skills',
  'homunculus/evolved/commands',
  'homunculus/evolved/agents',
  'homunculus/observations.archive'
];

for (const dir of dirs) {
  const fullPath = path.join(REPO_DIR, dir);
  if (!isDryRun) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  console.log(`  ✅ ${dir}/`);
}
console.log('');

// 2. Create .gitkeep files
console.log('[Creating .gitkeep Files]');
const gitkeepDirs = [
  'homunculus/instincts/inherited',
  'homunculus/evolved/skills',
  'homunculus/evolved/commands',
  'homunculus/evolved/agents'
];

for (const dir of gitkeepDirs) {
  const gitkeepPath = path.join(REPO_DIR, dir, '.gitkeep');
  if (!isDryRun) {
    fs.writeFileSync(gitkeepPath, '# Directory for v2 continuous learning\n');
  }
  console.log(`  ✅ ${dir}/.gitkeep`);
}
console.log('');

// 3. Update config.json paths (v2.0 only — v2.1+ hardcodes ~/.claude/homunculus)
console.log('[Updating config.json]');
const configPath = path.join(REPO_DIR, 'skills/continuous-learning-v2/config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const homunculus = path.join(REPO_DIR, 'homunculus');

if (config.observation && config.instincts && config.evolution) {
  config.observation.store_path = path.join(homunculus, 'observations.jsonl');
  config.instincts.personal_path = path.join(homunculus, 'instincts/personal') + '/';
  config.instincts.inherited_path = path.join(homunculus, 'instincts/inherited') + '/';
  config.evolution.evolved_path = path.join(homunculus, 'evolved') + '/';

  if (!isDryRun) {
    const backupPath = configPath + '.backup-' + Date.now();
    fs.copyFileSync(configPath, backupPath);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`  ✅ Updated config.json`);
    console.log(`  📦 Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  ✅ Would update config.json (dry run)`);
  }
} else {
  console.log(`  ℹ️  config.json v${config.version || '2.1+'} — paths hardcoded in scripts, no patch needed`);
}
console.log('');

// 4. Modify hooks/observe.sh (skip if already has env var support)
console.log('[Modifying hooks/observe.sh]');
const observePath = path.join(REPO_DIR, 'skills/continuous-learning-v2/hooks/observe.sh');
let observeContent = fs.readFileSync(observePath, 'utf8');

if (observeContent.includes('CLAUDE_HOMUNCULUS_DIR')) {
  console.log(`  ℹ️  observe.sh already has CLAUDE_HOMUNCULUS_DIR support — skipping`);
} else {
  const observeReplacement = `# Use environment variable, fall back to default
if [ -n "$CLAUDE_HOMUNCULUS_DIR" ]; then
  CONFIG_DIR="$CLAUDE_HOMUNCULUS_DIR"
else
  CONFIG_DIR="\${HOME}/.claude/homunculus"
fi`;

  observeContent = observeContent.replace(
    /CONFIG_DIR="\$\{HOME\}\/.claude\/homunculus"/,
    observeReplacement
  );

  if (!isDryRun) {
    const backupPath = observePath + '.backup-' + Date.now();
    fs.copyFileSync(observePath, backupPath);
    fs.writeFileSync(observePath, observeContent);
    console.log(`  ✅ Modified observe.sh`);
    console.log(`  📦 Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  ✅ Would modify observe.sh (dry run)`);
  }
}
console.log('');

// 5. Modify scripts/instinct-cli.py (skip if already has env var support)
console.log('[Modifying scripts/instinct-cli.py]');
const cliPath = path.join(REPO_DIR, 'skills/continuous-learning-v2/scripts/instinct-cli.py');
let cliContent = fs.readFileSync(cliPath, 'utf8');

if (cliContent.includes('CLAUDE_HOMUNCULUS_DIR')) {
  console.log(`  ℹ️  instinct-cli.py already has CLAUDE_HOMUNCULUS_DIR support — skipping`);
} else {
  const cliReplacement = `# Use environment variable, fall back to default
if "CLAUDE_HOMUNCULUS_DIR" in os.environ:
    HOMUNCULUS_DIR = Path(os.environ["CLAUDE_HOMUNCULUS_DIR"])
else:
    HOMUNCULUS_DIR = Path.home() / ".claude" / "homunculus"`;

  cliContent = cliContent.replace(
    /HOMUNCULUS_DIR = Path\.home\(\) \/ "\.claude" \/ "homunculus"/,
    cliReplacement
  );

  if (!isDryRun) {
    const backupPath = cliPath + '.backup-' + Date.now();
    fs.copyFileSync(cliPath, backupPath);
    fs.writeFileSync(cliPath, cliContent);
    console.log(`  ✅ Modified instinct-cli.py`);
    console.log(`  📦 Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  ✅ Would modify instinct-cli.py (dry run)`);
  }
}
console.log('');

// 6. Modify agents/start-observer.sh (skip if already has env var support)
console.log('[Modifying agents/start-observer.sh]');
const startObserverPath = path.join(REPO_DIR, 'skills/continuous-learning-v2/agents/start-observer.sh');
let startObserverContent = fs.readFileSync(startObserverPath, 'utf8');

if (startObserverContent.includes('CLAUDE_HOMUNCULUS_DIR')) {
  console.log(`  ℹ️  start-observer.sh already has CLAUDE_HOMUNCULUS_DIR support — skipping`);
} else {
  const startObserverReplacement = `# Use environment variable, fall back to default
if [ -n "$CLAUDE_HOMUNCULUS_DIR" ]; then
  CONFIG_DIR="$CLAUDE_HOMUNCULUS_DIR"
else
  CONFIG_DIR="\${HOME}/.claude/homunculus"
fi`;

  startObserverContent = startObserverContent.replace(
    /CONFIG_DIR="\$\{HOME\}\/.claude\/homunculus"/,
    startObserverReplacement
  );

  if (!isDryRun) {
    const backupPath = startObserverPath + '.backup-' + Date.now();
    fs.copyFileSync(startObserverPath, backupPath);
    fs.writeFileSync(startObserverPath, startObserverContent);
    console.log(`  ✅ Modified start-observer.sh`);
    console.log(`  📦 Backup: ${path.basename(backupPath)}`);
  } else {
    console.log(`  ✅ Would modify start-observer.sh (dry run)`);
  }
}
console.log('');

console.log('='.repeat(60));
console.log('✅ v2 Setup Complete!');
console.log('='.repeat(60));
console.log('');
console.log('Next steps:');
console.log('1. Update .gitignore: node scripts/update-gitignore-v2.js');
console.log('2. Verify setup: node scripts/verify-setup.js');
console.log('3. Test v2 hooks capture tool calls');
console.log('4. Run /instinct-status to see learned instincts');
console.log('5. Use /evolve to generate skills from instincts');
console.log('6. Commit homunculus/instincts/inherited/ and homunculus/evolved/');
