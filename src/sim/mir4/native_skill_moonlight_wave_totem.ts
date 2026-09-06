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
    attackId: 350611,
    impactStartMs: 0,
    impactOffsetsMs: Object.freeze([420, 500]),
    guideEffectId: 102,
  }),
  Object.freeze({
    attackId: 350612,
    impactStartMs: 500,
    impactOffsetsMs: Object.freeze([580, 600]),
    guideEffectId: 0,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Moonlight Wave Totem mismatch: ${message}`);
}

function validateAreaRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof EXPECTED_ROWS)[number],
): void {
  invariant(row.nativeBehavior.attackUseType === 0, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(
    row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 800,
    `AttackID ${row.attackId} TargetDistance`,
  );
  invariant(
    row.impactType === 2 && row.authorialTargetValue === 8,
    `AttackID ${row.attackId} area target contract`,
  );
  invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  invariant(
    row.geometry.nativeDistanceMin === 0 && row.geometry.nativeDistanceMax === 600,
    `AttackID ${row.attackId} AttackDistance`,
  );
  invariant(row.geometry.nativeHeight === 400, `AttackID ${row.attackId} AttackHeight`);
  invariant(
    row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 0,
    `AttackID ${row.attackId} LocationOffset`,
  );
  invariant(row.geometry.rotationDegrees === 0, `AttackID ${row.attackId} RotationOffset`);
  invariant(
    row.damage.type === 2 &&
      row.damage.attribute === 5 &&
      row.damage.coefficient === 10_000 &&
      row.damage.levelUpCoefficient === 200,
    `AttackID ${row.attackId} damage contract`,
  );
  invariant(
    row.reaction.kind === 'hit' &&
      row.reaction.stance === 'hit-01' &&
      row.reaction.value === 0 &&
      row.reaction.nativeHeight === 0 &&
      row.reaction.valueEx === 0 &&
      row.reaction.durationMs === 300 &&
      row.reaction.probabilityPercent === 100 &&
      row.reaction.direction === 0,
    `AttackID ${row.attackId} hit reaction`,
  );
  invariant(row.guideEffectId === expected.guideEffectId, `AttackID ${row.attackId} GuideEffect`);
  invariant(
    row.impactStartMs === expected.impactStartMs &&
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

/** Compile Moonlight Wave's direct strike plus its reviewed four-contact Totem graph. */
export function compileMir4MoonlightWaveTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 3506, 'SkillId');
  invariant(entry.record.TotemId === 1012, 'TotemId');
  invariant(entry.bridge.SkillId === 3506 && entry.bridge.AttackID === 350601, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1012 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 4 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 350611 &&
      entry.record.AttackDelay === 6 &&
      entry.record.Cleartime === 4 &&
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
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 200,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(
    setupRow.nativeBehavior.totem?.id === 1012 &&
      setupRow.nativeBehavior.totem.target === 0 &&
      setupRow.nativeBehavior.totem.time === 4 &&
      setupRow.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 200;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined && row.attackId === expected.attackId, `AttackID at row ${index}`);
    validateAreaRow(row, expected);
    invariant(
      row.damage.coefficient % row.impactOffsetsMs.length === 0 &&
        row.damage.levelUpCoefficient % row.impactOffsetsMs.length === 0,
      `AttackID ${row.attackId} exact contact split`,
    );
    const rowStartMs = cursorMs;
    for (const offsetMs of row.impactOffsetsMs) {
      contacts.push({
        attackId: row.attackId,
        offsetMs: rowStartMs + (offsetMs - row.impactStartMs),
        damageType: 2,
        damageAttribute: 5,
        coefficient: row.damage.coefficient / row.impactOffsetsMs.length,
        levelUpCoefficient: row.damage.levelUpCoefficient / row.impactOffsetsMs.length,
        area: area(row),
        reaction: {
          kind: 'hit',
          stance: 'hit-01',
          nativeValue: 0,
          nativeHeight: 0,
          moveDistanceYards: 0,
          moveDurationMs: 0,
          durationMs: 300,
          probabilityPercent: 100,
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
    contacts.length === 4 && aggregateCoefficient === 20_000 && aggregateLevelUpCoefficient === 400,
    'aggregate Totem damage contract',
  );
  const directRow = action.rows.find((row) => row.attackId === 350602);
  invariant(
    directRow?.damage.type === 2 &&
      directRow.damage.attribute === 5 &&
      directRow.damage.coefficient === 6000 &&
      directRow.damage.levelUpCoefficient === 100,
    'direct strike damage contract',
  );
  invariant(
    action.nativeBehavior.damageType === 0 &&
      action.nativeBehavior.primaryDamage.coefficient === 0 &&
      action.nativeBehavior.secondaryDamage.coefficient * 100 ===
        aggregateCoefficient + directRow.damage.coefficient &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        aggregateLevelUpCoefficient + directRow.damage.levelUpCoefficient,
    'SKILL summary versus direct and Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 3506,
    spawnAttackId: 350601,
    totemId: 1012,
    spawnOffsetMs: 200,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill3506.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 4000,
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
    attackDelayMs: 6000,
    repeatBeforeExpiry: false,
    targetSelection: {
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    },
    aggregateCoefficient: 20_000,
    aggregateLevelUpCoefficient: 400,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
