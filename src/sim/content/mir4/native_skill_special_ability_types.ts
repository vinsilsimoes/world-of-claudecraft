/**
 * Runtime-neutral, lossless source shapes for bounded MIR4 special ability graphs.
 *
 * Field names intentionally match the JSON sources exactly. Numeric fields remain
 * numeric evidence: this module does not assign enum names, effect names, targets,
 * timing units, or execution behavior to them.
 */

export type Mir4NativeSkillSpecialAbilitySourceFile =
  | 'SKILL_SPECIAL_ABILITY.json'
  | 'SKILL_PASSIVE.json'
  | 'SKILL_ATTACK.json'
  | 'BUFF.json';

export interface Mir4NativeSkillSpecialAbilitySourceSeal {
  readonly fileName: Mir4NativeSkillSpecialAbilitySourceFile;
  readonly sha256: string;
  readonly scope: 'materialized-records' | 'referenced-ids-only';
}

/** Exact 10-key shape of a SKILL_SPECIAL_ABILITY.json source record. */
export interface Mir4NativeRawSkillSpecialAbilityRecord {
  readonly ID: number;
  readonly SkillId: number;
  readonly SkillMinLv: number;
  readonly SkillMaxLv: number;
  readonly TriggerSkillAttackId: number;
  readonly Passive: readonly number[];
  readonly PassivePartyBuffID: readonly number[];
  readonly PassivePartyBuffLv: readonly number[];
  readonly PartyPassive: readonly number[];
  readonly SkillOnlyPassive: readonly number[];
}

/** Exact 58-key shape of a SKILL_PASSIVE.json source record. */
export interface Mir4NativeRawSkillPassiveRecord {
  readonly PassiveId: number;
  readonly PassiveMainType: number;
  readonly PassiveName: number;
  readonly PassiveExplain: number;
  readonly ItemOptionGrade: number;
  readonly PassiveIcon: number;
  readonly PassiveTranceExplain: number;
  readonly LearnType: number;
  readonly ShowUI: number;
  readonly Class: number;
  readonly PassiveGroupID: number;
  readonly PassiveMaxGrade: number;
  readonly PassiveMaxLv: number;
  readonly ReqClassLevel: number;
  readonly ReqPassivePoint: number;
  readonly ReqPassivePointLevelUp: number;
  readonly ReqPassiveGroupLevel: number;
  readonly ReqPassiveGroupLevelUp: number;
  readonly NeedItem01Id: number;
  readonly NeedItem01Count: number;
  readonly NeedCost01ID: number;
  readonly NeedCost01Count: number;
  readonly NeedLevelUpCost01: number;
  readonly PassiveType: number;
  readonly TargetType: number;
  readonly CastingCondition: number;
  readonly ConditionValue01: number;
  readonly ConditionValue02: number;
  readonly ConditionPer: number;
  readonly LVConditionPer: number;
  readonly CoolTime: number;
  readonly LVCoolTime: number;
  readonly BuffTargetType: number;
  readonly SkillPassiveLevel: number;
  readonly BuffLink: number;
  readonly BuffLink1: number;
  readonly SpecialAbilityType: number;
  readonly SpecialAbilityValue01: number;
  readonly SpecialAbilityValue02: number;
  readonly AbilityType_1: number;
  readonly AbilityValue_1: number;
  readonly LevelUpAbilityValue_1: number;
  readonly AbilityValueEx_1: number;
  readonly AbilityType_2: number;
  readonly AbilityValue_2: number;
  readonly LevelUpAbilityValue_2: number;
  readonly AbilityValueEx_2: number;
  readonly IsSmite: boolean;
  readonly UIDescValue: number;
  readonly UIDescLevelUpValue: number;
  readonly UIDescValueEx: number;
  readonly UIDescLevelUpValueEx: number;
  readonly UIDescAbilityTime: number;
  readonly UIDescLevelUpTime: number;
  readonly UIDescBuffValue: number;
  readonly UIDescLevelUpBuffValue: number;
  readonly UIDescConditonPer: number;
}

export interface Mir4NativeSourceReferenceEdge<
  SourceFile extends Mir4NativeSkillSpecialAbilitySourceFile,
  SourceField extends string,
  TargetFile extends Mir4NativeSkillSpecialAbilitySourceFile,
