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
    attackId: 410311,
    impactStartMs: 0,
    impactOffsetsMs: Object.freeze([850, 900]),
    coefficient: 9000,
    levelUpCoefficient: 220,
    guideEffectId: 102,
    attackRagePoint: 650,
    hitRagePoint: 240,
    aggroRate: 8000,
  }),
  Object.freeze({
    attackId: 410312,
    impactStartMs: 900,
    impactOffsetsMs: Object.freeze([1000]),
    coefficient: 5500,
    levelUpCoefficient: 110,
    guideEffectId: 0,
    attackRagePoint: 650,
    hitRagePoint: 240,
    aggroRate: 8000,
  }),
  Object.freeze({
    attackId: 410313,
    impactStartMs: 1000,
    impactOffsetsMs: Object.freeze([1100, 1150]),
    coefficient: 9000,
    levelUpCoefficient: 220,
    guideEffectId: 0,
    attackRagePoint: 650,
    hitRagePoint: 240,
    aggroRate: 8000,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Burst Shell Totem mismatch: ${message}`);
}

function validateAreaRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof EXPECTED_ROWS)[number],
): void {
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(
    row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 2000,
    `AttackID ${row.attackId} TargetDistance`,
  );
  invariant(
    row.impactType === 2 && row.authorialTargetValue === 5,
    `AttackID ${row.attackId} area target contract`,
  );
  invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  invariant(
    row.geometry.nativeDistanceMin === 0 && row.geometry.nativeDistanceMax === 800,
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
    row.damage.type === 1 &&
      row.damage.attribute === 0 &&
      row.damage.coefficient === expected.coefficient &&
      row.damage.levelUpCoefficient === expected.levelUpCoefficient,
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
    row.nativeBehavior.attackRagePoint === expected.attackRagePoint &&
      row.nativeBehavior.hitRagePoint === expected.hitRagePoint &&
      row.nativeBehavior.aggroRate === expected.aggroRate,
    `AttackID ${row.attackId} rage/aggro fields`,
  );
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

/** Compile Burst Shell's reviewed five-contact explosive Totem graph. */
export function compileMir4BurstShellTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 4103, 'SkillId');
  invariant(entry.record.TotemId === 1401, 'TotemId');
  invariant(entry.bridge.SkillId === 4103 && entry.bridge.AttackID === 410302, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1401 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 3 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 410311 &&
      entry.record.AttackDelay === 6 &&
      entry.record.Cleartime === 5 &&
      entry.record.DetectRange === 3000,
    'Totem lifecycle',
  );
  invariant(
    entry.record.PhysicalAttack === 40 &&
      entry.record.MagicAttack === 40 &&
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
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 600,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(
    setupRow.nativeBehavior.totem?.id === 1401 &&
      setupRow.nativeBehavior.totem.target === 0 &&
      setupRow.nativeBehavior.totem.time === 3 &&
      setupRow.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 600;
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
        damageType: 1,
        damageAttribute: 0,
        coefficient: row.damage.coefficient / row.impactOffsetsMs.length,
        levelUpCoefficient: row.damage.levelUpCoefficient / row.impactOffsetsMs.length,
        nativeCombat: {
          attackRagePoint: row.nativeBehavior.attackRagePoint,
          hitRagePoint: row.nativeBehavior.hitRagePoint,
          aggroRate: row.nativeBehavior.aggroRate,
        },
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
    contacts.length === 5 && aggregateCoefficient === 23_500 && aggregateLevelUpCoefficient === 550,
    'aggregate Totem damage contract',
  );
  invariant(
    action.nativeBehavior.damageType === 0 &&
      action.nativeBehavior.primaryDamage.coefficient === 220 &&
      action.nativeBehavior.primaryDamage.levelUpCoefficient === 5,
    'SKILL display summary',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 4103,
    spawnAttackId: 410302,
    totemId: 1401,
    spawnOffsetMs: 600,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill4103.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 3000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    },
    ownerSnapshot: {
      damagePower: 'owner-physical-power-at-cast',
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
    aggregateCoefficient: 23_500,
    aggregateLevelUpCoefficient: 550,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
