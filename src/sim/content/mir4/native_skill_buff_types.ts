export type Mir4NativeSkillBuffRole =
  | 'direct-action-reference'
  | 'passive-skill-reference'
  | 'graph-target';

export type Mir4NativeBuffSourceFile = 'BUFF.json' | 'BUFF_OVERLAPCALL.json' | 'BUFF_ATTACK.json';

export interface Mir4NativeBuffSourceHash {
  readonly fileName: Mir4NativeBuffSourceFile;
  readonly sha256: string;
}

/** Exact, unrenamed fields from one selected BUFF.json row. */
export interface Mir4NativeBuffRawRecord {
  readonly BuffId: number;
  readonly BuffName: number;
  readonly BuffExplain: number;
  readonly ShowDamageFont: number;
  readonly ShowDamageLog: number;
  readonly PetBuff_IconId: readonly [number, number];
  readonly PetId: number;
  readonly BuffUseType: number;
  readonly ApplyType: number;
  readonly BuffTarget: number;
  readonly ActEffect: number;
  readonly BuffEffect: number;
  readonly BuffEffectScale: number;
  readonly Icon: number;
  readonly Icon_Big: number;
  readonly BuffTime: number;
  readonly LevelUpBuffTime: number;
  readonly BuffType: number;
  readonly BuffIndexType_1: number;
  readonly BuffIndex_1: number;
  readonly BuffValue_1: number;
  readonly LevelUpBuffValue_1: number;
  readonly BuffValueEx_1: number;
  readonly BuffIndexType_2: number;
  readonly BuffIndex_2: number;
  readonly BuffValue_2: number;
  readonly LevelUpBuffValue_2: number;
  readonly BuffValueEx_2: number;
  readonly BuffIndexType_3: number;
  readonly BuffIndex_3: number;
  readonly BuffValue_3: number;
  readonly LevelUpBuffValue_3: number;
  readonly BuffValueEx_3: number;
  readonly BuffOverlap: number;
  readonly EffectSocket: string;
  readonly EffectSocket_Type: string;
  readonly EffectHeight: number;
  readonly BuffArmorType: number;
  readonly BuffProbability: number;
  readonly UpdateRule: number;
  readonly Emissive_Dcolor: readonly [number, number, number];
  readonly Fresnel_Exponenth: number;
  readonly Fresnel_BaseReflect: number;
  readonly BuffAttackID: number;
  readonly ExtinctionEffect: number;
  readonly ExtinctionEffectSocket: string;
  readonly OverLapCallGroupID: number;
  readonly KeepType_Die: number;
  readonly KeepType_StageOut: number;
  readonly KeepType_LogOut: number;
  readonly IsHideRemainTime: number;
  readonly detachBuffID: readonly number[];
}

export interface Mir4NativeBuffValueSlotEvidence {
  readonly slot: 1 | 2 | 3;
  readonly rawIndexType: number;
  readonly rawIndex: number;
  readonly rawValue: number;
  readonly rawLevelUpValue: number;
  readonly rawValueEx: number;
}

export interface Mir4NativeBuffProjection {
  /** Numeric source fields only; no target, subject, status, or CC enum names are inferred. */
  readonly application: {
    readonly rawBuffUseType: number;
    readonly rawApplyType: number;
    readonly rawBuffTarget: number;
    readonly rawBuffType: number;
    readonly rawProbability: number;
  };
  readonly duration: {
    readonly rawBaseSeconds: number;
    readonly rawLevelUpSeconds: number;
  };
  readonly update: {
    readonly rawUpdateRule: number;
    readonly rawBuffAttackId: number;
  };
  readonly overlap: {
    readonly rawBuffOverlap: number;
    readonly rawOverlapCallGroupId: number;
    readonly rawDetachBuffIds: readonly number[];
  };
  readonly valueSlots: readonly [
    Mir4NativeBuffValueSlotEvidence,
    Mir4NativeBuffValueSlotEvidence,
    Mir4NativeBuffValueSlotEvidence,
  ];
}

export type Mir4NativeBuffShippingGateRuling =
  | 'passes-proved-bounded-shipping-gate'
  | 'rejected-by-proved-bounded-shipping-gate';

export type Mir4NativeBuffUnresolvedReason =
  | 'target-runtime-consumer-not-located'
  | 'target-apply-enum-semantics-unresolved'
  | 'periodicity-consumer-not-proved'
  | 'calculated-holder-snapshot-unavailable'
  | 'index-type-2-consumer-not-located'
  | 'index-type-3-gameplay-consumer-not-located'
  | 'empty-effect-list'
  | 'mixed-index-types'
  | 'nonpositive-duration'
  | 'detach-consumer-not-located'
  | 'overlap-call-consumer-not-located';

