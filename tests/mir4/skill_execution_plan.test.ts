import { describe, expect, it } from 'vitest';
import { mir4NativeDirectSkillActionEvidenceById } from '../../src/sim/content/mir4/native_skill_action_evidence';
import type {
  Mir4NativeAttackBehaviorEvidence,
  Mir4NativeSkillAction,
  Mir4NativeSkillAttackRow,
  Mir4NativeSkillBehaviorEvidence,
} from '../../src/sim/content/mir4/native_skill_action_types';
import { type Mir4SkillDef, mir4SkillById } from '../../src/sim/content/mir4/skills_runtime';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';
import type {
  Mir4SkillExecutionIssueCode,
  Mir4SkillExecutionPlanResult,
} from '../../src/sim/mir4/skill_execution_types';

const ZERO_CHANNEL = {
  coefficient: 0,
  levelUpCoefficient: 0,
  additive: 0,
  levelUpAdditive: 0,
} as const;

const ZERO_ABILITY = { type: 0, value: 0, levelUpValue: 0, time: 0 } as const;

function safeSkillBehavior(): Mir4NativeSkillBehaviorEvidence {
  return {
    source: 'SKILL.json',
    skillType: 1,
    productType: 0,
    useControlTime: 0,
    conditionTarget: 0,
    conditionType: 0,
    conditionValue: 0,
    conditionRange: 0,
    conditionCheckTime: 0,
    chainUseSkillLevel: 0,
    chainSkillId: 0,
    chainSkillDelay: 0,
    chainSkillCount: 0,
    secondaryCostType: 0,
    secondaryCost: 0,
    darkChange: 0,
    damageType: 0,
    primaryDamage: { ...ZERO_CHANNEL },
    secondaryDamage: { ...ZERO_CHANNEL },
    abilities: [{ ...ZERO_ABILITY }, { ...ZERO_ABILITY }, { ...ZERO_ABILITY }, { ...ZERO_ABILITY }],
    stateConditionUse: false,
    moveConditionUse: false,
    passiveIds: [],
    smiteBuffIds: [],
    autoLearnPassiveIds: [],
    skillModPassiveIds: [],
  };
}

function safeAttackBehavior(
  damageType: 0 | 1,
  coefficient: number,
): Mir4NativeAttackBehaviorEvidence {
  return {
    source: 'SKILL_ATTACK.json',
    attackUseType: 0,
    rawTargetSubtype: 'TARGET_SUBTYPE::AliveOnly',
    impactSpawnType: 0,
    strikeDelay: 0,
    projectile: null,
    totem: null,
    buffIds: [],
    ccBuffIds: [],
    superIgnore: 0,
    superArmor: 0,
    actType: 0,
    ccUserCheck: 0,
    attackRagePoint: 0,
    // Every observed native row carries a non-zero rage value. The synthetic
    // green fixture deliberately uses the otherwise-unobserved zero sentinel so
    // the compiler cannot silently approve that unresolved native facet.
    hitRagePoint: 0 as Mir4NativeAttackBehaviorEvidence['hitRagePoint'],
    aggroRate: 0,
    damageType,
    damageAttribute: 0,
    physicalDamage:
      damageType === 1
        ? { ...ZERO_CHANNEL, coefficient, levelUpCoefficient: Math.floor(coefficient / 10) }
        : { ...ZERO_CHANNEL },
    magicDamage: { ...ZERO_CHANNEL },
    monsterScaleApply: false,
  };
}

function row(
  attackId: number,
  nextAttackId: number,
  coefficient: number,
  offsetMs: number,
  movement: Mir4NativeSkillAttackRow['movement'] = {
    kind: 'none',
    nativeRange: 0,
    delayMs: 0,
    durationMs: 0,
  },
): Mir4NativeSkillAttackRow {
  const damageType = coefficient === 0 ? 0 : 1;
  return {
    attackId,
    nativeBehavior: safeAttackBehavior(damageType, coefficient),
    mainAttack: 1,
    nextAttackId,
    impactStartMs: Math.max(0, offsetMs - 50),
    movement,
    viewTarget: 0,
    targetDistance: { nativeMin: 0, nativeMax: 500 },
    targetType: 0,
    authorialTargetValue: 0,
    targetSubtype: 'alive-only',
    impactType: 0,
    impactOffsetsMs: [offsetMs],
    geometry: {
      angleDegrees: 0,
      nativeDistanceMin: 0,
      nativeDistanceMax: 500,
      nativeWidth: 0,
      nativeHeight: 0,
      nativeOffset: { x: 0, y: 0, z: 0 },
      rotationDegrees: 0,
    },
    damage: {
      type: damageType,
      coefficient,
      levelUpCoefficient: Math.floor(coefficient / 10),
      attribute: 0,
    },
    reaction: {
      kind: 'none',
      stance: 'none',
      value: 0,
      nativeHeight: 0,
      valueEx: 0,
      durationMs: 0,
      probabilityPercent: 0,
      direction: 0,
    },
    guideEffectId: 0,
  };
}

