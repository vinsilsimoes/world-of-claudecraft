/**
 * Runtime-neutral source evidence for MIR4 Totem attack graphs.
 *
 * The raw records intentionally retain source field names. The typed projection is
 * compatible with the direct skill-action row shape, but the raw record remains the
 * lossless authority for fields that the runtime-facing projection does not model.
 */

import type {
  Mir4NativeAttackBehaviorEvidence,
  Mir4NativeCrowdControlKind,
  Mir4NativeCrowdControlStance,
  Mir4NativeSkillAttackRow,
} from './native_skill_action_types';
import {
  cloneMir4NativeEvidence,
  deepFreezeMir4NativeEvidence,
  type Mir4NativeRawSkillAttackRecord,
} from './native_skill_raw_records';

export type Mir4NativeTotemId =
  | 1001
  | 1004
  | 1008
  | 1009
  | 1010
  | 1011
  | 1012
  | 1013
  | 1401
  | 1402
  | 1403
  | 1404
  | 1405
  | 1406;

export type Mir4NativeTotemSkillAttackId =
  | 220311
  | 230112
  | 240321
  | 250111
  | 260211
  | 310411
  | 330111
  | 350611
  | 410311
  | 410411
  | 410511
  | 410711
  | 410811
  | 411211;

/** Exact 13-field projection from one selected TOTEM.json source record. */
export interface Mir4NativeTotemRawRecord {
  readonly TotemId: Mir4NativeTotemId;
  readonly ResourceID: '50060' | '50101';
  readonly PhysicalAttack: 40 | 69 | 200;
  readonly MagicAttack: 40 | 69 | 200;
  readonly AccuracyPer: 3000;
  readonly CriticalPer: 1300 | 2500;
  readonly CriticalOutcomePer: 12000;
  readonly AttackDelay: 6 | 8;
  readonly SkillAttackID: Mir4NativeTotemSkillAttackId;
  readonly CombatPower: 1827;
  readonly Cleartime: 3 | 4 | 5 | 6;
  readonly DetectRange: 3000;
  readonly AniSequence: string;
}

/** Raw spawning-row link. No semantic aliases are assigned to its Totem fields. */
export interface Mir4NativeTotemBridgeEvidence {
  readonly source: 'SKILL_ATTACK.json';
  readonly AttackID: number;
  readonly SkillId: number;
  readonly SkillTotem: Mir4NativeTotemId;
  readonly SkillTotemTarget: 0 | 1;
  readonly SkillTotemTime: number;
  readonly SkillTotemCount: 1;
}

/** Backward-compatible Totem name for the shared lossless attack source record. */
export type Mir4NativeTotemRawAttackRecord = Mir4NativeRawSkillAttackRecord;

export type Mir4NativeTotemAttackBehaviorEvidence = Omit<
  Mir4NativeAttackBehaviorEvidence,
  'hitRagePoint'
> & {
  /** Totem rows include the raw zero sentinel in addition to direct-row values. */
  readonly hitRagePoint: 0 | Mir4NativeAttackBehaviorEvidence['hitRagePoint'];
};

/** Reuses the direct attack-row projection while retaining its source SkillId. */
export type Mir4NativeTotemAttackRow = Omit<Mir4NativeSkillAttackRow, 'nativeBehavior'> & {
  readonly skillId: number;
  readonly nativeBehavior: Mir4NativeTotemAttackBehaviorEvidence;
};

export interface Mir4NativeTotemCatalogEntry {
  readonly record: Mir4NativeTotemRawRecord;
  readonly bridge: Mir4NativeTotemBridgeEvidence;
  /** Full source records, ordered by SkillAttackID then NextAttackLink. */
  readonly rawAttackRecords: readonly Mir4NativeTotemRawAttackRecord[];
  /** Reusable typed projection in the same linked-row order. */
  readonly attackRows: readonly Mir4NativeTotemAttackRow[];
}

