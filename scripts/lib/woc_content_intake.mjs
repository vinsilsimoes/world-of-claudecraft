const CATEGORY_PRIORITY = Object.freeze([
  'gameplay-blocked',
  'manual-review',
  'dungeon-adaptation',
  'world-adaptation',
  'engine-review',
  'asset-candidate',
  'unrelated',
]);

const ASSET_EXTENSION = /\.(?:glb|gltf|bin|ktx2|webp|png|jpe?g|hdr|mp3|ogg|wav)$/i;
const ASSET_ROOT = /^(?:public\/(?:models|textures|env|map_bg|audio|ui)|data\/)/;
const DUNGEON_PATH =
  /(?:^|\/)(?:dungeons?|dungeon_[^/]*|[^/]*_dungeon|instances\/dungeons|encounters\/nythraxis)(?:\.|\/|$)/;
const BLOCKED_GAMEPLAY_PATH =
  /^(?:server\/|headless\/|src\/sim\/(?:combat|mob|progression|quests|loot|items|entity|respawn_policy)|src\/sim\/content\/(?:classes|items|quests|recipes|loot|dungeon_difficulty|heroic_|talent|spec_|mounts|deeds|reliquary))/;
const WORLD_CONTENT_PATH = /^src\/sim\/content\/(?!mir4\/)[^/]+\.ts$/;
const WORLD_RENDER_PATH =
  /^src\/render\/(?:.*(?:terrain|foliage|water|world|town|harbor|shore|sky|props?|gates?|roads?|weather).*)\.ts$/;
const ENGINE_REVIEW_PATH =
  /^(?:src\/render\/|scripts\/(?:assets|build_media_manifest)|src\/sim\/(?:world|colliders|pathfind)\.ts)/;

function normalizedPath(path) {
  return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

function baseClassification(path) {
  if (DUNGEON_PATH.test(path)) {
    return {
      category: 'dungeon-adaptation',
      reason:
        'Dungeon layouts and visuals require explicit Aeldrune admission, tuning, and rewards.',
    };
  }
  if (ASSET_ROOT.test(path) && ASSET_EXTENSION.test(path)) {
    return {
      category: 'asset-candidate',
      reason: 'Binary content may be imported after provenance, load, budget, and visual review.',
    };
  }
  if (BLOCKED_GAMEPLAY_PATH.test(path)) {
    return {
      category: 'gameplay-blocked',
      reason: 'Gameplay authority stays in Aeldrune and cannot be copied from WoC automatically.',
    };
  }
  if (WORLD_CONTENT_PATH.test(path) || WORLD_RENDER_PATH.test(path)) {
    return {
      category: 'world-adaptation',
      reason: 'Map content must pass through the WoC geometry and Aeldrune gameplay adapter.',
    };
  }
  if (ENGINE_REVIEW_PATH.test(path)) {
    return {
      category: 'engine-review',
      reason: 'Runtime support may be required by content but can affect every profile.',
    };
  }
  return { category: 'unrelated', reason: 'Outside the map, dungeon, and asset intake scope.' };
}

export function classifyWocContentChange(change) {
  const path = normalizedPath(change.path);
  const status = String(change.status || 'M').toUpperCase();
  const classified = baseClassification(path);
  if (status.startsWith('D') || status.startsWith('R') || status.startsWith('C')) {
    return {
      ...change,
      path,
      oldPath: change.oldPath ? normalizedPath(change.oldPath) : undefined,
      category: 'manual-review',
      previousCategory: classified.category,
      reason: 'Deletion, rename, and copy changes require save-id and provenance review.',
    };
  }
  return { ...change, path, ...classified };
}

export function summarizeWocContentChanges(changes) {
  const entries = changes.map(classifyWocContentChange);
  const counts = Object.fromEntries(CATEGORY_PRIORITY.map((category) => [category, 0]));
  for (const entry of entries) counts[entry.category] += 1;
  const priority = new Map(CATEGORY_PRIORITY.map((category, index) => [category, index]));
  const reviewQueue = entries
    .filter((entry) => entry.category !== 'unrelated')
    .sort(
      (left, right) =>
        priority.get(left.category) - priority.get(right.category) ||
        left.path.localeCompare(right.path),
    );
  return { total: entries.length, counts, reviewQueue, entries };
}
