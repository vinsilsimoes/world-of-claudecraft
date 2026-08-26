// Shared, pure collection-album progression for MIR4 Mounts and Spirits.
// Every authored identity grants exactly one deterministic combat stat once;
// duplicate copies never increase the album bonus.

export const MIR4_ALBUM_STAT_KEYS = [
  'maxHp',
  'maxMana',
  'physicalAttack',
  'magicAttack',
  'physicalDefense',
  'magicDefense',
  'accuracy',
  'dodge',
  'critical',
  'avoidCritical',
  'criticalOutcome',
  'penetrationBps',
  'bossDamageBps',
  'skillDamageBps',
] as const;

export type Mir4AlbumStatKey = (typeof MIR4_ALBUM_STAT_KEYS)[number];
export type Mir4AlbumBonuses = Record<Mir4AlbumStatKey, number>;

export interface Mir4AlbumEntry {
  id: string;
  grade: number;
}

export interface Mir4AlbumAward {
  stat: Mir4AlbumStatKey;
  amount: number;
}

export function emptyMir4AlbumBonuses(): Mir4AlbumBonuses {
  return {
    maxHp: 0,
    maxMana: 0,
    physicalAttack: 0,
    magicAttack: 0,
    physicalDefense: 0,
    magicDefense: 0,
    accuracy: 0,
    dodge: 0,
    critical: 0,
    avoidCritical: 0,
    criticalOutcome: 0,
    penetrationBps: 0,
    bossDamageBps: 0,
    skillDamageBps: 0,
  };
}

function amountFor(stat: Mir4AlbumStatKey, grade: number): number {
  const safeGrade = Math.max(1, Math.min(6, Math.floor(grade)));
  if (stat === 'maxHp') return safeGrade * 25;
  if (stat === 'maxMana') return safeGrade * 10;
  if (
    stat === 'physicalAttack' ||
    stat === 'magicAttack' ||
    stat === 'physicalDefense' ||
    stat === 'magicDefense'
  ) {
    return safeGrade * 2;
  }
  if (stat === 'penetrationBps' || stat === 'bossDamageBps' || stat === 'skillDamageBps') {
    return safeGrade * 10;
  }
  return safeGrade;
}

export function mir4AlbumAwardForIndex(index: number, grade: number): Mir4AlbumAward {
  const stat = MIR4_ALBUM_STAT_KEYS[Math.abs(Math.floor(index)) % MIR4_ALBUM_STAT_KEYS.length];
  if (!stat) throw new Error('MIR4 album stat schedule is empty');
  return { stat, amount: amountFor(stat, grade) };
}

export function mir4AlbumBonuses(
  catalog: readonly Mir4AlbumEntry[],
  discoveredIds: readonly string[] | undefined,
): Mir4AlbumBonuses {
  const result = emptyMir4AlbumBonuses();
  const discovered = new Set(discoveredIds ?? []);
  catalog.forEach((entry, index) => {
    if (!discovered.has(entry.id)) return;
    const award = mir4AlbumAwardForIndex(index, entry.grade);
    result[award.stat] += award.amount;
  });
  return result;
}