> {
  readonly sourceFile: SourceFile;
  readonly sourceRecordId: number;
  readonly sourceField: SourceField;
  /** Null for scalar source fields; otherwise the exact source-array index. */
  readonly sourceIndex: number | null;
  readonly targetFile: TargetFile;
  readonly targetRecordId: number;
}

export type Mir4NativeSpecialAbilityPassiveReferenceField =
  | 'Passive'
  | 'PartyPassive'
  | 'SkillOnlyPassive';

export type Mir4NativeSpecialAbilityPassiveEdge = Mir4NativeSourceReferenceEdge<
  'SKILL_SPECIAL_ABILITY.json',
  Mir4NativeSpecialAbilityPassiveReferenceField,
  'SKILL_PASSIVE.json'
>;

export type Mir4NativeSpecialAbilityReferencedIdEdge =
  | (Mir4NativeSourceReferenceEdge<
      'SKILL_SPECIAL_ABILITY.json',
      'TriggerSkillAttackId',
      'SKILL_ATTACK.json'
    > & { readonly status: 'referenced-id-only' })
  | (Mir4NativeSourceReferenceEdge<
      'SKILL_SPECIAL_ABILITY.json',
      'PassivePartyBuffID',
      'BUFF.json'
    > & { readonly status: 'referenced-id-only' })
  | (Mir4NativeSourceReferenceEdge<'SKILL_PASSIVE.json', 'BuffLink' | 'BuffLink1', 'BUFF.json'> & {
      readonly status: 'referenced-id-only';
    });

export type Mir4NativeSkillSpecialAbilityUnresolvedReason =
  | 'special-ability-runtime-consumer-not-proved'
  | 'passive-runtime-consumer-not-proved'
  | 'passive-enum-semantics-unresolved'
  | 'referenced-skill-attack-records-not-materialized'
  | 'referenced-buff-records-not-materialized';

export interface Mir4NativeSkillSpecialAbilityExecutionEvidence {
  readonly status: 'blocked-unresolved';
  readonly unresolved: readonly Mir4NativeSkillSpecialAbilityUnresolvedReason[];
}

export interface Mir4NativeSkillSpecialAbilityCatalog<SkillId extends number = number> {
  readonly skillId: SkillId;
  /** Rows remain in source-file order. */
  readonly specialAbilityRecords: readonly Mir4NativeRawSkillSpecialAbilityRecord[];
  /** Rows remain in source-file order. */
  readonly passiveRecords: readonly Mir4NativeRawSkillPassiveRecord[];
  /** One edge per nonzero raw passive-array element, preserving field and index. */
  readonly passiveEdges: readonly Mir4NativeSpecialAbilityPassiveEdge[];
  /** Non-materialized SKILL_ATTACK and BUFF references only. */
  readonly referencedIdEdges: readonly Mir4NativeSpecialAbilityReferencedIdEdge[];
  readonly execution: Mir4NativeSkillSpecialAbilityExecutionEvidence;
}

export interface Mir4NativeSkillSpecialAbilityCatalogInput<SkillId extends number = number> {
  readonly skillId: SkillId;
  readonly specialAbilityRecords: readonly Mir4NativeRawSkillSpecialAbilityRecord[];
  readonly passiveRecords: readonly Mir4NativeRawSkillPassiveRecord[];
}

export type Mir4NativeSkillSpecialAbilityDeepReadonly<T> = T extends object
  ? { readonly [Key in keyof T]: Mir4NativeSkillSpecialAbilityDeepReadonly<T[Key]> }
  : T;

const SPECIAL_ABILITY_RAW_KEYS = [
  'ID',
  'SkillId',
  'SkillMinLv',
  'SkillMaxLv',
  'TriggerSkillAttackId',
  'Passive',
  'PassivePartyBuffID',
  'PassivePartyBuffLv',
  'PartyPassive',
  'SkillOnlyPassive',
] as const satisfies readonly (keyof Mir4NativeRawSkillSpecialAbilityRecord)[];

