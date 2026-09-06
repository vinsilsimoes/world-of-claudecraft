import type { Mir4ClassId } from '../content/mir4/classes';
import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';
import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { applyMir4Effect } from './effects';
import { applyMir4NativeArbalistFocus } from './native_skill_quick_shot';
import {
  type Mir4NativeTotemRuntimePlan,
  mir4NativeRuntimeTotemPlan,
} from './native_skill_totem_runtime';
import { compileMir4NativeArbalistUltimatePlan } from './native_ultimate_arbalist';
import { compileMir4NativeLancerUltimatePlan } from './native_ultimate_lancer';

export const MIR4_NATIVE_ULTIMATE_SKILL_IDS: Readonly<Record<Mir4ClassId, number>> = Object.freeze({
  1: 1403,
  2: 2403,
  3: 3303,
  4: 4113,
  5: 5203,
});

export interface Mir4NativeUltimateContactPlan {
  readonly attackId: number;
  readonly sourceImpactIndex: number;
  readonly offsetMs: number;
  /** Per-contact native coefficient in the SKILL_ATTACK 10,000 scale. */
  readonly coefficient: number;
  /** Present when one authored contact resolves both native damage channels. */
  readonly damageComponents?: readonly {
    readonly channel: 'physical' | 'magic';
    readonly coefficient: number;
  }[];
}

export interface Mir4NativeUltimateExecutionPlan {
  readonly classId: Mir4ClassId;
  readonly skillId: number;
  readonly requiredGauge: number;
  readonly skillCostType: 2;
  readonly skillCost: number;
  readonly cooldownMs: number;
  readonly attackAnimationMs: number;
  readonly endCutAnimationMs: number;
  readonly channel: 'physical' | 'magic';
  readonly sourceInvincibility: {
    readonly attackId: number;
    readonly buffId: 14040 | 24031 | 36010 | 53012;
    readonly applyAtMs: number;
    readonly durationMs: number;
    readonly effectId:
      | 'mir4_native_buff_14040'
      | 'mir4_native_buff_24031'
      | 'mir4_native_buff_36010'
      | 'mir4_native_buff_53012';
    readonly name: 'Dragon Flame' | 'Dragon Tornado' | 'Light Ray' | 'Arrow Rain' | 'Dragon Spear';
  };
  readonly sourceFocus: {
    readonly attackId: 411301;
    readonly buffId: 41010;
    readonly applyAtMs: 300;
  } | null;
  readonly sourceControlImmunity: {
    readonly attackId: number;
    readonly buffId: 31051;
    readonly applyAtMs: number;
    readonly durationMs: number;
    readonly effectId: 'mir4_native_buff_31051';
    readonly name: 'Light Ray: Control Immunity';
  } | null;
  readonly totem: Mir4NativeTotemRuntimePlan | null;
  readonly contacts: readonly Mir4NativeUltimateContactPlan[];
  readonly attackIds: readonly number[];
}

const WARRIOR_SKILL_ID = 1403;
const SORCERER_SKILL_ID = 2403;
const TAOIST_SKILL_ID = 3303;
const NATIVE_COEFFICIENT_SCALE = 100;

function exactRow(
  row: Mir4NativeSkillAttackRow | undefined,
  expected: {
    attackId: number;
    nextAttackId: number;
    impactStartMs: number;
    offsets: readonly number[];
    coefficient: number;
    levelUpCoefficient: number;
    buffIds: readonly number[];
    reactionKind: Mir4NativeSkillAttackRow['reaction']['kind'];
  },
): row is Mir4NativeSkillAttackRow {
  return (
    row !== undefined &&
    row.attackId === expected.attackId &&
    row.nextAttackId === expected.nextAttackId &&
    row.impactStartMs === expected.impactStartMs &&
    row.impactOffsetsMs.length === expected.offsets.length &&
    row.impactOffsetsMs.every((offset, index) => offset === expected.offsets[index]) &&
    row.nativeBehavior.damageType === (expected.coefficient === 0 ? 0 : 1) &&
    row.nativeBehavior.physicalDamage.coefficient === expected.coefficient &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === expected.levelUpCoefficient &&
    row.nativeBehavior.physicalDamage.additive === 0 &&
    row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.magicDamage.coefficient === 0 &&
    row.nativeBehavior.magicDamage.levelUpCoefficient === 0 &&
    row.nativeBehavior.buffIds.length === expected.buffIds.length &&
    row.nativeBehavior.buffIds.every((buffId, index) => buffId === expected.buffIds[index]) &&
    row.impactType === 2 &&
    row.authorialTargetValue === 10 &&
    row.targetSubtype === 'alive-only' &&
    row.geometry.angleDegrees === 360 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === 700 &&
    row.geometry.nativeHeight === 400 &&
    row.geometry.nativeOffset.x === 500 &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === 0 &&
    row.geometry.rotationDegrees === 0 &&
    row.reaction.kind === expected.reactionKind
  );
}