export interface Mir4NativeTotemCatalogEntryInput {
  readonly record: Mir4NativeTotemRawRecord;
  readonly bridge: Mir4NativeTotemBridgeEvidence;
  readonly rawAttackRecords: readonly Mir4NativeTotemRawAttackRecord[];
}

/**
 * Resolves one raw Totem graph without scheduling it. Missing rows, duplicate IDs,
 * cycles, bridge mismatches, cross-skill links, and unlinked supplied rows all fail.
 */
export function compileMir4NativeTotemAttackChain(
  record: Mir4NativeTotemRawRecord,
  bridge: Mir4NativeTotemBridgeEvidence,
  rawAttackRecords: readonly Mir4NativeTotemRawAttackRecord[],
): readonly Mir4NativeTotemRawAttackRecord[] {
  if (bridge.SkillTotem !== record.TotemId) {
    throw new Error(
      `MIR4 Totem bridge mismatch: Totem ${record.TotemId} was linked as ${bridge.SkillTotem}`,
    );
  }

  const rowsById = new Map<number, Mir4NativeTotemRawAttackRecord>();
  for (const row of rawAttackRecords) {
    if (rowsById.has(row.AttackID)) {
      throw new Error(`MIR4 Totem ${record.TotemId} has duplicate AttackID ${row.AttackID}`);
    }
    rowsById.set(row.AttackID, row);
  }

  const ordered: Mir4NativeTotemRawAttackRecord[] = [];
  const visited = new Set<number>();
  let attackId: number = record.SkillAttackID;
  while (attackId !== 0) {
    if (visited.has(attackId)) {
      throw new Error(`MIR4 Totem ${record.TotemId} attack chain contains cycle at ${attackId}`);
    }
    visited.add(attackId);

    const row = rowsById.get(attackId);
    if (row === undefined) {
      throw new Error(`MIR4 Totem ${record.TotemId} is missing linked AttackID ${attackId}`);
    }
    if (row.SkillId !== bridge.SkillId) {
      throw new Error(
        `MIR4 Totem ${record.TotemId} AttackID ${attackId} SkillId mismatch: expected ${bridge.SkillId}, got ${row.SkillId}`,
      );
    }

    ordered.push(row);
    attackId = row.NextAttackLink;
  }

  if (ordered.length !== rawAttackRecords.length) {
    const unlinkedIds = rawAttackRecords
      .filter((row) => !visited.has(row.AttackID))
      .map((row) => row.AttackID);
    throw new Error(
      `MIR4 Totem ${record.TotemId} has unlinked AttackID rows: ${unlinkedIds.join(', ')}`,
    );
  }

  return deepFreezeMir4NativeEvidence(cloneMir4NativeEvidence(ordered));
}

/** Builds and recursively freezes one evidence entry; no runtime consumer is attached. */
export function freezeMir4NativeTotemCatalogEntry(
  input: Mir4NativeTotemCatalogEntryInput,
): Mir4NativeTotemCatalogEntry {
  const rawAttackRecords = compileMir4NativeTotemAttackChain(
    input.record,
    input.bridge,
    input.rawAttackRecords,
  );
  const attackRows = rawAttackRecords.map(projectMir4NativeTotemAttackRow);

  return deepFreezeMir4NativeEvidence({
    record: cloneMir4NativeEvidence(input.record),
    bridge: cloneMir4NativeEvidence(input.bridge),
    rawAttackRecords,
    attackRows,
  });
}

/**
 * Produces the shared direct-row shape while leaving every source-only field in the
 * paired raw record. Unknown observed enum values fail instead of being coerced.
 */
