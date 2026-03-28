/**
 * Fast standalone CLI build — only builds src/cli/, NOT the full Electron app.
 * Uses esbuild which is already available as a transitive dependency.
 *
 * Usage:
 *   node scripts/build-cli.mjs
 *   bun run aion:cli
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));

mkdirSync(resolve(root, 'out/main'), { recursive: true });

await build({
  entryPoints: [resolve(root, 'src/cli/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  outfile: resolve(root, 'out/main/cli.js'),
  banner: { js: '#!/usr/bin/env node' },

  // Keep all npm packages external — they live in node_modules and will be
  // resolved at runtime. This keeps the build fast and the output tiny.
  packages: 'external',

  // Resolve TypeScript path aliases (matches tsconfig.json paths)
  alias: {
    '@': resolve(root, 'src'),
    '@process': resolve(root, 'src/process'),
    '@common': resolve(root, 'src/common'),
    '@worker': resolve(root, 'src/process/worker'),
  },

  define: {
    __AION_VERSION__: JSON.stringify(version),
  },

  logLevel: 'info',
});

// Make executable
import { chmodSync } from 'fs';
chmodSync(resolve(root, 'out/main/cli.js'), 0o755);

console.log('\n✓  aion CLI ready → out/main/cli.js');
console.log('   node out/main/cli.js --help\n');