const PASSIVE_RAW_KEYS = [
  'PassiveId',
  'PassiveMainType',
  'PassiveName',
  'PassiveExplain',
  'ItemOptionGrade',
  'PassiveIcon',
  'PassiveTranceExplain',
  'LearnType',
  'ShowUI',
  'Class',
  'PassiveGroupID',
  'PassiveMaxGrade',
  'PassiveMaxLv',
  'ReqClassLevel',
  'ReqPassivePoint',
  'ReqPassivePointLevelUp',
  'ReqPassiveGroupLevel',
  'ReqPassiveGroupLevelUp',
  'NeedItem01Id',
  'NeedItem01Count',
  'NeedCost01ID',
  'NeedCost01Count',
  'NeedLevelUpCost01',
  'PassiveType',
  'TargetType',
  'CastingCondition',
  'ConditionValue01',
  'ConditionValue02',
  'ConditionPer',
  'LVConditionPer',
  'CoolTime',
  'LVCoolTime',
  'BuffTargetType',
  'SkillPassiveLevel',
  'BuffLink',
  'BuffLink1',
  'SpecialAbilityType',
  'SpecialAbilityValue01',
  'SpecialAbilityValue02',
  'AbilityType_1',
  'AbilityValue_1',
  'LevelUpAbilityValue_1',
  'AbilityValueEx_1',
  'AbilityType_2',
  'AbilityValue_2',
  'LevelUpAbilityValue_2',
  'AbilityValueEx_2',
  'IsSmite',
  'UIDescValue',
  'UIDescLevelUpValue',
  'UIDescValueEx',
  'UIDescLevelUpValueEx',
  'UIDescAbilityTime',
  'UIDescLevelUpTime',
  'UIDescBuffValue',
  'UIDescLevelUpBuffValue',
  'UIDescConditonPer',
] as const satisfies readonly (keyof Mir4NativeRawSkillPassiveRecord)[];

const PASSIVE_REFERENCE_FIELDS = [
  'Passive',
  'PartyPassive',
  'SkillOnlyPassive',
] as const satisfies readonly Mir4NativeSpecialAbilityPassiveReferenceField[];

function cloneEvidence<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneEvidence(item)) as T;
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneEvidence(item)]),
    ) as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

function failCatalogValidation(message: string): never {
  throw new Error(`Invalid native skill special ability evidence: ${message}`);
}

function validateRawKeyOrder(record: object, expectedKeys: readonly string[], label: string): void {
  const actualKeys = Object.keys(record);
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    failCatalogValidation(`${label} does not preserve the exact source key order`);
  }
}

function requireUniqueIds(ids: readonly number[], label: string): void {
  if (new Set(ids).size !== ids.length) {
    failCatalogValidation(`${label} contains duplicate IDs`);
  }
}

function buildPassiveEdges(
  specialAbilityRecords: readonly Mir4NativeRawSkillSpecialAbilityRecord[],
): readonly Mir4NativeSpecialAbilityPassiveEdge[] {
  return specialAbilityRecords.flatMap((record) =>
    PASSIVE_REFERENCE_FIELDS.flatMap((field) =>
      record[field].flatMap((targetRecordId, sourceIndex) =>
        targetRecordId === 0
          ? []
          : [
              {
                sourceFile: 'SKILL_SPECIAL_ABILITY.json' as const,
                sourceRecordId: record.ID,
                sourceField: field,
                sourceIndex,
                targetFile: 'SKILL_PASSIVE.json' as const,
                targetRecordId,
              },
            ],
      ),
    ),
  );
}

