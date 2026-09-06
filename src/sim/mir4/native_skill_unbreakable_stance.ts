import { mir4NativeSkillActionById } from '../content/mir4';
import type { Mir4NativeSkillAttackRow } from '../content/mir4/native_skill_action_types';
import { mir4NativeSkillBuffEvidenceById } from '../content/mir4/native_skill_buff_evidence';

const SKILL_ID = 1502 as const;

export interface Mir4NativeStatusModifier {
  readonly statusId: number;
  /** Runtime-scale value: percentage STATUS values use 10,000 = 100%. */
  readonly magnitude: number;
}

export interface Mir4NativeUnbreakableStanceBuff {
  readonly buffId: 15011 | 15012 | 10113 | 10114 | 10116 | 10117 | 10127 | 10134;
  readonly durationMs: number;
  readonly statuses: readonly Mir4NativeStatusModifier[];
}

export interface Mir4NativeUnbreakableStancePolicy {
  readonly skillId: 1502;
  readonly skillLevel: number;
  readonly sourceAttackId: 150202;
  readonly usableWhileStunned: boolean;
  readonly persistentAllDamageReductionBasisPoints: number;
  readonly always: readonly Mir4NativeUnbreakableStanceBuff[];
  readonly whileStunned: readonly Mir4NativeUnbreakableStanceBuff[];
}

interface NativeBuffTemplate {
  readonly buffId: Mir4NativeUnbreakableStanceBuff['buffId'];
  readonly durationMs: number;
  readonly levelUpDurationMs: number;
  readonly statuses: readonly {
    readonly statusId: number;
    readonly value: number;
    readonly levelUpValue: number;
    readonly percentage: boolean;
  }[];
}

/**
 * Exact BUFF rows reached by SKILL_SPECIAL_ABILITY 1502.
 *
 * Source: the sealed client BUFF.json
 * sha256 797b38418ce5fd955cceb2d43012f82e4c864e1c0acea0ab5027f67b8142543b.
 * The direct 15011/15012 rows are additionally guarded through the materialized
 * evidence catalog below. Percentage-formatted native values use tenths of a
 * percent, so this boundary converts them once to the runtime's basis points.
 */
const SPECIAL_BUFFS = new Map<number, NativeBuffTemplate>([
  [
    10113,
    {
      buffId: 10113,
      durationMs: 10_000,
      levelUpDurationMs: 0,
      statuses: [{ statusId: 43, value: 200, levelUpValue: 100, percentage: true }],
    },
  ],
  [
    10114,
    {
      buffId: 10114,
      durationMs: 6_000,
      levelUpDurationMs: 2_000,
      statuses: [
        { statusId: 24, value: 500, levelUpValue: 100, percentage: false },
        { statusId: 26, value: 500, levelUpValue: 100, percentage: false },
      ],
    },
  ],
  [
    10116,
    {
      buffId: 10116,
      durationMs: 6_000,
      levelUpDurationMs: 2_000,
      statuses: [{ statusId: 49, value: 500, levelUpValue: 300, percentage: true }],
    },
  ],
  [
    10117,
    {
      buffId: 10117,
      durationMs: 6_000,
      levelUpDurationMs: 2_000,
      statuses: [{ statusId: 29, value: 250, levelUpValue: 150, percentage: false }],
    },
  ],
  [
    10127,
    {
      buffId: 10127,
      durationMs: 5_000,
      levelUpDurationMs: 0,
      statuses: [
        { statusId: 24, value: 250, levelUpValue: 0, percentage: false },
        { statusId: 26, value: 250, levelUpValue: 0, percentage: false },
      ],
    },
  ],
  [
    10134,
    {
      buffId: 10134,
      durationMs: 10_000,
      levelUpDurationMs: 0,
      statuses: [{ statusId: 35, value: 200, levelUpValue: 50, percentage: true }],
    },
  ],
]);

function directBuff(
  buffId: 15011 | 15012,
  skillLevel: number,
): Mir4NativeUnbreakableStanceBuff | null {
  const raw = mir4NativeSkillBuffEvidenceById(buffId)?.rawRecord;
  if (
    !raw ||
    raw.BuffTarget !== 1 ||
    raw.BuffIndexType_1 !== 1 ||
    raw.BuffIndexType_2 !== 0 ||
    raw.BuffIndexType_3 !== 0
  ) {
    return null;
  }
  const statusId = raw.BuffIndex_1;
  const percentage = statusId === 42;
  const nativeValue = raw.BuffValue_1 + (skillLevel - 1) * raw.LevelUpBuffValue_1;
  return Object.freeze({
    buffId,
    durationMs: Math.trunc((raw.BuffTime + (skillLevel - 1) * raw.LevelUpBuffTime) * 1_000),
    statuses: Object.freeze([
      Object.freeze({ statusId, magnitude: nativeValue * (percentage ? 10 : 1) }),
    ]),
  });
}