export interface Mir4NativeBuffExecutionEvidence {
  /** The recovered Shipping gate is evidence, not authorization for this runtime. */
  readonly boundedShippingGate: Mir4NativeBuffShippingGateRuling;
  readonly status: 'blocked-unresolved';
  readonly unresolved: readonly Mir4NativeBuffUnresolvedReason[];
}

export interface Mir4NativeSkillBuffEvidence {
  readonly id: number;
  readonly source: 'BUFF.json';
  readonly role: Mir4NativeSkillBuffRole;
  readonly rawRecord: Mir4NativeBuffRawRecord;
  readonly projection: Mir4NativeBuffProjection;
  readonly execution: Mir4NativeBuffExecutionEvidence;
}

/** Exact fields from one relevant BUFF_OVERLAPCALL.json Rows entry. */
export interface Mir4NativeBuffOverlapCallRawRecord {
  readonly OverLapCallID: number;
  readonly OverLapCallGroupID: number;
  readonly BuffOverlapCntMin: number;
  readonly BuffOverlapCntMax: number;
  readonly AttachBuffID: readonly number[];
  readonly BuffOverlapLevel: number;
}

export interface Mir4NativeBuffOverlapCallEvidence {
  readonly id: number;
  readonly source: 'BUFF_OVERLAPCALL.json';
  readonly rawRecord: Mir4NativeBuffOverlapCallRawRecord;
  readonly projection: {
    readonly rawGroupId: number;
    readonly rawCountMin: number;
    readonly rawCountMax: number;
    readonly rawAttachBuffIds: readonly number[];
    readonly rawLevel: number;
  };
  readonly execution: {
    readonly status: 'blocked-unresolved';
    readonly reason: 'overlap-call-consumer-not-located';
  };
}

export type Mir4NativeBuffConsumerStatus = 'proved' | 'consumer-not-located';

export interface Mir4NativeBuffConsumerEvidenceItem {
  readonly status: Mir4NativeBuffConsumerStatus;
  readonly ruling: string;
  readonly sourcePath: string | null;
  readonly symbols: readonly string[];
}

export interface Mir4NativeBuffConsumerEvidenceCatalog {
  readonly nativeIndexType1Writer: Mir4NativeBuffConsumerEvidenceItem;
  readonly nativeIndexType2: Mir4NativeBuffConsumerEvidenceItem;
  readonly shippingIndexType3WireProjection: Mir4NativeBuffConsumerEvidenceItem;
  readonly nativeIndexType3Gameplay: Mir4NativeBuffConsumerEvidenceItem;
  readonly boundedShippingApplicationGate: Mir4NativeBuffConsumerEvidenceItem;
  readonly targetRuntime: Mir4NativeBuffConsumerEvidenceItem;
  readonly periodicity: Mir4NativeBuffConsumerEvidenceItem;
  readonly detach: Mir4NativeBuffConsumerEvidenceItem;
  readonly overlapCall: Mir4NativeBuffConsumerEvidenceItem;
}

export type Mir4NativeDeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: Mir4NativeDeepReadonly<T[Key]> }
  : T;

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

function valueSlots(rawRecord: Mir4NativeBuffRawRecord): Mir4NativeBuffProjection['valueSlots'] {
  return [
    {
      slot: 1,
      rawIndexType: rawRecord.BuffIndexType_1,
      rawIndex: rawRecord.BuffIndex_1,
      rawValue: rawRecord.BuffValue_1,
      rawLevelUpValue: rawRecord.LevelUpBuffValue_1,
      rawValueEx: rawRecord.BuffValueEx_1,
    },
    {
      slot: 2,
      rawIndexType: rawRecord.BuffIndexType_2,
      rawIndex: rawRecord.BuffIndex_2,
      rawValue: rawRecord.BuffValue_2,
      rawLevelUpValue: rawRecord.LevelUpBuffValue_2,
      rawValueEx: rawRecord.BuffValueEx_2,
    },
    {
      slot: 3,
      rawIndexType: rawRecord.BuffIndexType_3,
      rawIndex: rawRecord.BuffIndex_3,
      rawValue: rawRecord.BuffValue_3,
      rawLevelUpValue: rawRecord.LevelUpBuffValue_3,
      rawValueEx: rawRecord.BuffValueEx_3,
    },
  ];
}