function exactWarriorBuffs(): boolean {
  const dragonBreath = mir4NativeSkillBuffEvidenceById(14011)?.rawRecord;
  const invincible = mir4NativeSkillBuffEvidenceById(14040)?.rawRecord;
  return (
    dragonBreath?.BuffTarget === 0 &&
    dragonBreath.ApplyType === 1 &&
    dragonBreath.BuffTime === 5 &&
    dragonBreath.LevelUpBuffTime === 0 &&
    dragonBreath.BuffProbability === 1_000 &&
    dragonBreath.BuffIndexType_1 === 2 &&
    dragonBreath.BuffIndex_1 === 2002 &&
    dragonBreath.BuffValue_1 === 1_000 &&
    dragonBreath.BuffIndexType_2 === 2 &&
    dragonBreath.BuffIndex_2 === 2001 &&
    dragonBreath.BuffValue_2 === 10 &&
    dragonBreath.LevelUpBuffValue_2 === 25 &&
    invincible?.BuffTarget === 1 &&
    invincible.ApplyType === 0 &&
    invincible.BuffTime === 3 &&
    invincible.LevelUpBuffTime === 0 &&
    invincible.BuffProbability === 1_000 &&
    invincible.BuffIndexType_1 === 3 &&
    invincible.BuffIndex_1 === 4003 &&
    invincible.BuffIndexType_2 === 0 &&
    invincible.BuffIndexType_3 === 0
  );
}

