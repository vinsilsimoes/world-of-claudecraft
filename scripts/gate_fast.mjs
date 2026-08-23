// Day-loop / agent fast path (Phase 3 local-gate-perf).
// High-signal subset: malware, biome changed, architecture + localization
// guards, incremental check:ts, and vitest related to changed sources/tests.
//
// NOT a merge contract. Full pre-merge bar is always `npm run gate`
// (scripts/gate.mjs): generate-once i18n/wiki, freshness, sfx, full unsharded
// vitest, browser, full types, env/server/client builds. Do not document this
// script as a substitute for that bar.
//
// Cross-platform: same win32 shell spawn pattern as gate.mjs. Worker count uses
// computeGateWorkers (available-memory clamp kept; the sensor is lib/gate_memory.mjs, which
// reads vm_stat on darwin because os.freemem() under-reports there). Optional
// GATE_WORKER_TIER=low|medium|high
// caps workers after the clamp; GATE_MAX_WORKERS is the expert absolute override.
//
// Vitest day-loop uses `vitest related` on changed code paths (and explicit
// changed test files). package.json / vite config dirtiness is intentionally
// NOT expanded via --changed (that re-runs nearly the full suite). Opt in to
// branch-wide --changed with GATE_FAST_BASE=<ref>.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildDayLoopVitestPlan,
  buildGuardVitestArgs,
  classifyChangedPaths,
  GATE_FAST_STEP_NAMES,
  resolveFastChangedBase,
} from './lib/gate_fast_plan.mjs';
import { resolveAvailableMemoryBytes } from './lib/gate_memory.mjs';
import {
  computeGateWorkers,
  parseGateWorkerTier,
  resolveGateWorkerTierCap,
} from './lib/gate_workers.mjs';
import { serializeVitestArgvManifest } from './lib/vitest_argv_manifest.mjs';

// npm/npx resolve to .cmd files on Windows, which spawnSync only finds via a shell.
const shell = process.platform === 'win32';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitestManifestRunner = path.join(repoRoot, 'scripts', 'vitest_from_argv_manifest.mjs');

// Resolve the vitest binary directly instead of going through `npx --no-install
// vitest`: npx still pays a real per-invocation startup cost even when it skips
// the install check, and this file spawns vitest at both call sites below.
const vitestBin = path.join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vitest.cmd' : 'vitest',
);

const tierRaw = process.env.GATE_WORKER_TIER;
const tier = parseGateWorkerTier(tierRaw);
const tierCap = resolveGateWorkerTierCap(tierRaw);
const workers = computeGateWorkers({
  cpuCount: os.availableParallelism(),
  // See lib/gate_memory.mjs: os.freemem() under-reports availability on macOS and used to
  // pin this day-loop path to a single worker too.
  freeMemBytes: resolveAvailableMemoryBytes({
    platform: process.platform,
    freeMemBytes: os.freemem(),
  }),
  envOverride: process.env.GATE_MAX_WORKERS,
  tierCap,
});

const changedBase = resolveFastChangedBase({
  envBase: process.env.GATE_FAST_BASE,
});
const changedPaths = listChangedPaths();
const classified = classifyChangedPaths(changedPaths);
const vitestPlan = buildDayLoopVitestPlan({
  workers,
  changedBase,
  testFiles: classified.testFiles,
  relatedSources: classified.relatedSources,
});

const guardArgs = buildGuardVitestArgs({ workers });
let vitestManifest = null;

/** @type {Array<[string, string, string[]]>} */
const steps = [
  ['malware scan', 'npm', ['run', 'security:gate']],
  ['biome (changed files)', 'npm', ['run', 'ci:changed']],
  ['guard tests (architecture + localization)', vitestBin, [...guardArgs]],
  ['typecheck (check:ts incremental)', 'npm', ['run', 'check:ts']],
];

