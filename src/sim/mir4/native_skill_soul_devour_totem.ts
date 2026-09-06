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
    attackId: 260211,
    impactStartMs: 0,
    impactOffsetMs: 300,
    radiusNative: 350,
    reactionKind: 'knock-back' as const,
    reactionDurationMs: 600,
  }),
  Object.freeze({
    attackId: 260212,
    impactStartMs: 400,
    impactOffsetMs: 600,
    radiusNative: 450,
    reactionKind: 'attack-back' as const,
    reactionDurationMs: 400,
  }),
  Object.freeze({
    attackId: 260213,
    impactStartMs: 700,
    impactOffsetMs: 900,
    radiusNative: 600,
    reactionKind: 'knock-back' as const,
    reactionDurationMs: 100,
  }),
  Object.freeze({
    attackId: 260214,
    impactStartMs: 1000,
    impactOffsetMs: 1200,
    radiusNative: 700,
    reactionKind: 'knock-back' as const,
    reactionDurationMs: 100,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Soul Devour Totem mismatch: ${message}`);
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

/** Compile Soul Devour's reviewed direct-plus-Totem graph from preserved source rows. */
export function compileMir4SoulDevourTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 2502, 'SkillId');
  invariant(entry.record.TotemId === 1011, 'TotemId');
  invariant(entry.bridge.SkillId === 2502, 'bridge SkillId');
  invariant(entry.bridge.AttackID === 250201, 'bridge AttackID');
  invariant(entry.bridge.SkillTotem === 1011, 'bridge SkillTotem');
  invariant(entry.bridge.SkillTotemTarget === 0, 'bridge SkillTotemTarget');
  invariant(entry.bridge.SkillTotemTime === 6, 'bridge SkillTotemTime');
  invariant(entry.bridge.SkillTotemCount === 1, 'bridge SkillTotemCount');
  invariant(entry.record.SkillAttackID === 260211, 'Totem SkillAttackID');
  invariant(entry.record.AttackDelay === 8, 'Totem AttackDelay');
  invariant(entry.record.Cleartime === 6, 'Totem Cleartime');
  invariant(entry.record.DetectRange === 3000, 'Totem DetectRange');
  invariant(entry.record.PhysicalAttack === 200, 'Totem PhysicalAttack');
  invariant(entry.record.MagicAttack === 200, 'Totem MagicAttack');
  invariant(entry.record.CombatPower === 1827, 'Totem CombatPower');
  invariant(entry.record.AccuracyPer === 3000, 'Totem AccuracyPer');
  invariant(entry.record.CriticalPer === 1300, 'Totem CriticalPer');
  invariant(entry.record.CriticalOutcomePer === 12000, 'Totem CriticalOutcomePer');

  const setupRow = action.rows.find((row) => row.attackId === entry.bridge.AttackID);
  invariant(setupRow !== undefined, 'missing setup row');
  invariant(
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 800,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(setupRow.nativeBehavior.totem?.id === 1011, 'setup Totem id');
  invariant(setupRow.nativeBehavior.totem?.target === 0, 'setup Totem target');
  invariant(setupRow.nativeBehavior.totem?.time === 6, 'setup Totem time');
  invariant(setupRow.nativeBehavior.totem?.count === 1, 'setup Totem count');
  invariant(setupRow.nativeBehavior.projectile?.bulletType === 1, 'setup projectile type');
  invariant(setupRow.nativeBehavior.projectile?.effectId === 2040045, 'setup projectile effect');
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 800;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined, `missing AttackID ${expected.attackId}`);
    invariant(row.attackId === expected.attackId, `AttackID at row ${index}`);
    invariant(
      row.impactStartMs === expected.impactStartMs,
      `AttackID ${row.attackId} ImpactStartTime`,
    );
    invariant(
      row.impactOffsetsMs.length === 1 && row.impactOffsetsMs[0] === expected.impactOffsetMs,
      `AttackID ${row.attackId} ImpactTime`,
    );
    invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
    invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
    invariant(
      row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 800,
      `AttackID ${row.attackId} TargetDistance`,
    );
    invariant(row.impactType === 2, `AttackID ${row.attackId} ImpactType`);
    invariant(row.authorialTargetValue === 6, `AttackID ${row.attackId} TargetValue`);
    invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
    invariant(row.geometry.nativeDistanceMin === 0, `AttackID ${row.attackId} AttackDistanceMin`);
    invariant(
      row.geometry.nativeDistanceMax === expected.radiusNative,
      `AttackID ${row.attackId} AttackDistanceMax`,
    );
    invariant(row.geometry.nativeHeight === 300, `AttackID ${row.attackId} AttackHeight`);
    invariant(
      row.geometry.nativeOffset.x === 0 &&
        row.geometry.nativeOffset.y === 0 &&
        row.geometry.nativeOffset.z === 150,
      `AttackID ${row.attackId} LocationOffset`,
    );
    invariant(
      row.damage.type === 2 && row.damage.attribute === 3,
      `AttackID ${row.attackId} damage channel`,
    );
    invariant(row.damage.coefficient === 5000, `AttackID ${row.attackId} coefficient`);
    invariant(row.damage.levelUpCoefficient === 100, `AttackID ${row.attackId} level coefficient`);
    invariant(
      row.reaction.kind === expected.reactionKind,
      `AttackID ${row.attackId} reaction kind`,
    );
    invariant(row.reaction.stance === 'hit-01', `AttackID ${row.attackId} reaction stance`);
    invariant(row.reaction.value === 10, `AttackID ${row.attackId} reaction value`);
    invariant(row.reaction.nativeHeight === 0, `AttackID ${row.attackId} reaction height`);
    invariant(row.reaction.valueEx === 0.2, `AttackID ${row.attackId} reaction movement time`);
    invariant(
      row.reaction.durationMs === expected.reactionDurationMs,
      `AttackID ${row.attackId} reaction duration`,
    );
    invariant(row.reaction.probabilityPercent === 100, `AttackID ${row.attackId} reaction chance`);
    invariant(row.reaction.direction === 0, `AttackID ${row.attackId} reaction direction`);

    cursorMs += expected.impactOffsetMs - expected.impactStartMs;
    contacts.push({
      attackId: row.attackId,
      offsetMs: cursorMs,
      damageType: 2,
      damageAttribute: 3,
      coefficient: row.damage.coefficient,
      levelUpCoefficient: row.damage.levelUpCoefficient,
      area: area(row),
      reaction: {
        kind: expected.reactionKind,
        stance: 'hit-01',
        nativeValue: row.reaction.value,
        // CrowdControlType 99 is an attack-back presentation reaction, not a
        // displacement. Its final native facing consumer remains unrecovered.
        moveDistanceYards:
          expected.reactionKind === 'attack-back'
            ? 0
            : mir4NativeDistanceToYards(row.reaction.value),
        moveDurationMs:
          expected.reactionKind === 'attack-back' ? 0 : Math.round(row.reaction.valueEx * 1000),
        durationMs: row.reaction.durationMs,
        probabilityPercent: 100,
        direction: 0,
      },
    });
  }

  const aggregateCoefficient = contacts.reduce((sum, contact) => sum + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (sum, contact) => sum + contact.levelUpCoefficient,
    0,
  );
  invariant(aggregateCoefficient === 20_000, 'aggregate coefficient');
  invariant(aggregateLevelUpCoefficient === 400, 'aggregate level coefficient');
  const directRow = action.rows.find((row) => row.attackId === 250202);
  invariant(directRow?.damage.coefficient === 4000, 'direct coefficient');
  invariant(directRow.damage.levelUpCoefficient === 100, 'direct level coefficient');
  invariant(
    action.nativeBehavior.secondaryDamage.coefficient * 100 ===
      directRow.damage.coefficient + aggregateCoefficient &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        directRow.damage.levelUpCoefficient + aggregateLevelUpCoefficient,
    'SKILL summary versus direct plus Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 2502,
    spawnAttackId: 250201,
    totemId: 1011,
    spawnOffsetMs: 800,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2502.totem-anchor-lifetime-v1',
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
    aggregateCoefficient,
    aggregateLevelUpCoefficient,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
