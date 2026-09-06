import { describe, expect, it } from 'vitest';
import {
  MIR4_CLASS_COMBAT_SPECS,
  MIR4_CLASSES,
  MIR4_SKILLS,
  type Mir4ClassDef,
  type Mir4ClassId,
  type Mir4SkillEffect,
  mir4NativeSkillActionById,
  mir4SkillById,
} from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import {
  mir4ActionAbilityDef,
  mir4ActionId,
  mir4ClassIdFromUltimateAction,
  mir4SkillIdFromAction,
  mir4UltimateActionId,
} from '../../src/sim/mir4/action_abilities';
import {
  mir4AttackMultiplier,
  mir4DefenseMultiplier,
  mir4DodgeBonus,
  mir4NativeStatusBonus,
} from '../../src/sim/mir4/effects';
import { mir4NativeSkillActivationRanges } from '../../src/sim/mir4/native_skill_activation_range';
import {
  MIR4_NATIVE_ULTIMATE_SKILL_IDS,
  mir4NativeUltimateExecutionPlan,
} from '../../src/sim/mir4/native_ultimate_runtime';
import {
  type Mir4SkillActivationResult,
  requestMir4SkillActivation,
} from '../../src/sim/mir4/skill_activation';
import {
  type Mir4SkillTargetMode,
  mir4SkillActivationPolicy,
} from '../../src/sim/mir4/skill_activation_policy';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { Sim } from '../../src/sim/sim';
import { type Entity, emptyMoveInput, PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const MAX_UNLOCK_LEVEL = 56;
const OUT_OF_RANGE_OFFSET = 40;
const MAX_PENDING_IMPACT_TICKS = 120;

interface RuntimeAction {
  readonly abilityId: string;
  readonly classId: Mir4ClassId;
}

type ActivationGeometry =
  | 'self'
  | 'single-target'
  | 'actor-area'
  | 'forward-area'
  | 'frontal-strip'
  | 'charge'
  | 'target-area'
  | 'ultimate';

interface LiveActionFamily {
  readonly key: string;
  readonly targetMode: Mir4SkillTargetMode;
  readonly geometry: ActivationGeometry;
  readonly range: number;
  readonly secondaryFootprint: boolean;
}

interface FamilyRepresentative extends RuntimeAction {
  readonly family: LiveActionFamily;
}

interface TargetlessOutcome {
  readonly rank?: number;
  readonly damage?: true;
  readonly heal?: true;
  readonly shield?: true;
  readonly attackBoost?: true;
  readonly spellAttackFlat?: number;
  readonly nativeStatus?: readonly [statusId: number, magnitude: number];
  readonly defenseBoost?: true;
  readonly dodgeBoost?: true;
  readonly stealth?: true;
}

const RUNTIME_ACTIONS: readonly RuntimeAction[] = [
  ...MIR4_SKILLS.map((skill) => ({
    abilityId: mir4ActionId(skill.skillId),
    classId: skill.classId,
  })),
  ...MIR4_CLASSES.map((cls) => ({
    abilityId: mir4UltimateActionId(cls.classId),
    classId: cls.classId,
  })),
];

function policyFor(abilityId: string) {
  const policy = mir4SkillActivationPolicy(abilityId);
  if (!policy) throw new Error(`missing activation policy for ${abilityId}`);
  return policy;
}

function actionsWithMode(mode: Mir4SkillTargetMode): RuntimeAction[] {
  return RUNTIME_ACTIONS.filter((action) => policyFor(action.abilityId).targetMode === mode);
}

function queuedCommitDistance(abilityId: string, fallbackRange: number): number {
  const regularSkillId = mir4SkillIdFromAction(abilityId);
  const ultimateClassId = MIR4_CLASSES.find(
    (cls) => mir4UltimateActionId(cls.classId) === abilityId,
  )?.classId;
  const skillId =
    regularSkillId ??
    (ultimateClassId === undefined ? null : MIR4_NATIVE_ULTIMATE_SKILL_IDS[ultimateClassId]);
  const nativeRanges =
    skillId === null
      ? null
      : mir4NativeSkillActivationRanges(skillId, {
          targetBodyRadiusYards: PLAYER_BODY_RADIUS,
          skillDistanceBonusNative: 0,
        });
  return nativeRanges?.traceStopRangeYards ?? Math.max(0.5, fallbackRange - 0.25);
}

const SELECTED_HOSTILE_ACTIONS = actionsWithMode('selected-hostile');
const TARGETLESS_ACTIONS = actionsWithMode('none');
const TARGETLESS_CLASSES = MIR4_CLASSES.filter((cls) =>
  TARGETLESS_ACTIONS.some((action) => action.classId === cls.classId),
);

function liveActionFamily(action: RuntimeAction): LiveActionFamily {
  const policy = policyFor(action.abilityId);
  const actionDef = mir4ActionAbilityDef(action.abilityId);
  if (!actionDef) throw new Error(`missing action definition for ${action.abilityId}`);
  const skillId = mir4SkillIdFromAction(action.abilityId);
  if (skillId === null) {
    const geometry: ActivationGeometry = 'ultimate';
    return {
      key: `${policy.targetMode}:${geometry}:${actionDef.range}:primary`,
      targetMode: policy.targetMode,
      geometry,
      range: actionDef.range,
      secondaryFootprint: false,
    };
  }

  const skill = mir4SkillById(skillId);
  if (!skill) throw new Error(`missing skill definition for ${skillId}`);
  const effect = skill.effect;
  const areaRadius = Number(effect?.areaRadiusPx ?? 0);
  const secondaryFootprint =
    Number(effect?.maxSecondaryTargets ?? 0) > 0 &&
    (areaRadius > 0 || effect?.areaShape === 'frontal-strip');
  let geometry: ActivationGeometry;
  if (policy.targetMode === 'none' && skill.damage === null) geometry = 'self';
  else if (effect?.chargeToTarget) geometry = 'charge';
  else if (effect?.areaShape === 'frontal-strip') geometry = 'frontal-strip';
  else if (policy.targetMode === 'none' && areaRadius > 0) geometry = 'actor-area';
  else if (effect?.areaOrigin === 'actor') geometry = 'actor-area';
  else if (effect?.areaOrigin === 'forward') geometry = 'forward-area';
  else if (areaRadius > 0) geometry = 'target-area';
  else geometry = 'single-target';

  const footprint = [
    effect?.areaOrigin ?? 'target',
    effect?.areaShape ?? 'circle',
    areaRadius,
    Number(effect?.areaForwardOffsetPx ?? 0),
    Number(effect?.areaLengthPx ?? 0),
    Number(effect?.areaWidthPx ?? 0),
    Number(effect?.maxSecondaryTargets ?? 0),
    effect?.chargeToTarget === true ? 'charge' : 'stationary',
  ].join(':');

  return {
    key: `${policy.targetMode}:${geometry}:${actionDef.range}:${footprint}`,
    targetMode: policy.targetMode,
    geometry,
    range: actionDef.range,
    secondaryFootprint,
  };
}

const FAMILY_REPRESENTATIVE_BY_KEY = new Map<string, FamilyRepresentative>();
for (const action of RUNTIME_ACTIONS) {
  const family = liveActionFamily(action);
  if (!FAMILY_REPRESENTATIVE_BY_KEY.has(family.key)) {
    FAMILY_REPRESENTATIVE_BY_KEY.set(family.key, { ...action, family });
  }
}
const FAMILY_REPRESENTATIVES = [...FAMILY_REPRESENTATIVE_BY_KEY.values()];
const DEDICATED_MOVING_FOOTPRINT_SKILL_IDS = new Set([1104, 1304]);
const SECONDARY_FAMILY_REPRESENTATIVES = FAMILY_REPRESENTATIVES.filter((representative) => {
  const skillId = mir4SkillIdFromAction(representative.abilityId);
  return (
    representative.family.secondaryFootprint &&
    (skillId === null || !DEDICATED_MOVING_FOOTPRINT_SKILL_IDS.has(skillId))
  );
});

const TARGETLESS_OUTCOME_BY_SKILL = new Map<number, TargetlessOutcome>([
  // Native status 49 is conditional on starting the rank-8 cast while stunned;
  // the ordinary targetless activation below exercises the always-on lanes only.
  [1502, { rank: 8, damage: true }],
  [2503, { shield: true }],
  [2201, { damage: true }],
  [2204, { spellAttackFlat: 25 }],
  [2202, { damage: true }],
  [3503, { heal: true }],
  [3501, { damage: true }],
  [3404, { nativeStatus: [26, 25] }],
  [3504, { heal: true }],
  [4111, { nativeStatus: [20, 10] }],
  [4112, { stealth: true }],
]);

function makeSim(cls: Mir4ClassDef, seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls.key,
    playerName: `Activation Matrix ${cls.key}`,
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(MAX_UNLOCK_LEVEL);
  placePlayerInOpenField(sim);
  sim.rebucket(sim.player);
  if (!sim.player.mir4) throw new Error(`missing MIR4 stats for ${cls.key}`);
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.player.resource = sim.player.maxResource;
  sim.player.mir4UltGauge = MIR4_CLASS_COMBAT_SPECS[cls.classId].ultimate.requiredGauge;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offset: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `activation_matrix_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  const target = createMob(
    sim.nextId++,
    template as never,
    1,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z - offset),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function placeEntityAt(sim: Sim, entity: Entity, x: number, z: number): void {
  entity.pos = sim.groundPos(x, z);
  entity.prevPos = { ...entity.pos };
  entity.spawnPos = { ...entity.pos };
  entity.leashAnchor = { ...entity.pos };
  sim.rebucket(entity);
}

function placeTargetAtOffset(sim: Sim, target: Entity, offset: number): void {
  placeEntityAt(sim, target, sim.player.pos.x, sim.player.pos.z - offset);
}

function resetTarget(target: Entity): void {
  target.dead = false;
  target.hp = target.maxHp;
  target.targetId = null;
  target.autoAttack = false;
  target.inCombat = false;
  target.combatTimer = 0;
  target.aggroTargetId = null;
  target.forcedTargetId = null;
  target.forcedTargetTimer = 0;
  target.threat.clear();
  target.vx = 0;
  target.vy = 0;
  target.vz = 0;
  target.auras = [];
  target.mir4Effects = undefined;
  target.mir4Shield = undefined;
  target.mir4PendingImpacts = [];
}

function resetActivationCase(sim: Sim, target: Entity, cls: Mir4ClassDef): void {
  const meta = sim.players.get(sim.playerId);
  if (!meta || !sim.player.mir4) throw new Error(`missing activation harness for ${cls.key}`);
  placePlayerInOpenField(sim);
  sim.rebucket(sim.player);
  placeTargetAtOffset(sim, target, OUT_OF_RANGE_OFFSET);
  resetTarget(target);
  sim.player.targetId = target.id;
  sim.player.autoAttack = false;
  sim.player.inCombat = false;
  sim.player.combatTimer = 0;
  sim.player.aggroTargetId = null;
  sim.player.forcedTargetId = null;
  sim.player.forcedTargetTimer = 0;
  sim.player.threat.clear();
  sim.player.vx = 0;
  sim.player.vy = 0;
  sim.player.vz = 0;
  sim.player.hp = sim.player.maxHp;
  sim.player.resource = sim.player.maxResource;
  sim.player.cooldowns.clear();
  sim.player.gcdRemaining = 0;
  sim.player.auras = [];
  sim.player.stealthed = false;
  sim.player.mir4Effects = undefined;
  sim.player.mir4Shield = undefined;
  sim.player.mir4PendingImpacts = [];
  sim.player.mir4UltGauge = MIR4_CLASS_COMBAT_SPECS[cls.classId].ultimate.requiredGauge;
  meta.mir4SkillLevels = {};
  meta.mir4SkillAction = undefined;
  meta.mir4SkillActivation = undefined;
  meta.mir4SkillActivationClaimedThroughTick = undefined;
  meta.mir4TargetCombat = undefined;
  meta.mir4AutoQuest = undefined;
  meta.autoBattle = undefined;
  Object.assign(meta.moveInput, emptyMoveInput());
  sim.drainEvents();
}

function requestAction(sim: Sim, abilityId: string): Mir4SkillActivationResult {
  return requestMir4SkillActivation(sim.ctx, abilityId, sim.playerId);
}

function cooldownKeyFor(abilityId: string): string {
  const skillId = mir4SkillIdFromAction(abilityId);
  return skillId === null ? 'mir4_ult' : String(skillId);
}

function resolvePendingImpacts(sim: Sim, label: string): void {
  let ticks = 0;
  while ((sim.player.mir4PendingImpacts?.length ?? 0) > 0 && ticks < MAX_PENDING_IMPACT_TICKS) {
    sim.tick();
    ticks += 1;
  }
  expect(sim.player.mir4PendingImpacts ?? [], label).toHaveLength(0);
  expect(ticks, label).toBeLessThan(MAX_PENDING_IMPACT_TICKS);
}

function footprintPoints(
  sim: Sim,
  primary: Entity,
  effect: Mir4SkillEffect,
  family: LiveActionFamily,
): { inside: { x: number; z: number }; outside: { x: number; z: number } } {
  const dx = primary.pos.x - sim.player.pos.x;
  const dz = primary.pos.z - sim.player.pos.z;
  const length = Math.hypot(dx, dz) || 1;
  const forward = { x: dx / length, z: dz / length };
  const perpendicular = { x: forward.z, z: -forward.x };
  if (effect.areaShape === 'frontal-strip') {
    const stripLength = Number(effect.areaLengthPx ?? 0) / 16;
    const halfWidth = Number(effect.areaWidthPx ?? 0) / 32;
    const along = stripLength * 0.5;
    return {
      inside: {
        x: sim.player.pos.x + forward.x * along + perpendicular.x * halfWidth * 0.5,
        z: sim.player.pos.z + forward.z * along + perpendicular.z * halfWidth * 0.5,
      },
      outside: {
        x: sim.player.pos.x + forward.x * along + perpendicular.x * (halfWidth + 2),
        z: sim.player.pos.z + forward.z * along + perpendicular.z * (halfWidth + 2),
      },
    };
  }

  let center: { x: number; z: number };
  if (family.geometry === 'charge') center = primary.pos;
  else if (family.geometry === 'actor-area') center = sim.player.pos;
  else if (family.geometry === 'forward-area') {
    const offset = Number(effect.areaForwardOffsetPx ?? 0) / 16;
    center = {
      x: sim.player.pos.x + forward.x * offset,
      z: sim.player.pos.z + forward.z * offset,
    };
  } else center = primary.pos;
  const radius = Number(effect.areaRadiusPx ?? 0) / 16;
  return {
    inside: {
      x: center.x + perpendicular.x * radius * 0.5,
      z: center.z + perpendicular.z * radius * 0.5,
    },
    outside: {
      x: center.x + perpendicular.x * (radius + 2),
      z: center.z + perpendicular.z * (radius + 2),
    },
  };
}

describe('MIR4 skill activation integration matrix', () => {
  it('enumerates the complete runtime, outcome, geometry, and range-family inventories', () => {
    expect(MIR4_SKILLS).toHaveLength(60);
    expect(RUNTIME_ACTIONS).toHaveLength(65);
    expect(new Set(RUNTIME_ACTIONS.map((action) => action.abilityId))).toHaveLength(65);
    expect(SELECTED_HOSTILE_ACTIONS).toHaveLength(54);
    expect(TARGETLESS_ACTIONS).toHaveLength(11);
    expect([...TARGETLESS_OUTCOME_BY_SKILL.keys()].sort((a, b) => a - b)).toEqual(
      TARGETLESS_ACTIONS.map((action) => mir4SkillIdFromAction(action.abilityId)).sort(
        (a, b) => Number(a) - Number(b),
      ),
    );
    expect(new Set(FAMILY_REPRESENTATIVES.map((row) => row.family.key))).toEqual(
      new Set(RUNTIME_ACTIONS.map((action) => liveActionFamily(action).key)),
    );
    for (const representative of FAMILY_REPRESENTATIVES) {
      expect(liveActionFamily(representative), representative.abilityId).toEqual(
        representative.family,
      );
    }
  });

  it.each(MIR4_CLASSES)(
    '$key queues and then commits every selected hostile action exactly once',
    (cls) => {
      const actions = SELECTED_HOSTILE_ACTIONS.filter((action) => action.classId === cls.classId);
      expect(actions.length).toBeGreaterThan(0);
      const sim = makeSim(cls, 26_500 + cls.classId);
      const target = spawnTarget(sim, OUT_OF_RANGE_OFFSET, `${cls.key}_commit_all`);
      const meta = sim.players.get(sim.playerId);
      if (!meta || !sim.player.mir4) throw new Error(`missing activation harness for ${cls.key}`);

      for (const action of actions) {
        resetActivationCase(sim, target, cls);
        const label = `${cls.key}:${action.abilityId}`;
        const actionDef = mir4ActionAbilityDef(action.abilityId);
        if (!actionDef) throw new Error(`missing action definition for ${action.abilityId}`);
        const resourceBefore = sim.player.resource;
        const gaugeBefore = sim.player.mir4UltGauge;
        const targetHpBefore = target.hp;
        const positionBefore = { ...sim.player.pos };

        expect(requestAction(sim, action.abilityId), label).toEqual({ ok: true, queued: true });
        expect(meta.mir4SkillActivation, label).toEqual({
          phase: 'approach',
          abilityId: action.abilityId,
          targetId: target.id,
          selectionBound: true,
          armedTick: sim.tickCount,
          instanceKey: sim.ctx.instanceKeyFor(sim.playerId),
        });
        expect(sim.player.pos, label).toEqual(positionBefore);
        expect(sim.player.resource, label).toBe(resourceBefore);
        expect(sim.player.mir4UltGauge, label).toBe(gaugeBefore);
        expect(sim.player.cooldowns.size, label).toBe(0);
        expect(target.hp, label).toBe(targetHpBefore);
        expect(sim.drainEvents(), label).toEqual([]);

        placeTargetAtOffset(sim, target, queuedCommitDistance(action.abilityId, actionDef.range));
        sim.tick();

        expect(meta.mir4SkillActivation, label).toBeUndefined();
        expect(sim.player.cooldowns.has(cooldownKeyFor(action.abilityId)), label).toBe(true);
        const primaryPending = (sim.player.mir4PendingImpacts ?? []).some(
          (impact) => impact.targetId === target.id,
        );
        expect(primaryPending || target.hp < targetHpBefore, label).toBe(true);
        if (mir4SkillIdFromAction(action.abilityId) === null) {
          const ultimateClassId = mir4ClassIdFromUltimateAction(action.abilityId);
          const nativeUltimate =
            ultimateClassId === null ? null : mir4NativeUltimateExecutionPlan(ultimateClassId);
          if (nativeUltimate) {
            expect(sim.player.resource, label).toBeLessThan(resourceBefore);
          } else {
            expect(sim.player.resource, label).toBe(resourceBefore);
          }
          expect(sim.player.mir4UltGauge, label).toBe(0);
        } else {
          expect(sim.player.resource, label).toBeLessThan(resourceBefore);
          expect(sim.player.mir4UltGauge, label).toBe(gaugeBefore);
        }
      }
    },
  );

  it.each(TARGETLESS_CLASSES)(
    '$key commits every targetless action and applies its authored outcome',
    (cls) => {
      const actions = TARGETLESS_ACTIONS.filter((action) => action.classId === cls.classId);
      expect(actions.length).toBeGreaterThan(0);
      const sim = makeSim(cls, 26_600 + cls.classId);
      const target = spawnTarget(sim, 1, `${cls.key}_targetless_outcome`);
      const meta = sim.players.get(sim.playerId);
      if (!meta || !sim.player.mir4) throw new Error(`missing activation harness for ${cls.key}`);

      for (const action of actions) {
        resetActivationCase(sim, target, cls);
        placeTargetAtOffset(sim, target, 1);
        sim.player.targetId = null;
        const label = `${cls.key}:${action.abilityId}`;
        const skillId = mir4SkillIdFromAction(action.abilityId);
        const outcome = skillId === null ? undefined : TARGETLESS_OUTCOME_BY_SKILL.get(skillId);
        if (skillId === null || !outcome)
          throw new Error(`missing targetless outcome for ${label}`);
        if (outcome.rank) meta.mir4SkillLevels = { [skillId]: outcome.rank };
        if (outcome.heal) sim.player.hp = Math.floor(sim.player.maxHp / 2);
        const resourceBefore = sim.player.resource;
        const playerHpBefore = sim.player.hp;
        const targetHpBefore = target.hp;
        const positionBefore = { ...sim.player.pos };

        const result = requestAction(sim, action.abilityId);

        expect(result.reason, label).not.toBe('no-target');
        expect(result, label).toEqual({ ok: true });
        expect(meta.mir4SkillActivation, label).toBeUndefined();
        expect(sim.player.targetId, label).toBeNull();
        expect(sim.player.pos, label).toEqual(positionBefore);
        expect(sim.player.resource, label).toBeLessThan(resourceBefore);
        expect(sim.player.cooldowns.get(String(skillId)), label).toBeGreaterThan(0);
        if (outcome.heal) {
          resolvePendingImpacts(sim, label);
          expect(sim.player.hp, label).toBeGreaterThan(playerHpBefore);
        }
        if (outcome.shield) {
          resolvePendingImpacts(sim, label);
          expect(sim.player.mir4Shield?.remaining, label).toBeGreaterThan(0);
        }
        if (
          outcome.attackBoost ||
          outcome.defenseBoost ||
          outcome.dodgeBoost ||
          outcome.stealth ||
          outcome.nativeStatus
        ) {
          resolvePendingImpacts(sim, label);
        }
        if (outcome.attackBoost) expect(mir4AttackMultiplier(sim.player), label).toBeGreaterThan(1);
        if (outcome.spellAttackFlat !== undefined) {
          resolvePendingImpacts(sim, label);
          expect(mir4NativeStatusBonus(sim.player, 22), label).toBe(outcome.spellAttackFlat);
        }
        if (outcome.nativeStatus) {
          const [statusId, magnitude] = outcome.nativeStatus;
          expect(mir4NativeStatusBonus(sim.player, statusId), label).toBe(magnitude);
        }
        if (outcome.defenseBoost) {
          expect(mir4DefenseMultiplier(sim.player), label).toBeGreaterThan(1);
        }
        if (outcome.dodgeBoost) expect(mir4DodgeBonus(sim.player), label).toBeGreaterThan(0);
        if (outcome.stealth) expect(sim.player.stealthed, label).toBe(true);
        if (outcome.damage) {
          resolvePendingImpacts(sim, label);
          expect(target.hp, label).toBeLessThan(targetHpBefore);
        }
      }
    },
  );

  it('derives every secondary geometry/range family and schedules only its live footprint', () => {
    const harnesses = new Map<
      Mir4ClassId,
      { sim: Sim; primary: Entity; inside: Entity; outside: Entity }
    >();

    for (const representative of SECONDARY_FAMILY_REPRESENTATIVES) {
      const cls = MIR4_CLASSES.find((candidate) => candidate.classId === representative.classId);
      const skillId = mir4SkillIdFromAction(representative.abilityId);
      const skill = skillId === null ? null : mir4SkillById(skillId);
      const actionDef = mir4ActionAbilityDef(representative.abilityId);
      if (skillId === null || !cls || !skill?.effect || !actionDef) {
        throw new Error(`missing footprint metadata for ${representative.abilityId}`);
      }
      let harness = harnesses.get(cls.classId);
      if (!harness) {
        const sim = makeSim(cls, 26_700 + cls.classId);
        harness = {
          sim,
          primary: spawnTarget(sim, OUT_OF_RANGE_OFFSET, `${cls.key}_footprint_primary`),
          inside: spawnTarget(sim, OUT_OF_RANGE_OFFSET + 2, `${cls.key}_footprint_inside`),
          outside: spawnTarget(sim, OUT_OF_RANGE_OFFSET + 4, `${cls.key}_footprint_outside`),
        };
        harnesses.set(cls.classId, harness);
      }
      const { sim, primary, inside, outside } = harness;
      const label = `${representative.family.key}:${representative.abilityId}`;
      resetActivationCase(sim, primary, cls);
      resetTarget(inside);
      resetTarget(outside);
      placeTargetAtOffset(sim, inside, OUT_OF_RANGE_OFFSET + 2);
      placeTargetAtOffset(sim, outside, OUT_OF_RANGE_OFFSET + 4);
      if (representative.family.targetMode === 'selected-hostile') {
        expect(requestAction(sim, representative.abilityId), label).toEqual({
          ok: true,
          queued: true,
        });
        placeTargetAtOffset(
          sim,
          primary,
          queuedCommitDistance(representative.abilityId, actionDef.range),
        );
      } else {
        sim.player.targetId = null;
        placeTargetAtOffset(sim, primary, 1);
      }
      const points = footprintPoints(sim, primary, skill.effect, representative.family);
      placeEntityAt(sim, inside, points.inside.x, points.inside.z);
      placeEntityAt(sim, outside, points.outside.x, points.outside.z);
      const forwardMotion = mir4NativeSkillActionById(skillId)?.rows.find(
        (row) => row.movement.kind === 'forward',
      )?.movement;
      if (forwardMotion?.kind === 'forward') {
        const dx = primary.pos.x - sim.player.pos.x;
        const dz = primary.pos.z - sim.player.pos.z;
        const length = Math.hypot(dx, dz) || 1;
        const distance = forwardMotion.nativeRange / 100;
        const contactGround = sim.groundPos(
          sim.player.pos.x + (dx / length) * distance,
          sim.player.pos.z + (dz / length) * distance,
        );
        // This matrix isolates the horizontal footprint. Native vertical
        // admission has its own exact geometry suite, so keep both probes on
        // the actor's contact plane even when the generic test field slopes.
        inside.pos.y = contactGround.y;
        inside.prevPos.y = contactGround.y;
        outside.pos.y = contactGround.y;
        outside.prevPos.y = contactGround.y;
      }
      const primaryHp = primary.hp;
      const insideHp = inside.hp;
      const outsideHp = outside.hp;

      if (representative.family.targetMode === 'selected-hostile') sim.tick();
      else expect(requestAction(sim, representative.abilityId), label).toEqual({ ok: true });

      // Native footprints are rebuilt at contact time, after any authored source
      // motion (1104 moves three yards before its rectangle resolves). Waiting
      // through the contact clock verifies the live footprint rather than the
      // legacy cast-time secondary list.
      resolvePendingImpacts(sim, label);
      expect(primary.hp < primaryHp, label).toBe(true);
      expect(inside.hp < insideHp, label).toBe(true);
      expect(outside.hp < outsideHp, label).toBe(false);
    }
  });
});
