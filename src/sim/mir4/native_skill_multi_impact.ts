import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4SkillExecutionDamageAllocation } from './skill_execution_types';

const NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE = 100;

interface Mir4NativeMultiImpactRowExpectation {
  readonly attackId: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  readonly impactCount: number;
}

type Mir4NativeAttackDamageChannel = 'physicalDamage' | 'magicDamage';
type Mir4NativeSkillDamageChannel = 'primaryDamage' | 'secondaryDamage';

interface Mir4NativeMultiImpactAdmission {
  readonly attackDamageChannel: Mir4NativeAttackDamageChannel;
  readonly attackDamageType: 1 | 2;
  readonly policy: Mir4NativeRuntimeMultiImpactPolicy;
  readonly skillDamageChannel: Mir4NativeSkillDamageChannel;
  readonly skillDamageType: 0 | 1;
}

export interface Mir4NativeRuntimeMultiImpactPolicy {
  readonly skillId: number;
  readonly allocationMode: Mir4SkillExecutionDamageAllocation;
  readonly summaryCoefficient: number;
  readonly summaryLevelUpCoefficient: number;
  readonly rowCoefficientScale: number;
  readonly contactCoefficientScaleBasisPoints?: readonly number[];
  readonly rows: readonly Mir4NativeMultiImpactRowExpectation[];
  readonly totalImpactCount: number;
}

const GALE_SLASH_ROWS = Object.freeze([
  Object.freeze({
    attackId: 150101,
    coefficient: 9_000,
    levelUpCoefficient: 180,
    impactCount: 3,
  }),
  Object.freeze({
    attackId: 150102,
    coefficient: 8_000,
    levelUpCoefficient: 160,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 150103,
    coefficient: 8_000,
    levelUpCoefficient: 160,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 150104,
    coefficient: 6_000,
    levelUpCoefficient: 150,
    impactCount: 1,
  }),
  Object.freeze({
    attackId: 150105,
    coefficient: 7_000,
    levelUpCoefficient: 150,
    impactCount: 1,
  }),
]);

