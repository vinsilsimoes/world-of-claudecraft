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
    attackId: 410511,
    startMs: 0,
    offsetsMs: Object.freeze([100, 300]),
    coefficient: 4000,
    levelUpCoefficient: 100,
  }),
  Object.freeze({
    attackId: 410512,
    startMs: 400,
    offsetsMs: Object.freeze([500, 700]),
    coefficient: 5000,
    levelUpCoefficient: 100,
  }),
  Object.freeze({
    attackId: 410513,
    startMs: 800,
    offsetsMs: Object.freeze([900, 1100]),
    coefficient: 5000,
    levelUpCoefficient: 100,
  }),
  Object.freeze({
    attackId: 410514,
    startMs: 1200,
    offsetsMs: Object.freeze([1300]),
    coefficient: 5000,
    levelUpCoefficient: 100,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Ice Cage Totem mismatch: ${message}`);
}

function validateRow(row: Mir4NativeTotemAttackRow, index: number): void {
  const expected = EXPECTED_ROWS[index];
  invariant(expected !== undefined && row.attackId === expected.attackId, `row ${index} identity`);
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(
    row.targetDistance.nativeMin === 0 && row.targetDistance.nativeMax === 800,
    `AttackID ${row.attackId} TargetDistance`,
  );
  invariant(
    row.impactType === 2 &&
      row.authorialTargetValue === 6 &&
      row.geometry.angleDegrees === 360 &&
      row.geometry.nativeDistanceMin === 0 &&
      row.geometry.nativeDistanceMax === 500 &&
      row.geometry.nativeHeight === 300 &&
      row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 150,
    `AttackID ${row.attackId} area`,
  );
  invariant(
    row.damage.type === 1 &&
      row.damage.attribute === 0 &&
      row.damage.coefficient === expected.coefficient &&
      row.damage.levelUpCoefficient === expected.levelUpCoefficient,
    `AttackID ${row.attackId} damage`,
  );
  invariant(
    row.reaction.kind === (index === 0 || index === 2 ? 'knock-back' : 'hit') &&
      row.reaction.stance === 'hit-01' &&
      row.reaction.value === (index === 0 || index === 2 ? -10 : 0) &&
      row.reaction.valueEx === 0 &&
      row.reaction.durationMs === 300 &&
      row.reaction.probabilityPercent === 100 &&
      row.reaction.direction === 0,
    `AttackID ${row.attackId} reaction`,
  );
  invariant(
    row.impactStartMs === expected.startMs &&
      row.impactOffsetsMs.length === expected.offsetsMs.length &&
      row.impactOffsetsMs.every((offset, position) => offset === expected.offsetsMs[position]),
    `AttackID ${row.attackId} timeline`,
  );
  invariant(
    row.nativeBehavior.attackRagePoint === 474 &&
      row.nativeBehavior.hitRagePoint === 240 &&
      row.nativeBehavior.aggroRate === 8000,
    `AttackID ${row.attackId} rage/aggro`,
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

/** Compile Ice Cage's reviewed seven-contact fixed field. */
export function compileMir4IceCageTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 4105, 'SkillId');
  invariant(entry.record.TotemId === 1404, 'TotemId');
  invariant(entry.bridge.SkillId === 4105 && entry.bridge.AttackID === 410501, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1404 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 3 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.ResourceID === '50060' &&
      entry.record.SkillAttackID === 410511 &&
      entry.record.AttackDelay === 8 &&
      entry.record.Cleartime === 3 &&
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
  const setup = action.rows.find((row) => row.attackId === 410501);
  invariant(setup?.impactOffsetsMs[0] === 560, 'setup timing');
  invariant(setup?.damage.type === 0, 'setup damage');
  invariant(setup?.nativeBehavior.totem?.id === 1404, 'setup Totem reference');
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 560;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  entry.attackRows.forEach((row, index) => {
    validateRow(row, index);
    invariant(
      row.damage.coefficient % row.impactOffsetsMs.length === 0 &&
        row.damage.levelUpCoefficient % row.impactOffsetsMs.length === 0,
      `AttackID ${row.attackId} exact split`,
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
          kind: index === 0 || index === 2 ? 'knock-back' : 'hit',
          stance: 'hit-01',
          nativeValue: row.reaction.value,
          nativeHeight: row.reaction.nativeHeight,
          moveDistanceYards:
            row.reaction.kind === 'knock-back' ? mir4NativeDistanceToYards(row.reaction.value) : 0,
          moveDurationMs: 0,
          durationMs: 300,
          probabilityPercent: 100,
          direction: 0,
        },
      });
    }
    cursorMs = contacts.at(-1)?.offsetMs ?? cursorMs;
  });
  const aggregateCoefficient = contacts.reduce((sum, contact) => sum + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (sum, contact) => sum + contact.levelUpCoefficient,
    0,
  );
  invariant(
    contacts.length === 7 && aggregateCoefficient === 19_000 && aggregateLevelUpCoefficient === 400,
    'aggregate Totem damage',
  );
  invariant(
    action.nativeBehavior.primaryDamage.coefficient === 230 &&
      action.nativeBehavior.primaryDamage.levelUpCoefficient === 5,
    'SKILL display summary',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 4105,
    spawnAttackId: 410501,
    totemId: 1404,
    spawnOffsetMs: 560,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill4105.totem-anchor-lifetime-v1',
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
    attackDelayMs: 8000,
    repeatBeforeExpiry: false,
    targetSelection: {
      timing: 'fresh-at-each-contact',
      order: 'host-zone-iteration-order',
      pvp: 'fail-closed',
    },
    aggregateCoefficient: 19_000,
    aggregateLevelUpCoefficient: 400,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
