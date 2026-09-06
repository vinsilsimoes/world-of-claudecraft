import { mir4NativeDirectSkillActionEvidenceById } from '../content/mir4/native_skill_action_evidence';
import type { Mir4NativeSkillAction } from '../content/mir4/native_skill_action_types';
import { deepFreezeMir4NativeEvidence } from '../content/mir4/native_skill_raw_records';
import { mir4NativeTotemEvidenceById } from '../content/mir4/native_skill_totem_evidence';
import type {
  Mir4NativeTotemAttackRow,
  Mir4NativeTotemCatalogEntry,
} from '../content/mir4/native_skill_totem_types';
import { compileMir4BlizzardTotemRuntimePlan } from './native_skill_blizzard_totem';
import { compileMir4BurstShellTotemRuntimePlan } from './native_skill_burst_shell_totem';
import { compileMir4CloakingTotemRuntimePlan } from './native_skill_cloaking_totem';
import { compileMir4DragonTornadoTotemRuntimePlan } from './native_skill_dragon_tornado_totem';
import { compileMir4FlashArrowTotemRuntimePlan } from './native_skill_flash_arrow_totem';
import { compileMir4HeavenlyBowTotemRuntimePlan } from './native_skill_heavenly_bow_totem';
import { compileMir4IceCageTotemRuntimePlan } from './native_skill_ice_cage_totem';
import { compileMir4MoonlightOrbTotemRuntimePlan } from './native_skill_moonlight_orb_totem';
import { compileMir4MoonlightWaveTotemRuntimePlan } from './native_skill_moonlight_wave_totem';
import { compileMir4RainOfBladesTotemRuntimePlan } from './native_skill_rain_of_blades_totem';
import { compileMir4SoulDevourTotemRuntimePlan } from './native_skill_soul_devour_totem';
import { mir4NativeDistanceToYards } from './native_skill_units';
import { compileMir4VenomMistShellTotemRuntimePlan } from './native_skill_venom_mist_shell_totem';

export interface Mir4NativeTotemRuntimeDamageComponent {
  readonly damageType: 1 | 2;
  readonly damageAttribute: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
}

export interface Mir4NativeTotemRuntimeContactPlan {
  readonly attackId: number;
  /** Milliseconds from the owning player cast, including the spawn contact. */
  readonly offsetMs: number;
  readonly damageType: 1 | 2;
  readonly damageAttribute: number;
  readonly coefficient: number;
  readonly levelUpCoefficient: number;
  /** Exact SKILL_ATTACK combat-side fields owned by this Totem row. */
  readonly nativeCombat?: Readonly<{
    readonly attackRagePoint: number;
    readonly hitRagePoint: number;
    readonly aggroRate: number;
  }>;
  /** Present only when one native contact resolves through both defense channels. */
  readonly damageComponents?: readonly Mir4NativeTotemRuntimeDamageComponent[];
  readonly area: {
    readonly impactType: 2;
    readonly radiusMinYards: number;
    readonly radiusMaxYards: number;
    readonly heightYards: number;
    readonly targetCap: number;
    readonly nativeOffset: Readonly<{ x: number; y: number; z: number }>;
  };
  readonly reaction: {
    readonly kind: 'none' | 'hit' | 'knock-back' | 'knock-down' | 'attack-back';
    readonly stance: 'none' | 'hit-01' | 'down-02';
    readonly nativeValue: number;
    readonly nativeHeight?: number;
    readonly moveDistanceYards: number;
    readonly moveDurationMs: number;
    readonly durationMs: number;
    readonly probabilityPercent: 10 | 100;
    readonly direction: 0;
  };
}

export interface Mir4NativeTotemRuntimeTelegraphPlan {
  readonly attackId: number;
  /** Milliseconds from the owning player cast, including the spawn contact. */
  readonly offsetMs: number;
  readonly area: Mir4NativeTotemRuntimeContactPlan['area'];
}

