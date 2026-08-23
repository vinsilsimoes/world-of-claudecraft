import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditAssetIsolation } from '../scripts/lib/mir4_asset_isolation.mjs';

const temporaryRoots: string[] = [];

function temporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'woc-mir4-asset-isolation-'));
  temporaryRoots.push(root);
  return root;
}

function write(root: string, relativePath: string, bytes: Uint8Array): void {
  const full = path.join(root, relativePath);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, bytes);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('MIR4 byte-level asset isolation audit', () => {
  it('detects a source asset copied under a different target name and directory', async () => {
    const root = temporaryRoot();
    const source = path.join(root, 'source');
    const target = path.join(root, 'target');
    const copiedBytes = new Uint8Array(256).map((_, index) => (index * 29) % 251);
    write(source, 'tiles/grass.png', copiedBytes);
    write(target, 'models/renamed_texture.webp', copiedBytes);

    const result = await auditAssetIsolation({ sourceRoot: source, targetRoots: [target] });

    expect(result).toMatchObject({ sourceFiles: 1, targetFiles: 1, comparedCandidates: 1 });
    expect(result.matches).toEqual([
      {
        source: 'tiles/grass.png',
        target: 'target/models/renamed_texture.webp',
        bytes: copiedBytes.byteLength,
      },
    ]);
  });

  it('does not confuse equal-size assets whose bytes differ', async () => {
    const root = temporaryRoot();
    const source = path.join(root, 'source');
    const publicRoot = path.join(root, 'public');
    const nativeRoot = path.join(root, 'native');
    write(source, 'pack/portrait.png', new Uint8Array(128).fill(7));
    write(publicRoot, 'ui/portrait.webp', new Uint8Array(128).fill(8));
    write(nativeRoot, 'icons/app.png', new Uint8Array(129).fill(7));

    const result = await auditAssetIsolation({
      sourceRoot: source,
      targetRoots: [nativeRoot, publicRoot],
    });

    expect(result.matches).toEqual([]);
    expect(result.targetFiles).toBe(2);
    expect(result.comparedCandidates).toBe(1);
  });

  it('makes the release command fail closed when a copied asset is found', () => {
    const root = temporaryRoot();
    const source = path.join(root, 'source');
    const target = path.join(root, 'target');
    const copiedBytes = new Uint8Array(64).fill(19);
    write(source, 'original.bin', copiedBytes);
    write(target, 'renamed.bin', copiedBytes);

    const run = spawnSync(
      process.execPath,
      [
        path.resolve('scripts/mir4_asset_isolation_audit.mjs'),
        '--source-root',
        source,
        '--target-root',
        target,
      ],
      { encoding: 'utf8' },
    );

    expect(run.status).toBe(1);
    expect(run.stdout).toContain('matches=1');
    expect(run.stderr).toContain('target/renamed.bin is byte-identical to original.bin');
  });
});