function trivialFixture(): { action: Mir4NativeSkillAction; skill: Mir4SkillDef } {
  const setupRow = row(990_001_02, 990_001_03, 0, 100, {
    kind: 'target',
    nativeRange: -150,
    delayMs: 0,
    durationMs: 100,
  });
  const action: Mir4NativeSkillAction = {
    skillId: 990_001,
    nativeBehavior: safeSkillBehavior(),
    cooldownMs: 1000,
    skillCostType: 2,
    skillCost: 100,
    attackAnimationMs: 500,
    endCutAnimationMs: 450,
    // This deliberately is not the two-contact cardinality.
    hitCount: 99,
    requiredClassLevel: 1,
    targeting: true,
    blockingCheck: 0,
    indicator: {
      type: 0,
      index: 0,
      angleDegrees: 0,
      nativeMin: 0,
      nativeMax: 500,
      nativeWidth: 0,
      nativeOffset: 0,
      nativeHeight: 0,
    },
    presentation: {
      animationAssetPath: null,
      animationBindingConfidence: 'unresolved',
      vfxAssetPaths: [],
      guideAssetPaths: [],
      soundAssetPaths: [],
      cameraCurveAssetPaths: [],
      cameraShakeAssetPaths: [],
    },
    rows: [setupRow, row(990_001_03, 990_001_01, 1000, 200), row(990_001_01, 0, 2000, 200)],
  };
  const skill: Mir4SkillDef = {
    skillId: 990_001,
    classId: 1,
    slot: 1,
    displayName: 'Synthetic inert plan fixture',
    unlock: { kind: 'initial-deck' },
    cooldownMs: 1000,
    skillCostType: 2,
    skillCost: 100,
    attackAnimationMs: 500,
    hitCount: 99,
    requiresTarget: true,
    browserRangePx: 73,
    castRangePx: 73,
    attackIds: [990_001_02, 990_001_03, 990_001_01],
    impactOffsetsMs: [200, 200],
    damage: {
      components: [
        {
          attackId: 990_001_03,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 1000,
          levelUpCoefficient: 100,
          impactCount: 1,
        },
        {
          attackId: 990_001_01,
          damageType: 1,
          damageAttribute: 0,
          coefficient: 2000,
          levelUpCoefficient: 200,
          impactCount: 1,
        },
      ],
      aggregateCoefficient: 3000,
      aggregateLevelUpCoefficient: 300,
      allocationMode: 'per-impact',
    },
    roles: [],
    minTargets: null,
    effect: null,
    provenance: 'native-catalog',
    sourceRuntimeStatus: 'synthetic-test-only',
  };
  return { action, skill };
}

function actualResult(skillId: number): Mir4SkillExecutionPlanResult {
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  const skill = mir4SkillById(skillId);
  expect(action, `native action ${skillId}`).not.toBeNull();
  expect(skill, `runtime skill ${skillId}`).not.toBeNull();
  if (action === null || skill === null) throw new Error(`Missing MIR4 skill ${skillId}`);
  return compileMir4SkillExecutionPlan({
    source: 'runtime-approved',
    action,
    skill,
  });
}

function projectedRuntimeSkill(
  action: Mir4NativeSkillAction,
  classId: Mir4SkillDef['classId'],
  impactOffsetsMs: readonly number[] | undefined,
): Mir4SkillDef {
  const damageRows = action.rows.filter(
    (candidate) => candidate.damage.coefficient !== 0 || candidate.damage.levelUpCoefficient !== 0,
  );
  const components = damageRows.map((candidate) => ({
    attackId: candidate.attackId,
    damageType: candidate.damage.type,
    damageAttribute: candidate.damage.attribute,
    coefficient: candidate.damage.coefficient,
    levelUpCoefficient: candidate.damage.levelUpCoefficient,
    impactCount: candidate.impactOffsetsMs.length,
  }));
  // The compiler intentionally has no ruling that converts native indicator
  // coordinates into browser pixels. This helper therefore supplies only a
  // self-consistent runtime range while testing unrelated native blockers.
  const castRangePx = 0;
  return {
    skillId: action.skillId,
    classId,
    slot: 1,
    displayName: 'Synthetic runtime admission projection',
    unlock: { kind: 'initial-deck' },
    cooldownMs: action.cooldownMs,
    skillCostType: action.skillCostType,
    skillCost: action.skillCost,
    attackAnimationMs: action.attackAnimationMs,
    hitCount: action.hitCount,
    requiresTarget: action.targeting,
    browserRangePx: castRangePx,
    ...(action.targeting ? { castRangePx } : {}),
    attackIds: action.rows.map((candidate) => candidate.attackId),
    ...(impactOffsetsMs === undefined ? {} : { impactOffsetsMs }),
    damage:
      components.length === 0
        ? null
        : {
            components,
            aggregateCoefficient: components.reduce(
              (total, component) => total + component.coefficient,
              0,
            ),
            aggregateLevelUpCoefficient: components.reduce(
              (total, component) => total + component.levelUpCoefficient,
              0,
            ),
            allocationMode: 'per-impact',
          },
    roles: [],
    minTargets: null,
    effect: null,
    provenance: 'native-catalog',
    sourceRuntimeStatus: 'synthetic-test-only',
  };
}

