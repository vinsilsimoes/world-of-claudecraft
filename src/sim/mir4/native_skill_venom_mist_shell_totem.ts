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
    attackId: 410411,
    startMs: 0,
    offsetsMs: Object.freeze([500, 900]),
  }),
  Object.freeze({
    attackId: 410412,
    startMs: 900,
    offsetsMs: Object.freeze([1100, 1300]),
  }),
  Object.freeze({
    attackId: 410413,
    startMs: 1300,
    offsetsMs: Object.freeze([1500, 1700]),
  }),
  Object.freeze({
    attackId: 410414,
    startMs: 1700,
    offsetsMs: Object.freeze([1900, 2100]),
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Venom Mist Shell Totem mismatch: ${message}`);
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
      row.geometry.nativeDistanceMax === 450 &&
      row.geometry.nativeHeight === 300 &&
      row.geometry.nativeOffset.x === 0 &&
      row.geometry.nativeOffset.y === 0 &&
      row.geometry.nativeOffset.z === 150,
    `AttackID ${row.attackId} area`,
  );
  invariant(
    row.damage.type === 1 &&
      row.damage.attribute === 0 &&
      row.damage.coefficient === 5500 &&
      row.damage.levelUpCoefficient === 110,
    `AttackID ${row.attackId} damage`,
  );
  invariant(
    row.reaction.kind === 'hit' &&
      row.reaction.stance === 'hit-01' &&
      row.reaction.value === 0 &&
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

/** Compile Venom Mist Shell's reviewed eight-contact poison field. */
export function compileMir4VenomMistShellTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 4104, 'SkillId');
  invariant(entry.record.TotemId === 1405, 'TotemId');
  invariant(entry.bridge.SkillId === 4104 && entry.bridge.AttackID === 410402, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1405 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 6 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.ResourceID === '50060' &&
      entry.record.SkillAttackID === 410411 &&
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
  const setup = action.rows.find((row) => row.attackId === 410402);
  invariant(setup?.impactOffsetsMs[0] === 390, 'setup timing');
  invariant(setup?.damage.type === 0, 'setup damage');
  invariant(setup?.nativeBehavior.totem?.id === 1405, 'setup Totem reference');
  invariant(entry.attackRows.length === EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 390;
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
          kind: 'hit',
          stance: 'hit-01',
          nativeValue: 0,
          nativeHeight: row.reaction.nativeHeight,
          moveDistanceYards: 0,
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
    contacts.length === 8 && aggregateCoefficient === 22_000 && aggregateLevelUpCoefficient === 440,
    'aggregate Totem damage',
  );
  invariant(
    action.nativeBehavior.primaryDamage.coefficient === 250 &&
      action.nativeBehavior.primaryDamage.levelUpCoefficient === 5,
    'SKILL display summary',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 4104,
    spawnAttackId: 410402,
    totemId: 1405,
    spawnOffsetMs: 390,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill4104.totem-anchor-lifetime-v1',
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
    aggregateCoefficient: 22_000,
    aggregateLevelUpCoefficient: 440,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
