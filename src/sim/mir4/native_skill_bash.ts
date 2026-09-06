import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { CAST_COMPLETE_EPS } from '../types';
import { mir4NativeStatusBonus } from './effects';
import { mir4StatusRecordValue } from './status_values';

export type Mir4NativeBashSkillId =
  | 1104
  | 1401
  | 1501
  | 1601
  | 2303
  | 3101
  | 3103
  | 3104
  | 3203
  | 4108
  | 4109
  | 5101
  | 5301;
export type Mir4NativeWarriorBashSkillId = Exclude<Mir4NativeBashSkillId, 2303 | 3101 | 3104>;

export interface Mir4NativeBashPolicy {
  readonly skillId: Mir4NativeBashSkillId;
  readonly skillLevel: number;
  readonly passiveId: 101001 | 101002 | 102001 | 103001 | 640811 | 640911;
  readonly requiredDebilitationBuffIds: readonly number[];
  /** Total skill-owned Bash bonus, including MIR4's native +50% baseline. */
  readonly skillBonusBasisPoints: number;
}

export interface Mir4NativeBashResolution {
  readonly triggered: boolean;
  readonly requiredDebilitationBuffIds: readonly number[];
  readonly skillBonusBasisPoints: number;
  readonly attackerBonusBasisPoints: number;
  readonly defenderReductionBasisPoints: number;
  /** Multiplier applied to the contact before the ordinary damage pipeline. */
  readonly damageMultiplierBasisPoints: number;
}

interface BashSkillEvidence {
  readonly passiveId: Mir4NativeBashPolicy['passiveId'];
  readonly requiredDebilitationBuffIds: readonly number[];
  readonly rankBonuses: readonly {
    readonly minimumRank: number;
    readonly bonusBasisPoints: number;
  }[];
  readonly includeWarriorPersistentBonus: boolean;
  readonly includeLancerPersistentBonus?: boolean;
  readonly triggerAttackIds?: readonly number[];
}

/**
 * Sealed MIR4 Warrior Bash contracts.
 *
 * Sources (JevLOMCN mirror of the extracted client tables):
 * - SKILL.json sha256 b3cef975e878aeadfa14d467f730f47a3352be288a27b897640ad5cc07d73026
 * - SKILL_PASSIVE.json sha256 533909cf09d0867adec2cb31d2470179c3a6b29ad24945f36c42997398b08f4e
 * - STRING_TEMPLATE.json skill rows 341114..341144, 341411..341441,
 *   341511..341541 and 341214..341244.
 *
 * IsSmite passives 101001/101002 prove the admitted debilitation. The skill
 * tooltips prove the total +50/+65/+80/+100% and +50/+80/+100/+120% Bash
 * ladders. Status 34 and 35 are the extracted AddSmiteSkillDamage and
 * AddDefSmiteSkillDamage lanes respectively.
 */
