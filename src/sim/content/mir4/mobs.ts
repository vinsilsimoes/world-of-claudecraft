// Aeldrune's long-term monster balance, projected from the canonical MIR4
// player level table. The imported source formula made monsters cease to be a
// threat as player HP and defense rose: equal-level players survived hundreds
// of hits. The live profile targets readable time-to-kill and one-monster
// potion equilibrium at every level while preserving the source grade shape.
// Classic-engine note: these are classic MobTemplates whose stat NUMBERS come
// from the MIR4 formula, so the shared mob machinery (spawning, aggro, death)
// runs unchanged. The MIR4 swing lane reads their authored damage directly and
// resolves it through the MIR4 hit, critical, and defense pipeline.

import type { MobFamily, MobTemplate } from '../../types';
import { mir4LevelRow } from './class_levels';
import { MIR4_CLASS_COMBAT_SPECS } from './classes';

/** m01's map-level recommendedCombatPower (design contract value). */
export const MIR4_M01_RECOMMENDED_COMBAT_POWER = 2788;

export type Mir4MobGrade = 'normal' | 'veteran' | 'guardian';

export interface Mir4MobBuildDefenses {
  physicalDefense: number;
  magicDefense: number;
  dodge: number;
  avoidCritical: number;
}

const GRADE_DEFENSE_BPS: Record<Mir4MobGrade, number> = {
  normal: 10_000,
  veteran: 11_500,
  guardian: 14_000,
};

const FAMILY_DEFENSE_BPS: Readonly<
  Record<MobFamily, { physical: number; magic: number; dodge: number }>
> = {
  beast: { physical: 11_000, magic: 9_000, dodge: 13_000 },
  humanoid: { physical: 10_000, magic: 10_000, dodge: 10_000 },
  mudfin: { physical: 10_000, magic: 10_000, dodge: 9_000 },
  spider: { physical: 9_000, magic: 10_500, dodge: 14_000 },
  burrower: { physical: 11_000, magic: 9_000, dodge: 8_000 },
  undead: { physical: 9_000, magic: 11_000, dodge: 8_000 },
  troll: { physical: 12_000, magic: 8_500, dodge: 7_000 },
  ogre: { physical: 12_500, magic: 8_000, dodge: 6_000 },
  elemental: { physical: 8_000, magic: 12_500, dodge: 9_000 },
  dragonkin: { physical: 11_500, magic: 10_500, dodge: 8_000 },
  demon: { physical: 9_000, magic: 12_000, dodge: 10_000 },
  reptile: { physical: 11_000, magic: 9_000, dodge: 12_000 },
};

function admittedMobLevel(level: number): number {
  const parsed = Math.floor(Number(level));
  return Number.isFinite(parsed) ? Math.max(1, Math.min(1_000, parsed)) : 1;
}

function admittedMobStat(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1_000_000_000, parsed)) : 0;
}

/**
 * Shared PvE opposition profile. Flat defense follows a saturating level curve
 * (about 3/25/75/120 at levels 1/10/50/200), while classic WoC armor is
 * converted to the equivalent MIR4 rating at equal level. Families trade
 * Physical, Magic, and Evasion strengths instead of being recolored clones.
 */
export function mir4MobBuildDefenses(
  level: number,
  family: MobFamily = 'humanoid',
  grade: Mir4MobGrade = 'normal',
  classicArmor = 0,
  overrides: Partial<Mir4MobBuildDefenses> = {},
): Mir4MobBuildDefenses {
  const safeLevel = admittedMobLevel(level);
  const profile = FAMILY_DEFENSE_BPS[family] ?? FAMILY_DEFENSE_BPS.humanoid;
  const safeArmor = admittedMobStat(classicArmor) ?? 0;
  const curveDefense = Math.floor((150 * safeLevel) / (safeLevel + 50));
  const physicalBase =
    safeArmor > 0 ? Math.floor((100 * safeArmor) / (85 * safeLevel + 400)) : curveDefense;
  const rankBps = GRADE_DEFENSE_BPS[grade] ?? GRADE_DEFENSE_BPS.normal;
  const precisionK = 120 + (safeLevel - 1) * 8;
  const criticalEvasionK = 140 + (safeLevel - 1) * 10;
  const rankDodgeBps = grade === 'guardian' ? 7_500 : grade === 'veteran' ? 9_000 : 10_000;
  const derived = {
    physicalDefense: Math.floor((physicalBase * rankBps * profile.physical) / 100_000_000),
    // Classic armor is physical-only. Magic always follows the new family
    // curve unless a MIR4-specific template override explicitly replaces it.
    magicDefense: Math.floor((curveDefense * rankBps * profile.magic) / 100_000_000),
    dodge: Math.max(1, Math.floor((precisionK * profile.dodge * rankDodgeBps) / 2_000_000_000)),
    avoidCritical: Math.max(1, Math.floor(criticalEvasionK * 0.035)),
  };
  return {
    physicalDefense: admittedMobStat(overrides.physicalDefense) ?? derived.physicalDefense,
    magicDefense: admittedMobStat(overrides.magicDefense) ?? derived.magicDefense,
    dodge: admittedMobStat(overrides.dodge) ?? derived.dodge,
    avoidCritical: admittedMobStat(overrides.avoidCritical) ?? derived.avoidCritical,
  };
}

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
  const loDefense = mir4MobBuildDefenses(admittedMin, 'humanoid', grade).physicalDefense;
  const hiDefense = mir4MobBuildDefenses(admittedMax, 'humanoid', grade).physicalDefense;
  // HP is authored as a target number of raw basic hits. Normalize it by the
  // new defense layer so adding meaningful defenses does not turn grind mobs
  // into accidental damage sponges.
  const hpAtMin = (lo.maxHp * 100) / (100 + loDefense) / hpDivisor;
  const hpAtMax = (hi.maxHp * 100) / (100 + hiDefense) / hpDivisor;
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
    // The first tutorial target intentionally preserves the exact source
    // damage fixture; later field mobs use the shared opposition profile.
    mir4PhysicalDefense: 0,
    mir4MagicDefense: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 0,
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