function specialBuff(
  buffId: 10113 | 10114 | 10116 | 10117 | 10127 | 10134,
  buffLevel: number,
): Mir4NativeUnbreakableStanceBuff | null {
  const template = SPECIAL_BUFFS.get(buffId);
  if (!template || !Number.isSafeInteger(buffLevel) || buffLevel < 1) return null;
  return Object.freeze({
    buffId,
    durationMs: template.durationMs + (buffLevel - 1) * template.levelUpDurationMs,
    statuses: Object.freeze(
      template.statuses.map((status) => {
        const nativeValue = status.value + (buffLevel - 1) * status.levelUpValue;
        return Object.freeze({
          statusId: status.statusId,
          magnitude: nativeValue * (status.percentage ? 10 : 1),
        });
      }),
    ),
  });
}

/** Direct row 150202 owns the two rank-scaled base buffs. */
export function mir4NativeUnbreakableStanceImpactBuffsMatchRow(
  rowOverride?: Mir4NativeSkillAttackRow,
): boolean {
  const row =
    rowOverride ??
    mir4NativeSkillActionById(SKILL_ID)?.rows.find((candidate) => candidate.attackId === 150202);
  const dodge = mir4NativeSkillBuffEvidenceById(15011)?.rawRecord;
  const monsterReduction = mir4NativeSkillBuffEvidenceById(15012)?.rawRecord;
  return (
    row?.nativeBehavior.buffIds.length === 2 &&
    row.nativeBehavior.buffIds[0] === 15011 &&
    row.nativeBehavior.buffIds[1] === 15012 &&
    dodge?.BuffTarget === 1 &&
    dodge.BuffTime === 20 &&
    dodge.BuffIndexType_1 === 1 &&
    dodge.BuffIndex_1 === 29 &&
    dodge.BuffValue_1 === 60 &&
    dodge.LevelUpBuffValue_1 === 10 &&
    monsterReduction?.BuffTarget === 1 &&
    monsterReduction.BuffTime === 10 &&
    monsterReduction.BuffIndexType_1 === 1 &&
    monsterReduction.BuffIndex_1 === 42 &&
    monsterReduction.BuffValue_1 === 200 &&
    monsterReduction.LevelUpBuffValue_1 === 0
  );
}

function required<T>(value: T | null): T {
  if (value === null) throw new Error('sealed Unbreakable Stance buff evidence is invalid');
  return value;
}

/** Compile the exact direct and rank-milestone buff graph for skill 1502. */
export function mir4NativeRuntimeUnbreakableStancePolicy(
  requestedSkillLevel: number,
): Mir4NativeUnbreakableStancePolicy | null {
  if (!mir4NativeUnbreakableStanceImpactBuffsMatchRow()) return null;
  if (!Number.isFinite(requestedSkillLevel)) return null;
  const skillLevel = Math.max(1, Math.min(10, Math.floor(requestedSkillLevel)));
  const always: Mir4NativeUnbreakableStanceBuff[] = [
    required(directBuff(15011, skillLevel)),
    required(directBuff(15012, skillLevel)),
  ];
  const whileStunned: Mir4NativeUnbreakableStanceBuff[] = [];
  let persistentAllDamageReductionBasisPoints = 0;
  let usableWhileStunned = false;

  if (skillLevel >= 10) {
    always.push(
      required(specialBuff(10113, 4)),
      required(specialBuff(10114, 2)),
      required(specialBuff(10116, 2)),
      required(specialBuff(10134, 7)),
    );
    whileStunned.push(required(specialBuff(10117, 2)));
    persistentAllDamageReductionBasisPoints = 600;
    usableWhileStunned = true;
  } else if (skillLevel >= 8) {
    always.push(
      required(specialBuff(10113, 2)),
      required(specialBuff(10114, 1)),
      required(specialBuff(10116, 1)),
      required(specialBuff(10134, 4)),
    );
    whileStunned.push(required(specialBuff(10117, 1)));
    persistentAllDamageReductionBasisPoints = 300;
    usableWhileStunned = true;
  } else if (skillLevel >= 5) {
    always.push(
      required(specialBuff(10113, 1)),
      required(specialBuff(10127, 1)),
      required(specialBuff(10134, 1)),
    );
  }

  return Object.freeze({
    skillId: SKILL_ID,
    skillLevel,
    sourceAttackId: 150202 as const,
    usableWhileStunned,
    persistentAllDamageReductionBasisPoints,
    always: Object.freeze(always),
    whileStunned: Object.freeze(whileStunned),
  });
}
