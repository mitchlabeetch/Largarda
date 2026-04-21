#!/usr/bin/env node

/**
 * Check for missing index.md files in documentation directories
 * This script scans the docs/ directory and reports directories that lack index.md
 */

const fs = require('fs');
const path = require('path');

// Directories that should have index.md files
const REQUIRED_INDEX_DIRS = [
  'docs/api-reference',
  'docs/architecture',
  'docs/conventions',
  'docs/data-flows',
  'docs/domain',
  'docs/domain/ma',
  'docs/domain/agents',
  'docs/examples',
  'docs/features',
  'docs/onboarding',
  'docs/performance',
  'docs/skills',
  'docs/troubleshooting',
  'src/common/adapter',
  'src/common/api',
  'src/common/chat',
  'src/process/agent',
  'src/process/bridge',
  'src/process/channels',
  'src/process/services',
  'src/renderer/components',
  'src/renderer/hooks',
];

/**
 * Check if a directory exists and has an index.md file
 */
function hasIndexFile(dirPath) {
  const indexPath = path.join(dirPath, 'index.md');
  return fs.existsSync(indexPath);
}

/**
 * Scan a directory and check for index.md
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return { exists: false, hasIndex: false };
  }

  return {
    exists: true,
    hasIndex: hasIndexFile(dirPath),
  };
}

/**
 * Main function
 */
function main() {
  const rootDir = path.resolve(__dirname, '..');
  const results = [];
  let missingCount = 0;
  let notFoundCount = 0;

  console.log('Checking for missing index.md files...\n');

  for (const dir of REQUIRED_INDEX_DIRS) {
    const fullPath = path.join(rootDir, dir);
    const result = scanDirectory(fullPath);

    if (!result.exists) {
      console.log(`⚠️  ${dir} - Directory does not exist`);
      notFoundCount++;
    } else if (!result.hasIndex) {
      console.log(`❌ ${dir} - Missing index.md`);
      missingCount++;
      results.push(dir);
    } else {
      console.log(`✅ ${dir} - Has index.md`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total directories checked: ${REQUIRED_INDEX_DIRS.length}`);
  console.log(`Directories with index.md: ${REQUIRED_INDEX_DIRS.length - missingCount - notFoundCount}`);
  console.log(`Missing index.md: ${missingCount}`);
  console.log(`Directories not found: ${notFoundCount}`);

  if (missingCount > 0) {
    console.log('\n--- Directories needing index.md ---');
    results.forEach((dir) => console.log(`  - ${dir}`));
    process.exit(1);
  } else {
    console.log('\n✅ All required directories have index.md files');
    process.exit(0);
  }
}

// Run the script
main();
