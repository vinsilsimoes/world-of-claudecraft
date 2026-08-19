// The mir4-gameplay-port slice mob family, derived from the source project's
// spawn formula (server/mir4-mmo-world-encounters-v1.js definitionFor):
//   maxHp  = round((70 + level * 24 + zoneRecommendedCombatPower * 0.012) * hpMultiplier)
//   attack = round(5 + level * 1.8 + grade * 3)
// with the m01 hunting-zone band (levelMin 1, levelMax 2, normal grade) and
// the map-level recommendedCombatPower 2788 from the m01 design contract. XP
// reward 22 is the native L1 field-mob evidence (MIR4_NATIVE_MONSTER_CATALOG
// Valley Bat, server/game-data.js). The full per-zone xp model lands with the
// Phase 5 world port; do not tune these numbers by hand.
// Classic-engine note: these are classic MobTemplates whose stat NUMBERS come
// from the mir4 formula, so the shared mob machinery (spawning, aggro, death)
// runs unchanged. Mob-side swing resolution still rides the classic formula
// until Phase 3 ports the source monster attack pipeline.

import type { MobTemplate } from '../../types';

/** m01's map-level recommendedCombatPower (design contract value). */
export const MIR4_M01_RECOMMENDED_COMBAT_POWER = 2788;

export type Mir4MobGrade = 'normal' | 'veteran' | 'guardian';

const GRADE_HP_MULTIPLIER: Record<Mir4MobGrade, number> = {
  normal: 1,
  veteran: 2.25,
  // Guardian multiplies further by 7 (boss 14); slice mobs stay normal.
  guardian: 7,
};

const GRADE_RANK: Record<Mir4MobGrade, number> = {
  normal: 0,
  veteran: 1,
  guardian: 2,
};

/** The source spawn formula, pure. rcp defaults to the m01 map value. */
export function mir4MobStats(
  level: number,
  grade: Mir4MobGrade = 'normal',
  recommendedCombatPower = MIR4_M01_RECOMMENDED_COMBAT_POWER,
): { maxHp: number; attack: number } {
  const base = 70 + level * 24 + recommendedCombatPower * 0.012;
  return {
    maxHp: Math.round(base * GRADE_HP_MULTIPLIER[grade]),
    attack: Math.round(5 + level * 1.8 + GRADE_RANK[grade] * 3),
  };
}

function forestWolfTemplate(): MobTemplate {
  const level1 = mir4MobStats(1);
  const level2 = mir4MobStats(2);
  return {
    id: 'mir4_forest_wolf',
    name: 'Lobo do Vau',
    // "Clareira dos Filhotes" (m01-z01): the tutorial band is passive until
    // attacked, so the wolf never aggroes first.
    minLevel: 1,
    maxLevel: 2,
    family: 'beast',
    hpBase: level1.maxHp,
    hpPerLevel: level2.maxHp - level1.maxHp,
    dmgBase: level1.attack,
    dmgPerLevel: level2.attack - level1.attack,
    attackSpeed: 2,
    armorPerLevel: 0,
    moveSpeed: 3.5,
    aggroRadius: 0,
    mir4XpReward: 22,
    loot: [{ copper: 2, chance: 1 }],
    scale: 1,
    color: 0x8a7a66,
  } satisfies MobTemplate;
}

/** The slice's mir4 mob templates, keyed like MOBS for camp lookups. */
export const MIR4_MOBS: Record<string, MobTemplate> = {
  mir4_forest_wolf: forestWolfTemplate(),
};

/** The profile's flat kill XP for a template id (0 when unmapped). */
export function mir4KillXpReward(templateId: string): number {
  return MIR4_MOBS[templateId]?.mir4XpReward ?? 0;
}