const BASH_SKILL_EVIDENCE = new Map<Mir4NativeBashSkillId, BashSkillEvidence>([
  [
    1104,
    {
      passiveId: 101001,
      requiredDebilitationBuffIds: Object.freeze([10010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: true,
    },
  ],
  [
    1401,
    {
      passiveId: 101001,
      requiredDebilitationBuffIds: Object.freeze([10010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: true,
    },
  ],
  [
    1501,
    {
      passiveId: 101002,
      requiredDebilitationBuffIds: Object.freeze([10020, 30010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 10_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 12_000 }),
      ]),
      includeWarriorPersistentBonus: true,
    },
  ],
  [
    1601,
    {
      passiveId: 101002,
      requiredDebilitationBuffIds: Object.freeze([10020, 30010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 10_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 12_000 }),
      ]),
      includeWarriorPersistentBonus: true,
    },
  ],
  [
    2303,
    {
      passiveId: 102001,
      requiredDebilitationBuffIds: Object.freeze([20020]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    3101,
    {
      passiveId: 103001,
      requiredDebilitationBuffIds: Object.freeze([30010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    3103,
    {
      passiveId: 103001,
      requiredDebilitationBuffIds: Object.freeze([30010, 10020, 20020]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    3104,
    {
      passiveId: 101002,
      requiredDebilitationBuffIds: Object.freeze([10020, 20020]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
      triggerAttackIds: Object.freeze([310402]),
    },
  ],
  [
    3203,
    {
      passiveId: 101002,
      requiredDebilitationBuffIds: Object.freeze([10020, 20020]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    4108,
    {
      passiveId: 640811,
      requiredDebilitationBuffIds: Object.freeze([40010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    4109,
    {
      passiveId: 640911,
      requiredDebilitationBuffIds: Object.freeze([40010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
    },
  ],
  [
    5101,
    {
      passiveId: 102001,
      requiredDebilitationBuffIds: Object.freeze([20020, 30010]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
      includeLancerPersistentBonus: true,
    },
  ],
  [
    5301,
    {
      passiveId: 102001,
      requiredDebilitationBuffIds: Object.freeze([20020]),
      rankBonuses: Object.freeze([
        Object.freeze({ minimumRank: 1, bonusBasisPoints: 5_000 }),
        Object.freeze({ minimumRank: 5, bonusBasisPoints: 6_500 }),
        Object.freeze({ minimumRank: 8, bonusBasisPoints: 8_000 }),
        Object.freeze({ minimumRank: 10, bonusBasisPoints: 10_000 }),
      ]),
      includeWarriorPersistentBonus: false,
      includeLancerPersistentBonus: true,
    },
  ],
]);

/** Persistent Bash ATK DMG Boost learned from the two Warrior skill ladders. */
export function mir4NativeWarriorBashPassiveBonusBasisPoints(
  skillLevels: Readonly<Record<number, number>> | undefined,
): number {
  const rank = (skillId: 1104 | 1401): number =>
    Math.max(1, Math.min(10, Math.floor(skillLevels?.[skillId] ?? 1)));
  const splittingSlash = rank(1104);
  const groundSmash = rank(1401);
  const splittingBonus =
    splittingSlash >= 10 ? 2_000 : splittingSlash >= 8 ? 1_500 : splittingSlash >= 5 ? 1_000 : 0;
  const groundBonus =
    groundSmash >= 10 ? 3_000 : groundSmash >= 8 ? 2_000 : groundSmash >= 5 ? 1_000 : 0;
  return splittingBonus + groundBonus;
}

/** Persistent Bash ATK DMG Boost learned from the two Lancer skill ladders. */
export function mir4NativeLancerBashPassiveBonusBasisPoints(
  skillLevels: Readonly<Record<number, number>> | undefined,
): number {
  const rank = (skillId: 5101 | 5301): number =>
    Math.max(1, Math.min(10, Math.floor(skillLevels?.[skillId] ?? 1)));
  const crescentBlade = rank(5101);
  const doubleStrike = rank(5301);
  const crescentBonus = crescentBlade >= 10 ? 2_000 : crescentBlade >= 8 ? 1_500 : 0;
  const doubleStrikeBonus = doubleStrike >= 10 ? 1_500 : doubleStrike >= 8 ? 1_000 : 0;
  return crescentBonus + doubleStrikeBonus;
}

export function mir4NativeBashPolicy(
  skillId: number,
  requestedSkillLevel: number,
): Mir4NativeBashPolicy | null {
  if (!BASH_SKILL_EVIDENCE.has(skillId as Mir4NativeBashSkillId)) return null;
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const evidence = BASH_SKILL_EVIDENCE.get(skillId as Mir4NativeBashSkillId)!;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  let skillBonusBasisPoints = evidence.rankBonuses[0]?.bonusBasisPoints ?? 0;
  for (const rank of evidence.rankBonuses) {
    if (skillLevel >= rank.minimumRank) skillBonusBasisPoints = rank.bonusBasisPoints;
  }
  return Object.freeze({
    skillId: skillId as Mir4NativeBashSkillId,
    skillLevel,
    passiveId: evidence.passiveId,
    requiredDebilitationBuffIds: evidence.requiredDebilitationBuffIds,
    skillBonusBasisPoints,
  });
}

function hasRequiredDebilitation(target: Entity, policy: Mir4NativeBashPolicy): boolean {
  return (target.mir4Effects?.active ?? []).some(
    (effect) =>
      effect.remaining > CAST_COMPLETE_EPS &&
      policy.requiredDebilitationBuffIds.some((buffId) => {
        const prefix = `mir4_native_buff_${buffId}`;
        return effect.effectId === prefix || effect.effectId.startsWith(`${prefix}_`);
      }),
  );
}

/**
 * Resolve the native Bash layer for one contact. Reduction only removes Bash's
 * extra damage; it cannot turn a successful Bash into damage below the same
 * non-Bash contact.
 */
export function mir4NativeBashResolution(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number,
  skillLevel: number,
): Mir4NativeBashResolution {
  const policy = mir4NativeBashPolicy(skillId, skillLevel);
  if (!policy || !hasRequiredDebilitation(target, policy)) {
    return Object.freeze({
      triggered: false,
      requiredDebilitationBuffIds: policy?.requiredDebilitationBuffIds ?? Object.freeze([]),
      skillBonusBasisPoints: policy?.skillBonusBasisPoints ?? 0,
      attackerBonusBasisPoints: 0,
      defenderReductionBasisPoints: 0,
      damageMultiplierBasisPoints: 10_000,
    });
  }

  const sourceSkillLevels = ctx.players.get(source.id)?.mir4SkillLevels;
  const evidence = BASH_SKILL_EVIDENCE.get(policy.skillId);
  // Permanent STATUS values retain the native tenth-of-a-percent unit. The
  // temporary native-status primitive is already normalized to basis points.
  const attackerBonusBasisPoints =
    mir4StatusRecordValue(source.mir4?.statusValues, 34) * 10 +
    mir4NativeStatusBonus(source, 34) +
    (evidence?.includeWarriorPersistentBonus
      ? mir4NativeWarriorBashPassiveBonusBasisPoints(sourceSkillLevels)
      : 0) +
    (evidence?.includeLancerPersistentBonus
      ? mir4NativeLancerBashPassiveBonusBasisPoints(sourceSkillLevels)
      : 0);
  const defenderReductionBasisPoints =
    mir4StatusRecordValue(target.mir4?.statusValues, 35) * 10 +
    mir4NativeStatusBonus(target, 35) +
    (target.mir4Shield?.bashDamageReductionBasisPoints ?? 0);
  const netBonusBasisPoints = Math.max(
    0,
    policy.skillBonusBasisPoints + attackerBonusBasisPoints - defenderReductionBasisPoints,
  );
  return Object.freeze({
    triggered: true,
    requiredDebilitationBuffIds: policy.requiredDebilitationBuffIds,
    skillBonusBasisPoints: policy.skillBonusBasisPoints,
    attackerBonusBasisPoints,
    defenderReductionBasisPoints,
    damageMultiplierBasisPoints: 10_000 + netBonusBasisPoints,
  });
}

export function mir4NativeBashScaledRawDamage(
  ctx: SimContext,
  source: Entity,
  target: Entity,
  skillId: number | undefined,
  skillLevel: number | undefined,
  rawDamage: number,
  attackId?: number,
): number {
  if (skillId === undefined) return Math.max(0, Math.floor(rawDamage));
  const triggerAttackIds = BASH_SKILL_EVIDENCE.get(
    skillId as Mir4NativeBashSkillId,
  )?.triggerAttackIds;
  if (triggerAttackIds && (attackId === undefined || !triggerAttackIds.includes(attackId))) {
    return Math.max(0, Math.floor(rawDamage));
  }
  const resolution = mir4NativeBashResolution(ctx, source, target, skillId, skillLevel ?? 1);
  return Math.max(0, Math.floor((rawDamage * resolution.damageMultiplierBasisPoints) / 10_000));
}