const GALE_SLASH_POLICY = Object.freeze({
  skillId: 1501,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 380,
  summaryLevelUpCoefficient: 8,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: GALE_SLASH_ROWS,
  totalImpactCount: 9,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const FLAME_STRIKE_ROWS = Object.freeze([
  Object.freeze({
    attackId: 220102,
    coefficient: 8_000,
    levelUpCoefficient: 180,
    impactCount: 1,
  }),
  Object.freeze({
    attackId: 220103,
    coefficient: 15_000,
    levelUpCoefficient: 320,
    impactCount: 2,
  }),
]);

const FLAME_STRIKE_POLICY = Object.freeze({
  skillId: 2201,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 230,
  summaryLevelUpCoefficient: 5,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: FLAME_STRIKE_ROWS,
  totalImpactCount: 3,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const IMMOLATE_ROWS = Object.freeze([
  Object.freeze({
    attackId: 210301,
    coefficient: 7_000,
    levelUpCoefficient: 140,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 210302,
    coefficient: 7_000,
    levelUpCoefficient: 140,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 210303,
    coefficient: 8_000,
    levelUpCoefficient: 160,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 210304,
    coefficient: 8_000,
    levelUpCoefficient: 160,
    impactCount: 2,
  }),
  Object.freeze({
    attackId: 210305,
    coefficient: 10_000,
    levelUpCoefficient: 200,
    impactCount: 2,
  }),
]);

const IMMOLATE_POLICY = Object.freeze({
  skillId: 2103,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 400,
  summaryLevelUpCoefficient: 8,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: IMMOLATE_ROWS,
  totalImpactCount: 10,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const CHAIN_LIGHTNING_POLICY = Object.freeze({
  skillId: 2303,
  allocationMode: 'per-impact' as const,
  summaryCoefficient: 352,
  summaryLevelUpCoefficient: 6,
  rowCoefficientScale: 50,
  // Compatibility reconstruction between MIR4's sealed 352% first-target and
  // 220% seventh-target endpoints. See native_skill_chain_lightning.ts.
  contactCoefficientScaleBasisPoints: Object.freeze([
    20_000, 18_750, 17_500, 16_250, 15_000, 13_750, 12_500,
  ]),
  rows: Object.freeze([
    Object.freeze({
      attackId: 230301,
      coefficient: 17_600,
      levelUpCoefficient: 300,
      impactCount: 7,
    }),
  ]),
  totalImpactCount: 7,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const SUNBEAM_SWORD_POLICY = Object.freeze({
  skillId: 3101,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 200,
  summaryLevelUpCoefficient: 4,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 310101,
      coefficient: 5_000,
      levelUpCoefficient: 100,
      impactCount: 1,
    }),
    Object.freeze({
      attackId: 310102,
      coefficient: 5_000,
      levelUpCoefficient: 100,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 310103,
      coefficient: 5_000,
      levelUpCoefficient: 100,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 310104,
      coefficient: 5_000,
      levelUpCoefficient: 100,
      impactCount: 2,
    }),
  ]),
  totalImpactCount: 7,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const PIERCING_BLADES_POLICY = Object.freeze({
  skillId: 3103,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 200,
  summaryLevelUpCoefficient: 4,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 310302,
      coefficient: 10_000,
      levelUpCoefficient: 200,
      impactCount: 3,
    }),
    Object.freeze({
      attackId: 310303,
      coefficient: 10_000,
      levelUpCoefficient: 200,
      impactCount: 2,
    }),
  ]),
  totalImpactCount: 5,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const QUICK_SHOT_POLICY = Object.freeze({
  skillId: 4101,
  allocationMode: 'row-total-final-contact' as const,
  // SKILL displays 200% +4% per rank, while the six authoritative
  // SKILL_ATTACK rows sum to 220% +4.4% per rank. The packet capture emits
  // one damage packet per row, on the second timestamp of each arrow pair.
  summaryCoefficient: 200,
  summaryLevelUpCoefficient: 4,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 410101,
      coefficient: 3_300,
      levelUpCoefficient: 66,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 410102,
      coefficient: 3_300,
      levelUpCoefficient: 66,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 410103,
      coefficient: 3_300,
      levelUpCoefficient: 77,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 410104,
      coefficient: 3_300,
      levelUpCoefficient: 77,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 410105,
      coefficient: 4_400,
      levelUpCoefficient: 77,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 410106,
      coefficient: 4_400,
      levelUpCoefficient: 77,
      impactCount: 2,
    }),
  ]),
  totalImpactCount: 12,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

function exactQuickShotPolicy(): Mir4NativeRuntimeMultiImpactPolicy | null {
  const action = mir4NativeSkillActionById(4101);
  if (
    !action ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== QUICK_SHOT_POLICY.summaryCoefficient ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !==
      QUICK_SHOT_POLICY.summaryLevelUpCoefficient ||
    action.nativeBehavior.secondaryDamage.coefficient !== 0 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 0 ||
    action.rows.length !== QUICK_SHOT_POLICY.rows.length
  ) {
    return null;
  }
  const exactRows = action.rows.every((row, index) => {
    const expected = QUICK_SHOT_POLICY.rows[index];
    return (
      expected !== undefined &&
      row.attackId === expected.attackId &&
      row.nativeBehavior.damageType === 1 &&
      row.nativeBehavior.physicalDamage.coefficient === expected.coefficient &&
      row.nativeBehavior.physicalDamage.levelUpCoefficient === expected.levelUpCoefficient &&
      row.nativeBehavior.physicalDamage.additive === 0 &&
      row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
      !channelHasValue(row.nativeBehavior.magicDamage) &&
      row.impactOffsetsMs.length === expected.impactCount
    );
  });
  return exactRows ? QUICK_SHOT_POLICY : null;
}

const SOARING_SLASH_POLICY = Object.freeze({
  skillId: 3203,
  allocationMode: 'row-total-impact-vector' as const,
  // Hybrid source summary: 290% PHYS + 110% Spell, +6%/+2% per rank.
  summaryCoefficient: 400,
  summaryLevelUpCoefficient: 8,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 320301,
      coefficient: 12_000,
      levelUpCoefficient: 260,
      impactCount: 3,
    }),
    Object.freeze({
      attackId: 320302,
      coefficient: 14_000,
      levelUpCoefficient: 270,
      impactCount: 3,
    }),
    Object.freeze({
      attackId: 320303,
      coefficient: 14_000,
      levelUpCoefficient: 270,
      impactCount: 3,
    }),
  ]),
  totalImpactCount: 9,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const RAVAGING_BLOW_POLICY = Object.freeze({
  skillId: 5201,
  allocationMode: 'row-total-impact-vector' as const,
  // Hybrid source summary: 120% PHYS + 160% Spell, +2%/+3% per rank.
  summaryCoefficient: 280,
  summaryLevelUpCoefficient: 5,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 520101,
      coefficient: 10_000,
      levelUpCoefficient: 160,
      impactCount: 3,
    }),
    Object.freeze({
      attackId: 520102,
      coefficient: 9_000,
      levelUpCoefficient: 160,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 520103,
      coefficient: 9_000,
      levelUpCoefficient: 180,
      impactCount: 1,
    }),
  ]),
  totalImpactCount: 6,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const WIND_WALL_POLICY = Object.freeze({
  skillId: 5403,
  allocationMode: 'row-total-impact-vector' as const,
  // Hybrid source summary: 140% PHYS + 80% Spell, +3%/+2% per rank.
  summaryCoefficient: 220,
  summaryLevelUpCoefficient: 5,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 540301,
      coefficient: 5_000,
      levelUpCoefficient: 110,
      impactCount: 1,
    }),
    Object.freeze({
      attackId: 540303,
      coefficient: 5_000,
      levelUpCoefficient: 110,
      impactCount: 2,
    }),
    Object.freeze({
      attackId: 540304,
      coefficient: 6_000,
      levelUpCoefficient: 140,
      impactCount: 1,
    }),
    Object.freeze({
      attackId: 540305,
      coefficient: 6_000,
      levelUpCoefficient: 140,
      impactCount: 1,
    }),
  ]),
  totalImpactCount: 5,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

