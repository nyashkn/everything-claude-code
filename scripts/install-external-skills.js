#!/usr/bin/env node
/**
 * install-external-skills.js
 *
 * Installs external skills (from GitHub repos) into the active Claude profile.
 * Skills are cloned to a local cache and symlinked — updates via git pull in cache.
 *
 * Usage:
 *   node scripts/install-external-skills.js           # install all
 *   node scripts/install-external-skills.js --update  # git pull all cached repos
 *   node scripts/install-external-skills.js --list    # show status
 *
 * Respects CLAUDE_CONFIG_DIR for profile-aware installation.
 */

const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync, spawnSync } = require('child_process');

const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const SKILLS_DIR = path.join(CLAUDE_DIR, 'skills');
const CACHE_DIR = path.join(CLAUDE_DIR, '.skills-cache');
const MANIFEST = path.join(__dirname, 'external-skills.json');

const args = process.argv.slice(2);
const UPDATE_MODE = args.includes('--update');
const LIST_MODE = args.includes('--list');

function run(cmd, opts = {}) {
  return spawnSync('sh', ['-c', cmd], { stdio: 'inherit', ...opts });
}

function runCaptured(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function skillStatus(skill) {
  const cacheRepo = path.join(CACHE_DIR, repoName(skill.repo));
  const skillLink = path.join(SKILLS_DIR, skill.name);
  const cached = fs.existsSync(cacheRepo);
  const linked = isSymlink(skillLink);
  return { cached, linked };
}

function repoName(repoUrl) {
  return repoUrl.replace(/\.git$/, '').split('/').pop();
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const skills = manifest.skills || [];

  if (LIST_MODE) {
    console.log(`\nExternal skills (target: ${SKILLS_DIR})\n`);
    for (const skill of skills) {
      const { cached, linked } = skillStatus(skill);
      const status = cached && linked ? '✓ installed' : cached ? '⚠ cached, not linked' : '✗ not installed';
      console.log(`  ${status}  ${skill.name}`);
      console.log(`           ${skill.description}`);
    }
    console.log();
    return;
  }

  ensureDir(SKILLS_DIR);
  ensureDir(CACHE_DIR);

  for (const skill of skills) {
    console.log(`\n── ${skill.name} ──`);
    console.log(`   ${skill.description}`);

    const name = repoName(skill.repo);
    const cacheRepo = path.join(CACHE_DIR, name);
    const skillSource = path.join(cacheRepo, skill.subdir);
    const skillLink = path.join(SKILLS_DIR, skill.name);

    // Clone or update the repo
    if (fs.existsSync(cacheRepo)) {
      if (UPDATE_MODE) {
        console.log(`   Updating ${name}...`);
        run(`git -C "${cacheRepo}" pull --quiet`);
      } else {
        console.log(`   Cached at ${cacheRepo} (use --update to pull)`);
      }
    } else {
      console.log(`   Cloning ${skill.repo}...`);
      const result = run(`git clone --quiet "${skill.repo}" "${cacheRepo}"`);
      if (result.status !== 0) {
        console.error(`   ✗ Clone failed`);
        continue;
      }
    }

    // Verify the skill subdir exists
    if (!fs.existsSync(skillSource)) {
      console.error(`   ✗ Subdir '${skill.subdir}' not found in repo`);
      continue;
    }

    // Run setup if present and not already linked
    if (skill.setup && !fs.existsSync(skillLink)) {
      console.log(`   Running setup: ${skill.setup}`);
      run(skill.setup, { cwd: skillSource });
    }

    // Create symlink
    if (isSymlink(skillLink)) {
      console.log(`   Already linked at ${skillLink}`);
    } else {
      if (fs.existsSync(skillLink)) {
        fs.rmSync(skillLink, { recursive: true });
      }
      fs.symlinkSync(skillSource, skillLink);
      console.log(`   ✓ Linked: ${skillLink} → ${skillSource}`);
    }
  }

  console.log('\nDone. Re-run with --update to pull latest from repos.\n');
}

main();
