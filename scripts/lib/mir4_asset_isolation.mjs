import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

function normalize(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function contains(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

async function filesUnder(root) {
  const rootReal = await realpath(root);
  const visited = new Set([rootReal]);
  const files = [];

  async function walk(directory, prefix) {
    const entries = (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const resolved = entry.isSymbolicLink() ? await realpath(absolute) : absolute;
      if (!contains(rootReal, resolved)) {
        throw new Error(`${absolute} resolves outside the audited root ${rootReal}`);
      }
      const info = await stat(resolved);
      const relative = `${prefix}${entry.name}`;
      if (info.isDirectory()) {
        const directoryReal = await realpath(resolved);
        if (visited.has(directoryReal)) continue;
        visited.add(directoryReal);
        await walk(resolved, `${relative}/`);
      } else if (info.isFile()) {
        files.push({ absolute: resolved, relative: normalize(relative), size: info.size });
      }
    }
  }

  await walk(rootReal, '');
  return files;
}

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const input = createReadStream(file);
    input.on('error', reject);
    input.on('data', (chunk) => hash.update(chunk));
    input.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Compare source and target files by bytes, independent of file name or extension.
 * Only equal-size candidates are hashed, which keeps a full source-pack audit bounded.
 */
export async function auditAssetIsolation({ sourceRoot, targetRoots, minBytes = 1 }) {
  if (!sourceRoot) throw new Error('sourceRoot is required');
  if (!Array.isArray(targetRoots) || targetRoots.length === 0) {
    throw new Error('at least one targetRoot is required');
  }
  if (!Number.isSafeInteger(minBytes) || minBytes < 1) {
    throw new Error('minBytes must be a positive safe integer');
  }

  const sourceFiles = await filesUnder(sourceRoot);
  const targetGroups = await Promise.all(
    targetRoots.map(async (root) => ({
      label: path.basename(path.resolve(root)),
      files: await filesUnder(root),
    })),
  );
  const sourceSizes = new Set(
    sourceFiles.filter((file) => file.size >= minBytes).map((file) => file.size),
  );
  const targetBySize = new Map();
  let targetFileCount = 0;
  for (const group of targetGroups) {
    targetFileCount += group.files.length;
    for (const file of group.files) {
      if (file.size < minBytes || !sourceSizes.has(file.size)) continue;
      const entries = targetBySize.get(file.size) ?? [];
      entries.push({ ...file, label: `${group.label}/${file.relative}` });
      targetBySize.set(file.size, entries);
    }
  }

  const targetByHash = new Map();
  for (const entries of targetBySize.values()) {
    for (const file of entries) {
      const digest = await sha256(file.absolute);
      const matches = targetByHash.get(digest) ?? [];
      matches.push(file);
      targetByHash.set(digest, matches);
    }
  }

  const matches = [];
  let comparedCandidates = 0;
  for (const source of sourceFiles) {
    if (source.size < minBytes || !targetBySize.has(source.size)) continue;
    comparedCandidates++;
    const digest = await sha256(source.absolute);
    for (const target of targetByHash.get(digest) ?? []) {
      matches.push({ source: source.relative, target: target.label, bytes: source.size });
    }
  }
  matches.sort((a, b) =>
    a.source === b.source
      ? a.target < b.target
        ? -1
        : a.target > b.target
          ? 1
          : 0
      : a.source < b.source
        ? -1
        : 1,
  );

  return {
    sourceFiles: sourceFiles.length,
    targetFiles: targetFileCount,
    comparedCandidates,
    matches,
  };
}