const CRUSHING_BLOW_POLICY = Object.freeze({
  skillId: 5303,
  allocationMode: 'row-total-impact-vector' as const,
  summaryCoefficient: 240,
  summaryLevelUpCoefficient: 5,
  rowCoefficientScale: NATIVE_ATTACK_TO_SKILL_COEFFICIENT_SCALE,
  rows: Object.freeze([
    Object.freeze({
      attackId: 530302,
      coefficient: 18_000,
      levelUpCoefficient: 350,
      impactCount: 3,
    }),
    Object.freeze({
      attackId: 530303,
      coefficient: 6_000,
      levelUpCoefficient: 150,
      impactCount: 1,
    }),
  ]),
  totalImpactCount: 4,
}) satisfies Mir4NativeRuntimeMultiImpactPolicy;

function exactSoaringSlashHybridPolicy(): Mir4NativeRuntimeMultiImpactPolicy | null {
  const action = mir4NativeSkillActionById(3203);
  if (
    !action ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 290 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 6 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 110 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 2 ||
    action.rows.length !== 3
  ) {
    return null;
  }
  const exactRows = action.rows.every((row, index) => {
    const expected = SOARING_SLASH_POLICY.rows[index];
    return (
      expected !== undefined &&
      row.attackId === expected.attackId &&
      row.nativeBehavior.damageType === 3 &&
      row.nativeBehavior.physicalDamage.coefficient + row.nativeBehavior.magicDamage.coefficient ===
        expected.coefficient &&
      row.nativeBehavior.physicalDamage.levelUpCoefficient +
        row.nativeBehavior.magicDamage.levelUpCoefficient ===
        expected.levelUpCoefficient &&
      row.nativeBehavior.physicalDamage.additive === 0 &&
      row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
      row.nativeBehavior.magicDamage.additive === 0 &&
      row.nativeBehavior.magicDamage.levelUpAdditive === 0 &&
      row.impactOffsetsMs.length === expected.impactCount
    );
  });
  return exactRows ? SOARING_SLASH_POLICY : null;
}

