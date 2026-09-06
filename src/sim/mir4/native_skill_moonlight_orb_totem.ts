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
    attackId: 330111,
    impactStartMs: 0,
    impactOffsetsMs: Object.freeze([300, 900]),
    reactionKind: 'knock-back' as const,
    nativeValue: -60,
    durationMs: 600,
  }),
  Object.freeze({
    attackId: 330112,
    impactStartMs: 900,
    impactOffsetsMs: Object.freeze([1250, 1550]),
    reactionKind: 'attack-back' as const,
    nativeValue: -60,
    durationMs: 400,
  }),
  Object.freeze({
    attackId: 330113,
    impactStartMs: 1550,
    impactOffsetsMs: Object.freeze([1900, 2200]),
    reactionKind: 'knock-back' as const,
    nativeValue: -100,
    durationMs: 300,
  }),
  Object.freeze({
    attackId: 330114,
    impactStartMs: 2200,
    impactOffsetsMs: Object.freeze([2550, 2850]),
    reactionKind: 'attack-back' as const,
    nativeValue: -100,
    durationMs: 400,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Moonlight Orb Totem mismatch: ${message}`);
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

function validateRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof EXPECTED_ROWS)[number],
): void {
  invariant(row.attackId === expected.attackId, `AttackID ${expected.attackId}`);
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(
    row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 800,
    `AttackID ${row.attackId} TargetDistance`,
  );
  invariant(
    row.impactType === 2 && row.authorialTargetValue === 6,
    `AttackID ${row.attackId} area target contract`,
  );
  invariant(
    row.geometry.angleDegrees === 360 &&
      row.geometry.nativeDistanceMin === 0 &&
      row.geometry.nativeDistanceMax === 550 &&
      row.geometry.nativeHeight === 300,
    `AttackID ${row.attackId} geometry`,
  );
  invariant(
    row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 150 &&
      row.geometry.rotationDegrees === 0,
    `AttackID ${row.attackId} transform`,
  );
  invariant(
    row.damage.type === 2 &&
      row.damage.attribute === 5 &&
      row.damage.coefficient === 5000 &&
      row.damage.levelUpCoefficient === 110,
    `AttackID ${row.attackId} damage`,
  );
  invariant(
    row.impactStartMs === expected.impactStartMs &&
      row.impactOffsetsMs.length === expected.impactOffsetsMs.length &&
      row.impactOffsetsMs.every((offset, index) => offset === expected.impactOffsetsMs[index]),
    `AttackID ${row.attackId} impact vector`,
  );
  invariant(
    row.reaction.kind === expected.reactionKind &&
      row.reaction.stance === 'hit-01' &&
      row.reaction.value === expected.nativeValue &&
      row.reaction.nativeHeight === 0 &&
      row.reaction.valueEx === 0.2 &&
      row.reaction.durationMs === expected.durationMs &&
      row.reaction.probabilityPercent === 100 &&
      row.reaction.direction === 0,
    `AttackID ${row.attackId} reaction`,
  );
}

/** Compile Moonlight Orb's direct strike plus its reviewed eight-contact fixed Totem. */
export function compileMir4MoonlightOrbTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 3301, 'SkillId');
  invariant(entry.record.TotemId === 1004, 'TotemId');
  invariant(entry.bridge.SkillId === 3301 && entry.bridge.AttackID === 330101, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1004 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 6 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 330111 &&
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
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 567,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(
    setupRow.nativeBehavior.totem?.id === 1004 &&
      setupRow.nativeBehavior.totem.target === 0 &&
      setupRow.nativeBehavior.totem.time === 6 &&
      setupRow.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 567;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined, `missing attack row ${expected.attackId}`);
    validateRow(row, expected);
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
          kind: expected.reactionKind,
          stance: 'hit-01',
          nativeValue: expected.nativeValue,
          nativeHeight: 0,
          moveDistanceYards: mir4NativeDistanceToYards(expected.nativeValue),
          moveDurationMs: 200,
          durationMs: expected.durationMs,
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
    contacts.length === 8 && aggregateCoefficient === 20_000 && aggregateLevelUpCoefficient === 440,
    'aggregate Totem damage contract',
  );
  const directRow = action.rows.find((row) => row.attackId === 330102);
  invariant(
    directRow?.damage.type === 2 &&
      directRow.damage.attribute === 5 &&
      directRow.damage.coefficient === 3500 &&
      directRow.damage.levelUpCoefficient === 60,
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
    skillId: 3301,
    spawnAttackId: 330101,
    totemId: 1004,
    spawnOffsetMs: 567,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill3301.totem-anchor-lifetime-v1',
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
    aggregateCoefficient: 20_000,
    aggregateLevelUpCoefficient: 440,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
