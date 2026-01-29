#!/usr/bin/env node

/**
 * Updates the versions.json manifest for versioned documentation
 *
 * Usage: node update-versions-manifest.js <manifest-path> <new-version>
 *
 * Example: node update-versions-manifest.js gh-pages/versions.json 0.0.7
 *
 * The manifest has the following structure:
 * {
 *   "latest": "0.0.7",
 *   "versions": ["0.0.7", "0.0.6", "0.0.5"]
 * }
 */

const fs = require('fs');
const path = require('path');

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: node update-versions-manifest.js <manifest-path> <new-version>');
    console.error('Example: node update-versions-manifest.js gh-pages/versions.json 0.0.7');
    process.exit(1);
  }

  const [manifestPath, newVersion] = args;

  // Normalize version (remove leading 'v' if present)
  const normalizedVersion = newVersion.replace(/^v/, '');

  // Read existing manifest or create new one
  let manifest = {
    latest: normalizedVersion,
    versions: [],
  };

  if (fs.existsSync(manifestPath)) {
    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch (error) {
      console.warn(`Warning: Could not parse existing manifest, creating new one: ${error.message}`);
    }
  }

  // Update latest version
  manifest.latest = normalizedVersion;

  // Add new version to the list if not already present
  if (!manifest.versions.includes(normalizedVersion)) {
    // Prepend new version (newest first)
    manifest.versions.unshift(normalizedVersion);
  }

  // Sort versions in descending order (newest first)
  manifest.versions.sort((a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA !== numB) {
        return numB - numA; // Descending order
      }
    }
    return 0;
  });

  // Ensure the directory exists
  const dir = path.dirname(manifestPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write updated manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(`Updated versions.json:`);
  console.log(`  Latest: ${manifest.latest}`);
  console.log(`  Versions: ${manifest.versions.join(', ')}`);
}

main();
