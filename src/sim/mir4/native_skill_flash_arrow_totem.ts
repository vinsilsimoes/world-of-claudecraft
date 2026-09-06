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
  { attackId: 410711, impactStartMs: 0, impactOffsetMs: 300 },
  { attackId: 410712, impactStartMs: 300, impactOffsetMs: 700 },
  { attackId: 410713, impactStartMs: 700, impactOffsetMs: 1100 },
  { attackId: 410714, impactStartMs: 1100, impactOffsetMs: 1500 },
  { attackId: 410715, impactStartMs: 1500, impactOffsetMs: 1900 },
  { attackId: 410716, impactStartMs: 1900, impactOffsetMs: 2300 },
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Flash Arrow Totem mismatch: ${message}`);
}

function validateRow(row: Mir4NativeTotemAttackRow, attackId: number): void {
  invariant(row.attackId === attackId, `AttackID ${attackId}`);
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${attackId} TargetSubType`);
  invariant(row.impactType === 2 && row.authorialTargetValue === 5, `AttackID ${attackId} target`);
  invariant(
    row.geometry.angleDegrees === 360 &&
      row.geometry.nativeDistanceMin === 0 &&
      row.geometry.nativeDistanceMax === 600 &&
      row.geometry.nativeHeight === 300 &&
      row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 150,
    `AttackID ${attackId} geometry`,
  );
  invariant(
    row.damage.type === 0 && row.damage.coefficient === 0 && row.damage.levelUpCoefficient === 0,
    `AttackID ${attackId} damage`,
  );
  invariant(
    row.nativeBehavior.buffIds.length === 1 && row.nativeBehavior.buffIds[0] === 41071,
    `AttackID ${attackId} Buff`,
  );
  invariant(
    row.reaction.kind === 'none' &&
      row.reaction.stance === 'none' &&
      row.reaction.durationMs === 0 &&
      row.reaction.probabilityPercent === 100,
    `AttackID ${attackId} reaction`,
  );
  invariant(
    row.nativeBehavior.attackRagePoint === 474 &&
      row.nativeBehavior.hitRagePoint === 240 &&
      row.nativeBehavior.aggroRate === 8000,
    `AttackID ${attackId} rage/aggro`,
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

/** Compile Flash Arrow's six source-authored Accuracy pulses. */
export function compileMir4FlashArrowTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 4107, 'SkillId');
  invariant(entry.record.TotemId === 1406, 'TotemId');
  invariant(entry.bridge.SkillId === 4107 && entry.bridge.AttackID === 410701, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1406 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 6 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.ResourceID === '50060' &&
      entry.record.SkillAttackID === 410711 &&
      entry.record.AttackDelay === 8 &&
      entry.record.Cleartime === 6 &&
      entry.record.DetectRange === 3000,
    'Totem lifecycle',
  );
  invariant(
    entry.record.PhysicalAttack === 200 &&
      entry.record.MagicAttack === 200 &&
      entry.record.CombatPower === 1827 &&
      entry.record.AccuracyPer === 3000 &&
      entry.record.CriticalPer === 1300 &&
      entry.record.CriticalOutcomePer === 12000,
    'Totem stats',
  );
  const setup = action.rows.find((row) => row.attackId === 410701);
  invariant(setup?.impactOffsetsMs[0] === 450, 'setup timing');
  invariant(setup?.damage.type === 0, 'setup damage');
  invariant(setup?.nativeBehavior.totem?.id === 1406, 'setup Totem reference');
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  const contacts = entry.attackRows.map((row, index) => {
    const expected = EXPECTED_ROWS[index];
    invariant(expected !== undefined, `unexpected row ${index}`);
    validateRow(row, expected.attackId);
    invariant(row.impactStartMs === expected.impactStartMs, `AttackID ${row.attackId} start`);
    invariant(
      row.impactOffsetsMs[0] === expected.impactOffsetMs,
      `AttackID ${row.attackId} impact`,
    );
    return {
      attackId: row.attackId,
      offsetMs: 450 + expected.impactOffsetMs,
      damageType: 1 as const,
      damageAttribute: 0,
      coefficient: 0,
      levelUpCoefficient: 0,
      nativeCombat: {
        attackRagePoint: row.nativeBehavior.attackRagePoint,
        hitRagePoint: row.nativeBehavior.hitRagePoint,
        aggroRate: row.nativeBehavior.aggroRate,
      },
      area: area(row),
      reaction: {
        kind: 'none' as const,
        stance: 'none' as const,
        nativeValue: 0,
        nativeHeight: 0,
        moveDistanceYards: 0,
        moveDurationMs: 0,
        durationMs: 0,
        probabilityPercent: 100 as const,
        direction: 0 as const,
      },
    };
  });

  return deepFreezeMir4NativeEvidence({
    skillId: 4107,
    spawnAttackId: 410701,
    totemId: 1406,
    spawnOffsetMs: 450,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill4107.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 6000,
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
    attackDelayMs: 8000,
    repeatBeforeExpiry: false,
    targetSelection: {
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    },
    aggregateCoefficient: 0,
    aggregateLevelUpCoefficient: 0,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
