import { readFileSync } from 'node:fs';
import { parseCLI, startVitest } from 'vitest/node';
import { parseVitestArgvManifest } from './lib/vitest_argv_manifest.mjs';

const manifestPath = process.argv[2];
if (!manifestPath || process.argv.length !== 3) {
  console.error('usage: node scripts/vitest_from_argv_manifest.mjs <manifest.json>');
  process.exitCode = 1;
} else {
  try {
    const args = parseVitestArgvManifest(readFileSync(manifestPath, 'utf8'));
    const parsed = parseCLI(['vitest', ...args]);
    await startVitest('test', parsed.filter, parsed.options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