function exactRavagingBlowHybridPolicy(): Mir4NativeRuntimeMultiImpactPolicy | null {
  const action = mir4NativeSkillActionById(5201);
  if (
    !action ||
    action.nativeBehavior.damageType !== 1 ||
    action.nativeBehavior.primaryDamage.coefficient !== 120 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 2 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 160 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 3 ||
    action.rows.length !== 3
  ) {
    return null;
  }
  const exactRows = action.rows.every((row, index) => {
    const expected = RAVAGING_BLOW_POLICY.rows[index];
    return (
      expected !== undefined &&
      row.attackId === expected.attackId &&
      row.nativeBehavior.damageType === 3 &&
      row.nativeBehavior.physicalDamage.coefficient + row.nativeBehavior.magicDamage.coefficient ===
        expected.coefficient &&
      row.nativeBehavior.physicalDamage.levelUpCoefficient +
        row.nativeBehavior.magicDamage.levelUpCoefficient ===
        expected.levelUpCoefficient &&
      row.nativeBehavior.physicalDamage.additive === 0 &&
      row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
      row.nativeBehavior.magicDamage.additive === 0 &&
      row.nativeBehavior.magicDamage.levelUpAdditive === 0 &&
      row.impactOffsetsMs.length === expected.impactCount
    );
  });
  return exactRows ? RAVAGING_BLOW_POLICY : null;
}

function exactWindWallHybridPolicy(): Mir4NativeRuntimeMultiImpactPolicy | null {
  const action = mir4NativeSkillActionById(5403);
  if (
    !action ||
    action.nativeBehavior.damageType !== 1 ||
    action.nativeBehavior.primaryDamage.coefficient !== 140 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 3 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 80 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 2 ||
    action.rows.length !== 5
  ) {
    return null;
  }
  const damageRows = action.rows.filter(
    (row) =>
      channelHasValue(row.nativeBehavior.physicalDamage) ||
      channelHasValue(row.nativeBehavior.magicDamage),
  );
  const exactRows =
    damageRows.length === WIND_WALL_POLICY.rows.length &&
    damageRows.every((row, index) => {
      const expected = WIND_WALL_POLICY.rows[index];
      return (
        expected !== undefined &&
        row.attackId === expected.attackId &&
        row.nativeBehavior.damageType === 3 &&
        row.nativeBehavior.physicalDamage.coefficient +
          row.nativeBehavior.magicDamage.coefficient ===
          expected.coefficient &&
        row.nativeBehavior.physicalDamage.levelUpCoefficient +
          row.nativeBehavior.magicDamage.levelUpCoefficient ===
          expected.levelUpCoefficient &&
        row.nativeBehavior.physicalDamage.additive === 0 &&
        row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
        row.nativeBehavior.magicDamage.additive === 0 &&
        row.nativeBehavior.magicDamage.levelUpAdditive === 0 &&
        row.impactOffsetsMs.length === expected.impactCount
      );
    });
  return exactRows ? WIND_WALL_POLICY : null;
}

const NATIVE_MULTI_IMPACT_ADMISSIONS: readonly Mir4NativeMultiImpactAdmission[] = Object.freeze([
  Object.freeze({
    attackDamageChannel: 'physicalDamage' as const,
    attackDamageType: 1 as const,
    policy: GALE_SLASH_POLICY,
    skillDamageChannel: 'primaryDamage' as const,
    skillDamageType: 1 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'magicDamage' as const,
    attackDamageType: 2 as const,
    policy: FLAME_STRIKE_POLICY,
    skillDamageChannel: 'secondaryDamage' as const,
    skillDamageType: 1 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'magicDamage' as const,
    attackDamageType: 2 as const,
    policy: IMMOLATE_POLICY,
    skillDamageChannel: 'secondaryDamage' as const,
    skillDamageType: 1 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'magicDamage' as const,
    attackDamageType: 2 as const,
    policy: CHAIN_LIGHTNING_POLICY,
    skillDamageChannel: 'secondaryDamage' as const,
    skillDamageType: 1 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'physicalDamage' as const,
    attackDamageType: 1 as const,
    policy: SUNBEAM_SWORD_POLICY,
    skillDamageChannel: 'primaryDamage' as const,
    skillDamageType: 0 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'physicalDamage' as const,
    attackDamageType: 1 as const,
    policy: PIERCING_BLADES_POLICY,
    skillDamageChannel: 'primaryDamage' as const,
    skillDamageType: 0 as const,
  }),
  Object.freeze({
    attackDamageChannel: 'physicalDamage' as const,
    attackDamageType: 1 as const,
    policy: CRUSHING_BLOW_POLICY,
    skillDamageChannel: 'primaryDamage' as const,
    skillDamageType: 1 as const,
  }),
]);

