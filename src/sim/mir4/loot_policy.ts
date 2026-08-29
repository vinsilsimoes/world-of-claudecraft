// Aeldrune loot boundary for reused legacy maps and dungeons.
// A reused mob may keep its model, AI and copper row, but never its classic
// profession reagents, equipment, quest tokens or heroic loot table.

import type { LootEntry } from '../types';

/** Return the only classic-template rewards Aeldrune accepts: currency rows. */
export function mir4AeldruneLootEntries(entries: readonly LootEntry[]): LootEntry[] {
  return entries.flatMap((entry) => {
    if (!entry.copper || entry.copper <= 0) return [];
    return [{ copper: entry.copper, chance: entry.chance }];
  });
}