function buildReferencedIdEdges(
  specialAbilityRecords: readonly Mir4NativeRawSkillSpecialAbilityRecord[],
  passiveRecords: readonly Mir4NativeRawSkillPassiveRecord[],
): readonly Mir4NativeSpecialAbilityReferencedIdEdge[] {
  const edges: Mir4NativeSpecialAbilityReferencedIdEdge[] = [];

  for (const record of specialAbilityRecords) {
    if (record.TriggerSkillAttackId !== 0) {
      edges.push({
        sourceFile: 'SKILL_SPECIAL_ABILITY.json',
        sourceRecordId: record.ID,
        sourceField: 'TriggerSkillAttackId',
        sourceIndex: null,
        targetFile: 'SKILL_ATTACK.json',
        targetRecordId: record.TriggerSkillAttackId,
        status: 'referenced-id-only',
      });
    }
    record.PassivePartyBuffID.forEach((targetRecordId, sourceIndex) => {
      if (targetRecordId === 0) return;
      edges.push({
        sourceFile: 'SKILL_SPECIAL_ABILITY.json',
        sourceRecordId: record.ID,
        sourceField: 'PassivePartyBuffID',
        sourceIndex,
        targetFile: 'BUFF.json',
        targetRecordId,
        status: 'referenced-id-only',
      });
    });
  }

  for (const record of passiveRecords) {
    for (const sourceField of ['BuffLink', 'BuffLink1'] as const) {
      const targetRecordId = record[sourceField];
      if (targetRecordId === 0) continue;
      edges.push({
        sourceFile: 'SKILL_PASSIVE.json',
        sourceRecordId: record.PassiveId,
        sourceField,
        sourceIndex: null,
        targetFile: 'BUFF.json',
        targetRecordId,
        status: 'referenced-id-only',
      });
    }
  }

  return edges;
}

/**
 * Builds and seals a bounded graph. Malformed rows, duplicate identities, missing
 * passive targets, and supplied passive rows outside the selected graph all throw.
 */
export function buildMir4NativeSkillSpecialAbilityCatalog<const SkillId extends number>(
  input: Mir4NativeSkillSpecialAbilityCatalogInput<SkillId>,
): Mir4NativeSkillSpecialAbilityCatalog<SkillId> {
  const specialAbilityRecords = cloneEvidence(input.specialAbilityRecords);
  const passiveRecords = cloneEvidence(input.passiveRecords);

  if (specialAbilityRecords.length === 0) {
    failCatalogValidation(`skill ${input.skillId} has no special ability records`);
  }

  requireUniqueIds(
    specialAbilityRecords.map((record) => record.ID),
    'special ability rows',
  );
  requireUniqueIds(
    passiveRecords.map((record) => record.PassiveId),
    'passive rows',
  );

  for (const record of specialAbilityRecords) {
    validateRawKeyOrder(record, SPECIAL_ABILITY_RAW_KEYS, `special ability ${record.ID}`);
    if (record.SkillId !== input.skillId) {
      failCatalogValidation(
        `special ability ${record.ID} belongs to skill ${record.SkillId}, not ${input.skillId}`,
      );
    }
  }
  for (const record of passiveRecords) {
    validateRawKeyOrder(record, PASSIVE_RAW_KEYS, `passive ${record.PassiveId}`);
  }

  const passiveEdges = buildPassiveEdges(specialAbilityRecords);
  const passiveRecordIds = new Set(passiveRecords.map((record) => record.PassiveId));
  const referencedPassiveIds = new Set(passiveEdges.map((edge) => edge.targetRecordId));

  for (const passiveId of referencedPassiveIds) {
    if (!passiveRecordIds.has(passiveId)) {
      failCatalogValidation(`passive reference ${passiveId} has no selected source record`);
    }
  }
  for (const passiveId of passiveRecordIds) {
    if (!referencedPassiveIds.has(passiveId)) {
      failCatalogValidation(`selected passive ${passiveId} is outside the bounded graph`);
    }
  }

  return deepFreeze({
    skillId: input.skillId,
    specialAbilityRecords,
    passiveRecords,
    passiveEdges,
    referencedIdEdges: buildReferencedIdEdges(specialAbilityRecords, passiveRecords),
    execution: {
      status: 'blocked-unresolved' as const,
      unresolved: [
        'special-ability-runtime-consumer-not-proved',
        'passive-runtime-consumer-not-proved',
        'passive-enum-semantics-unresolved',
        'referenced-skill-attack-records-not-materialized',
        'referenced-buff-records-not-materialized',
      ] as const,
    },
  });
}

export function freezeMir4NativeSkillSpecialAbilityValue<T>(
  value: T,
): Mir4NativeSkillSpecialAbilityDeepReadonly<T> {
  return deepFreeze(cloneEvidence(value)) as Mir4NativeSkillSpecialAbilityDeepReadonly<T>;
}