function compileWarriorPlan(): Mir4NativeUltimateExecutionPlan | null {
  const action = mir4NativeDirectSkillActionEvidenceById(WARRIOR_SKILL_ID);
  if (
    action?.nativeBehavior.skillType !== 3 ||
    action.nativeBehavior.secondaryCostType !== 3 ||
    action.nativeBehavior.secondaryCost !== 10_000 ||
    action.nativeBehavior.damageType !== 1 ||
    action.nativeBehavior.primaryDamage.coefficient !== 660 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 13 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 7000 ||
    action.cooldownMs !== 10_000 ||
    action.attackAnimationMs !== 3_433 ||
    action.endCutAnimationMs !== 2_950 ||
    action.hitCount !== 4 ||
    action.requiredClassLevel !== 1 ||
    !action.targeting ||
    action.blockingCheck !== 0 ||
    action.indicator.nativeMax !== 700 ||
    action.indicator.nativeOffset !== 500 ||
    action.indicator.nativeHeight !== 800 ||
    action.rows.length !== 4 ||
    !exactWarriorBuffs() ||
    !exactRow(action.rows[0], {
      attackId: 140301,
      nextAttackId: 140302,
      impactStartMs: 0,
      offsets: [20],
      coefficient: 0,
      levelUpCoefficient: 0,
      buffIds: [14040],
      reactionKind: 'none',
    }) ||
    !exactRow(action.rows[1], {
      attackId: 140302,
      nextAttackId: 140303,
      impactStartMs: 740,
      offsets: [780],
      coefficient: 15_000,
      levelUpCoefficient: 320,
      buffIds: [],
      reactionKind: 'push-to-point',
    }) ||
    !exactRow(action.rows[2], {
      attackId: 140303,
      nextAttackId: 140304,
      impactStartMs: 1_450,
      offsets: [1_500, 1_720],
      coefficient: 31_000,
      levelUpCoefficient: 580,
      buffIds: [],
      reactionKind: 'knock-back',
    }) ||
    !exactRow(action.rows[3], {
      attackId: 140304,
      nextAttackId: 0,
      impactStartMs: 2_520,
      offsets: [2_560],
      coefficient: 20_000,
      levelUpCoefficient: 400,
      buffIds: [14011],
      reactionKind: 'knock-down',
    })
  ) {
    return null;
  }

  const damagingRows = action.rows.filter(
    (row) => row.nativeBehavior.physicalDamage.coefficient > 0,
  );
  const aggregateCoefficient = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.physicalDamage.coefficient,
    0,
  );
  const aggregateLevelUpCoefficient = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.physicalDamage.levelUpCoefficient,
    0,
  );
  if (
    aggregateCoefficient !==
      action.nativeBehavior.primaryDamage.coefficient * NATIVE_COEFFICIENT_SCALE ||
    aggregateLevelUpCoefficient !==
      action.nativeBehavior.primaryDamage.levelUpCoefficient * NATIVE_COEFFICIENT_SCALE
  ) {
    return null;
  }

  const contacts = damagingRows.flatMap((row) => {
    const impactCount = row.impactOffsetsMs.length;
    if (impactCount <= 0 || row.nativeBehavior.physicalDamage.coefficient % impactCount !== 0) {
      return [];
    }
    const coefficient = row.nativeBehavior.physicalDamage.coefficient / impactCount;
    return row.impactOffsetsMs.map((offsetMs, sourceImpactIndex) =>
      Object.freeze({ attackId: row.attackId, sourceImpactIndex, offsetMs, coefficient }),
    );
  });
  if (contacts.length !== action.hitCount) return null;

  return Object.freeze({
    classId: 1,
    skillId: WARRIOR_SKILL_ID,
    requiredGauge: action.nativeBehavior.secondaryCost / 100,
    skillCostType: 2,
    skillCost: action.skillCost,
    cooldownMs: action.cooldownMs,
    attackAnimationMs: action.attackAnimationMs,
    endCutAnimationMs: action.endCutAnimationMs,
    channel: 'physical',
    sourceInvincibility: Object.freeze({
      attackId: 140301,
      buffId: 14040,
      applyAtMs: 20,
      durationMs: 3_000,
      effectId: 'mir4_native_buff_14040',
      name: 'Dragon Flame',
    }),
    sourceFocus: null,
    sourceControlImmunity: null,
    totem: null,
    contacts: Object.freeze(contacts),
    attackIds: Object.freeze(action.rows.map((row) => row.attackId)),
  });
}

function exactSorcererBuff(): boolean {
  const invincible = mir4NativeSkillBuffEvidenceById(24031)?.rawRecord;
  return (
    invincible?.BuffTarget === 1 &&
    invincible.ApplyType === 0 &&
    invincible.BuffTime === 3 &&
    invincible.LevelUpBuffTime === 0 &&
    invincible.BuffProbability === 1_000 &&
    invincible.BuffIndexType_1 === 3 &&
    invincible.BuffIndex_1 === 4003 &&
    invincible.BuffIndexType_2 === 0 &&
    invincible.BuffIndexType_3 === 0
  );
}