function channelHasValue(channel: {
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
 * Exact damage-allocation rulings for reviewed multi-impact skills.
 *
 * Each admitted SKILL summary is exactly the sum of its damaging SKILL_ATTACK
 * rows at the native 100x scale. A row coefficient therefore belongs to the
 * complete ImpactTime vector authored by that row. Repeating it for every
 * timestamp would multiply the skill beyond both source tables.
 *
 * Other multi-impact skills stay closed until their aggregate/row relationship
 * and live consumer have the same typed ruling.
 */
export function mir4NativeRuntimeMultiImpactPolicy(
  skillId: number,
): Mir4NativeRuntimeMultiImpactPolicy | null {
  if (skillId === 3203) return exactSoaringSlashHybridPolicy();
  if (skillId === 4101) return exactQuickShotPolicy();
  if (skillId === 5201) return exactRavagingBlowHybridPolicy();
  if (skillId === 5403) return exactWindWallHybridPolicy();
  const admission = NATIVE_MULTI_IMPACT_ADMISSIONS.find(
    (candidate) => candidate.policy.skillId === skillId,
  );
  if (!admission) return null;
  const action = mir4NativeSkillActionById(skillId);
  if (action?.nativeBehavior.damageType !== admission.skillDamageType) return null;
  const damageRows = action.rows.filter(
    (row) =>
      row.nativeBehavior.damageType === admission.attackDamageType &&
      channelHasValue(row.nativeBehavior[admission.attackDamageChannel]),
  );
  const summary = action.nativeBehavior[admission.skillDamageChannel];
  const otherSummary =
    admission.skillDamageChannel === 'primaryDamage'
      ? action.nativeBehavior.secondaryDamage
      : action.nativeBehavior.primaryDamage;
  const otherAttackDamageChannel =
    admission.attackDamageChannel === 'physicalDamage' ? 'magicDamage' : 'physicalDamage';
  const exactRows =
    damageRows.length === admission.policy.rows.length &&
    damageRows.every((row, index) => {
      const expected = admission.policy.rows[index];
      const damage = row.nativeBehavior[admission.attackDamageChannel];
      return (
        expected !== undefined &&
        row.attackId === expected.attackId &&
        damage.coefficient === expected.coefficient &&
        damage.levelUpCoefficient === expected.levelUpCoefficient &&
        damage.additive === 0 &&
        damage.levelUpAdditive === 0 &&
        !channelHasValue(row.nativeBehavior[otherAttackDamageChannel]) &&
        row.impactOffsetsMs.length === expected.impactCount
      );
    });
  const rowCoefficient = damageRows.reduce(
    (total, row) => total + row.nativeBehavior[admission.attackDamageChannel].coefficient,
    0,
  );
  const rowLevelUpCoefficient = damageRows.reduce(
    (total, row) => total + row.nativeBehavior[admission.attackDamageChannel].levelUpCoefficient,
    0,
  );
  const totalImpactCount = damageRows.reduce((total, row) => total + row.impactOffsetsMs.length, 0);
  if (
    !exactRows ||
    channelHasValue(otherSummary) ||
    summary.coefficient !== admission.policy.summaryCoefficient ||
    summary.levelUpCoefficient !== admission.policy.summaryLevelUpCoefficient ||
    summary.additive !== 0 ||
    summary.levelUpAdditive !== 0 ||
    rowCoefficient !== summary.coefficient * admission.policy.rowCoefficientScale ||
    rowLevelUpCoefficient !== summary.levelUpCoefficient * admission.policy.rowCoefficientScale ||
    (admission.policy.contactCoefficientScaleBasisPoints !== undefined &&
      admission.policy.contactCoefficientScaleBasisPoints.length !== totalImpactCount) ||
    totalImpactCount !== admission.policy.totalImpactCount
  ) {
    return null;
  }
  return admission.policy;
}
