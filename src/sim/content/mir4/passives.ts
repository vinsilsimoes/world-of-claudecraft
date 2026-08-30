// Official MIR4 class combat is represented by twelve regular active skills
// plus one Ultimate. The former Aeldrune five-passive layer was inherited from
// the prototype source project and is intentionally kept empty for every class.

import type { Mir4ClassId } from './classes';

export const MIR4_PASSIVE_UNLOCK_LEVELS = [] as const;

export interface Mir4PassiveBonus {
  statusId: number;
  basisPoints: number;
}

export interface Mir4PassiveDef {
  id: string;
  level: number;
  name: string;
  bonuses: readonly Mir4PassiveBonus[];
}

export const MIR4_CLASS_PASSIVES: Readonly<Record<Mir4ClassId, readonly Mir4PassiveDef[]>> = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
};

/** Sum of unlocked bonus bps per status id. Official kits currently have none. */
export function aggregateMir4PassiveBonuses(
  classId: Mir4ClassId,
  level: number,
): Map<number, number> {
  const sums = new Map<number, number>();
  for (const passive of MIR4_CLASS_PASSIVES[classId]) {
    if (passive.level > level) continue;
    for (const bonus of passive.bonuses) {
      sums.set(bonus.statusId, (sums.get(bonus.statusId) ?? 0) + bonus.basisPoints);
    }
  }
  return sums;
}