function compileSorcererPlan(): Mir4NativeUltimateExecutionPlan | null {
  const action = mir4NativeDirectSkillActionEvidenceById(SORCERER_SKILL_ID);
  const setup = action?.rows[0];
  const totem = mir4NativeRuntimeTotemPlan(SORCERER_SKILL_ID);
  if (
    !action ||
    !setup ||
    !totem ||
    action.nativeBehavior.skillType !== 3 ||
    action.nativeBehavior.secondaryCostType !== 3 ||
    action.nativeBehavior.secondaryCost !== 10_000 ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 0 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 680 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 15 ||
    action.cooldownMs !== 10_000 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 7000 ||
    action.attackAnimationMs !== 3_330 ||
    action.endCutAnimationMs !== 2_760 ||
    action.hitCount !== 10 ||
    action.requiredClassLevel !== 1 ||
    !action.targeting ||
    action.blockingCheck !== 0 ||
    action.indicator.type !== 0 ||
    action.indicator.index !== 103 ||
    action.indicator.nativeMax !== 1500 ||
    action.indicator.nativeWidth !== 500 ||
    action.indicator.nativeOffset !== 0 ||
    action.indicator.nativeHeight !== 1000 ||
    action.rows.length !== 1 ||
    setup.attackId !== 240302 ||
    setup.nextAttackId !== 0 ||
    setup.impactStartMs !== 0 ||
    setup.impactOffsetsMs.length !== 1 ||
    setup.impactOffsetsMs[0] !== 100 ||
    setup.nativeBehavior.damageType !== 0 ||
    setup.nativeBehavior.buffIds.length !== 1 ||
    setup.nativeBehavior.buffIds[0] !== 24031 ||
    setup.impactType !== 1 ||
    setup.authorialTargetValue !== 1 ||
    setup.targetSubtype !== 'alive-only' ||
    setup.geometry.angleDegrees !== 360 ||
    setup.geometry.nativeDistanceMin !== 0 ||
    setup.geometry.nativeDistanceMax !== 700 ||
    setup.geometry.nativeHeight !== 700 ||
    setup.geometry.nativeOffset.x !== 0 ||
    setup.geometry.nativeOffset.y !== 0 ||
    setup.geometry.nativeOffset.z !== 0 ||
    setup.reaction.kind !== 'none' ||
    !exactSorcererBuff() ||
    totem.spawnAttackId !== setup.attackId ||
    totem.aggregateCoefficient !==
      action.nativeBehavior.secondaryDamage.coefficient * NATIVE_COEFFICIENT_SCALE ||
    totem.aggregateLevelUpCoefficient !==
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * NATIVE_COEFFICIENT_SCALE ||
    totem.contacts.length !== action.hitCount
  ) {
    return null;
  }

  return Object.freeze({
    classId: 2,
    skillId: SORCERER_SKILL_ID,
    requiredGauge: action.nativeBehavior.secondaryCost / 100,
    skillCostType: 2,
    skillCost: action.skillCost,
    cooldownMs: action.cooldownMs,
    attackAnimationMs: action.attackAnimationMs,
    endCutAnimationMs: action.endCutAnimationMs,
    channel: 'magic',
    sourceInvincibility: Object.freeze({
      attackId: 240302,
      buffId: 24031,
      applyAtMs: 100,
      durationMs: 3_000,
      effectId: 'mir4_native_buff_24031',
      name: 'Dragon Tornado',
    }),
    sourceFocus: null,
    sourceControlImmunity: null,
    totem,
    contacts: Object.freeze(
      totem.contacts.map((contact, sourceImpactIndex) =>
        Object.freeze({
          attackId: contact.attackId,
          sourceImpactIndex,
          offsetMs: contact.offsetMs,
          coefficient: contact.coefficient,
        }),
      ),
    ),
    attackIds: Object.freeze([
      setup.attackId,
      ...totem.contacts.map((contact) => contact.attackId),
    ]),
  });
}

interface TaoistRowExpectation {
  readonly attackId: number;
  readonly nextAttackId: number;
  readonly impactStartMs: number;
  readonly offsets: readonly number[];
  readonly targetType: 1 | 4;
  readonly nativeDistanceMax: 500 | 1300 | 1350 | 1600;
  readonly nativeWidth: 350 | 400 | 450;
  readonly nativeOffsetX: 0 | -50;
  readonly nativeOffsetZ: 0 | 300;
  readonly physicalCoefficient: number;
  readonly physicalLevelUpCoefficient: number;
  readonly magicCoefficient: number;
  readonly magicLevelUpCoefficient: number;
  readonly buffIds: readonly number[];
  readonly reactionKind: Mir4NativeSkillAttackRow['reaction']['kind'];
}

