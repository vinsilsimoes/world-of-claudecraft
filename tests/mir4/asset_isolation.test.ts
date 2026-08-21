import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cssTreeUnder } from '../helpers/css_tree_under';
import { expectScansOnlyThroughSharedWalkers } from '../helpers/scan_guard_self_audit';
import { sourceFilesUnder } from '../helpers/source_files_under';

const ROOT = path.resolve(import.meta.dirname, '../..');

const FORBIDDEN = [
  /F:\\Dev\\Survival-Game\\assets/i,
  /Survival-Game[\\/]assets/i,
  /epic-rpg-world/i,
  /PixelCrawler Assets/i,
  /Novos Assets/i,
  /assets[\\/](?:lpc|pixelcrawler|tilesets|vfx)[\\/]/i,
  /\.tmx\b/i,
  /tile[-_ ]?(?:map|set)/i,
] as const;

const RUNTIME_PREFIXES = [
  'src/',
  'server/',
  'headless/',
  'scripts/',
  'electron/',
  'android/',
  'ios/',
  'bot/',
  'public/',
] as const;
const ROOT_RUNTIME_FILES = new Set([
  'index.html',
  'play.html',
  'admin.html',
  'editor.html',
  'guide.html',
  'music_editor.html',
  'wallet-handoff.html',
  'capacitor.config.ts',
  'vite.config.ts',
  'svelte.config.js',
]);
const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.html',
  '.json',
  '.xml',
  '.gradle',
  '.kt',
  '.java',
  '.swift',
]);

function gitPublicFiles(args: readonly string[]): string[] {
  return execFileSync('git', [...args, '-z', '--', 'public'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean);
}

function gitRuntimeTextFiles(args: readonly string[]): string[] {
  return execFileSync('git', [...args, '-z'], { cwd: ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .map((file) => file.replaceAll('\\', '/'))
    .filter(
      (file) =>
        (ROOT_RUNTIME_FILES.has(file) ||
          RUNTIME_PREFIXES.some((prefix) => file.startsWith(prefix))) &&
        TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()),
    );
}

describe('MIR4 asset isolation', () => {
  it('keeps MIR4 content inside existing WoC roots instead of a parallel panel shell', () => {
    const entryText = ['index.html', 'play.html']
      .map((file) => readFileSync(path.join(ROOT, file), 'utf8'))
      .join('\n');
    expect(entryText).not.toMatch(/id=["'][^"']*mir4[^"']*["']/i);
    expect(readFileSync(path.join(ROOT, 'src/main.ts'), 'utf8')).not.toContain('mir4_slice_input');
    expect(existsSync(path.join(ROOT, 'src/game/mir4_slice_input.ts'))).toBe(false);
  });

  it('keeps source-project 2D assets and authoring outputs out of every runtime surface', () => {
    expectScansOnlyThroughSharedWalkers(import.meta.url, ['source_files_under', 'css_tree_under']);
    const sourceFiles = [
      ...sourceFilesUnder(path.join(ROOT, 'src')),
      ...sourceFilesUnder(path.join(ROOT, 'server')),
      ...sourceFilesUnder(path.join(ROOT, 'headless')),
    ];
    const styleFiles = cssTreeUnder(path.join(ROOT, 'src/styles')).files;
    const entryFiles = ['index.html', 'play.html'].map((file) => ({
      file,
      full: path.join(ROOT, file),
    }));
    expect(sourceFiles.length).toBeGreaterThan(1_000);
    expect(styleFiles.length).toBeGreaterThanOrEqual(10);

    const violations: string[] = [];
    for (const file of [...sourceFiles, ...styleFiles, ...entryFiles]) {
      const text = readFileSync(file.full, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) violations.push(`${file.file}: ${pattern.source}`);
      }
    }
    // Git-backed sweep closes the surfaces outside src/server/headless: native
    // shells, scripts, every entry HTML and text delivered directly from
    // public. It includes untracked files, which is where an accidental asset
    // intake or temporary source reference most often appears during a port.
    const runtimeTextFiles = [
      ...gitRuntimeTextFiles(['ls-files']),
      ...gitRuntimeTextFiles(['ls-files', '--others', '--exclude-standard']),
    ];
    expect(runtimeTextFiles.length).toBeGreaterThan(1_000);
    for (const file of runtimeTextFiles) {
      const full = path.join(ROOT, file);
      // `git ls-files` includes a tracked path deleted by the current diff;
      // there is no runtime payload left to inspect in that case.
      if (!existsSync(full)) continue;
      const text = readFileSync(full, 'utf8');
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) violations.push(`${file}: ${pattern.source}`);
      }
    }
    const publicFiles = [
      ...gitPublicFiles(['ls-files']),
      ...gitPublicFiles(['ls-files', '--others', '--exclude-standard']),
    ];
    expect(publicFiles.length).toBeGreaterThan(100);
    for (const file of publicFiles) {
      for (const pattern of FORBIDDEN) {
        if (pattern.test(file)) violations.push(`${file}: ${pattern.source}`);
      }
    }
    expect(violations, 'MIR4 may adapt semantics, never source 2D presentation assets').toEqual([]);
  });
});