function issueCodes(result: Mir4SkillExecutionPlanResult): string[] {
  expect(result.ok).toBe(false);
  return result.ok ? [] : result.issues.map((issue) => issue.code);
}

function expectDeepFrozen(value: unknown, seen = new Set<unknown>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  expect(Object.isFrozen(value)).toBe(true);
  for (const nested of Object.values(value)) expectDeepFrozen(nested, seen);
}

const UNRESOLVED_ATTACK_FACET_CASES: readonly [
  string,
  Mir4SkillExecutionIssueCode,
  (candidate: Mir4NativeSkillAttackRow) => Mir4NativeSkillAttackRow,
][] = [
  [
    'AttackUseType',
    'unresolved-attack-use-type',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, attackUseType: 1 },
    }),
  ],
  [
    'projectile',
    'unresolved-projectile',
    (candidate) => ({
      ...candidate,
      nativeBehavior: {
        ...candidate.nativeBehavior,
        projectile: {
          bulletType: 1,
          moveType: 1,
          count: 1,
          speed: 100,
          lifetime: 1,
          socketName: '',
          launchGapDelay: 0,
          effectId: 0,
          effectScale: 0,
          curveData: '',
          speedData: '',
          rotationOffset: { x: 0, y: 0, z: 0 },
          angleSpeed: 0,
          curveTime: 0,
          nativeHeight: 0,
        },
      },
    }),
  ],
  [
    'totem',
    'unresolved-totem',
    (candidate) => ({
      ...candidate,
      nativeBehavior: {
        ...candidate.nativeBehavior,
        totem: { id: 123, target: 0, time: 1, count: 1 },
      },
    }),
  ],
  [
    'buff reference',
    'unresolved-buff-reference',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, buffIds: [123] },
    }),
  ],
  [
    'super state',
    'unresolved-super-state',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, superArmor: 9000 },
    }),
  ],
  [
    'dual damage channel',
    'unresolved-dual-damage-channel',
    (candidate) => ({
      ...candidate,
      nativeBehavior: {
        ...candidate.nativeBehavior,
        magicDamage: { ...ZERO_CHANNEL, coefficient: 1 },
      },
    }),
  ],
  [
    'attack rage point',
    'unresolved-native-attack-facet',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, attackRagePoint: 1 },
    }),
  ],
  [
    'hit rage point',
    'unresolved-native-attack-facet',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, hitRagePoint: 240 },
    }),
  ],
  [
    'aggro rate',
    'unresolved-native-attack-facet',
    (candidate) => ({
      ...candidate,
      nativeBehavior: { ...candidate.nativeBehavior, aggroRate: 5000 },
    }),
  ],
  [
    'guide effect',
    'unresolved-native-attack-facet',
    (candidate) => ({ ...candidate, guideEffectId: 123 }),
  ],
];