function exactTaoistRow(
  row: Mir4NativeSkillAttackRow | undefined,
  expected: TaoistRowExpectation,
): row is Mir4NativeSkillAttackRow {
  const hasDamage = expected.physicalCoefficient > 0 || expected.magicCoefficient > 0;
  return (
    row !== undefined &&
    row.attackId === expected.attackId &&
    row.nextAttackId === expected.nextAttackId &&
    row.impactStartMs === expected.impactStartMs &&
    row.impactOffsetsMs.length === expected.offsets.length &&
    row.impactOffsetsMs.every((offset, index) => offset === expected.offsets[index]) &&
    row.nativeBehavior.damageType === (hasDamage ? 2 : 0) &&
    row.nativeBehavior.physicalDamage.coefficient === expected.physicalCoefficient &&
    row.nativeBehavior.physicalDamage.levelUpCoefficient === expected.physicalLevelUpCoefficient &&
    row.nativeBehavior.physicalDamage.additive === 0 &&
    row.nativeBehavior.physicalDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.magicDamage.coefficient === expected.magicCoefficient &&
    row.nativeBehavior.magicDamage.levelUpCoefficient === expected.magicLevelUpCoefficient &&
    row.nativeBehavior.magicDamage.additive === 0 &&
    row.nativeBehavior.magicDamage.levelUpAdditive === 0 &&
    row.nativeBehavior.buffIds.length === expected.buffIds.length &&
    row.nativeBehavior.buffIds.every((buffId, index) => buffId === expected.buffIds[index]) &&
    row.movement.kind === 'none' &&
    row.targetDistance.nativeMin === 0 &&
    row.targetDistance.nativeMax === 1200 &&
    row.targetType === expected.targetType &&
    row.authorialTargetValue === 10 &&
    row.targetSubtype === 'alive-only' &&
    row.impactType === 3 &&
    row.geometry.angleDegrees === 0 &&
    row.geometry.nativeDistanceMin === 0 &&
    row.geometry.nativeDistanceMax === expected.nativeDistanceMax &&
    row.geometry.nativeWidth === expected.nativeWidth &&
    row.geometry.nativeHeight === 400 &&
    row.geometry.nativeOffset.x === expected.nativeOffsetX &&
    row.geometry.nativeOffset.y === 0 &&
    row.geometry.nativeOffset.z === expected.nativeOffsetZ &&
    row.geometry.rotationDegrees === 0 &&
    row.reaction.kind === expected.reactionKind
  );
}

function exactTaoistUltimateBuffs(): boolean {
  const controlImmunity = mir4NativeSkillBuffEvidenceById(31051)?.rawRecord;
  const invincible = mir4NativeSkillBuffEvidenceById(36010)?.rawRecord;
  const internalDamageMarker = mir4NativeSkillBuffEvidenceById(35019)?.rawRecord;
  return (
    controlImmunity?.BuffTarget === 1 &&
    controlImmunity.ApplyType === 0 &&
    controlImmunity.BuffTime === 5 &&
    controlImmunity.LevelUpBuffTime === 0 &&
    controlImmunity.BuffProbability === 1_000 &&
    controlImmunity.BuffIndexType_1 === 3 &&
    controlImmunity.BuffIndex_1 === 4004 &&
    invincible?.BuffTarget === 1 &&
    invincible.ApplyType === 0 &&
    invincible.BuffTime === 3 &&
    invincible.LevelUpBuffTime === 0 &&
    invincible.BuffProbability === 1_000 &&
    invincible.BuffIndexType_1 === 3 &&
    invincible.BuffIndex_1 === 4003 &&
    internalDamageMarker?.BuffTarget === 0 &&
    internalDamageMarker.ApplyType === 0 &&
    internalDamageMarker.BuffTime === 1 &&
    internalDamageMarker.BuffProbability === 1_000 &&
    internalDamageMarker.BuffIndexType_1 === 2 &&
    internalDamageMarker.BuffIndex_1 === 2022 &&
    internalDamageMarker.BuffValue_1 === 330 &&
    internalDamageMarker.BuffIndexType_2 === 2 &&
    internalDamageMarker.BuffIndex_2 === 2027 &&
    internalDamageMarker.BuffValue_2 === 1_000 &&
    internalDamageMarker.LevelUpBuffValue_2 === 800 &&
    internalDamageMarker.BuffIndexType_3 === 2 &&
    internalDamageMarker.BuffIndex_3 === 2021 &&
    internalDamageMarker.BuffValue_3 === 150 &&
    internalDamageMarker.LevelUpBuffValue_3 === 150
  );
}

