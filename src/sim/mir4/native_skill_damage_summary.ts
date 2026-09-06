import { mir4NativeSkillActionById } from '../content/mir4';
import { mir4NativeGeneratedMechanicalAction } from './native_skill_generated_contract';

const NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE = 100;

type Mir4NativeDamageSummaryRelationship = 'exact-scaled-summary' | 'divergent-source-values';

interface Mir4NativeDamageSummaryExpectation {
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly attackCoefficient: number;
  readonly attackLevelUpCoefficient: number;
  readonly attackIds: readonly number[];
  readonly relationship: Mir4NativeDamageSummaryRelationship;
}

const RUNTIME_DAMAGE_SUMMARY_EXPECTATIONS = new Map<number, Mir4NativeDamageSummaryExpectation>([
  [
    1102,
    Object.freeze({
      coefficient: 250,
      levelUpCoefficient: 5,
      attackCoefficient: 25_000,
      attackLevelUpCoefficient: 500,
      attackIds: Object.freeze([110202, 110203, 110204]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1103,
    Object.freeze({
      coefficient: 280,
      levelUpCoefficient: 6,
      attackCoefficient: 21_000,
      attackLevelUpCoefficient: 450,
      attackIds: Object.freeze([110106, 110107]),
      relationship: 'divergent-source-values' as const,
    }),
  ],
  [
    1104,
    Object.freeze({
      coefficient: 210,
      levelUpCoefficient: 4,
      attackCoefficient: 21_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([110402]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1201,
    Object.freeze({
      coefficient: 220,
      levelUpCoefficient: 4,
      attackCoefficient: 22_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([120101, 120102, 120103]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1304,
    Object.freeze({
      coefficient: 220,
      levelUpCoefficient: 4,
      attackCoefficient: 22_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([130402]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1401,
    Object.freeze({
      coefficient: 250,
      levelUpCoefficient: 5,
      attackCoefficient: 25_000,
      attackLevelUpCoefficient: 500,
      attackIds: Object.freeze([140102]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1501,
    Object.freeze({
      coefficient: 380,
      levelUpCoefficient: 8,
      attackCoefficient: 38_000,
      attackLevelUpCoefficient: 800,
      attackIds: Object.freeze([150101, 150102, 150103, 150104, 150105]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1301,
    Object.freeze({
      damageType: 1,
      coefficient: 252,
      levelUpCoefficient: 5,
      attackCoefficient: 25_200,
      attackLevelUpCoefficient: 500,
      attackIds: Object.freeze([130102]),
      relationship: 'exact-scaled-summary' as const,
      runtimeAuthority: 'skill-attack-rows' as const,
    }),
  ],
  [
    1302,
    Object.freeze({
      damageType: 1,
      coefficient: 130,
      levelUpCoefficient: 3,
      attackCoefficient: 13_000,
      attackLevelUpCoefficient: 300,
      attackIds: Object.freeze([130202, 130203]),
      relationship: 'exact-scaled-summary' as const,
      runtimeAuthority: 'skill-attack-rows' as const,
    }),
  ],
  [
    1601,
    Object.freeze({
      coefficient: 180,
      levelUpCoefficient: 4,
      attackCoefficient: 18_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([160103]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    1502,
    Object.freeze({
      coefficient: 80,
      levelUpCoefficient: 2,
      attackCoefficient: 8_000,
      attackLevelUpCoefficient: 200,
      attackIds: Object.freeze([150202]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    3101,
    Object.freeze({
      coefficient: 200,
      levelUpCoefficient: 4,
      attackCoefficient: 20_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([310101, 310102, 310103, 310104]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
  [
    4101,
    Object.freeze({
      coefficient: 200,
      levelUpCoefficient: 4,
      attackCoefficient: 22_000,
      attackLevelUpCoefficient: 440,
      attackIds: Object.freeze([410101, 410102, 410103, 410104, 410105, 410106]),
      relationship: 'divergent-source-values' as const,
    }),
  ],
  [
    4106,
    Object.freeze({
      coefficient: 170,
      levelUpCoefficient: 4,
      attackCoefficient: 17_000,
      attackLevelUpCoefficient: 400,
      attackIds: Object.freeze([410602]),
      relationship: 'exact-scaled-summary' as const,
    }),
  ],
]);

export interface Mir4NativeRuntimeDamageSummary {
  readonly damageType: 0 | 1;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly attackCoefficient: number;
  readonly attackLevelUpCoefficient: number;
  readonly attackIds: readonly number[];
  readonly relationship: Mir4NativeDamageSummaryRelationship;
  /** Runtime damage is applied exclusively from the individual SKILL_ATTACK rows. */
  readonly runtimeAuthority: 'skill-attack-rows';
}

type NativeSkillSummaryChannel = 'primaryDamage' | 'secondaryDamage';
type NativeAttackDamageChannel = 'physicalDamage' | 'magicDamage';

function coefficientChannelHasValue(channel: {
  readonly additive: number;
  readonly coefficient: number;
  readonly levelUpAdditive: number;
  readonly levelUpCoefficient: number;
}): boolean {
  return (
    channel.coefficient !== 0 ||
    channel.levelUpCoefficient !== 0 ||
    channel.additive !== 0 ||
    channel.levelUpAdditive !== 0
  );
}

/**
 * Preserve the active SKILL damage summary alongside the sum of its matching
 * damaging SKILL_ATTACK rows. Physical summaries use primary/MulDamage;
 * magical summaries use secondary/MagicDamage. The source tables store the
 * action aggregate in percentage points and each contact in basis points.
 * This is evidence, never an extra damage application: live damage continues
 * to come from individual attack rows, matching the recovered native server
 * consumer.
 */
export function mir4NativeRuntimeDamageSummary(
  skillId: number,
): Mir4NativeRuntimeDamageSummary | null {
  const expected = RUNTIME_DAMAGE_SUMMARY_EXPECTATIONS.get(skillId);
  const generatedAction = mir4NativeGeneratedMechanicalAction(skillId);
  if (!expected && !generatedAction) return null;
  const action = generatedAction ?? mir4NativeSkillActionById(skillId);
  if (
    !action ||
    (action.nativeBehavior.damageType !== 1 &&
      !(skillId === 2503 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 3101 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 3103 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 3501 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 3505 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4101 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4102 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4106 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4107 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4108 && action.nativeBehavior.damageType === 0) &&
      !(skillId === 4110 && action.nativeBehavior.damageType === 0))
  ) {
    return null;
  }

  const activeSummaryChannels = (
    [
      {
        attackChannel: 'physicalDamage',
        attackDamageType: 1,
        skillChannel: 'primaryDamage',
      },
      {
        attackChannel: 'magicDamage',
        attackDamageType: 2,
        skillChannel: 'secondaryDamage',
      },
    ] as const satisfies readonly {
      readonly attackChannel: NativeAttackDamageChannel;
      readonly attackDamageType: 1 | 2;
      readonly skillChannel: NativeSkillSummaryChannel;
    }[]
  ).filter((candidate) =>
    coefficientChannelHasValue(action.nativeBehavior[candidate.skillChannel]),
  );
  if (activeSummaryChannels.length !== 1) return null;
  const activeChannel = activeSummaryChannels[0];
  if (!activeChannel) return null;

  const damageRows = action.rows.filter(
    (row) =>
      row.nativeBehavior.damageType === activeChannel.attackDamageType &&
      coefficientChannelHasValue(row.nativeBehavior[activeChannel.attackChannel]),
  );
  const attackCoefficient = damageRows.reduce(
    (total, row) => total + row.nativeBehavior[activeChannel.attackChannel].coefficient,
    0,
  );
  const attackLevelUpCoefficient = damageRows.reduce(
    (total, row) => total + row.nativeBehavior[activeChannel.attackChannel].levelUpCoefficient,
    0,
  );
  const summary = action.nativeBehavior[activeChannel.skillChannel];
  const otherSummary =
    activeChannel.skillChannel === 'primaryDamage'
      ? action.nativeBehavior.secondaryDamage
      : action.nativeBehavior.primaryDamage;
  const otherAttackChannel =
    activeChannel.attackChannel === 'physicalDamage' ? 'magicDamage' : 'physicalDamage';
  const attackIds = damageRows.map((row) => row.attackId);
  const exactScaledSummary =
    summary.coefficient * NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE === attackCoefficient &&
    summary.levelUpCoefficient * NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE ===
      attackLevelUpCoefficient;
  const relationship: Mir4NativeDamageSummaryRelationship = exactScaledSummary
    ? 'exact-scaled-summary'
    : 'divergent-source-values';
  const resolvedExpectation =
    expected ??
    Object.freeze({
      coefficient: summary.coefficient,
      levelUpCoefficient: summary.levelUpCoefficient,
      attackCoefficient,
      attackLevelUpCoefficient,
      attackIds: Object.freeze(attackIds),
      relationship,
    });
  if (
    summary.additive !== 0 ||
    summary.levelUpAdditive !== 0 ||
    coefficientChannelHasValue(otherSummary) ||
    damageRows.some((row) => coefficientChannelHasValue(row.nativeBehavior[otherAttackChannel])) ||
    summary.coefficient !== resolvedExpectation.coefficient ||
    summary.levelUpCoefficient !== resolvedExpectation.levelUpCoefficient ||
    attackCoefficient !== resolvedExpectation.attackCoefficient ||
    attackLevelUpCoefficient !== resolvedExpectation.attackLevelUpCoefficient ||
    relationship !== resolvedExpectation.relationship ||
    attackIds.length !== resolvedExpectation.attackIds.length ||
    attackIds.some((attackId, index) => attackId !== resolvedExpectation.attackIds[index])
  ) {
    return null;
  }
  return Object.freeze({
    damageType: action.nativeBehavior.damageType as 0 | 1,
    coefficient: summary.coefficient,
    levelUpCoefficient: summary.levelUpCoefficient,
    attackCoefficient,
    attackLevelUpCoefficient,
    attackIds: Object.freeze(attackIds),
    relationship,
    runtimeAuthority: 'skill-attack-rows',
  });
}
