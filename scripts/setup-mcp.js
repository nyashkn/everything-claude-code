#!/usr/bin/env node
/**
 * Setup MCP servers with credentials from .env
 *
 * Usage: node scripts/setup-mcp.js
 *
 * This script is fully dynamic - it automatically detects all MCP servers
 * that need credentials and injects them from .env without code changes.
 *
 * Reads:
 *   - mcp-configs/mcp-servers.json (clean template)
 *   - .env (user credentials)
 *
 * Writes:
 *   - mcp-configs/mcp-servers.with_creds.json (ready-to-use)
 */

const fs = require('fs');
const path = require('path');

// Parse .env file into key-value pairs
function parseEnvFile(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return env;
}

// Dynamically inject credentials into MCP server config
function injectCredentials(config, env) {
  const result = JSON.parse(JSON.stringify(config)); // Deep clone
  const injected = [];
  const missing = [];

  // Process each MCP server
  for (const [serverName, serverConfig] of Object.entries(result.mcpServers || {})) {
    // Handle env object credentials
    if (serverConfig.env && typeof serverConfig.env === 'object') {
      // Look for _comment field to identify servers needing credentials
      const hasComment = serverConfig.env._comment;

      if (hasComment) {
        // Extract env var names from comment (e.g., "GITHUB_PERSONAL_ACCESS_TOKEN injected...")
        // Or just look for matching env vars by convention
        const envKeys = Object.keys(env).filter(key => !key.includes('YOUR_'));

        // Try to match env vars by server name convention
        for (const envKey of envKeys) {
          const lowerKey = envKey.toLowerCase();
          const lowerServer = serverName.toLowerCase().replace(/-/g, '');

          // Match if env var contains server name or vice versa
          if (lowerKey.includes(lowerServer) ||
              lowerServer.includes(lowerKey.split('_')[0])) {
            if (env[envKey] && !env[envKey].includes('YOUR_')) {
              delete serverConfig.env._comment;
              serverConfig.env[envKey] = env[envKey];
              injected.push(`${serverName}: ${envKey}`);
            }
          }
        }

        // Also check for explicitly mentioned env vars in comments
        const commentMatch = hasComment.match(/([A-Z_]+)/g);
        if (commentMatch) {
          for (const varName of commentMatch) {
            if (env[varName] && !env[varName].includes('YOUR_')) {
              delete serverConfig.env._comment;
              serverConfig.env[varName] = env[varName];
              if (!injected.some(i => i.includes(varName))) {
                injected.push(`${serverName}: ${varName}`);
              }
            } else if (env[varName]?.includes('YOUR_')) {
              missing.push(`${serverName}: ${varName} (placeholder value)`);
            }
          }
        }
      } else {
        // Server has env object but no comment - inject matching env vars
        for (const [key, value] of Object.entries(serverConfig.env)) {
          if (env[key] && !env[key].includes('YOUR_') && value && value.includes('YOUR_')) {
            serverConfig.env[key] = env[key];
            injected.push(`${serverName}: ${key}`);
          }
        }
      }
    }

    // Handle args-based credentials (like Supabase --project-ref)
    if (serverConfig.args && Array.isArray(serverConfig.args)) {
      const commentMatch = serverConfig._comment?.match(/([A-Z_]+)/g);
      if (commentMatch) {
        for (const varName of commentMatch) {
          if (env[varName] && !env[varName].includes('YOUR_')) {
            // Look for matching arg pattern
            const argPattern = varName.toLowerCase().replace(/_/g, '-');
            const existingArgIndex = serverConfig.args.findIndex(arg =>
              typeof arg === 'string' && arg.includes(argPattern)
            );

            if (existingArgIndex >= 0) {
              // Replace existing arg
              serverConfig.args[existingArgIndex] = serverConfig.args[existingArgIndex]
                .replace(/YOUR_[A-Z_]+/g, env[varName]);
              delete serverConfig._comment;
              injected.push(`${serverName}: ${varName} (args)`);
            } else {
              // Add new arg
              serverConfig.args.push(`--${argPattern}=${env[varName]}`);
              delete serverConfig._comment;
              injected.push(`${serverName}: ${varName} (args)`);
            }
          }
        }
      }
    }
  }

  return { result, injected, missing };
}

async function main() {
  const rootDir = path.join(__dirname, '..');
  const templatePath = path.join(rootDir, 'mcp-configs', 'mcp-servers.json');
  const envPath = path.join(rootDir, '.env');
  const outputPath = path.join(rootDir, 'mcp-configs', 'mcp-servers.with_creds.json');

  console.log('MCP Setup - Dynamic credential injection\n');

  // Check if files exist
  if (!fs.existsSync(templatePath)) {
    console.error('Error: mcp-configs/mcp-servers.json not found');
    process.exit(1);
  }

  if (!fs.existsSync(envPath)) {
    console.error('Error: .env not found');
    console.error('Please create .env from .env.example and populate with your credentials');
    process.exit(1);
  }

  // Read and parse
  console.log('Reading template: mcp-configs/mcp-servers.json');
  const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

  console.log('Reading credentials: .env');
  const env = parseEnvFile(envPath);

  // Inject credentials dynamically
  console.log('Injecting credentials...\n');
  const { result: withCreds, injected, missing } = injectCredentials(template, env);

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(withCreds, null, 2));
  console.log('✅ Created: mcp-configs/mcp-servers.with_creds.json\n');

  // Show results
  if (injected.length > 0) {
    console.log('Credentials injected:');
    injected.forEach(i => console.log(`  ✓ ${i}`));
  } else {
    console.log('No credentials injected (all values are placeholders)');
  }

  if (missing.length > 0) {
    console.warn('\nWarning: Found placeholder values:');
    missing.forEach(m => console.warn(`  ⚠ ${m}`));
    console.warn('\nReplace YOUR_*_HERE with actual credentials in .env');
  }

  // Show instructions
  console.log('\nNext steps:');
  console.log('  1. Review mcp-configs/mcp-servers.with_creds.json');
  console.log('  2. Copy desired servers to your ~/.claude.json:');
  console.log('');
  console.log('     {');
  console.log('       "mcpServers": {');
  console.log('         "github": { ... },  // Copy from with_creds.json');
  console.log('         "firecrawl": { ... }');
  console.log('       }');
  console.log('     }');
  console.log('');
  console.log('  3. Restart Claude Code to load new MCPs');
  console.log('');
  console.log('Note: This script is fully dynamic - add new MCPs to mcp-servers.json');
  console.log('      and credentials to .env, then re-run. No code changes needed!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