export function projectMir4NativeTotemAttackRow(
  raw: Mir4NativeTotemRawAttackRecord,
): Mir4NativeTotemAttackRow {
  assertRawOneOf('AttackUseType', raw.AttackUseType, [0, 1] as const);
  assertRawOneOf('TargetSubType', raw.TargetSubType, [
    'TARGET_SUBTYPE::AliveOnly',
    'TARGET_SUBTYPE::DeadOnly',
  ] as const);
  assertRawOneOf('DamageType', raw.DamageType, [0, 1, 2] as const);
  assertRawOneOf('DamageAttribute', raw.DamageAttribute, [0, 2, 3, 5] as const);
  assertRawOneOf('ActType', raw.ActType, [0, 2] as const);
  assertRawOneOf('CCUserCheck', raw.CCUserCheck, [0, 1000] as const);
  assertRawOneOf('HitRagePoint', raw.HitRagePoint, [0, 240, 320] as const);
  assertRawOneOf('AggroRate', raw.AggroRate, [7000, 7500, 8000] as const);
  assertRawOneOf('SuperIgnore', raw.SuperIgnore, [0] as const);
  assertRawOneOf('SuperArmor', raw.SuperArmor, [0] as const);

  if (
    raw.MoveType !== 0 ||
    raw.MoveAngleMin !== 0 ||
    raw.MoveAngleMax !== 0 ||
    raw.MoveRange !== 0 ||
    raw.DelayMove !== 0 ||
    raw.MoveTime !== 0
  ) {
    throw new Error(`MIR4 Totem AttackID ${raw.AttackID} has unsupported movement evidence`);
  }
  if (raw.BulletType !== 0) {
    throw new Error(`MIR4 Totem AttackID ${raw.AttackID} has unsupported projectile evidence`);
  }
  if (raw.SkillTotem !== 0) {
    throw new Error(`MIR4 Totem AttackID ${raw.AttackID} contains a nested SkillTotem`);
  }

  const physicalDamage = {
    coefficient: raw.MulDamage,
    levelUpCoefficient: raw.LevelUpMulDamage,
    additive: raw.AddDamage,
    levelUpAdditive: raw.LevelUpAddDamage,
  };
  const magicDamage = {
    coefficient: raw.MagicDamage,
    levelUpCoefficient: raw.LevelUpMagicDamage,
    additive: raw.AddMagicDamage,
    levelUpAdditive: raw.LevelUpAddMagicDamage,
  };
  const projectedDamage = raw.DamageType === 2 ? magicDamage : physicalDamage;

  return {
    attackId: raw.AttackID,
    skillId: raw.SkillId,
    nativeBehavior: {
      source: 'SKILL_ATTACK.json',
      attackUseType: raw.AttackUseType,
      rawTargetSubtype: raw.TargetSubType,
      impactSpawnType: raw.ImpactSpawnType,
      strikeDelay: raw.StrikeDelay,
      projectile: null,
      totem: null,
      buffIds: raw.Buff.filter((id) => id !== 0),
      ccBuffIds: raw.CCBuff.filter((id) => id !== 0),
      superIgnore: raw.SuperIgnore,
      superArmor: raw.SuperArmor,
      actType: raw.ActType,
      ccUserCheck: raw.CCUserCheck,
      attackRagePoint: raw.AttackRagePoint,
      hitRagePoint: raw.HitRagePoint,
      aggroRate: raw.AggroRate,
      damageType: raw.DamageType,
      damageAttribute: raw.DamageAttribute,
      physicalDamage,
      magicDamage,
      monsterScaleApply: raw.MonScaleApply,
    },
    mainAttack: raw.MainAttack,
    nextAttackId: raw.NextAttackLink,
    impactStartMs: sourceSecondsToMilliseconds(raw.ImpactStartTime, raw.AttackID),
    movement: {
      kind: 'none',
      nativeRange: raw.MoveRange,
      delayMs: sourceSecondsToMilliseconds(raw.DelayMove, raw.AttackID),
      durationMs: sourceSecondsToMilliseconds(raw.MoveTime, raw.AttackID),
    },
    viewTarget: raw.ViewTarget,
    targetDistance: {
      nativeMin: raw.TargetDistanceMin,
      nativeMax: raw.TargetDistanceMax,
    },
    targetType: raw.TargetType,
    authorialTargetValue: raw.TargetValue,
    targetSubtype: raw.TargetSubType === 'TARGET_SUBTYPE::AliveOnly' ? 'alive-only' : 'dead-only',
    impactType: raw.ImpactType,
    impactOffsetsMs: raw.ImpactTime.map((time) => sourceSecondsToMilliseconds(time, raw.AttackID)),
    geometry: {
      angleDegrees: raw.AttackAngle,
      nativeDistanceMin: raw.AttackDistanceMin,
      nativeDistanceMax: raw.AttackDistanceMax,
      nativeWidth: raw.AttackWidth,
      nativeHeight: raw.AttackHeight,
      nativeOffset: {
        x: raw.LocationOffset.X,
        y: raw.LocationOffset.Y,
        z: raw.LocationOffset.Z,
      },
      rotationDegrees: raw.RotationOffset,
    },
    damage: {
      type: raw.DamageType,
      coefficient: projectedDamage.coefficient,
      levelUpCoefficient: projectedDamage.levelUpCoefficient,
      attribute: raw.DamageAttribute,
    },
    reaction: {
      kind: crowdControlKind(raw.CrowdControlType, raw.AttackID),
      stance: crowdControlStance(raw.CCStance, raw.AttackID),
      value: raw.CrowdControlValue,
      nativeHeight: raw.CrowdControlHeight,
      valueEx: raw.CrowdControlValueEx,
      durationMs: sourceSecondsToMilliseconds(raw.CrowdControlTime, raw.AttackID),
      probabilityPercent: raw.HitReactionProb,
      direction: raw.CCDirection,
    },
    guideEffectId: raw.GuideEffect,
  };
}