function buildUnresolvedReasons(
  rawRecord: Mir4NativeBuffRawRecord,
  slots: Mir4NativeBuffProjection['valueSlots'],
): readonly Mir4NativeBuffUnresolvedReason[] {
  const reasons: Mir4NativeBuffUnresolvedReason[] = [
    'target-runtime-consumer-not-located',
    'target-apply-enum-semantics-unresolved',
    'periodicity-consumer-not-proved',
  ];
  const activeTypes = slots
    .filter((slot) => slot.rawIndexType !== 0)
    .map((slot) => slot.rawIndexType);
  const distinctActiveTypes = new Set(activeTypes);

  if (distinctActiveTypes.has(1)) reasons.push('calculated-holder-snapshot-unavailable');
  if (distinctActiveTypes.has(2)) reasons.push('index-type-2-consumer-not-located');
  if (distinctActiveTypes.has(3)) reasons.push('index-type-3-gameplay-consumer-not-located');
  if (activeTypes.length === 0) reasons.push('empty-effect-list');
  if (distinctActiveTypes.size > 1) reasons.push('mixed-index-types');
  if (rawRecord.BuffTime <= 0) reasons.push('nonpositive-duration');
  if (rawRecord.detachBuffID.some((buffId) => buffId !== 0)) {
    reasons.push('detach-consumer-not-located');
  }
  if (rawRecord.OverLapCallGroupID !== 0) reasons.push('overlap-call-consumer-not-located');

  return reasons;
}

function boundedShippingGateRuling(
  rawRecord: Mir4NativeBuffRawRecord,
  slots: Mir4NativeBuffProjection['valueSlots'],
): Mir4NativeBuffShippingGateRuling {
  const activeSlots = slots.filter((slot) => slot.rawIndexType !== 0);
  const passes =
    rawRecord.BuffTarget === 1 &&
    (rawRecord.ApplyType === 0 || rawRecord.ApplyType === 2) &&
    rawRecord.BuffProbability === 1000 &&
    rawRecord.UpdateRule === 0 &&
    rawRecord.BuffAttackID === 0 &&
    rawRecord.BuffTime > 0 &&
    activeSlots.length > 0 &&
    activeSlots.every((slot) => slot.rawIndexType === 3 && slot.rawIndex > 0);

  return passes
    ? 'passes-proved-bounded-shipping-gate'
    : 'rejected-by-proved-bounded-shipping-gate';
}

export function freezeMir4NativeSkillBuffEvidence(
  rawRecord: Mir4NativeBuffRawRecord,
  role: Mir4NativeSkillBuffRole,
): Mir4NativeSkillBuffEvidence {
  const slots = valueSlots(rawRecord);
  return deepFreeze({
    id: rawRecord.BuffId,
    source: 'BUFF.json' as const,
    role,
    rawRecord,
    projection: {
      application: {
        rawBuffUseType: rawRecord.BuffUseType,
        rawApplyType: rawRecord.ApplyType,
        rawBuffTarget: rawRecord.BuffTarget,
        rawBuffType: rawRecord.BuffType,
        rawProbability: rawRecord.BuffProbability,
      },
      duration: {
        rawBaseSeconds: rawRecord.BuffTime,
        rawLevelUpSeconds: rawRecord.LevelUpBuffTime,
      },
      update: {
        rawUpdateRule: rawRecord.UpdateRule,
        rawBuffAttackId: rawRecord.BuffAttackID,
      },
      overlap: {
        rawBuffOverlap: rawRecord.BuffOverlap,
        rawOverlapCallGroupId: rawRecord.OverLapCallGroupID,
        rawDetachBuffIds: rawRecord.detachBuffID,
      },
      valueSlots: slots,
    },
    execution: {
      boundedShippingGate: boundedShippingGateRuling(rawRecord, slots),
      status: 'blocked-unresolved' as const,
      unresolved: buildUnresolvedReasons(rawRecord, slots),
    },
  });
}

export function freezeMir4NativeBuffOverlapCallEvidence(
  rawRecord: Mir4NativeBuffOverlapCallRawRecord,
): Mir4NativeBuffOverlapCallEvidence {
  return deepFreeze({
    id: rawRecord.OverLapCallID,
    source: 'BUFF_OVERLAPCALL.json' as const,
    rawRecord,
    projection: {
      rawGroupId: rawRecord.OverLapCallGroupID,
      rawCountMin: rawRecord.BuffOverlapCntMin,
      rawCountMax: rawRecord.BuffOverlapCntMax,
      rawAttachBuffIds: rawRecord.AttachBuffID,
      rawLevel: rawRecord.BuffOverlapLevel,
    },
    execution: {
      status: 'blocked-unresolved' as const,
      reason: 'overlap-call-consumer-not-located' as const,
    },
  });
}

export function freezeMir4NativeBuffValue<T>(value: T): Mir4NativeDeepReadonly<T> {
  return deepFreeze(value) as Mir4NativeDeepReadonly<T>;
}