const TAOIST_ROWS = Object.freeze([
  {
    attackId: 330301,
    nextAttackId: 330302,
    impactStartMs: 0,
    offsets: [20],
    targetType: 1,
    nativeDistanceMax: 500,
    nativeWidth: 350,
    nativeOffsetX: 0,
    nativeOffsetZ: 300,
    physicalCoefficient: 0,
    physicalLevelUpCoefficient: 0,
    magicCoefficient: 0,
    magicLevelUpCoefficient: 0,
    buffIds: [31051, 36010],
    reactionKind: 'none',
  },
  {
    attackId: 330302,
    nextAttackId: 330303,
    impactStartMs: 300,
    offsets: [400],
    targetType: 4,
    nativeDistanceMax: 1350,
    nativeWidth: 450,
    nativeOffsetX: -50,
    nativeOffsetZ: 0,
    physicalCoefficient: 0,
    physicalLevelUpCoefficient: 0,
    magicCoefficient: 0,
    magicLevelUpCoefficient: 0,
    buffIds: [35019],
    reactionKind: 'none',
  },
  {
    attackId: 330303,
    nextAttackId: 330304,
    impactStartMs: 960,
    offsets: [1060, 1260],
    targetType: 1,
    nativeDistanceMax: 1300,
    nativeWidth: 350,
    nativeOffsetX: 0,
    nativeOffsetZ: 0,
    physicalCoefficient: 4000,
    physicalLevelUpCoefficient: 80,
    magicCoefficient: 6000,
    magicLevelUpCoefficient: 120,
    buffIds: [],
    reactionKind: 'knock-back',
  },
  {
    attackId: 330304,
    nextAttackId: 330305,
    impactStartMs: 1260,
    offsets: [1400],
    targetType: 4,
    nativeDistanceMax: 1350,
    nativeWidth: 450,
    nativeOffsetX: -50,
    nativeOffsetZ: 0,
    physicalCoefficient: 0,
    physicalLevelUpCoefficient: 0,
    magicCoefficient: 0,
    magicLevelUpCoefficient: 0,
    buffIds: [35019],
    reactionKind: 'none',
  },
  {
    attackId: 330305,
    nextAttackId: 330306,
    impactStartMs: 1560,
    offsets: [1660, 1860],
    targetType: 1,
    nativeDistanceMax: 1300,
    nativeWidth: 350,
    nativeOffsetX: 0,
    nativeOffsetZ: 0,
    physicalCoefficient: 4000,
    physicalLevelUpCoefficient: 80,
    magicCoefficient: 6000,
    magicLevelUpCoefficient: 130,
    buffIds: [],
    reactionKind: 'attack-back',
  },
  {
    attackId: 330306,
    nextAttackId: 330307,
    impactStartMs: 1900,
    offsets: [2200],
    targetType: 1,
    nativeDistanceMax: 1300,
    nativeWidth: 350,
    nativeOffsetX: 0,
    nativeOffsetZ: 0,
    physicalCoefficient: 4000,
    physicalLevelUpCoefficient: 80,
    magicCoefficient: 7000,
    magicLevelUpCoefficient: 150,
    buffIds: [],
    reactionKind: 'attack-back',
  },
  {
    attackId: 330307,
    nextAttackId: 330309,
    impactStartMs: 2300,
    offsets: [2400],
    targetType: 4,
    nativeDistanceMax: 1350,
    nativeWidth: 450,
    nativeOffsetX: -50,
    nativeOffsetZ: 0,
    physicalCoefficient: 0,
    physicalLevelUpCoefficient: 0,
    magicCoefficient: 0,
    magicLevelUpCoefficient: 0,
    buffIds: [35019],
    reactionKind: 'none',
  },
  {
    attackId: 330309,
    nextAttackId: 330310,
    impactStartMs: 2560,
    offsets: [2600],
    targetType: 1,
    nativeDistanceMax: 1600,
    nativeWidth: 400,
    nativeOffsetX: 0,
    nativeOffsetZ: 0,
    physicalCoefficient: 5000,
    physicalLevelUpCoefficient: 80,
    magicCoefficient: 8000,
    magicLevelUpCoefficient: 150,
    buffIds: [],
    reactionKind: 'knock-down',
  },
  {
    attackId: 330310,
    nextAttackId: 0,
    impactStartMs: 2700,
    offsets: [2800],
    targetType: 1,
    nativeDistanceMax: 1600,
    nativeWidth: 400,
    nativeOffsetX: 0,
    nativeOffsetZ: 0,
    physicalCoefficient: 5000,
    physicalLevelUpCoefficient: 80,
    magicCoefficient: 7000,
    magicLevelUpCoefficient: 150,
    buffIds: [],
    reactionKind: 'hit',
  },
] as const satisfies readonly TaoistRowExpectation[]);

