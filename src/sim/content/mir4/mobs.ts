// Aeldrune's long-term monster balance, projected from the canonical MIR4
// player level table. The imported source formula made monsters cease to be a
// threat as player HP and defense rose: equal-level players survived hundreds
// of hits. The live profile targets readable time-to-kill and one-monster
// potion equilibrium at every level while preserving the source grade shape.
// Classic-engine note: these are classic MobTemplates whose stat NUMBERS come
// from the MIR4 formula, so the shared mob machinery (spawning, aggro, death)
// runs unchanged. The MIR4 swing lane reads their authored damage directly and
// resolves it through the MIR4 hit, critical, and defense pipeline.

import type { MobTemplate } from '../../types';
import { mir4LevelRow } from './class_levels';
import { MIR4_CLASS_COMBAT_SPECS } from './classes';

/** m01's map-level recommendedCombatPower (design contract value). */
export const MIR4_M01_RECOMMENDED_COMBAT_POWER = 2788;

export type Mir4MobGrade = 'normal' | 'veteran' | 'guardian';

const GRADE_HP_MULTIPLIER: Record<Mir4MobGrade, number> = {
  normal: 1,
  veteran: 2.25,
  // Guardian multiplies further by 7 (boss 14); slice mobs stay normal.
  guardian: 7,
};

const GRADE_ATTACK_MULTIPLIER: Record<Mir4MobGrade, number> = {
  normal: 1,
  veteran: 1.35,
  guardian: 1.8,
};

const ROSTER_BASIC_COEFFICIENT = Math.floor(
  Object.values(MIR4_CLASS_COMBAT_SPECS).reduce((sum, spec) => sum + spec.basic.coefficient, 0) /
    Object.keys(MIR4_CLASS_COMBAT_SPECS).length,
);

const PLAYER_LEVEL_COL = {
  maxHp: 3,
  physicalAttack: 5,
  magicAttack: 6,
  physicalDefense: 7,
  accuracy: 9,
} as const;

function campaignLevelStats(level: number): {
  maxHp: number;
  primaryAttack: number;
  physicalDefense: number;
  accuracy: number;
} {
  const admittedLevel = Math.max(1, Math.min(250, Math.floor(level)));
  const row = mir4LevelRow(1, admittedLevel) ?? mir4LevelRow(1, 1);
  if (!row) throw new Error('MIR4 player level table is missing level 1');
  return {
    maxHp: Number(row[PLAYER_LEVEL_COL.maxHp]),
    primaryAttack: Math.max(
      Number(row[PLAYER_LEVEL_COL.physicalAttack]),
      Number(row[PLAYER_LEVEL_COL.magicAttack]),
    ),
    physicalDefense: Number(row[PLAYER_LEVEL_COL.physicalDefense]),
    accuracy: Number(row[PLAYER_LEVEL_COL.accuracy]),
  };
}

/** Same-level monster accuracy keeps its baseline hit chance at 95 percent. */
export function mir4MobAccuracy(level: number): number {
  return campaignLevelStats(level).accuracy;
}

/**
 * Pure live spawn formula. Normal attacks ramp from 6 percent in the tutorial
 * to 8 percent in M02 and 10 percent from M03 onward against the same-level
 * naked campaign row. A single five-percent potion each second can sustain one
 * two-second attacker, while dense pulls still require control or intervention.
 */
export function mir4MobStats(
  level: number,
  grade: Mir4MobGrade = 'normal',
  _recommendedCombatPower = MIR4_M01_RECOMMENDED_COMBAT_POWER,
): { maxHp: number; attack: number } {
  const admittedLevel = Math.max(1, Math.min(250, Math.floor(level)));
  const player = campaignLevelStats(admittedLevel);
  const targetBasicHits = Math.min(14, 5 + Math.floor((admittedLevel - 1) / 20));
  const rosterReferenceBasicDamage = Math.max(
    1,
    Math.floor((player.primaryAttack * ROSTER_BASIC_COEFFICIENT) / 10_000),
  );
  const normalPressureRatio = admittedLevel <= 10 ? 0.06 : admittedLevel <= 20 ? 0.08 : 0.1;
  const desiredLandedDamage = Math.max(
    1,
    Math.round(player.maxHp * normalPressureRatio * GRADE_ATTACK_MULTIPLIER[grade]),
  );
  return {
    maxHp: Math.round(rosterReferenceBasicDamage * targetBasicHits * GRADE_HP_MULTIPLIER[grade]),
    attack: Math.ceil((desiredLandedDamage * (100 + player.physicalDefense)) / 100),
  };
}

export interface Mir4MobTemplateProgression {
  hpBase: number;
  hpPerLevel: number;
  dmgBase: number;
  dmgPerLevel: number;
  statAnchorLevel: number;
}

/**
 * Converts absolute stats at a world level band into the classic template's
 * band anchor. When the template is marked elite, compensate only HP for the
 * shared shell's legacy 2.3x multiplier. MIR4 attacks read the authored damage
 * columns directly, bypassing the shell's weapon-side 1.5x elite multiplier.
 */
export function mir4MobTemplateProgression(
  levelMin: number,
  levelMax: number,
  grade: Mir4MobGrade = 'normal',
  classicEliteScaling = false,
): Mir4MobTemplateProgression {
  const admittedMin = Math.max(1, Math.floor(levelMin));
  const admittedMax = Math.max(admittedMin, Math.floor(levelMax));
  const hpDivisor = classicEliteScaling ? 2.3 : 1;
  const lo = mir4MobStats(admittedMin, grade);
  const hi = mir4MobStats(admittedMax, grade);
  const span = Math.max(1, admittedMax - admittedMin);
  const hpAtMin = lo.maxHp / hpDivisor;
  const hpAtMax = hi.maxHp / hpDivisor;
  const damageAtMin = lo.attack;
  const damageAtMax = hi.attack;
  const hpPerLevel = Math.max(1, Math.round((hpAtMax - hpAtMin) / span));
  const dmgPerLevel = Math.max(1, Math.round((damageAtMax - damageAtMin) / span));
  return {
    hpBase: Math.round(hpAtMin),
    hpPerLevel,
    dmgBase: Math.round(damageAtMin),
    dmgPerLevel,
    statAnchorLevel: admittedMin,
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
    mir4XpReward: 34, // m01 combatXpModel normalXp (was 22: the native catalog value)
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