export interface Mir4NativeTotemRuntimePlan {
  readonly skillId:
    | 2203
    | 2301
    | 2403
    | 2501
    | 2502
    | 3104
    | 3301
    | 3506
    | 4103
    | 4104
    | 4105
    | 4107
    | 4108
    | 4112;
  readonly spawnAttackId:
    | 220301
    | 230101
    | 240302
    | 250101
    | 250201
    | 310401
    | 330101
    | 350601
    | 410302
    | 410402
    | 410501
    | 410701
    | 410801
    | 411201;
  readonly totemId:
    | 1001
    | 1004
    | 1008
    | 1009
    | 1010
    | 1011
    | 1012
    | 1013
    | 1401
    | 1403
    | 1404
    | 1405
    | 1406
    | 1402;
  readonly spawnOffsetMs: 20 | 100 | 200 | 390 | 450 | 560 | 567 | 600 | 800;
  readonly reconstruction: {
    readonly authority: 'authorial-browser-reconstruction';
    readonly nativeClaim: false;
    readonly policyId:
      | 'mir4-authorial.skill2301.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill2203.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill2403.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill2501.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill2502.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill3104.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill3301.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill3506.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4103.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4104.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4105.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4107.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4108.totem-anchor-lifetime-v1'
      | 'mir4-authorial.skill4112.totem-anchor-lifetime-v1';
    readonly anchor: 'selected-target-position-at-cast' | 'source-position-at-cast';
    readonly lifetimeConversion: 'skill-totem-time-seconds';
    readonly lifetimeMs: 1000 | 3000 | 4000 | 6000;
    readonly unresolvedNativeFacts: readonly [
      'native-spawn-coordinate-transform',
      'native-skill-totem-time-unit-conversion',
    ];
  };
  readonly ownerSnapshot: {
    readonly damagePower:
      | 'owner-spell-power-at-cast'
      | 'owner-physical-power-at-cast'
      | 'owner-physical-and-spell-power-at-cast';
    readonly combatPower: 'owner-at-spawn';
    readonly accuracyNative: 3000;
    readonly criticalNative: 1300 | 2500;
    readonly criticalOutcomeNative: 12000;
  };
  readonly combatResolution: {
    readonly authority: 'authorial-browser-reconstruction';
    readonly nativeClaim: false;
    readonly policyId: 'mir4-authorial.totem-native-fields-to-bounded-outcomes-v1';
    readonly mapping: 'native-fixed-fields-to-bounded-outcomes';
    readonly hitChanceBps: 9950;
    readonly criticalChanceBps: 1300 | 2500;
    readonly criticalMultiplierBps: 22000;
    readonly unresolvedNativeFacts: readonly [
      'native-accuracy-admission-modifier-selectors',
      'native-critical-admission-modifier-selectors',
      'native-critical-outcome-branch-arithmetic',
    ];
  };
  readonly attackDelayMs: 6000 | 8000;
  readonly repeatBeforeExpiry: false;
  readonly targetSelection: {
    readonly timing: 'fresh-at-each-contact';
    readonly order: 'host-zone-iteration-order';
    readonly pvp: 'fail-closed';
  };
  readonly aggregateCoefficient:
    | 0
    | 9000
    | 19000
    | 20000
    | 21000
    | 21600
    | 22000
    | 23500
    | 26400
    | 29200
    | 68000;
  readonly aggregateLevelUpCoefficient: 0 | 200 | 400 | 410 | 420 | 440 | 528 | 550 | 600 | 1500;
  readonly aggregateDamage?: Readonly<{
    physical: Readonly<{ coefficient: number; levelUpCoefficient: number }>;
    magic: Readonly<{ coefficient: number; levelUpCoefficient: number }>;
  }>;
  /** Source-authored zero-damage contacts that telegraph the durable field. */
  readonly telegraphs: readonly Mir4NativeTotemRuntimeTelegraphPlan[];
  readonly contacts: readonly Mir4NativeTotemRuntimeContactPlan[];
}

