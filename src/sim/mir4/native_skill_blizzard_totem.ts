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
    attackId: 220311,
    impactStartMs: 0,
    impactOffsetsMs: Object.freeze([455, 650]),
    coefficient: 6900,
    levelUpCoefficient: 130,
    guideEffectId: 102,
  }),
  Object.freeze({
    attackId: 220312,
    impactStartMs: 850,
    impactOffsetsMs: Object.freeze([1050]),
    coefficient: 3900,
    levelUpCoefficient: 80,
    guideEffectId: 0,
  }),
  Object.freeze({
    attackId: 220313,
    impactStartMs: 1200,
    impactOffsetsMs: Object.freeze([1400, 1800]),
    coefficient: 6900,
    levelUpCoefficient: 130,
    guideEffectId: 0,
  }),
  Object.freeze({
    attackId: 220314,
    impactStartMs: 1900,
    impactOffsetsMs: Object.freeze([2100]),
    coefficient: 3900,
    levelUpCoefficient: 80,
    guideEffectId: 0,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Blizzard Totem mismatch: ${message}`);
}

function validateAreaRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof EXPECTED_ROWS)[number],
): void {
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(row.targetDistance.nativeMin === 0, `AttackID ${row.attackId} TargetDistanceMin`);
  invariant(row.targetDistance.nativeMax === 1500, `AttackID ${row.attackId} TargetDistanceMax`);
  invariant(row.impactType === 2, `AttackID ${row.attackId} ImpactType`);
  invariant(row.authorialTargetValue === 10, `AttackID ${row.attackId} TargetValue`);
  invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  invariant(row.geometry.nativeDistanceMin === 0, `AttackID ${row.attackId} AttackDistanceMin`);
  invariant(row.geometry.nativeDistanceMax === 700, `AttackID ${row.attackId} AttackDistanceMax`);
  invariant(row.geometry.nativeHeight === 400, `AttackID ${row.attackId} AttackHeight`);
  invariant(row.geometry.nativeOffset.x === 0, `AttackID ${row.attackId} LocationOffset.X`);
  invariant(row.geometry.nativeOffset.y === 0, `AttackID ${row.attackId} LocationOffset.Y`);
  invariant(row.geometry.nativeOffset.z === 300, `AttackID ${row.attackId} LocationOffset.Z`);
  invariant(row.damage.type === 2, `AttackID ${row.attackId} DamageType`);
  invariant(row.damage.attribute === 2, `AttackID ${row.attackId} DamageAttribute`);
  invariant(
    row.damage.coefficient === expected.coefficient,
    `AttackID ${row.attackId} coefficient`,
  );
  invariant(
    row.damage.levelUpCoefficient === expected.levelUpCoefficient,
    `AttackID ${row.attackId} level coefficient`,
  );
  invariant(row.reaction.kind === 'hit', `AttackID ${row.attackId} reaction kind`);
  invariant(row.reaction.stance === 'hit-01', `AttackID ${row.attackId} reaction stance`);
  invariant(row.reaction.value === 0, `AttackID ${row.attackId} reaction value`);
  invariant(row.reaction.nativeHeight === 0, `AttackID ${row.attackId} reaction height`);
  invariant(row.reaction.valueEx === 0, `AttackID ${row.attackId} reaction movement time`);
  invariant(row.reaction.durationMs === 200, `AttackID ${row.attackId} reaction duration`);
  invariant(row.reaction.probabilityPercent === 10, `AttackID ${row.attackId} reaction chance`);
  invariant(row.reaction.direction === 0, `AttackID ${row.attackId} reaction direction`);
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

/** Compile Blizzard's reviewed six-contact Totem graph from source evidence. */
export function compileMir4BlizzardTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 2203, 'SkillId');
  invariant(entry.record.TotemId === 1008, 'TotemId');
  invariant(entry.bridge.SkillId === 2203, 'bridge SkillId');
  invariant(entry.bridge.AttackID === 220301, 'bridge AttackID');
  invariant(entry.bridge.SkillTotem === 1008, 'bridge SkillTotem');
  invariant(entry.bridge.SkillTotemTarget === 0, 'bridge SkillTotemTarget');
  invariant(entry.bridge.SkillTotemTime === 6, 'bridge SkillTotemTime');
  invariant(entry.bridge.SkillTotemCount === 1, 'bridge SkillTotemCount');
  invariant(entry.record.SkillAttackID === 220311, 'Totem SkillAttackID');
  invariant(entry.record.AttackDelay === 8, 'Totem AttackDelay');
  invariant(entry.record.Cleartime === 6, 'Totem Cleartime');
  invariant(entry.record.DetectRange === 3000, 'Totem DetectRange');
  invariant(entry.record.PhysicalAttack === 69, 'Totem PhysicalAttack');
  invariant(entry.record.MagicAttack === 69, 'Totem MagicAttack');
  invariant(entry.record.CombatPower === 1827, 'Totem CombatPower');
  invariant(entry.record.AccuracyPer === 3000, 'Totem AccuracyPer');
  invariant(entry.record.CriticalPer === 2500, 'Totem CriticalPer');
  invariant(entry.record.CriticalOutcomePer === 12000, 'Totem CriticalOutcomePer');

  const setupRow = action.rows.find((row) => row.attackId === entry.bridge.AttackID);
  invariant(setupRow !== undefined, 'missing setup row');
  invariant(setupRow.impactOffsetsMs.length === 1, 'setup impact cardinality');
  invariant(setupRow.impactOffsetsMs[0] === 100, 'setup impact timing');
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(setupRow.nativeBehavior.totem?.id === 1008, 'setup Totem id');
  invariant(setupRow.nativeBehavior.totem?.target === 0, 'setup Totem target');
  invariant(setupRow.nativeBehavior.totem?.time === 6, 'setup Totem time');
  invariant(setupRow.nativeBehavior.totem?.count === 1, 'setup Totem count');
  invariant(setupRow.reaction.kind === 'hit', 'setup reaction kind');
  invariant(setupRow.reaction.stance === 'hit-01', 'setup reaction stance');
  invariant(setupRow.reaction.durationMs === 200, 'setup reaction duration');
  invariant(setupRow.reaction.probabilityPercent === 10, 'setup reaction chance');
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 100;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined, `missing attack row ${expected.attackId}`);
    invariant(row.attackId === expected.attackId, `AttackID at row ${index}`);
    invariant(
      row.impactStartMs === expected.impactStartMs,
      `AttackID ${row.attackId} ImpactStartTime`,
    );
    validateAreaRow(row, expected);

    const componentImpactCount = row.impactOffsetsMs.length;
    invariant(
      row.damage.coefficient % componentImpactCount === 0,
      `AttackID ${row.attackId} coefficient split`,
    );
    invariant(
      row.damage.levelUpCoefficient % componentImpactCount === 0,
      `AttackID ${row.attackId} level coefficient split`,
    );
    const rowStartMs = cursorMs;
    for (const offsetMs of row.impactOffsetsMs) {
      const relativeOffsetMs = offsetMs - row.impactStartMs;
      invariant(relativeOffsetMs >= 0, `AttackID ${row.attackId} relative impact timing`);
      contacts.push({
        attackId: row.attackId,
        offsetMs: rowStartMs + relativeOffsetMs,
        damageType: 2,
        damageAttribute: 2,
        coefficient: row.damage.coefficient / componentImpactCount,
        levelUpCoefficient: row.damage.levelUpCoefficient / componentImpactCount,
        area: area(row),
        reaction: {
          kind: 'hit',
          stance: 'hit-01',
          nativeValue: 0,
          moveDistanceYards: 0,
          moveDurationMs: 0,
          durationMs: 200,
          probabilityPercent: 10,
          direction: 0,
        },
      });
    }
    cursorMs = contacts.at(-1)?.offsetMs ?? cursorMs;
  }

  const aggregateCoefficient = contacts.reduce((total, contact) => total + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (total, contact) => total + contact.levelUpCoefficient,
    0,
  );
  invariant(aggregateCoefficient === 21_600, 'aggregate coefficient');
  invariant(aggregateLevelUpCoefficient === 420, 'aggregate level coefficient');
  const directRow = action.rows.find((row) => row.attackId === 220302);
  invariant(directRow?.damage.coefficient === 3900, 'direct coefficient');
  invariant(directRow.damage.levelUpCoefficient === 80, 'direct level coefficient');
  invariant(
    action.nativeBehavior.secondaryDamage.coefficient * 100 ===
      directRow.damage.coefficient + aggregateCoefficient &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        directRow.damage.levelUpCoefficient + aggregateLevelUpCoefficient,
    'SKILL summary versus direct plus Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 2203,
    spawnAttackId: 220301,
    totemId: 1008,
    spawnOffsetMs: 100,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2203.totem-anchor-lifetime-v1',
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
      criticalNative: 2500,
      criticalOutcomeNative: 12000,
    },
    combatResolution: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1',
      mapping: 'native-fixed-fields-to-bounded-outcomes',
      hitChanceBps: 9950,
      criticalChanceBps: 2500,
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
    aggregateCoefficient: 21_600,
    aggregateLevelUpCoefficient: 420,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