function compileTaoistPlan(): Mir4NativeUltimateExecutionPlan | null {
  const action = mir4NativeDirectSkillActionEvidenceById(TAOIST_SKILL_ID);
  if (
    action?.nativeBehavior.skillType !== 3 ||
    action.nativeBehavior.productType !== 2 ||
    action.nativeBehavior.useControlTime !== 2 ||
    action.nativeBehavior.secondaryCostType !== 3 ||
    action.nativeBehavior.secondaryCost !== 10_000 ||
    action.nativeBehavior.darkChange !== 1 ||
    action.nativeBehavior.damageType !== 0 ||
    action.nativeBehavior.primaryDamage.coefficient !== 220 ||
    action.nativeBehavior.primaryDamage.levelUpCoefficient !== 4 ||
    action.nativeBehavior.secondaryDamage.coefficient !== 340 ||
    action.nativeBehavior.secondaryDamage.levelUpCoefficient !== 7 ||
    action.skillCostType !== 2 ||
    action.skillCost !== 7000 ||
    action.cooldownMs !== 10_000 ||
    action.attackAnimationMs !== 4_000 ||
    action.endCutAnimationMs !== 3_100 ||
    action.hitCount !== 9 ||
    action.requiredClassLevel !== 1 ||
    !action.targeting ||
    action.blockingCheck !== 1 ||
    action.indicator.type !== 0 ||
    action.indicator.index !== 3 ||
    action.indicator.nativeMin !== 0 ||
    action.indicator.nativeMax !== 1500 ||
    action.indicator.nativeWidth !== 400 ||
    action.indicator.nativeOffset !== 0 ||
    action.indicator.nativeHeight !== 400 ||
    action.rows.length !== TAOIST_ROWS.length ||
    !action.rows.every((row, index) => exactTaoistRow(row, TAOIST_ROWS[index])) ||
    !exactTaoistUltimateBuffs()
  ) {
    return null;
  }

  const damagingRows = action.rows.filter(
    (row) =>
      row.nativeBehavior.physicalDamage.coefficient > 0 &&
      row.nativeBehavior.magicDamage.coefficient > 0,
  );
  const physicalCoefficient = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.physicalDamage.coefficient,
    0,
  );
  const physicalLevelUp = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.physicalDamage.levelUpCoefficient,
    0,
  );
  const magicCoefficient = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.magicDamage.coefficient,
    0,
  );
  const magicLevelUp = damagingRows.reduce(
    (sum, row) => sum + row.nativeBehavior.magicDamage.levelUpCoefficient,
    0,
  );
  if (
    physicalCoefficient !==
      action.nativeBehavior.primaryDamage.coefficient * NATIVE_COEFFICIENT_SCALE ||
    physicalLevelUp !==
      action.nativeBehavior.primaryDamage.levelUpCoefficient * NATIVE_COEFFICIENT_SCALE ||
    magicCoefficient !==
      action.nativeBehavior.secondaryDamage.coefficient * NATIVE_COEFFICIENT_SCALE ||
    magicLevelUp !==
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * NATIVE_COEFFICIENT_SCALE
  ) {
    return null;
  }

  const contacts = damagingRows.flatMap((row) => {
    const impactCount = row.impactOffsetsMs.length;
    const physical = row.nativeBehavior.physicalDamage.coefficient;
    const magic = row.nativeBehavior.magicDamage.coefficient;
    if (impactCount <= 0 || physical % impactCount !== 0 || magic % impactCount !== 0) return [];
    return row.impactOffsetsMs.map((offsetMs, sourceImpactIndex) => {
      const physicalPerContact = physical / impactCount;
      const magicPerContact = magic / impactCount;
      return Object.freeze({
        attackId: row.attackId,
        sourceImpactIndex,
        offsetMs,
        coefficient: physicalPerContact + magicPerContact,
        damageComponents: Object.freeze([
          Object.freeze({ channel: 'physical' as const, coefficient: physicalPerContact }),
          Object.freeze({ channel: 'magic' as const, coefficient: magicPerContact }),
        ]),
      });
    });
  });
  if (contacts.length !== 7) return null;

  return Object.freeze({
    classId: 3,
    skillId: TAOIST_SKILL_ID,
    requiredGauge: action.nativeBehavior.secondaryCost / 100,
    skillCostType: 2,
    skillCost: action.skillCost,
    cooldownMs: action.cooldownMs,
    attackAnimationMs: action.attackAnimationMs,
    endCutAnimationMs: action.endCutAnimationMs,
    channel: 'magic',
    sourceInvincibility: Object.freeze({
      attackId: 330301,
      buffId: 36010,
      applyAtMs: 20,
      durationMs: 3_000,
      effectId: 'mir4_native_buff_36010',
      name: 'Light Ray',
    }),
    sourceFocus: null,
    sourceControlImmunity: Object.freeze({
      attackId: 330301,
      buffId: 31051,
      applyAtMs: 20,
      durationMs: 5_000,
      effectId: 'mir4_native_buff_31051',
      name: 'Light Ray: Control Immunity',
    }),
    totem: null,
    contacts: Object.freeze(contacts),
    attackIds: Object.freeze(action.rows.map((row) => row.attackId)),
  });
}

