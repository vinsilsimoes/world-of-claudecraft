import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import type {
  Mir4NativeTotemAttackRow,
  Mir4NativeTotemCatalogEntry,
} from '../content/mir4/native_skill_totem_types';
import type {
  Mir4NativeTotemRuntimeContactPlan,
  Mir4NativeTotemRuntimePlan,
} from './native_skill_totem_runtime';
import { mir4NativeDistanceToYards } from './native_skill_units';

const EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    attackId: 240321,
    impactStartMs: 0,
    impactOffsetsMs: Object.freeze([455, 600, 700]),
    coefficient: 20_400,
    levelUpCoefficient: 450,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    reactionValue: 20,
    reactionHeight: 0,
    reactionValueEx: 0.2,
    reactionDurationMs: 600,
    guideEffectId: 102,
  }),
  Object.freeze({
    attackId: 240322,
    impactStartMs: 900,
    impactOffsetsMs: Object.freeze([1050, 1150]),
    coefficient: 13_600,
    levelUpCoefficient: 300,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    reactionValue: -20,
    reactionHeight: 0,
    reactionValueEx: 0.2,
    reactionDurationMs: 600,
    guideEffectId: 0,
  }),
  Object.freeze({
    attackId: 240323,
    impactStartMs: 1300,
    impactOffsetsMs: Object.freeze([1400]),
    coefficient: 6800,
    levelUpCoefficient: 150,
    reactionKind: 'knock-down' as const,
    stance: 'down-02' as const,
    reactionValue: 0,
    reactionHeight: 700,
    reactionValueEx: 0.9,
    reactionDurationMs: 2100,
    guideEffectId: 0,
  }),
  Object.freeze({
    attackId: 240324,
    impactStartMs: 1600,
    impactOffsetsMs: Object.freeze([1700, 1900, 2100]),
    coefficient: 20_400,
    levelUpCoefficient: 450,
    reactionKind: 'hit' as const,
    stance: 'hit-01' as const,
    reactionValue: 0,
    reactionHeight: 0,
    reactionValueEx: 0,
    reactionDurationMs: 200,
    guideEffectId: 0,
  }),
  Object.freeze({
    attackId: 240325,
    impactStartMs: 2380,
    impactOffsetsMs: Object.freeze([2580]),
    coefficient: 6800,
    levelUpCoefficient: 150,
    reactionKind: 'hit' as const,
    stance: 'hit-01' as const,
    reactionValue: 0,
    reactionHeight: 0,
    reactionValueEx: 0,
    reactionDurationMs: 200,
    guideEffectId: 0,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Dragon Tornado Totem mismatch: ${message}`);
}

function validateAreaRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof EXPECTED_ROWS)[number],
): void {
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(
    row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 1700,
    `AttackID ${row.attackId} TargetDistance`,
  );
  invariant(
    row.impactType === 2 && row.authorialTargetValue === 10,
    `AttackID ${row.attackId} area target contract`,
  );
  invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  invariant(
    row.geometry.nativeDistanceMin === 0 && row.geometry.nativeDistanceMax === 700,
    `AttackID ${row.attackId} AttackDistance`,
  );
  invariant(row.geometry.nativeHeight === 400, `AttackID ${row.attackId} AttackHeight`);
  invariant(
    row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 300,
    `AttackID ${row.attackId} LocationOffset`,
  );
  invariant(row.geometry.rotationDegrees === 0, `AttackID ${row.attackId} RotationOffset`);
  invariant(
    row.damage.type === 2 && row.damage.attribute === 0,
    `AttackID ${row.attackId} damage channel`,
  );
  invariant(
    row.damage.coefficient === expected.coefficient,
    `AttackID ${row.attackId} coefficient`,
  );
  invariant(
    row.damage.levelUpCoefficient === expected.levelUpCoefficient,
    `AttackID ${row.attackId} level coefficient`,
  );
  invariant(
    row.reaction.kind === expected.reactionKind && row.reaction.stance === expected.stance,
    `AttackID ${row.attackId} reaction kind`,
  );
  invariant(
    row.reaction.value === expected.reactionValue,
    `AttackID ${row.attackId} reaction value`,
  );
  invariant(
    row.reaction.nativeHeight === expected.reactionHeight,
    `AttackID ${row.attackId} reaction height`,
  );
  invariant(
    row.reaction.valueEx === expected.reactionValueEx,
    `AttackID ${row.attackId} reaction movement time`,
  );
  invariant(
    row.reaction.durationMs === expected.reactionDurationMs,
    `AttackID ${row.attackId} reaction duration`,
  );
  invariant(
    row.reaction.probabilityPercent === 10 && row.reaction.direction === 0,
    `AttackID ${row.attackId} reaction admission`,
  );
  invariant(row.guideEffectId === expected.guideEffectId, `AttackID ${row.attackId} GuideEffect`);
  invariant(
    row.impactOffsetsMs.length === expected.impactOffsetsMs.length &&
      row.impactOffsetsMs.every((offset, index) => offset === expected.impactOffsetsMs[index]),
    `AttackID ${row.attackId} impact vector`,
  );
}

function area(row: Mir4NativeTotemAttackRow): Mir4NativeTotemRuntimeContactPlan['area'] {
  return {
    impactType: 2,
    radiusMinYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin),
    radiusMaxYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
    heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
    targetCap: row.authorialTargetValue,
    nativeOffset: { ...row.geometry.nativeOffset },
  };
}

/** Compile Dragon Tornado's reviewed ten-contact Totem graph from extracted evidence. */
export function compileMir4DragonTornadoTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 2403, 'SkillId');
  invariant(entry.record.TotemId === 1013, 'TotemId');
  invariant(entry.bridge.SkillId === 2403 && entry.bridge.AttackID === 240302, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1013 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 6 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 240321 &&
      entry.record.AttackDelay === 8 &&
      entry.record.Cleartime === 6 &&
      entry.record.DetectRange === 3000,
    'Totem lifecycle',
  );
  invariant(
    entry.record.PhysicalAttack === 200 &&
      entry.record.MagicAttack === 200 &&
      entry.record.CombatPower === 1827,
    'Totem combat stats',
  );
  invariant(
    entry.record.AccuracyPer === 3000 &&
      entry.record.CriticalPer === 1300 &&
      entry.record.CriticalOutcomePer === 12000,
    'Totem outcome stats',
  );

  const setupRow = action.rows.find((row) => row.attackId === entry.bridge.AttackID);
  invariant(setupRow !== undefined, 'missing setup row');
  invariant(
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 100,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(
    setupRow.nativeBehavior.totem?.id === 1013 &&
      setupRow.nativeBehavior.totem.target === 0 &&
      setupRow.nativeBehavior.totem.time === 6 &&
      setupRow.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(
    setupRow.nativeBehavior.buffIds.length === 1 && setupRow.nativeBehavior.buffIds[0] === 24031,
    'setup buff',
  );
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 100;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined && row.attackId === expected.attackId, `AttackID at row ${index}`);
    invariant(
      row.impactStartMs === expected.impactStartMs,
      `AttackID ${row.attackId} ImpactStartTime`,
    );
    validateAreaRow(row, expected);
    invariant(
      row.damage.coefficient % row.impactOffsetsMs.length === 0,
      `AttackID ${row.attackId} coefficient split`,
    );
    invariant(
      row.damage.levelUpCoefficient % row.impactOffsetsMs.length === 0,
      `AttackID ${row.attackId} level coefficient split`,
    );
    const rowStartMs = cursorMs;
    for (const offsetMs of row.impactOffsetsMs) {
      contacts.push({
        attackId: row.attackId,
        offsetMs: rowStartMs + (offsetMs - row.impactStartMs),
        damageType: 2,
        damageAttribute: 0,
        coefficient: row.damage.coefficient / row.impactOffsetsMs.length,
        levelUpCoefficient: row.damage.levelUpCoefficient / row.impactOffsetsMs.length,
        area: area(row),
        reaction: {
          kind: expected.reactionKind,
          stance: expected.stance,
          nativeValue: expected.reactionValue,
          nativeHeight: expected.reactionHeight,
          moveDistanceYards: mir4NativeDistanceToYards(expected.reactionValue),
          moveDurationMs: Math.round(expected.reactionValueEx * 1000),
          durationMs: expected.reactionDurationMs,
          probabilityPercent: 10,
          direction: 0,
        },
      });
    }
    cursorMs = contacts.at(-1)?.offsetMs ?? cursorMs;
  }

  const aggregateCoefficient = contacts.reduce((sum, contact) => sum + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (sum, contact) => sum + contact.levelUpCoefficient,
    0,
  );
  invariant(
    contacts.length === 10 &&
      aggregateCoefficient === 68_000 &&
      aggregateLevelUpCoefficient === 1500,
    'aggregate damage contract',
  );
  invariant(
    action.nativeBehavior.damageType === 0 &&
      action.nativeBehavior.primaryDamage.coefficient === 0 &&
      action.nativeBehavior.secondaryDamage.coefficient * 100 === aggregateCoefficient &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        aggregateLevelUpCoefficient,
    'SKILL summary versus Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 2403,
    spawnAttackId: 240302,
    totemId: 1013,
    spawnOffsetMs: 100,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2403.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 6000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    },
    ownerSnapshot: {
      damagePower: 'owner-spell-power-at-cast',
      combatPower: 'owner-at-spawn',
      accuracyNative: 3000,
      criticalNative: 1300,
      criticalOutcomeNative: 12000,
    },
    combatResolution: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1',
      mapping: 'native-fixed-fields-to-bounded-outcomes',
      hitChanceBps: 9950,
      criticalChanceBps: 1300,
      criticalMultiplierBps: 22000,
      unresolvedNativeFacts: [
        'native-accuracy-admission-modifier-selectors',
        'native-critical-admission-modifier-selectors',
        'native-critical-outcome-branch-arithmetic',
      ],
    },
    attackDelayMs: 8000,
    repeatBeforeExpiry: false,
    targetSelection: {
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    },
    aggregateCoefficient: 68_000,
    aggregateLevelUpCoefficient: 1500,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
