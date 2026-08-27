#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { summarizeWocContentChanges } from './lib/woc_content_intake.mjs';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  return result.stdout.trim();
}

function parseNameStatus(text) {
  if (!text) return [];
  return text.split(/\r?\n/).map((line) => {
    const columns = line.split('\t');
    const status = columns[0] ?? 'M';
    if (status.startsWith('R') || status.startsWith('C')) {
      return { status, oldPath: columns[1] ?? '', path: columns[2] ?? '' };
    }
    return { status, path: columns[1] ?? '' };
  });
}

const args = process.argv.slice(2);
const json = args.includes('--json');
const refs = args.filter((arg) => arg !== '--json');
const baseRef = refs[0] ?? 'origin/main';
const upstreamRef = refs[1] ?? 'upstream/main';

try {
  const mergeBase = git(['merge-base', baseRef, upstreamRef]);
  const changes = parseNameStatus(
    git(['diff', '--name-status', '--find-renames', `${mergeBase}..${upstreamRef}`]),
  );
  const summary = summarizeWocContentChanges(changes);
  if (json) {
    process.stdout.write(
      `${JSON.stringify({ baseRef, upstreamRef, mergeBase, ...summary }, null, 2)}\n`,
    );
  } else {
    console.log(`[woc-content] ${mergeBase}..${upstreamRef}: ${summary.total} changed files`);
    for (const [category, count] of Object.entries(summary.counts)) {
      console.log(`[woc-content] ${category}: ${count}`);
    }
    for (const entry of summary.reviewQueue) {
      console.log(`${entry.category}\t${entry.status}\t${entry.path}`);
    }
  }
} catch (error) {
  console.error(`[woc-content] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