if (vitestPlan.mode !== 'skip' && vitestPlan.args) {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'woc-gate-fast-'));
  const manifestPath = path.join(tempDir, 'vitest-argv.json');
  writeFileSync(manifestPath, serializeVitestArgvManifest(vitestPlan.args), 'utf8');
  vitestManifest = { tempDir, manifestPath };
  steps.push([
    'vitest (related / changed tests)',
    process.execPath,
    [vitestManifestRunner, manifestPath],
  ]);
}

console.log('[gate:fast] day-loop path (NOT the merge bar; use `npm run gate` before merge)');
console.log(
  `[gate:fast] workers=${workers}` +
    (process.env.GATE_MAX_WORKERS
      ? ` (GATE_MAX_WORKERS=${process.env.GATE_MAX_WORKERS})`
      : tier
        ? ` (GATE_WORKER_TIER=${tier} cap=${tierCap})`
        : ' (default CPU/2 + free-mem clamp)'),
);
console.log(
  `[gate:fast] vitest plan: mode=${vitestPlan.mode}` +
    (vitestPlan.reason ? ` (${vitestPlan.reason})` : '') +
    (classified.relatedSources.length ? `; sources=${classified.relatedSources.length}` : '') +
    (classified.testFiles.length ? `; tests=${classified.testFiles.length}` : '') +
    (classified.broadConfigs.length
      ? `; broad-config-skipped=${classified.broadConfigs.join(',')}`
      : ''),
);
console.log(`[gate:fast] steps: ${steps.map(([name]) => name).join(' -> ')}`);
if (vitestPlan.mode === 'skip') {
  console.log(`[gate:fast] note: ${vitestPlan.reason}`);
  console.log(
    `[gate:fast] documented steps still include "${GATE_FAST_STEP_NAMES[4]}" when code/tests change`,
  );
}

let failure = null;
try {
  for (const [name, cmd, args] of steps) {
    console.log(`\n[gate:fast] ${name}: ${cmd} ${args.join(' ')}`);
    const stepShell = shell && (cmd === 'npm' || cmd.toLowerCase().endsWith('.cmd'));
    const res = spawnSync(cmd, args, { stdio: 'inherit', env: process.env, shell: stepShell });
    if (res.status !== 0) {
      failure = { name, exitCode: res.status ?? 1 };
      break;
    }
  }
} finally {
  cleanupVitestManifest();
}

if (failure) {
  console.error(`\n[gate:fast] FAIL at "${failure.name}" (exit ${failure.exitCode})`);
  console.error(
    '[gate:fast] hint: this path is for day-to-day only. Before merge or "done", run `npm run gate`.',
  );
  process.exitCode = failure.exitCode;
} else {
  console.log(
    `\n[gate:fast] PASS: ${steps.length} day-loop steps green (vitest workers: ${workers})`,
  );
  console.log(
    '[gate:fast] merge contract is still `npm run gate` (full suite + builds + freshness).',
  );
}

function cleanupVitestManifest() {
  if (!vitestManifest) return;
  try {
    unlinkSync(vitestManifest.manifestPath);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  try {
    rmdirSync(vitestManifest.tempDir);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}

/**
 * Working-tree changes: unstaged, staged, and untracked (not ignored).
 * @returns {string[]}
 */
function listChangedPaths() {
  const out = new Set();
  // Unstaged + staged names.
  const diff = spawnSync('git', ['diff', '--name-only', 'HEAD'], {
    encoding: 'utf8',
    shell,
  });
  if (diff.status === 0 && diff.stdout) {
    for (const line of diff.stdout.split('\n')) {
      const t = line.trim();
      if (t) out.add(t);
    }
  }
  // Untracked (exclude ignored).
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
    shell,
  });
  if (untracked.status === 0 && untracked.stdout) {
    for (const line of untracked.stdout.split('\n')) {
      const t = line.trim();
      if (t) out.add(t);
    }
  }
  return [...out];
}