/** Fully reviewed native ultimate plans. Other classes remain fail-closed. */
export function mir4NativeUltimateExecutionPlan(
  classId: Mir4ClassId,
): Mir4NativeUltimateExecutionPlan | null {
  if (classId === 1) return compileWarriorPlan();
  if (classId === 2) return compileSorcererPlan();
  if (classId === 3) return compileTaoistPlan();
  if (classId === 4) return compileMir4NativeArbalistUltimatePlan();
  if (classId === 5) return compileMir4NativeLancerUltimatePlan();
  return null;
}

export function mir4NativeUltimateExecutionPlanBySkillId(
  skillId: number,
): Mir4NativeUltimateExecutionPlan | null {
  for (const classId of [1, 2, 3, 4, 5] as const satisfies readonly Mir4ClassId[]) {
    if (MIR4_NATIVE_ULTIMATE_SKILL_IDS[classId] === skillId) {
      return mir4NativeUltimateExecutionPlan(classId);
    }
  }
  return null;
}

/** Resolve the exact source-owned setup buff at its native router timestamp. */
export function applyMir4NativeUltimateSetup(
  ctx: SimContext,
  source: Entity,
  skillId: number,
  attackId: number,
): boolean {
  const plan = mir4NativeUltimateExecutionPlanBySkillId(skillId);
  if (!plan || attackId !== plan.sourceInvincibility.attackId || source.dead) return false;
  const invincibilityApplied = applyMir4Effect(ctx, source, {
    effectId: plan.sourceInvincibility.effectId,
    kind: 'invincible',
    durationSeconds: plan.sourceInvincibility.durationMs / 1_000,
    magnitude: 0,
    name: plan.sourceInvincibility.name,
    sourceId: source.id,
  }).ok;
  const focus = plan.sourceFocus;
  const focusApplied =
    !focus || focus.attackId !== attackId ? true : applyMir4NativeArbalistFocus(ctx, source);
  const controlImmunity = plan.sourceControlImmunity;
  if (!controlImmunity || controlImmunity.attackId !== attackId) {
    return invincibilityApplied && focusApplied;
  }
  const controlImmunityApplied = applyMir4Effect(ctx, source, {
    effectId: controlImmunity.effectId,
    kind: 'control-immunity',
    durationSeconds: controlImmunity.durationMs / 1_000,
    magnitude: 0,
    name: controlImmunity.name,
    sourceId: source.id,
  }).ok;
  return invincibilityApplied && focusApplied && controlImmunityApplied;
}
