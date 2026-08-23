// Reconstruct the server's delta-compressed world snapshots for standalone
// multiplayer probes. Heavy self fields are omitted when unchanged, while
// entity identity rides only the first/full record and `keep` preserves an
// entity that did not change at all.

const DELTA_SELF_KEYS = [
  'xp',
  'copper',
  'inv',
  'equip',
  'qlog',
  'qdone',
  'cds',
  'stats',
  'weapon',
  'mir4',
  'party',
  'trade',
  'duel',
];

const ENTITY_IDENTITY_KEYS = ['k', 'tid', 'nm', 'lv', 'sc', 'c', 'dgn'];

export function mergeSelfSnapshot(previous, delta) {
  const next = { ...delta };
  if (previous) {
    for (const key of DELTA_SELF_KEYS) {
      if (!(key in next) && key in previous) next[key] = previous[key];
    }
  }
  return next;
}

export function mergeEntitySnapshot(previousEntities, snapshot) {
  const next = new Map();
  for (const wire of snapshot.ents) {
    const entity = { ...wire };
    const previous = previousEntities.get(entity.id);
    if (previous && entity.k === undefined) {
      for (const key of ENTITY_IDENTITY_KEYS) {
        if (key in previous) entity[key] = previous[key];
      }
    }
    next.set(entity.id, entity);
  }
  for (const id of snapshot.keep ?? []) {
    const previous = previousEntities.get(id);
    if (previous) next.set(id, previous);
  }
  return next;
}
