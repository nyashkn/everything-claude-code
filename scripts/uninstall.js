#!/usr/bin/env node

/**
 * Uninstall Claude Code Symlink Setup
 *
 * Reverses all changes made by setup scripts:
 * - Removes symlinks from ~/.claude/
 * - Optionally restores backups
 * - Removes hooks from settings.json (optional)
 * - Cleans up backup files (optional)
 *
 * Usage: node scripts/uninstall.js [--dry-run] [--keep-hooks] [--restore-backups]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const REPO_DIR = path.resolve(__dirname, '..');
const CLAUDE_DIR = path.join(os.homedir(), '.claude');

const isDryRun = process.argv.includes('--dry-run');
const keepHooks = process.argv.includes('--keep-hooks');
const restoreBackups = process.argv.includes('--restore-backups');

const components = ['agents', 'commands', 'skills', 'rules', 'scripts'];

console.log('='.repeat(60));
console.log('Claude Code Uninstall');
console.log('='.repeat(60));
console.log(`Repository: ${REPO_DIR}`);
console.log(`Claude Dir: ${CLAUDE_DIR}`);
console.log(`Mode:       ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
console.log(`Keep Hooks: ${keepHooks ? 'Yes' : 'No (will remove)'}`);
console.log(`Restore:    ${restoreBackups ? 'Yes (from backups)' : 'No'}`);
console.log('='.repeat(60));
console.log('');

// Helper to prompt user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  // Step 0: Show current installation status
  console.log('[Current Installation Status]');
  console.log('');

  // Check symlinks
  console.log('Symlinks in ~/.claude/:');
  let symlinkCount = 0;
  for (const component of components) {
    const target = path.join(CLAUDE_DIR, component);

    if (fs.existsSync(target)) {
      const stats = fs.lstatSync(target);

      if (stats.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(target);
        const pointsToRepo = linkTarget === path.join(REPO_DIR, component);
        const marker = pointsToRepo ? '✅' : '⚠️ ';
        console.log(`  ${marker} ${component.padEnd(12)} -> ${linkTarget}`);
        symlinkCount++;
      } else {
        console.log(`  ❌ ${component.padEnd(12)} (not a symlink)`);
      }
    } else {
      console.log(`  ⏭️  ${component.padEnd(12)} (not found)`);
    }
  }
  console.log(`  Total symlinks: ${symlinkCount}`);
  console.log('');

  // Check backups
  console.log('Backups in ~/.claude/:');
  let backupCount = 0;
  for (const component of components) {
    const backupPattern = `${component}.backup-`;
    if (fs.existsSync(CLAUDE_DIR)) {
      const claudeDirContents = fs.readdirSync(CLAUDE_DIR);
      const backups = claudeDirContents.filter(name => name.startsWith(backupPattern));

      if (backups.length > 0) {
        console.log(`  📦 ${component.padEnd(12)} (${backups.length} backup${backups.length > 1 ? 's' : ''})`);
        for (const backup of backups.sort().reverse().slice(0, 3)) {
          console.log(`     - ${backup}`);
        }
        if (backups.length > 3) {
          console.log(`     ... and ${backups.length - 3} more`);
        }
        backupCount += backups.length;
      }
    }
  }
  if (backupCount === 0) {
    console.log('  ℹ️  No backups found');
  } else {
    console.log(`  Total backups: ${backupCount}`);
  }
  console.log('');

  // Check hooks
  console.log('Hooks in settings.json:');
  const settingsPath = path.join(CLAUDE_DIR, 'settings.json');
  let repoHooksCount = 0;
  if (fs.existsSync(settingsPath)) {
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const repoScriptsPath = path.join(REPO_DIR, 'scripts');

    for (const [event, hooksList] of Object.entries(settings.hooks || {})) {
      const repoHooks = hooksList.filter(hookConfig => {
        const hooksArray = hookConfig.hooks || [];
        return hooksArray.some(hook => hook.command && hook.command.includes(repoScriptsPath));
      });

      if (repoHooks.length > 0) {
        console.log(`  ${event}:`);
        for (const hook of repoHooks) {
          console.log(`    ✅ ${hook.description || 'No description'}`);
          repoHooksCount++;
        }
      }
    }

    if (repoHooksCount === 0) {
      console.log('  ℹ️  No repo hooks found');
    } else {
      console.log(`  Total repo hooks: ${repoHooksCount}`);
    }
  } else {
    console.log('  ⏭️  settings.json not found');
  }
  console.log('');

  // Check backup files in repo
  console.log('Backup files in repo:');
  const backupPatterns = {
    'v2 config': 'skills/continuous-learning-v2/config.json.backup-*',
    'v2 observe.sh': 'skills/continuous-learning-v2/hooks/observe.sh.backup-*',
    'v2 instinct-cli.py': 'skills/continuous-learning-v2/scripts/instinct-cli.py.backup-*',
    'v2 start-observer.sh': 'skills/continuous-learning-v2/agents/start-observer.sh.backup-*',
    '.gitignore': '.gitignore.backup-*'
  };

  let repoBackupCount = 0;
  for (const [label, pattern] of Object.entries(backupPatterns)) {
    const dir = path.dirname(path.join(REPO_DIR, pattern));
    const filename = path.basename(pattern).replace('*', '');

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.startsWith(filename));
      if (files.length > 0) {
        console.log(`  📦 ${label}: ${files.length} file${files.length > 1 ? 's' : ''}`);
        repoBackupCount += files.length;
      }
    }
  }
  if (repoBackupCount === 0) {
    console.log('  ℹ️  No backup files found');
  } else {
    console.log(`  Total backup files: ${repoBackupCount}`);
  }
  console.log('');

  // Check what will be kept
  console.log('What will be KEPT after uninstall:');
  console.log(`  ✅ Repository: ${REPO_DIR}`);
  if (fs.existsSync(path.join(REPO_DIR, 'skills/learned'))) {
    const learnedFiles = fs.readdirSync(path.join(REPO_DIR, 'skills/learned')).filter(f => f !== '.gitkeep');
    console.log(`  ✅ v1 learned skills: ${learnedFiles.length} file${learnedFiles.length !== 1 ? 's' : ''}`);
  }
  if (fs.existsSync(path.join(REPO_DIR, 'homunculus'))) {
    console.log(`  ✅ v2 homunculus/ directory`);
    const personalInstincts = fs.existsSync(path.join(REPO_DIR, 'homunculus/instincts/personal'))
      ? fs.readdirSync(path.join(REPO_DIR, 'homunculus/instincts/personal')).filter(f => f !== '.gitkeep').length
      : 0;
    const inheritedInstincts = fs.existsSync(path.join(REPO_DIR, 'homunculus/instincts/inherited'))
      ? fs.readdirSync(path.join(REPO_DIR, 'homunculus/instincts/inherited')).filter(f => f !== '.gitkeep').length
      : 0;
    console.log(`     - Personal instincts: ${personalInstincts}`);
    console.log(`     - Inherited instincts: ${inheritedInstincts}`);
  }
  if (fs.existsSync(path.join(CLAUDE_DIR, 'sessions'))) {
    const sessions = fs.readdirSync(path.join(CLAUDE_DIR, 'sessions'));
    console.log(`  ✅ Session history: ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`);
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('');

  if (!isDryRun) {
    console.log('⚠️  WARNING: This will remove all symlinks and optionally restore backups.');
    console.log('');
    const confirm = await askQuestion('Continue? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Cancelled.');
      rl.close();
      process.exit(0);
    }
    console.log('');
  }

  let removedCount = 0;
  let restoredCount = 0;

  // Step 1: Remove symlinks
  console.log('[Removing Symlinks]');
  for (const component of components) {
    const target = path.join(CLAUDE_DIR, component);

    if (!fs.existsSync(target)) {
      console.log(`  ⏭️  ${component.padEnd(12)} not found`);
      continue;
    }

    const stats = fs.lstatSync(target);

    if (stats.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(target);
      console.log(`  🔗 ${component.padEnd(12)} -> ${linkTarget}`);

      if (!isDryRun) {
        fs.unlinkSync(target);
        console.log(`  ✅ Removed symlink`);
        removedCount++;
      } else {
        console.log(`  ✅ Would remove (dry run)`);
      }
    } else {
      console.log(`  ⚠️  ${component.padEnd(12)} is not a symlink (keeping)`);
    }
  }
  console.log('');

  // Step 2: Restore backups (if requested)
  if (restoreBackups) {
    console.log('[Restoring Backups]');

    for (const component of components) {
      const target = path.join(CLAUDE_DIR, component);

      // Find most recent backup
      const backupPattern = `${component}.backup-`;
      const claudeDirContents = fs.readdirSync(CLAUDE_DIR);
      const backups = claudeDirContents
        .filter(name => name.startsWith(backupPattern))
        .sort()
        .reverse();

      if (backups.length > 0) {
        const mostRecentBackup = backups[0];
        const backupPath = path.join(CLAUDE_DIR, mostRecentBackup);

        console.log(`  📦 ${component.padEnd(12)} <- ${mostRecentBackup}`);

        if (!isDryRun) {
          // Remove symlink if it still exists
          if (fs.existsSync(target)) {
            fs.unlinkSync(target);
          }

          // Restore backup
          fs.renameSync(backupPath, target);
          console.log(`  ✅ Restored from backup`);
          restoredCount++;
        } else {
          console.log(`  ✅ Would restore (dry run)`);
        }
      } else {
        console.log(`  ⏭️  ${component.padEnd(12)} no backup found`);
      }
    }
    console.log('');
  }

  // Step 3: Remove hooks (if not keeping)
  if (!keepHooks) {
    console.log('[Removing Hooks from settings.json]');
    const settingsPath = path.join(CLAUDE_DIR, 'settings.json');

    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

      // Find hooks that point to this repo
      let hooksRemoved = 0;
      const repoScriptsPath = path.join(REPO_DIR, 'scripts');

      for (const [event, hooksList] of Object.entries(settings.hooks || {})) {
        const filteredHooks = hooksList.filter(hookConfig => {
          const hooksArray = hookConfig.hooks || [];
          const hasRepoHook = hooksArray.some(hook => {
            return hook.command && hook.command.includes(repoScriptsPath);
          });

          if (hasRepoHook) {
            hooksRemoved++;
            console.log(`  🗑️  Removing: ${hookConfig.description || 'No description'}`);
            return false; // Remove this hook
          }

          return true; // Keep this hook
        });

        settings.hooks[event] = filteredHooks;
      }

      if (hooksRemoved > 0) {
        if (!isDryRun) {
          // Backup settings
          const backupPath = settingsPath + '.backup-' + Date.now();
          fs.copyFileSync(settingsPath, backupPath);
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
          console.log(`  ✅ Removed ${hooksRemoved} hooks`);
          console.log(`  📦 Backup: ${path.basename(backupPath)}`);
        } else {
          console.log(`  ✅ Would remove ${hooksRemoved} hooks (dry run)`);
        }
      } else {
        console.log(`  ℹ️  No repo hooks found in settings.json`);
      }
    } else {
      console.log(`  ⏭️  settings.json not found`);
    }
    console.log('');
  }

  // Step 4: Clean up backup files in repo
  console.log('[Cleanup Backup Files in Repo]');
  const backupFiles = [
    'skills/continuous-learning-v2/config.json.backup-*',
    'skills/continuous-learning-v2/hooks/observe.sh.backup-*',
    'skills/continuous-learning-v2/scripts/instinct-cli.py.backup-*',
    'skills/continuous-learning-v2/agents/start-observer.sh.backup-*',
    '.gitignore.backup-*'
  ];

  let backupsRemoved = 0;
  for (const pattern of backupFiles) {
    const dir = path.dirname(path.join(REPO_DIR, pattern));
    const filename = path.basename(pattern).replace('*', '');

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.startsWith(filename));

      for (const file of files) {
        const filePath = path.join(dir, file);
        console.log(`  🗑️  ${file}`);

        if (!isDryRun) {
          fs.unlinkSync(filePath);
          backupsRemoved++;
        }
      }
    }
  }

  if (backupsRemoved > 0) {
    console.log(`  ✅ Removed ${backupsRemoved} backup files`);
  } else {
    console.log(`  ℹ️  No backup files found`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  🔗 Symlinks removed:      ${removedCount}`);
  console.log(`  📦 Backups restored:      ${restoredCount}`);
  console.log(`  🗑️  Backup files cleaned:  ${backupsRemoved}`);
  console.log('='.repeat(60));
  console.log('');

  if (!isDryRun) {
    console.log('✅ Uninstall complete!');
    console.log('');
    console.log('What remains:');
    console.log('  - This repository (everything-claude-code/)');
    console.log('  - homunculus/ directory (v2 learned data)');
    console.log('  - skills/learned/ directory (v1 learned skills)');
    console.log('  - ~/.claude/sessions/ (session history)');
    console.log('');
    console.log('To completely remove:');
    console.log('  1. Delete this repo: rm -rf ' + REPO_DIR);
    console.log('  2. Delete ~/.claude/ if desired');
  } else {
    console.log('ℹ️  Dry run complete - no changes made');
    console.log('');
    console.log('To execute uninstall:');
    console.log('  node scripts/uninstall.js');
    console.log('');
    console.log('Options:');
    console.log('  --keep-hooks        Keep hooks in settings.json');
    console.log('  --restore-backups   Restore original directories from backups');
  }

  rl.close();
}

main().catch(err => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
