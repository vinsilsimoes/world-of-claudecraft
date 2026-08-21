#!/usr/bin/env node

import { auditAssetIsolation } from './lib/mir4_asset_isolation.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/mir4_asset_isolation_audit.mjs --source-root <path>',
    '    --target-root <path> [--target-root <path> ...] [--min-bytes <n>]',
  ].join('\n');
}

function parseArgs(argv) {
  let sourceRoot = '';
  let minBytes = 1;
  const targetRoots = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--source-root' && value) {
      sourceRoot = value;
      index++;
    } else if (arg === '--target-root' && value) {
      targetRoots.push(value);
      index++;
    } else if (arg === '--min-bytes' && value) {
      minBytes = Number(value);
      index++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`unknown or incomplete argument: ${arg}`);
    }
  }
  return { sourceRoot, targetRoots, minBytes };
}

try {
  const result = await auditAssetIsolation(parseArgs(process.argv.slice(2)));
  console.log(
    `asset isolation: source=${result.sourceFiles} target=${result.targetFiles} ` +
      `candidates=${result.comparedCandidates} matches=${result.matches.length}`,
  );
  for (const match of result.matches) {
    console.error(`${match.target} is byte-identical to ${match.source} (${match.bytes} bytes)`);
  }
  process.exitCode = result.matches.length === 0 ? 0 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(usage());
  process.exitCode = 2;
}