function crowdControlKind(raw: number, attackId: number): Mir4NativeCrowdControlKind {
  switch (raw) {
    case 0:
      return 'none';
    case 1:
      return 'hit';
    case 2:
      return 'stun';
    case 3:
      return 'taunt';
    case 4:
      return 'petrification';
    case 5:
      return 'knock-back';
    case 6:
      return 'knock-down';
    case 7:
      return 'knock-front';
    case 8:
      return 'push-to-point';
    case 9:
      return 'sleep';
    case 99:
      return 'attack-back';
    default:
      throw new Error(`MIR4 Totem AttackID ${attackId} has unknown CrowdControlType ${raw}`);
  }
}

function crowdControlStance(raw: number, attackId: number): Mir4NativeCrowdControlStance {
  switch (raw) {
    case 0:
      return 'none';
    case 11:
      return 'hit-01';
    case 12:
      return 'hit-02';
    case 13:
      return 'hit-03';
    case 21:
      return 'stun-01';
    case 31:
      return 'down-01';
    case 32:
      return 'down-02';
    case 33:
      return 'down-03';
    case 41:
      return 'hover-01';
    case 42:
      return 'air-01';
    case 99:
      return 'state-end';
    default:
      throw new Error(`MIR4 Totem AttackID ${attackId} has unknown CCStance ${raw}`);
  }
}

function sourceSecondsToMilliseconds(value: number, attackId: number): number {
  const milliseconds = value * 1000;
  const rounded = Math.round(milliseconds);
  if (Math.abs(milliseconds - rounded) > 1e-6) {
    throw new Error(`MIR4 Totem AttackID ${attackId} has sub-millisecond source timing ${value}`);
  }
  return rounded;
}

function assertRawOneOf<const T extends readonly (number | string)[]>(
  field: string,
  value: number | string,
  allowed: T,
): asserts value is T[number] {
  if (!allowed.some((candidate) => candidate === value)) {
    throw new Error(`Unsupported MIR4 Totem ${field} value ${String(value)}`);
  }
}
