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

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Cloaking Totem mismatch: ${message}`);
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

/** Compile the one-contact decoy left at Cloaking's cast origin. */
export function compileMir4CloakingTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 4112, 'SkillId');
  invariant(entry.record.TotemId === 1402, 'TotemId');
  invariant(entry.bridge.SkillId === 4112 && entry.bridge.AttackID === 411201, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1402 &&
      entry.bridge.SkillTotemTarget === 1 &&
      entry.bridge.SkillTotemTime === 1 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 411211 &&
      entry.record.AttackDelay === 6 &&
      entry.record.Cleartime === 5 &&
      entry.record.DetectRange === 3000,
    'Totem lifecycle',
  );
  invariant(
    entry.record.PhysicalAttack === 40 &&
      entry.record.MagicAttack === 40 &&
      entry.record.CombatPower === 1827 &&
      entry.record.AccuracyPer === 3000 &&
      entry.record.CriticalPer === 1300 &&
      entry.record.CriticalOutcomePer === 12000,
    'Totem combat stats',
  );

  const setupRow = action.rows.find((row) => row.attackId === 411201);
  invariant(setupRow !== undefined, 'missing setup row');
  invariant(
    setupRow.impactOffsetsMs.length === 1 && setupRow.impactOffsetsMs[0] === 20,
    'setup timing',
  );
  invariant(setupRow.damage.type === 0, 'setup damage type');
  invariant(
    setupRow.nativeBehavior.totem?.id === 1402 &&
      setupRow.nativeBehavior.totem.target === 1 &&
      setupRow.nativeBehavior.totem.time === 1 &&
      setupRow.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(entry.attackRows.length === 1, 'attack-row count');
  const row = entry.attackRows[0];
  invariant(row !== undefined && row.attackId === 411211, 'contact AttackID');
  invariant(
    row.nativeBehavior.attackUseType === 0 &&
      row.targetSubtype === 'alive-only' &&
      row.targetDistance.nativeMin === 0 &&
      row.targetDistance.nativeMax === 2100,
    'contact target contract',
  );
  invariant(
    row.impactType === 2 &&
      row.authorialTargetValue === 8 &&
      row.geometry.angleDegrees === 360 &&
      row.geometry.nativeDistanceMin === 0 &&
      row.geometry.nativeDistanceMax === 350 &&
      row.geometry.nativeHeight === 500,
    'contact area',
  );
  invariant(
    row.damage.type === 1 &&
      row.damage.attribute === 0 &&
      row.damage.coefficient === 9000 &&
      row.damage.levelUpCoefficient === 200,
    'contact damage',
  );
  invariant(row.impactOffsetsMs.length === 1 && row.impactOffsetsMs[0] === 700, 'contact timing');
  invariant(
    row.reaction.kind === 'knock-back' &&
      row.reaction.stance === 'hit-01' &&
      row.reaction.value === 30 &&
      row.reaction.valueEx === 0.1 &&
      row.reaction.durationMs === 100 &&
      row.reaction.probabilityPercent === 100 &&
      row.reaction.direction === 0,
    'contact reaction',
  );
  invariant(
    row.nativeBehavior.attackRagePoint === 1496 &&
      row.nativeBehavior.hitRagePoint === 240 &&
      row.nativeBehavior.aggroRate === 8000,
    'contact rage/aggro fields',
  );
  invariant(
    action.nativeBehavior.damageType === 0 &&
      action.nativeBehavior.primaryDamage.coefficient === 90 &&
      action.nativeBehavior.primaryDamage.levelUpCoefficient === 2,
    'SKILL display summary',
  );

  const contacts: readonly Mir4NativeTotemRuntimeContactPlan[] = Object.freeze([
    Object.freeze({
      attackId: 411211,
      offsetMs: 720,
      damageType: 1 as const,
      damageAttribute: 0,
      coefficient: 9000,
      levelUpCoefficient: 200,
      nativeCombat: {
        attackRagePoint: 1496,
        hitRagePoint: 240,
        aggroRate: 8000,
      },
      area: area(row),
      reaction: {
        kind: 'knock-back' as const,
        stance: 'hit-01' as const,
        nativeValue: 30,
        nativeHeight: row.reaction.nativeHeight,
        moveDistanceYards: mir4NativeDistanceToYards(row.reaction.value),
        moveDurationMs: row.reaction.valueEx * 1000,
        durationMs: 100,
        probabilityPercent: 100 as const,
        direction: 0 as const,
      },
    }),
  ]);

  return deepFreezeMir4NativeEvidence({
    skillId: 4112,
    spawnAttackId: 411201,
    totemId: 1402,
    spawnOffsetMs: 20,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill4112.totem-anchor-lifetime-v1',
      anchor: 'source-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 1000,
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
    aggregateCoefficient: 9000,
    aggregateLevelUpCoefficient: 200,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