const DARK_VORTEX_EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    attackId: 250111,
    impactStartMs: 0,
    impactOffsetMs: 1000,
    coefficient: 4000,
    levelUpCoefficient: 80,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    value: 20,
    valueEx: 0.2,
    durationMs: 600,
  }),
  Object.freeze({
    attackId: 250112,
    impactStartMs: 1300,
    impactOffsetMs: 1500,
    coefficient: 4000,
    levelUpCoefficient: 80,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    value: -20,
    valueEx: 0.2,
    durationMs: 400,
  }),
  Object.freeze({
    attackId: 250113,
    impactStartMs: 1950,
    impactOffsetMs: 2150,
    coefficient: 4000,
    levelUpCoefficient: 80,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    value: 20,
    valueEx: 0.2,
    durationMs: 300,
  }),
  Object.freeze({
    attackId: 250114,
    impactStartMs: 2350,
    impactOffsetMs: 2550,
    coefficient: 5000,
    levelUpCoefficient: 90,
    reactionKind: 'knock-back' as const,
    stance: 'hit-01' as const,
    value: -10,
    valueEx: 0.1,
    durationMs: 100,
  }),
  Object.freeze({
    attackId: 250115,
    impactStartMs: 2750,
    impactOffsetMs: 2850,
    coefficient: 5000,
    levelUpCoefficient: 90,
    reactionKind: 'knock-down' as const,
    stance: 'down-02' as const,
    value: 300,
    valueEx: 0.9,
    durationMs: 2100,
  }),
]);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Dark Vortex Totem mismatch: ${message}`);
}

function validateDarkVortexAreaRow(row: Mir4NativeTotemAttackRow): void {
  invariant(row.nativeBehavior.attackUseType === 1, `AttackID ${row.attackId} AttackUseType`);
  invariant(row.targetSubtype === 'alive-only', `AttackID ${row.attackId} TargetSubType`);
  invariant(row.impactType === 2, `AttackID ${row.attackId} ImpactType`);
  invariant(row.authorialTargetValue === 6, `AttackID ${row.attackId} TargetValue`);
  invariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  invariant(row.geometry.nativeDistanceMin === 0, `AttackID ${row.attackId} AttackDistanceMin`);
  invariant(row.geometry.nativeDistanceMax === 450, `AttackID ${row.attackId} AttackDistanceMax`);
  invariant(row.geometry.nativeHeight === 300, `AttackID ${row.attackId} AttackHeight`);
  invariant(row.geometry.nativeOffset.x === 0, `AttackID ${row.attackId} LocationOffset.X`);
  invariant(row.geometry.nativeOffset.y === 0, `AttackID ${row.attackId} LocationOffset.Y`);
  invariant(row.geometry.nativeOffset.z === 150, `AttackID ${row.attackId} LocationOffset.Z`);
  invariant(row.damage.type === 2, `AttackID ${row.attackId} DamageType`);
  invariant(row.damage.attribute === 0, `AttackID ${row.attackId} DamageAttribute`);
  invariant(row.reaction.probabilityPercent === 100, `AttackID ${row.attackId} reaction chance`);
  invariant(row.reaction.direction === 0, `AttackID ${row.attackId} reaction direction`);
  invariant(row.impactOffsetsMs.length === 1, `AttackID ${row.attackId} impact cardinality`);
}

/**
 * Compile the first reviewed persistent-area Totem without generalising facts
 * which the preserved server does not prove. The hard guards are deliberate:
 * any source drift closes the runtime path instead of changing gameplay.
 */
export function compileMir4DarkVortexTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  invariant(action.skillId === 2501, 'SkillId');
  invariant(entry.record.TotemId === 1009, 'TotemId');
  invariant(entry.bridge.SkillId === 2501, 'bridge SkillId');
  invariant(entry.bridge.AttackID === 250101, 'bridge AttackID');
  invariant(entry.bridge.SkillTotem === 1009, 'bridge SkillTotem');
  invariant(entry.bridge.SkillTotemTarget === 0, 'bridge SkillTotemTarget');
  invariant(entry.bridge.SkillTotemTime === 6, 'bridge SkillTotemTime');
  invariant(entry.bridge.SkillTotemCount === 1, 'bridge SkillTotemCount');
  invariant(entry.record.SkillAttackID === 250111, 'Totem SkillAttackID');
  invariant(entry.record.AttackDelay === 8, 'Totem AttackDelay');
  invariant(entry.record.Cleartime === 6, 'Totem Cleartime');
  invariant(entry.record.DetectRange === 3000, 'Totem DetectRange');
  invariant(entry.record.AccuracyPer === 3000, 'Totem AccuracyPer');
  invariant(entry.record.CriticalPer === 1300, 'Totem CriticalPer');
  invariant(entry.record.CriticalOutcomePer === 12000, 'Totem CriticalOutcomePer');

  const setupRow = action.rows.find((row) => row.attackId === entry.bridge.AttackID);
  invariant(setupRow !== undefined, 'missing setup row');
  invariant(setupRow.impactOffsetsMs.length === 1, 'setup impact cardinality');
  invariant(setupRow.impactOffsetsMs[0] === 100, 'setup impact timing');
  invariant(setupRow.nativeBehavior.totem !== null, 'setup Totem reference');
  invariant(setupRow.nativeBehavior.totem.id === 1009, 'setup Totem id');
  invariant(setupRow.nativeBehavior.totem.target === 0, 'setup Totem target');
  invariant(setupRow.nativeBehavior.totem.time === 6, 'setup Totem time');
  invariant(setupRow.nativeBehavior.totem.count === 1, 'setup Totem count');
  invariant(entry.attackRows.length === DARK_VORTEX_EXPECTED_ROWS.length, 'attack-row count');

  let cursorMs = 100;
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < DARK_VORTEX_EXPECTED_ROWS.length; index += 1) {
    const expected = DARK_VORTEX_EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    invariant(row !== undefined, `missing attack row ${expected.attackId}`);
    validateDarkVortexAreaRow(row);
    invariant(row.attackId === expected.attackId, `AttackID at row ${index}`);
    invariant(
      row.impactStartMs === expected.impactStartMs,
      `AttackID ${row.attackId} ImpactStartTime`,
    );
    invariant(
      row.impactOffsetsMs[0] === expected.impactOffsetMs,
      `AttackID ${row.attackId} ImpactTime`,
    );
    invariant(
      row.damage.coefficient === expected.coefficient,
      `AttackID ${row.attackId} coefficient`,
    );
    invariant(
      row.damage.levelUpCoefficient === expected.levelUpCoefficient,
      `AttackID ${row.attackId} level coefficient`,
    );
    invariant(
      row.reaction.kind === expected.reactionKind,
      `AttackID ${row.attackId} reaction kind`,
    );
    invariant(row.reaction.stance === expected.stance, `AttackID ${row.attackId} reaction stance`);
    invariant(row.reaction.value === expected.value, `AttackID ${row.attackId} reaction value`);
    invariant(
      row.reaction.valueEx === expected.valueEx,
      `AttackID ${row.attackId} reaction movement time`,
    );
    invariant(
      row.reaction.durationMs === expected.durationMs,
      `AttackID ${row.attackId} reaction duration`,
    );

    cursorMs += expected.impactOffsetMs - expected.impactStartMs;
    contacts.push({
      attackId: row.attackId,
      offsetMs: cursorMs,
      damageType: 2,
      damageAttribute: 0,
      coefficient: row.damage.coefficient,
      levelUpCoefficient: row.damage.levelUpCoefficient,
      area: {
        impactType: 2,
        radiusMinYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin),
        radiusMaxYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
        heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
        targetCap: row.authorialTargetValue,
        nativeOffset: { ...row.geometry.nativeOffset },
      },
      reaction: {
        kind: expected.reactionKind,
        stance: expected.stance,
        nativeValue: expected.value,
        moveDistanceYards: mir4NativeDistanceToYards(expected.value),
        moveDurationMs: Math.round(expected.valueEx * 1000),
        durationMs: expected.durationMs,
        probabilityPercent: 100,
        direction: 0,
      },
    });
  }

  const aggregateCoefficient = contacts.reduce((total, contact) => total + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (total, contact) => total + contact.levelUpCoefficient,
    0,
  );
  invariant(aggregateCoefficient === 22000, 'aggregate coefficient');
  invariant(aggregateLevelUpCoefficient === 420, 'aggregate level coefficient');
  invariant(
    action.nativeBehavior.damageType === 0 &&
      action.nativeBehavior.primaryDamage.coefficient === 0 &&
      action.nativeBehavior.secondaryDamage.coefficient * 100 === aggregateCoefficient + 4000 &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        aggregateLevelUpCoefficient + 80,
    'SKILL summary versus direct plus Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 2501,
    spawnAttackId: 250101,
    totemId: 1009,
    spawnOffsetMs: 100,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2501.totem-anchor-lifetime-v1',
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
      // AccuracyPer is added to Aeldrune's contested base and bounded by its
      // existing PvE ceiling; CriticalPer is already fixed point; the source
      // critical-outcome branch is missing, so its 1.2 proportional value is
      // reconstructed as +120% over a normal hit.
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
    aggregateCoefficient: 22000,
    aggregateLevelUpCoefficient: 420,
    telegraphs: [],
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}

const THUNDERSTORM_EXPECTED_ROWS = Object.freeze([
  Object.freeze({
    attackId: 230112,
    impactStartMs: 0,
    impactOffsetMs: 700,
    coefficient: 0,
    levelUpCoefficient: 0,
    targetCap: 10,
    radiusNative: 700,
    reactionKind: 'none' as const,
    stance: 'none' as const,
    durationMs: 0,
  }),
  ...[230113, 230114, 230115, 230116].map((attackId, index) =>
    Object.freeze({
      attackId,
      impactStartMs: [900, 1200, 1450, 1500][index],
      impactOffsetMs: [1000, 1250, 1500, 1550][index],
      coefficient: 7300,
      levelUpCoefficient: 150,
      targetCap: index === 3 ? 8 : 10,
      radiusNative: index === 3 ? 350 : 700,
      reactionKind: 'hit' as const,
      stance: 'hit-01' as const,
      durationMs: 200,
    }),
  ),
]);

function thunderstormInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`MIR4 Thunderstorm Totem mismatch: ${message}`);
}

function thunderstormArea(
  row: Mir4NativeTotemAttackRow,
): Mir4NativeTotemRuntimeContactPlan['area'] {
  return {
    impactType: 2,
    radiusMinYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMin),
    radiusMaxYards: mir4NativeDistanceToYards(row.geometry.nativeDistanceMax),
    heightYards: mir4NativeDistanceToYards(row.geometry.nativeHeight),
    targetCap: row.authorialTargetValue,
    nativeOffset: { ...row.geometry.nativeOffset },
  };
}

function validateThunderstormAreaRow(
  row: Mir4NativeTotemAttackRow,
  expected: (typeof THUNDERSTORM_EXPECTED_ROWS)[number],
): void {
  thunderstormInvariant(
    row.nativeBehavior.attackUseType === 1,
    `AttackID ${row.attackId} AttackUseType`,
  );
  thunderstormInvariant(
    row.targetSubtype === 'alive-only',
    `AttackID ${row.attackId} TargetSubType`,
  );
  thunderstormInvariant(
    row.targetDistance.nativeMin === 0,
    `AttackID ${row.attackId} TargetDistanceMin`,
  );
  thunderstormInvariant(
    row.targetDistance.nativeMax === 2000,
    `AttackID ${row.attackId} TargetDistanceMax`,
  );
  thunderstormInvariant(row.impactType === 2, `AttackID ${row.attackId} ImpactType`);
  thunderstormInvariant(
    row.authorialTargetValue === expected.targetCap,
    `AttackID ${row.attackId} TargetValue`,
  );
  thunderstormInvariant(row.geometry.angleDegrees === 360, `AttackID ${row.attackId} AttackAngle`);
  thunderstormInvariant(
    row.geometry.nativeDistanceMin === 0,
    `AttackID ${row.attackId} AttackDistanceMin`,
  );
  thunderstormInvariant(
    row.geometry.nativeDistanceMax === expected.radiusNative,
    `AttackID ${row.attackId} AttackDistanceMax`,
  );
  thunderstormInvariant(row.geometry.nativeHeight === 400, `AttackID ${row.attackId} AttackHeight`);
  thunderstormInvariant(
    row.geometry.nativeOffset.x === 0,
    `AttackID ${row.attackId} LocationOffset.X`,
  );
  thunderstormInvariant(
    row.geometry.nativeOffset.y === 0,
    `AttackID ${row.attackId} LocationOffset.Y`,
  );
  thunderstormInvariant(
    row.geometry.nativeOffset.z === 0,
    `AttackID ${row.attackId} LocationOffset.Z`,
  );
  thunderstormInvariant(
    row.damage.type === (expected.coefficient === 0 ? 0 : 2),
    `AttackID ${row.attackId} DamageType`,
  );
  thunderstormInvariant(
    row.damage.attribute === (expected.coefficient === 0 ? 0 : 3),
    `AttackID ${row.attackId} DamageAttribute`,
  );
  thunderstormInvariant(
    row.damage.coefficient === expected.coefficient,
    `AttackID ${row.attackId} coefficient`,
  );
  thunderstormInvariant(
    row.damage.levelUpCoefficient === expected.levelUpCoefficient,
    `AttackID ${row.attackId} level coefficient`,
  );
  thunderstormInvariant(
    row.reaction.kind === expected.reactionKind,
    `AttackID ${row.attackId} reaction kind`,
  );
  thunderstormInvariant(
    row.reaction.stance === expected.stance,
    `AttackID ${row.attackId} reaction stance`,
  );
  thunderstormInvariant(row.reaction.value === 0, `AttackID ${row.attackId} reaction value`);
  thunderstormInvariant(
    row.reaction.valueEx === 0,
    `AttackID ${row.attackId} reaction movement time`,
  );
  thunderstormInvariant(
    row.reaction.durationMs === expected.durationMs,
    `AttackID ${row.attackId} reaction duration`,
  );
  thunderstormInvariant(
    row.reaction.probabilityPercent === (expected.coefficient === 0 ? 0 : 100),
    `AttackID ${row.attackId} reaction chance`,
  );
  thunderstormInvariant(
    row.reaction.direction === 0,
    `AttackID ${row.attackId} reaction direction`,
  );
  thunderstormInvariant(
    row.impactOffsetsMs.length === 1,
    `AttackID ${row.attackId} impact cardinality`,
  );
}

/**
 * Reconstruct the reviewed Thunderstorm field from its direct spawn row and
 * five-row Totem graph. Only the two absent engine transforms remain
 * authorial; targeting, timing, damage, radii, caps, and reactions are pinned.
 */
export function compileMir4ThunderstormTotemRuntimePlan(
  action: Mir4NativeSkillAction,
  entry: Mir4NativeTotemCatalogEntry,
): Mir4NativeTotemRuntimePlan {
  thunderstormInvariant(action.skillId === 2301, 'SkillId');
  thunderstormInvariant(entry.record.TotemId === 1001, 'TotemId');
  thunderstormInvariant(entry.bridge.SkillId === 2301, 'bridge SkillId');
  thunderstormInvariant(entry.bridge.AttackID === 230101, 'bridge AttackID');
  thunderstormInvariant(entry.bridge.SkillTotem === 1001, 'bridge SkillTotem');
  thunderstormInvariant(entry.bridge.SkillTotemTarget === 0, 'bridge SkillTotemTarget');
  thunderstormInvariant(entry.bridge.SkillTotemTime === 4, 'bridge SkillTotemTime');
  thunderstormInvariant(entry.bridge.SkillTotemCount === 1, 'bridge SkillTotemCount');
  thunderstormInvariant(entry.record.SkillAttackID === 230112, 'Totem SkillAttackID');
  thunderstormInvariant(entry.record.AttackDelay === 6, 'Totem AttackDelay');
  thunderstormInvariant(entry.record.Cleartime === 4, 'Totem Cleartime');
  thunderstormInvariant(entry.record.DetectRange === 3000, 'Totem DetectRange');
  thunderstormInvariant(entry.record.PhysicalAttack === 40, 'Totem PhysicalAttack');
  thunderstormInvariant(entry.record.MagicAttack === 40, 'Totem MagicAttack');
  thunderstormInvariant(entry.record.CombatPower === 1827, 'Totem CombatPower');
  thunderstormInvariant(entry.record.AccuracyPer === 3000, 'Totem AccuracyPer');
  thunderstormInvariant(entry.record.CriticalPer === 1300, 'Totem CriticalPer');
  thunderstormInvariant(entry.record.CriticalOutcomePer === 12000, 'Totem CriticalOutcomePer');

  const setupRow = action.rows.find((row) => row.attackId === entry.bridge.AttackID);
  thunderstormInvariant(setupRow !== undefined, 'missing setup row');
  thunderstormInvariant(setupRow.impactOffsetsMs.length === 1, 'setup impact cardinality');
  thunderstormInvariant(setupRow.impactOffsetsMs[0] === 100, 'setup impact timing');
  thunderstormInvariant(setupRow.damage.type === 0, 'setup damage type');
  thunderstormInvariant(setupRow.nativeBehavior.totem !== null, 'setup Totem reference');
  thunderstormInvariant(setupRow.nativeBehavior.totem.id === 1001, 'setup Totem id');
  thunderstormInvariant(setupRow.nativeBehavior.totem.target === 0, 'setup Totem target');
  thunderstormInvariant(setupRow.nativeBehavior.totem.time === 4, 'setup Totem time');
  thunderstormInvariant(setupRow.nativeBehavior.totem.count === 1, 'setup Totem count');
  thunderstormInvariant(
    entry.attackRows.length === THUNDERSTORM_EXPECTED_ROWS.length,
    'attack-row count',
  );

  let cursorMs = 100;
  const telegraphs: Mir4NativeTotemRuntimeTelegraphPlan[] = [];
  const contacts: Mir4NativeTotemRuntimeContactPlan[] = [];
  for (let index = 0; index < THUNDERSTORM_EXPECTED_ROWS.length; index += 1) {
    const expected = THUNDERSTORM_EXPECTED_ROWS[index];
    const row = entry.attackRows[index];
    thunderstormInvariant(row !== undefined, `missing attack row ${expected.attackId}`);
    thunderstormInvariant(row.attackId === expected.attackId, `AttackID at row ${index}`);
    validateThunderstormAreaRow(row, expected);
    thunderstormInvariant(
      row.impactStartMs === expected.impactStartMs,
      `AttackID ${row.attackId} ImpactStartTime`,
    );
    thunderstormInvariant(
      row.impactOffsetsMs[0] === expected.impactOffsetMs,
      `AttackID ${row.attackId} ImpactTime`,
    );

    cursorMs += expected.impactOffsetMs - expected.impactStartMs;
    if (expected.coefficient === 0) {
      telegraphs.push({
        attackId: row.attackId,
        offsetMs: cursorMs,
        area: thunderstormArea(row),
      });
      continue;
    }
    contacts.push({
      attackId: row.attackId,
      offsetMs: cursorMs,
      damageType: 2,
      damageAttribute: 3,
      coefficient: row.damage.coefficient,
      levelUpCoefficient: row.damage.levelUpCoefficient,
      area: thunderstormArea(row),
      reaction: {
        kind: 'hit',
        stance: 'hit-01',
        nativeValue: 0,
        moveDistanceYards: 0,
        moveDurationMs: 0,
        durationMs: 200,
        probabilityPercent: 100,
        direction: 0,
      },
    });
  }

  const aggregateCoefficient = contacts.reduce((total, contact) => total + contact.coefficient, 0);
  const aggregateLevelUpCoefficient = contacts.reduce(
    (total, contact) => total + contact.levelUpCoefficient,
    0,
  );
  thunderstormInvariant(aggregateCoefficient === 29_200, 'aggregate coefficient');
  thunderstormInvariant(aggregateLevelUpCoefficient === 600, 'aggregate level coefficient');
  thunderstormInvariant(
    action.nativeBehavior.damageType === 1 &&
      action.nativeBehavior.primaryDamage.coefficient === 0 &&
      action.nativeBehavior.secondaryDamage.coefficient * 100 === aggregateCoefficient &&
      action.nativeBehavior.secondaryDamage.levelUpCoefficient * 100 ===
        aggregateLevelUpCoefficient,
    'SKILL summary versus Totem contacts',
  );

  return deepFreezeMir4NativeEvidence({
    skillId: 2301,
    spawnAttackId: 230101,
    totemId: 1001,
    spawnOffsetMs: 100,
    reconstruction: {
      authority: 'authorial-browser-reconstruction',
      nativeClaim: false,
      policyId: 'mir4-authorial.skill2301.totem-anchor-lifetime-v1',
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
    aggregateCoefficient: 29_200,
    aggregateLevelUpCoefficient: 600,
    telegraphs,
    contacts,
  }) as Mir4NativeTotemRuntimePlan;
}

/** Runtime allowlist. Other extracted Totems remain evidence-only. */
export function mir4NativeRuntimeTotemPlan(skillId: number): Mir4NativeTotemRuntimePlan | null {
  if (
    skillId !== 2203 &&
    skillId !== 2301 &&
    skillId !== 2403 &&
    skillId !== 2501 &&
    skillId !== 2502 &&
    skillId !== 3104 &&
    skillId !== 3301 &&
    skillId !== 3506 &&
    skillId !== 4103 &&
    skillId !== 4104 &&
    skillId !== 4105 &&
    skillId !== 4107 &&
    skillId !== 4108 &&
    skillId !== 4112
  )
    return null;
  const entry = mir4NativeTotemEvidenceById(
    skillId === 2203
      ? 1008
      : skillId === 2301
        ? 1001
        : skillId === 2403
          ? 1013
          : skillId === 2501
            ? 1009
            : skillId === 2502
              ? 1011
              : skillId === 3104
                ? 1010
                : skillId === 3301
                  ? 1004
                  : skillId === 3506
                    ? 1012
                    : skillId === 4104
                      ? 1405
                      : skillId === 4105
                        ? 1404
                        : skillId === 4108
                          ? 1403
                          : skillId === 4107
                            ? 1406
                            : skillId === 4112
                              ? 1402
                              : 1401,
  );
  if (!entry) return null;
  const action = mir4NativeDirectSkillActionEvidenceById(skillId);
  if (!action) return null;
  try {
    if (skillId === 2203) return compileMir4BlizzardTotemRuntimePlan(action, entry);
    if (skillId === 2403) return compileMir4DragonTornadoTotemRuntimePlan(action, entry);
    if (skillId === 2502) return compileMir4SoulDevourTotemRuntimePlan(action, entry);
    if (skillId === 3104) return compileMir4RainOfBladesTotemRuntimePlan(action, entry);
    if (skillId === 3301) return compileMir4MoonlightOrbTotemRuntimePlan(action, entry);
    if (skillId === 3506) return compileMir4MoonlightWaveTotemRuntimePlan(action, entry);
    if (skillId === 4103) return compileMir4BurstShellTotemRuntimePlan(action, entry);
    if (skillId === 4104) return compileMir4VenomMistShellTotemRuntimePlan(action, entry);
    if (skillId === 4105) return compileMir4IceCageTotemRuntimePlan(action, entry);
    if (skillId === 4107) return compileMir4FlashArrowTotemRuntimePlan(action, entry);
    if (skillId === 4108) return compileMir4HeavenlyBowTotemRuntimePlan(action, entry);
    if (skillId === 4112) return compileMir4CloakingTotemRuntimePlan(action, entry);
    return skillId === 2301
      ? compileMir4ThunderstormTotemRuntimePlan(action, entry)
      : compileMir4DarkVortexTotemRuntimePlan(action, entry);
  } catch {
    return null;
  }
}
