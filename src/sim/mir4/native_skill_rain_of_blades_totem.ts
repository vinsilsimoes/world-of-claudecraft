import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import type {
  Mir4NativeTotemAttackRow,
  Mir4NativeTotemCatalogEntry,
  Mir4NativeTotemRawAttackRecord,
} from '../content/mir4/native_skill_totem_types';
import type {
  Mir4NativeTotemRuntimeContactPlan,
  Mir4NativeTotemRuntimeDamageComponent,
  Mir4NativeTotemRuntimePlan,
} from './native_skill_totem_runtime';
import { mir4NativeDistanceToYards } from './native_skill_units';

const EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    attackId: 310411,
    impactStartMs: 0,
    impactOffsetMs: 380,
    physical: Object.freeze({ coefficient: 6000, levelUpCoefficient: 130 }),
    magic: Object.freeze({ coefficient: 4000, levelUpCoefficient: 70 }),
  }),
  Object.freeze({
    attackId: 310412,
    impactStartMs: 500,
    impactOffsetMs: 700,
    physical: Object.freeze({ coefficient: 7000, levelUpCoefficient: 140 }),
    magic: Object.freeze({ coefficient: 4000, levelUpCoefficient: 70 }),
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Rain of Blades Totem mismatch: ${message}`);
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

function damageComponents(
  raw: Mir4NativeTotemRawAttackRecord,
): readonly Mir4NativeTotemRuntimeDamageComponent[] {
  return [
    {
      damageType: 1,
      damageAttribute: raw.DamageAttribute,
      coefficient: raw.MulDamage,
      levelUpCoefficient: raw.LevelUpMulDamage,
    },
    {
      damageType: 2,
      damageAttribute: raw.DamageAttribute,
      coefficient: raw.MagicDamage,
      levelUpCoefficient: raw.LevelUpMagicDamage,
    },
  ];
}

/** Compile the two sword-phantom contacts spawned by Rain of Blades. */
export function compileMir4RainOfBladesTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 3104, 'SkillId');
  invariant(entry.record.TotemId === 1010, 'TotemId');
  invariant(entry.bridge.SkillId === 3104 && entry.bridge.AttackID === 310401, 'bridge identity');
  invariant(
    entry.bridge.SkillTotem === 1010 &&
      entry.bridge.SkillTotemTarget === 0 &&
      entry.bridge.SkillTotemTime === 4 &&
      entry.bridge.SkillTotemCount === 1,
    'bridge Totem contract',
  );
  invariant(
    entry.record.SkillAttackID === 310411 &&
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

  const setup = action.rows.find((row) => row.attackId === 310401);
  invariant(setup !== undefined, 'missing setup row');
  invariant(setup.impactOffsetsMs.length === 1 && setup.impactOffsetsMs[0] === 100, 'setup timing');
  invariant(setup.damage.type === 0, 'setup damage');
  invariant(
    setup.nativeBehavior.totem?.id === 1010 &&
      setup.nativeBehavior.totem.target === 0 &&
      setup.nativeBehavior.totem.time === 4 &&
      setup.nativeBehavior.totem.count === 1,
    'setup Totem reference',
  );
  invariant(entry.attackRows.length === 2 && entry.rawAttackRecords.length === 2, 'attack rows');

  let cursorMs = 100;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < EXPECTED_ROWS.length; index += 1) {
    const expected = EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    const raw = entry.rawAttackRecords[index];
    invariant(row !== undefined && raw !== undefined, `missing row ${expected.attackId}`);
    invariant(
      row.attackId === expected.attackId && raw.AttackID === expected.attackId,
      'row identity',
    );
    invariant(
      row.impactStartMs === expected.impactStartMs &&
        row.impactOffsetsMs.length === 1 &&
        row.impactOffsetsMs[0] === expected.impactOffsetMs,
      `AttackID ${row.attackId} timing`,
    );
    invariant(
      row.nativeBehavior.attackUseType === 0 &&
        row.targetSubtype === 'alive-only' &&
        row.targetDistance.nativeMax === 1200 &&
        row.impactType === 2 &&
        row.authorialTargetValue === 8,
      `AttackID ${row.attackId} targeting`,
    );
    invariant(
      row.geometry.angleDegrees === 360 &&
        row.geometry.nativeDistanceMin === 0 &&
        row.geometry.nativeDistanceMax === 600 &&
        row.geometry.nativeHeight === 400,
      `AttackID ${row.attackId} geometry`,
    );
    invariant(
      raw.DamageType === 1 &&
        raw.MulDamage === expected.physical.coefficient &&
        raw.LevelUpMulDamage === expected.physical.levelUpCoefficient &&
        raw.MagicDamage === expected.magic.coefficient &&
        raw.LevelUpMagicDamage === expected.magic.levelUpCoefficient &&
        raw.AddDamage === 0 &&
        raw.LevelUpAddDamage === 0 &&
        raw.AddMagicDamage === 0 &&
        raw.LevelUpAddMagicDamage === 0,
      `AttackID ${row.attackId} hybrid damage`,
    );
    invariant(
      row.reaction.kind === 'hit' &&
        row.reaction.stance === 'hit-01' &&
        row.reaction.durationMs === 300 &&
        row.reaction.probabilityPercent === 100,
      `AttackID ${row.attackId} reaction`,
    );

    cursorMs += expected.impactOffsetMs - expected.impactStartMs;
    const components = damageComponents(raw);
    contacts.push({
      attackId: row.attackId,
      offsetMs: cursorMs,
      damageType: 1,
      damageAttribute: 0,
      coefficient: components.reduce((sum, component) => sum + component.coefficient, 0),
      levelUpCoefficient: components.reduce(
        (sum, component) => sum + component.levelUpCoefficient,
        0,
      ),
      damageComponents: components,
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

  const aggregateDamage = {
    physical: {
      coefficient: contacts.reduce(
        (sum, contact) =>
          sum +
          (contact.damageComponents?.find((component) => component.damageType === 1)?.coefficient ??
            0),
        0,
      ),
      levelUpCoefficient: contacts.reduce(
        (sum, contact) =>
          sum +
          (contact.damageComponents?.find((component) => component.damageType === 1)
            ?.levelUpCoefficient ?? 0),
        0,
      ),
    },
    magic: {
      coefficient: contacts.reduce(
        (sum, contact) =>
          sum +
          (contact.damageComponents?.find((component) => component.damageType === 2)?.coefficient ??
            0),
        0,
      ),
      levelUpCoefficient: contacts.reduce(
        (sum, contact) =>
          sum +
          (contact.damageComponents?.find((component) => component.damageType === 2)
            ?.levelUpCoefficient ?? 0),
        0,
      ),
    },
  };
  invariant(
    aggregateDamage.physical.coefficient === 13_000 &&
      aggregateDamage.physical.levelUpCoefficient === 270 &&
      aggregateDamage.magic.coefficient === 8_000 &&
      aggregateDamage.magic.levelUpCoefficient === 140,
    'aggregate Totem damage',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 3104,
    spawnAttackId: 310401,
    totemId: 1010,
    spawnOffsetMs: 100,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill3104.totem-anchor-lifetime-v1',
      anchor: 'selected-target-position-at-cast',
      lifetimeConversion: 'skill-totem-time-seconds',
      lifetimeMs: 4000,
      unresolvedNativeFacts: [
        'native-spawn-coordinate-transform',
        'native-skill-totem-time-unit-conversion',
      ],
    },
    ownerSnapshot: {
      damagePower: 'owner-physical-and-spell-power-at-cast',
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
    aggregateCoefficient: 21_000,
    aggregateLevelUpCoefficient: 410,
    aggregateDamage,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}