describe('MIR4 inert skill execution plan compiler', () => {
  it('accepts only a fully reconciled trivial action and preserves source order', () => {
    const { action, skill } = trivialFixture();
    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.sourceHitCount).toBe(99);
    expect(result.plan.range).toEqual({ runtimePixels: 73, nativeMin: 0, nativeMax: 500 });
    expect(result.plan.rows.map((planRow) => planRow.attackId)).toEqual([
      990_001_02, 990_001_03, 990_001_01,
    ]);
    expect(result.plan.rows[0]).toMatchObject({
      motion: { kind: 'target', nativeRange: -150, delayMs: 0, durationMs: 100 },
      contacts: [],
    });
    expect(
      result.plan.rows.flatMap((planRow) =>
        planRow.contacts.map((contact) => ({
          attackId: planRow.attackId,
          offsetMs: contact.offsetMs,
        })),
      ),
    ).toEqual([
      { attackId: 990_001_03, offsetMs: 200 },
      { attackId: 990_001_01, offsetMs: 200 },
    ]);
    expect(Object.isFrozen(action)).toBe(false);
    expectDeepFrozen(result);
  });

  it('rejects non-zero damage classifications on a zero-damage setup row', () => {
    const { action, skill } = trivialFixture();
    const setup = action.rows[0];
    if (setup === undefined) throw new Error('Synthetic fixture must carry a setup row');
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        rows: [
          {
            ...setup,
            nativeBehavior: {
              ...setup.nativeBehavior,
              damageType: 3,
              damageAttribute: 6,
            },
            damage: { ...setup.damage, type: 3, attribute: 6 },
          },
          ...action.rows.slice(1),
        ],
      },
      skill,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[0].nativeBehavior.damageType',
          attackId: setup.attackId,
          expected: 0,
          actual: 3,
        },
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[0].nativeBehavior.damageAttribute',
          attackId: setup.attackId,
          expected: 0,
          actual: 6,
        },
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[0].damage.type',
          attackId: setup.attackId,
          expected: 0,
          actual: 3,
        },
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[0].damage.attribute',
          attackId: setup.attackId,
          expected: 0,
          actual: 6,
        },
      ]),
    );
  });

  it('rejects direct evidence before attempting any incidental promotion', () => {
    const { action } = trivialFixture();
    const firstRow = action.rows[0];
    if (firstRow === undefined) throw new Error('Synthetic fixture must carry a setup row');
    const result = compileMir4SkillExecutionPlan({
      source: 'direct-evidence-only',
      action: {
        ...action,
        cooldownMs: Number.NaN,
        rows: [
          {
            ...firstRow,
            movement: { ...firstRow.movement, kind: 'direct' },
          },
          ...action.rows.slice(1),
        ],
      },
    });

    expect(result).toEqual({
      ok: false,
      issues: [
        {
          code: 'direct-evidence-not-runtime-approved',
          path: 'source',
          actual: 'direct-evidence-only',
        },
      ],
    });
    expectDeepFrozen(result);
  });

  it('deep-freezes every issue and preserves issue discovery order', () => {
    const { action, skill } = trivialFixture();
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action,
      skill: {
        ...skill,
        cooldownMs: skill.cooldownMs + 1,
        skillCost: skill.skillCost + 1,
      },
    });

    expect(issueCodes(result).slice(0, 2)).toEqual(['cooldown-mismatch', 'skill-cost-mismatch']);
    expectDeepFrozen(result);
  });

  it('rejects a runtime browser range that contradicts the runtime cast range', () => {
    const { action, skill } = trivialFixture();
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action,
      skill: { ...skill, browserRangePx: skill.browserRangePx + 1 },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: 'range-mismatch',
      path: 'skill.browserRangePx',
      expected: skill.castRangePx,
      actual: skill.browserRangePx + 1,
    });
  });

  it('rejects an internal link that skips native row order', () => {
    const { action, skill } = trivialFixture();
    const first = action.rows[0];
    const third = action.rows[2];
    if (first === undefined || third === undefined) {
      throw new Error('Synthetic fixture must carry three rows');
    }
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        rows: [{ ...first, nextAttackId: third.attackId }, ...action.rows.slice(1)],
      },
      skill,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: 'broken-attack-link',
      path: 'action.rows[0].nextAttackId',
      attackId: first.attackId,
      relatedAttackId: third.attackId,
      expected: action.rows[1]?.attackId,
      actual: third.attackId,
    });
  });

  it('rejects a non-finite native timing with its row identity', () => {
    const { action, skill } = trivialFixture();
    const first = action.rows[0];
    if (first === undefined) throw new Error('Synthetic fixture must carry a setup row');
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        rows: [
          {
            ...first,
            movement: { ...first.movement, durationMs: Number.NaN },
          },
          ...action.rows.slice(1),
        ],
      },
      skill,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: 'invalid-timing',
      path: 'action.rows[0].movement.durationMs',
      attackId: first.attackId,
      actual: 'NaN',
    });
  });

  it('rejects mirrored non-finite native and runtime damage evidence', () => {
    const { action, skill } = trivialFixture();
    const nativeDamageRow = action.rows[1];
    const damage = skill.damage;
    const runtimeComponent = damage?.components[0];
    if (nativeDamageRow === undefined || damage === null || runtimeComponent === undefined) {
      throw new Error('Synthetic fixture must carry a first damage row and component');
    }
    const rows = action.rows.map((candidate, index) =>
      index === 1
        ? {
            ...candidate,
            nativeBehavior: {
              ...candidate.nativeBehavior,
              physicalDamage: {
                ...candidate.nativeBehavior.physicalDamage,
                coefficient: Number.POSITIVE_INFINITY,
              },
            },
            damage: { ...candidate.damage, coefficient: Number.POSITIVE_INFINITY },
          }
        : candidate,
    );
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: { ...action, skillId: Number.POSITIVE_INFINITY, rows },
      skill: {
        ...skill,
        skillId: Number.POSITIVE_INFINITY,
        damage: {
          ...damage,
          components: [
            { ...runtimeComponent, coefficient: Number.POSITIVE_INFINITY },
            ...damage.components.slice(1),
          ],
          aggregateCoefficient: Number.POSITIVE_INFINITY,
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: 'invalid-native-value',
          path: 'action.skillId',
          actual: 'Infinity',
        },
        {
          code: 'invalid-runtime-value',
          path: 'skill.skillId',
          actual: 'Infinity',
        },
        {
          code: 'invalid-native-value',
          path: 'action.rows[1].nativeBehavior.physicalDamage.coefficient',
          attackId: nativeDamageRow.attackId,
          actual: 'Infinity',
        },
        {
          code: 'invalid-native-value',
          path: 'action.rows[1].damage.coefficient',
          attackId: nativeDamageRow.attackId,
          actual: 'Infinity',
        },
        {
          code: 'invalid-runtime-value',
          path: 'skill.damage.components[0].coefficient',
          attackId: runtimeComponent.attackId,
          actual: 'Infinity',
        },
        {
          code: 'invalid-runtime-value',
          path: 'skill.damage.aggregateCoefficient',
          actual: 'Infinity',
        },
      ]),
    );
  });

  it('rejects omitted action-level native execution facets', () => {
    const { action, skill } = trivialFixture();
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: {
          ...action.nativeBehavior,
          damageType: 1,
          primaryDamage: { ...action.nativeBehavior.primaryDamage, coefficient: 1 },
        },
        blockingCheck: 1,
        indicator: { ...action.indicator, type: 1 },
      },
      skill,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unresolved-native-skill-facet',
          path: 'action.nativeBehavior.primaryDamage',
        }),
        expect.objectContaining({
          code: 'unresolved-native-skill-facet',
          path: 'action.nativeBehavior.damageType',
        }),
        expect.objectContaining({
          code: 'unresolved-native-skill-facet',
          path: 'action.blockingCheck',
        }),
        expect.objectContaining({
          code: 'unresolved-native-skill-facet',
          path: 'action.indicator.type',
        }),
      ]),
    );
  });

  it('rejects duplicate ids, broken links, and decreasing or invalid timings', () => {
    const { action, skill } = trivialFixture();
    const duplicateAttackId = action.rows[0]?.attackId ?? -1;
    const rows = action.rows.map((candidate, index) => {
      if (index === 0) {
        return {
          ...candidate,
          movement: { ...candidate.movement, durationMs: Number.NaN },
        };
      }
      if (index === 1) return { ...candidate, attackId: duplicateAttackId };
      if (index === 2) {
        return {
          ...candidate,
          impactStartMs: 199,
          impactOffsetsMs: [199],
        };
      }
      return candidate;
    });
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: { ...action, rows },
      skill,
    });

    const codes = issueCodes(result);
    expect(codes).toContain('duplicate-attack-id');
    expect(codes).toContain('external-attack-link');
    expect(codes).toContain('invalid-timing');
    expect(codes).toContain('decreasing-timing');
    expect(codes).toContain('impact-offset-mismatch');
  });

  it.each([
    ['offset', 'impact-offset-mismatch'],
    ['coefficient', 'damage-coefficient-mismatch'],
    ['impact-count', 'damage-impact-count-mismatch'],
    ['allocation', 'unsupported-damage-allocation'],
  ] as const)('rejects a runtime %s mismatch', (kind, expectedCode) => {
    const { action, skill } = trivialFixture();
    const damage = skill.damage;
    if (damage === null) throw new Error('Synthetic fixture must carry damage');
    const first = damage.components[0];
    const second = damage.components[1];
    if (first === undefined || second === undefined) {
      throw new Error('Synthetic fixture must carry two damage components');
    }
    const changedSkill: Mir4SkillDef = {
      ...skill,
      impactOffsetsMs: kind === 'offset' ? [201, 200] : skill.impactOffsetsMs,
      damage: {
        ...damage,
        allocationMode: kind === 'allocation' ? 'unruled-mode' : damage.allocationMode,
        components: [
          {
            ...first,
            coefficient: kind === 'coefficient' ? first.coefficient + 1 : first.coefficient,
            impactCount: kind === 'impact-count' ? first.impactCount + 1 : first.impactCount,
          },
          second,
        ],
      },
    };
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action,
      skill: changedSkill,
    });

    expect(issueCodes(result)).toContain(expectedCode);
  });

  it('keeps multi-impact allocation closed until a typed ruling exists', () => {
    const { action, skill } = trivialFixture();
    const rows = action.rows.map((candidate, index) =>
      index === 1 ? { ...candidate, impactOffsetsMs: [190, 200] } : candidate,
    );
    const damage = skill.damage;
    if (damage === null) throw new Error('Synthetic fixture must carry damage');
    const first = damage.components[0];
    if (first === undefined) throw new Error('Synthetic fixture must carry a first component');
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: { ...action, rows },
      skill: {
        ...skill,
        impactOffsetsMs: [190, 200, 200],
        damage: {
          ...damage,
          components: [{ ...first, impactCount: 2 }, ...damage.components.slice(1)],
          allocationMode: 'per-impact',
        },
      },
    });

    expect(issueCodes(result)).toContain('unsupported-damage-allocation');
  });

  it('bounds motion from the row start plus its delay and duration', () => {
    const { action, skill } = trivialFixture();
    const rows = action.rows.map((candidate, index) =>
      index === 0
        ? {
            ...candidate,
            movement: { ...candidate.movement, delayMs: 400, durationMs: 100 },
          }
        : candidate,
    );
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: { ...action, rows },
      skill,
    });

    expect(issueCodes(result)).toContain('timing-outside-animation');
  });

  it.each(UNRESOLVED_ATTACK_FACET_CASES)(
    'rejects an unresolved %s facet',
    (_name, expectedCode, mutate) => {
      const { action, skill } = trivialFixture();
      const rows = action.rows.map((candidate, index) =>
        index === 1 ? mutate(candidate) : candidate,
      );
      const result = compileMir4SkillExecutionPlan({
        source: 'runtime-approved',
        action: { ...action, rows },
        skill,
      });

      expect(issueCodes(result)).toContain(expectedCode);
    },
  );

  it('compiles Warrior 1101 only after the exact Berserk contracts are admitted', () => {
    expect(mir4SkillById(1101)?.sourceRuntimeStatus).toBe('official-client-catalog');
    const result = actualResult(1101);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.rows.flatMap((row) =>
        row.contacts.map((contact) => [row.attackId, contact.offsetMs]),
      ),
    ).toEqual([
      [110100, 20],
      [110101, 650],
    ]);
  });

  it('compiles the exact Warrior 1102 action without silently approving other skills', () => {
    expect(mir4SkillById(1102)?.sourceRuntimeStatus).toBe('authorial-runtime-unhomologated');
    const result = actualResult(1102);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.nativeSkill).not.toBeNull();
    if (result.plan.nativeSkill === null) return;
    expect(result.plan.nativeSkill).toMatchObject({
      darkChange: {
        nativeMode: 1,
        presentationOnly: true,
        clientOption: 'G_SkillDarkChange',
      },
      autoLearnPassiveIds: [],
      skillModPassiveIds: [],
    });
    expect(result.plan.nativeSkill.abilities[3]).toMatchObject({
      type: 0,
      time: 20,
      active: false,
    });
    expect(result.plan.nativeSkill.passiveEligibilityIds).toHaveLength(89);
  });

  it('keeps mutated 1102 source facets fail closed', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: {
          ...action.nativeBehavior,
          darkChange: 3,
          abilities: action.nativeBehavior.abilities.map((ability, index) =>
            index === 3 ? { ...ability, type: 20 } : ability,
          ) as unknown as Mir4NativeSkillBehaviorEvidence['abilities'],
          passiveIds: action.nativeBehavior.passiveIds.slice(1),
        },
      },
      skill,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'action.nativeBehavior.darkChange', actual: 3 }),
        expect.objectContaining({ path: 'action.nativeBehavior.abilities[3]' }),
        expect.objectContaining({ path: 'action.nativeBehavior.passiveIds' }),
      ]),
    );
  });

  it('recognizes the exact 1102 dynamic native contact-range policy', () => {
    const result = actualResult(1102);
    const resolvedPaths = new Set([
      'skill.castRangePx',
      'skill.browserRangePx',
      'action.blockingCheck',
      'action.indicator.nativeHeight',
    ]);
    expect(result.ok ? [] : result.issues.filter((issue) => resolvedPaths.has(issue.path))).toEqual(
      [],
    );
  });

  it('recognizes only the exact 1102 setup guide and skill indicator', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    const resolvedPaths = new Set([
      'action.indicator.index',
      'action.indicator.nativeWidth',
      'action.rows[0].guideEffectId',
    ]);
    expect(exact.ok ? [] : exact.issues.filter((issue) => resolvedPaths.has(issue.path))).toEqual(
      [],
    );

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        indicator: { ...action.indicator, nativeWidth: 501 },
        rows: action.rows.map((row) =>
          row.attackId === 110201
            ? { ...row, nativeBehavior: row.nativeBehavior, guideEffectId: 102 }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unresolved-native-skill-facet',
          path: 'action.indicator.nativeWidth',
          actual: 501,
        }),
        expect.objectContaining({
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[0].guideEffectId',
          attackId: 110201,
          actual: 102,
        }),
      ]),
    );
  });

  it('recognizes only the exact native 1102 reaction rows admitted by the runtime', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(exact.ok).toBe(true);

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110203
            ? {
                ...row,
                nativeBehavior: row.nativeBehavior,
                reaction: { ...row.reaction, durationMs: row.reaction.durationMs + 1 },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-hit-reaction',
        attackId: 110203,
        path: 'action.rows[2].reaction',
      }),
    );
  });

  it('recognizes only the exact 1102 AttackRagePoint rows admitted by the runtime', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(
      exact.ok
        ? []
        : exact.issues.filter((issue) => issue.path.endsWith('.nativeBehavior.attackRagePoint')),
    ).toEqual([]);

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110203
            ? {
                ...row,
                nativeBehavior: {
                  ...row.nativeBehavior,
                  attackRagePoint: row.nativeBehavior.attackRagePoint + 1,
                },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual({
      code: 'unresolved-native-attack-facet',
      path: 'action.rows[2].nativeBehavior.attackRagePoint',
      attackId: 110203,
      expected: 0,
      actual: 500,
    });
  });

  it('compiles the exact recovered 1104 Down02, Smite, and runtime-effect tuples', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1104);
    const skill = mir4SkillById(1104);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1104');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(exact.ok).toBe(true);
    if (!exact.ok) return;
    expect(exact.plan.nativeSkill).toMatchObject({
      skillId: 1104,
      smiteBuffIds: [10010],
      autoLearnPassiveIds: [101001],
    });

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110402
            ? {
                ...row,
                nativeBehavior: row.nativeBehavior,
                reaction: { ...row.reaction, value: row.reaction.value + 1 },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-hit-reaction',
        attackId: 110402,
        path: 'action.rows[1].reaction',
      }),
    );
  });

  it('keeps changed 1104 passive and Smite tuples fail closed', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1104);
    const skill = mir4SkillById(1104);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1104');

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: {
          ...action.nativeBehavior,
          passiveIds: action.nativeBehavior.passiveIds.slice(1),
          smiteBuffIds: [10011],
        },
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'action.nativeBehavior.passiveIds' }),
        expect.objectContaining({ path: 'action.nativeBehavior.smiteBuffIds' }),
      ]),
    );
  });

  it('recognizes only the exact 1102 HitRagePoint and AggroRate rows admitted by runtime', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(
      exact.ok
        ? []
        : exact.issues.filter(
            (issue) =>
              issue.path.endsWith('.nativeBehavior.hitRagePoint') ||
              issue.path.endsWith('.nativeBehavior.aggroRate'),
          ),
    ).toEqual([]);

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110203
            ? {
                ...row,
                nativeBehavior: {
                  ...row.nativeBehavior,
                  hitRagePoint: 320,
                  aggroRate: 8_000,
                },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toEqual(
      expect.arrayContaining([
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[2].nativeBehavior.hitRagePoint',
          attackId: 110203,
          expected: 0,
          actual: 320,
        },
        {
          code: 'unresolved-native-attack-facet',
          path: 'action.rows[2].nativeBehavior.aggroRate',
          attackId: 110203,
          expected: 0,
          actual: 8_000,
        },
      ]),
    );
  });

  it('recognizes only the exact 1102 SKILL damage aggregate admitted by the runtime', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1102);
    const skill = mir4SkillById(1102);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1102');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    const aggregatePaths = new Set([
      'action.nativeBehavior.primaryDamage',
      'action.nativeBehavior.damageType',
    ]);
    expect(exact.ok ? [] : exact.issues.filter((issue) => aggregatePaths.has(issue.path))).toEqual(
      [],
    );

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: {
          ...action.nativeBehavior,
          primaryDamage: {
            ...action.nativeBehavior.primaryDamage,
            coefficient: action.nativeBehavior.primaryDamage.coefficient + 1,
          },
        },
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual(
      expect.objectContaining({
        code: 'unresolved-native-skill-facet',
        path: 'action.nativeBehavior.primaryDamage',
      }),
    );
  });

  it('accepts only the exact inert zero-kind reaction on the 1103 setup row', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1103);
    const skill = mir4SkillById(1103);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1103');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(
      exact.ok
        ? []
        : exact.issues.filter(
            (issue) =>
              issue.attackId === 110105 &&
              issue.path === 'action.rows[0].reaction' &&
              issue.code === 'unresolved-hit-reaction',
          ),
    ).toEqual([]);

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110105
            ? {
                ...row,
                nativeBehavior: row.nativeBehavior,
                reaction: { ...row.reaction, probabilityPercent: 99 },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual({
      code: 'unresolved-hit-reaction',
      path: 'action.rows[0].reaction',
      attackId: 110105,
      actual: 'none',
    });
  });

  it('accepts only the exact native PushToPoint tuple on Warrior 1103 contact one', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1103);
    const skill = mir4SkillById(1103);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1103');

    const exact = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(
      exact.ok
        ? []
        : exact.issues.filter(
            (issue) =>
              issue.attackId === 110106 &&
              issue.path === 'action.rows[1].reaction' &&
              issue.code === 'unresolved-hit-reaction',
          ),
    ).toEqual([]);

    const changed = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110106
            ? {
                ...row,
                nativeBehavior: row.nativeBehavior,
                reaction: { ...row.reaction, value: row.reaction.value + 1 },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) return;
    expect(changed.issues).toContainEqual({
      code: 'unresolved-hit-reaction',
      path: 'action.rows[1].reaction',
      attackId: 110106,
      actual: 'push-to-point',
    });
  });

  it('opens Warrior 1103 only when its indicator and super-state tuples are exact', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1103);
    const skill = mir4SkillById(1103);
    if (action === null || skill === null) throw new Error('Missing MIR4 skill 1103');

    expect(compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill }).ok).toBe(
      true,
    );

    const changedIndicator = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        indicator: { ...action.indicator, nativeWidth: 501 },
      },
      skill,
    });
    expect(changedIndicator.ok).toBe(false);
    if (!changedIndicator.ok) {
      expect(changedIndicator.issues).toContainEqual(
        expect.objectContaining({ path: 'action.indicator.nativeWidth', actual: 501 }),
      );
    }

    const changedSuperState = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action: {
        ...action,
        nativeBehavior: action.nativeBehavior,
        rows: action.rows.map((row) =>
          row.attackId === 110107
            ? {
                ...row,
                nativeBehavior: { ...row.nativeBehavior, ccUserCheck: 0 },
              }
            : row,
        ),
      },
      skill,
    });
    expect(changedSuperState.ok).toBe(false);
    if (!changedSuperState.ok) {
      expect(changedSuperState.issues).toContainEqual(
        expect.objectContaining({
          code: 'unresolved-super-state',
          attackId: 110107,
          path: 'action.rows[2].nativeBehavior.ccUserCheck',
          actual: 0,
        }),
      );
    }
  });

  it('compiles Warrior 1501 only after every native facet has a typed consumer', () => {
    const result = actualResult(1501);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.rows.map((row) => row.attackId)).toEqual([
      150101, 150102, 150103, 150104, 150105,
    ]);
    expect(
      result.plan.rows.flatMap((row) => row.contacts.map((contact) => contact.offsetMs)),
    ).toEqual([20, 225, 375, 540, 640, 840, 900, 1050, 1275]);
    expect(result.plan.rows.map((row) => row.guide?.guideShape)).toEqual([
      'circle',
      'circle',
      'circle',
      'circle',
      'circle',
    ]);
    expect(result.plan.nativeSkill).toMatchObject({
      skillId: 1501,
      darkChange: { nativeMode: 3, presentationOnly: true },
      smiteBuffIds: [10020],
      autoLearnPassiveIds: [101002],
      skillModPassiveIds: [],
    });
  });

  it('compiles Burst Shell as three zero-damage setup rows plus its five-contact Totem', () => {
    const result = actualResult(4103);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.plan.range).toMatchObject({
      nativeContactDistanceMax: 1200,
      nativeTraceStopPadding: 100,
      nativeTargetHeight: 800,
      blockingCheck: true,
    });
    expect(result.plan.rows.map((row) => row.attackId)).toEqual([410301, 410302, 410303]);
    expect(result.plan.rows.every((row) => row.contacts.length === 0)).toBe(true);
    expect(result.plan.totem?.contacts.map((contact) => contact.offsetMs)).toEqual([
      1450, 1500, 1600, 1700, 1750,
    ]);
  });

  it.each([
    [4106, 410603],
    [4112, 411203],
  ] as const)('rejects external attack links for %i', (skillId, externalAttackId) => {
    const result = actualResult(skillId);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'external-attack-link',
        relatedAttackId: externalAttackId,
      }),
    );
  });

  it('rejects direct motion in 4113', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(4113);
    if (action === null) throw new Error('Missing native action 4113');
    const skill = projectedRuntimeSkill(
      action,
      4,
      action.rows.flatMap((candidate) =>
        candidate.damage.coefficient === 0 && candidate.damage.levelUpCoefficient === 0
          ? []
          : candidate.impactOffsetsMs,
      ),
    );
    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    expect(issueCodes(result)).toContain('unsupported-direct-movement');
  });

  it('preserves the two reviewed dead-only resurrection rows in 3504', () => {
    const result = actualResult(3504);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.plan.rows.map((row) => [row.attackId, row.target.targetSubtype]),
    ).toEqual([
      [350401, 'alive-only'],
      [350402, 'alive-only'],
      [350403, 'dead-only'],
      [350404, 'dead-only'],
    ]);
  });

  it('keeps the current 1403 authorial runtime closed against its native timeline', () => {
    const action = mir4NativeDirectSkillActionEvidenceById(1403);
    if (action === null) throw new Error('Missing native action 1403');
    const result = compileMir4SkillExecutionPlan({
      source: 'runtime-approved',
      action,
      skill: projectedRuntimeSkill(action, 1, undefined),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: 'runtime-impact-offsets-missing',
      path: 'skill.impactOffsetsMs',
      expected: '780,1500,1720,2560',
      actual: null,
    });
  });
});
