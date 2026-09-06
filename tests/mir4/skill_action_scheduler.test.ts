import { describe, expect, it, vi } from 'vitest';
import { supportHeightAt } from '../../src/sim/colliders';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_FLOOR_Y, DUNGEON_X_THRESHOLD, riftInstanceOrigin } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, mir4BasicAttack, mir4Ultimate } from '../../src/sim/mir4/combat';
import { interruptMir4SkillMovementOnDisplacement } from '../../src/sim/mir4/displacement';
import {
  interruptMir4SkillActionMotion,
  startMir4SkillAction,
  updateMir4SkillActions,
} from '../../src/sim/mir4/skill_action_scheduler';
import {
  mir4SkillActivationOwnsMotion,
  requestMir4SkillActivation,
} from '../../src/sim/mir4/skill_activation';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { floorHeightAt } from '../../src/sim/physics/character';
import { swimSurfaceY } from '../../src/sim/player_motion';
import { generateRiftFloor } from '../../src/sim/rift/rift_gen';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { groundHeight, waterLevelAt } from '../../src/sim/world';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const TICK_MS = 50;

function makeWarrior(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Skill Action Test',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offsetX: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `skill_action_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + offsetX, sim.player.pos.z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  sim.player.targetId = target.id;
  return target;
}

function tickMany(sim: Sim, count: number): void {
  for (let tick = 0; tick < count; tick += 1) sim.tick();
}

function elevatedActionLane(sim: Sim): { x: number; z: number; support: number } {
  // Literal seed-34502 battleground rampart lane. Keeping the arrangement
  // fixed avoids turning this regression into an expensive world scan.
  const x = 129_746;
  const z = -1_636;
  const terrain = groundHeight(x, z, sim.cfg.seed);
  const support = supportHeightAt(sim.cfg.seed, x, z, PLAYER_BODY_RADIUS, terrain + 40);
  const endSupport = supportHeightAt(sim.cfg.seed, x + 2.5, z, PLAYER_BODY_RADIUS, support + 1e-3);
  if (support <= terrain + 4 || Math.abs(endSupport - support) > 0.1) {
    throw new Error('pinned elevated skill-action lane changed');
  }
  return { x, z, support };
}

describe('MIR4 native skill action scheduler', () => {
  it('emits the exact self-anchored direct guide when Air Slash commits', () => {
    const sim = makeWarrior(31_102);
    const target = spawnTarget(sim, 3, 'air_slash_guide');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({ ok: true });

    expect(sim.drainEvents().filter((event) => event.type === 'mir4SkillGuide')).toEqual([
      {
        type: 'mir4SkillGuide',
        sourceId: sim.playerId,
        skillId: 1102,
        attackId: 110201,
        shape: 'direct',
        applyTo: 'self',
        lengthYards: 8.5,
        widthYards: 5,
        aliveMs: 450,
        scalingMs: 250,
        materialScalarCurve: 'inside-linear-grow-then-hold',
        materialAssetPath:
          '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01',
        colors: {
          primary: [0.091146, 0.217937, 0.729167],
          secondary: [0.358803, 0.40595, 0.828125],
          emissive: [0, 5.375199, 10],
        },
      },
    ]);
  });

  it.each([
    { skillId: 1102, durationMs: 250, distanceYards: 2.5 },
    { skillId: 1104, durationMs: 500, distanceYards: 3 },
    { skillId: 1501, durationMs: 200, distanceYards: 4 },
  ])(
    'moves skill $skillId forward by its native distance along captured facing',
    ({ skillId, durationMs, distanceYards }) => {
      const sim = makeWarrior(31_000 + skillId);
      const target = spawnTarget(sim, 3, `forward_${skillId}`);
      const origin = { ...sim.player.pos };

      expect(castMir4Skill(sim.ctx, sim.playerId, skillId, target.id)).toEqual({ ok: true });
      sim.player.facing = 0;
      target.pos = sim.groundPos(origin.x, origin.z - 3);
      target.prevPos = { ...target.pos };
      sim.rebucket(target);

      tickMany(sim, durationMs / TICK_MS);

      expect(sim.player.pos.x).toBeCloseTo(origin.x + distanceYards, 8);
      expect(sim.player.pos.z).toBeCloseTo(origin.z, 8);
    },
  );

  it.each([
    { skillId: 1304, startMs: 480, durationMs: 370, signedRangeYards: 0.1 },
    { skillId: 1401, startMs: 100, durationMs: 490, signedRangeYards: 0.8 },
  ])(
    'uses absolute authored progress for the $durationMs ms target motion on skill $skillId',
    ({ skillId, startMs, durationMs, signedRangeYards }) => {
      const sim = makeWarrior(32_000 + skillId);
      const target = spawnTarget(sim, 3, `partial_${skillId}`);
      const origin = { ...sim.player.pos };
      const endpointX = target.pos.x + signedRangeYards;

      expect(castMir4Skill(sim.ctx, sim.playerId, skillId, target.id)).toEqual({ ok: true });

      const ticksAtOrBeforeStart = Math.floor(startMs / TICK_MS);
      tickMany(sim, ticksAtOrBeforeStart);
      expect(sim.player.pos.x).toBeCloseTo(origin.x, 8);

      sim.tick();
      const sampledElapsedMs = (ticksAtOrBeforeStart + 1) * TICK_MS;
      const sampledProgress = (sampledElapsedMs - startMs) / durationMs;
      expect(sim.player.pos.x).toBeCloseTo(origin.x + (endpointX - origin.x) * sampledProgress, 8);

      const completionTick = Math.ceil((startMs + durationMs) / TICK_MS);
      tickMany(sim, completionTick - ticksAtOrBeforeStart - 1);
      expect(sim.player.pos.x).toBeCloseTo(endpointX, 8);
      expect(sim.player.pos.z).toBeCloseTo(origin.z, 8);
    },
  );

  it('preserves the signed target range so 1103 stops on the near side', () => {
    const sim = makeWarrior(33_103);
    const target = spawnTarget(sim, 6, 'signed_target');
    const origin = { ...sim.player.pos };

    expect(castMir4Skill(sim.ctx, sim.playerId, 1103, target.id)).toEqual({ ok: true });
    expect(sim.player.pos).toEqual(origin);

    tickMany(sim, 8);

    expect(sim.player.pos.x).toBeCloseTo(target.pos.x - 1.5, 8);
    expect(sim.player.pos.x).toBeGreaterThan(origin.x);
    expect(sim.player.pos.x).toBeLessThan(target.pos.x);
  });

  it('clamps on collision without accepting the resolver slide or resuming motion', () => {
    const sim = makeWarrior(34_501);
    sim.player.pos = { x: DUNGEON_X_THRESHOLD + 10, y: 0, z: 0 };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.onGround = true;
    sim.rebucket(sim.player);
    const target = spawnTarget(sim, 3, 'collision');
    const origin = { ...sim.player.pos };
    const blockAt = origin.x + 0.6;
    const originalResolveMove = sim.ctx.resolveMove;
    sim.ctx.resolveMove = vi.fn((fromX, fromZ, toX, toZ) => {
      if (toX <= blockAt) return { x: toX, z: toZ };
      return { x: Math.max(fromX, blockAt), z: fromZ + 0.5 };
    }) as typeof originalResolveMove;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1501, target.id)).toEqual({ ok: true });
    sim.tick();

    expect(sim.player.pos.x).toBeCloseTo(blockAt, 2);
    expect(sim.player.pos.z).toBeCloseTo(origin.z, 8);
    expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted).toBe(true);
    const stopped = { ...sim.player.pos };

    tickMany(sim, 3);
    expect(sim.player.pos).toEqual(stopped);
  });

  it('keeps authored movement on the same standable floor as ordinary locomotion', () => {
    const sim = makeWarrior(34_502);
    const lane = elevatedActionLane(sim);
    sim.player.pos = { x: lane.x, y: lane.support, z: lane.z };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.facing = Math.PI / 2;
    sim.player.onGround = true;
    sim.rebucket(sim.player);

    expect(startMir4SkillAction(sim.ctx, sim.player, 1102, null)).toBe(true);
    // Isolate the authored-motion phase from unrelated battleground instance
    // lifecycle; this pin is about the scheduler's floor query itself.
    for (let tick = 0; tick < 5; tick += 1) {
      sim.tickCount += 1;
      updateMir4SkillActions(sim.ctx);
    }

    const floor = floorHeightAt(
      sim.cfg.seed,
      sim.player.pos.x,
      sim.player.pos.z,
      PLAYER_BODY_RADIUS,
      lane.support + 1e-3,
    );
    expect(sim.player.pos.x).toBeCloseTo(lane.x + 2.5, 8);
    expect(sim.player.pos.y).toBeCloseTo(floor, 8);
    expect(sim.player.pos.y).toBeGreaterThan(
      groundHeight(sim.player.pos.x, sim.player.pos.z, sim.cfg.seed) + 1,
    );
  });

  it('follows the pitched standable surface already under the caster', () => {
    const sim = makeWarrior(42);
    const origin = {
      x: -364.5205744613958,
      y: 3.7079999999999966,
      z: 359.8775825618904,
    };
    sim.player.pos = { ...origin };
    sim.player.prevPos = { ...origin };
    sim.player.facing = -2.641592653589793;
    sim.player.onGround = true;
    sim.rebucket(sim.player);

    expect(startMir4SkillAction(sim.ctx, sim.player, 1501, null)).toBe(true);
    sim.tickCount += 1;
    updateMir4SkillActions(sim.ctx);

    expect(sim.player.pos.x).toBeCloseTo(-365, 8);
    expect(sim.player.pos.z).toBeCloseTo(359, 8);
    expect(sim.player.pos.y).toBeCloseTo(4.54, 8);
    expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted).toBe(false);
  });

  it('keeps authored movement on the generated Rift raised tier', () => {
    const sim = makeWarrior(6);
    sim.enterRift(6, 20, sim.playerId);
    const instance = sim.riftInstances.find((candidate) => candidate.partyKey !== null);
    if (!instance) throw new Error('missing active Rift instance');
    const floor = generateRiftFloor(6, 20, 0);
    const origin = riftInstanceOrigin(instance.slot, 0);
    sim.player.pos = {
      x: origin.x,
      y: DUNGEON_FLOOR_Y + (floor.platform?.height ?? 0),
      z: origin.z + 98,
    };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.facing = Math.PI / 2;
    sim.player.onGround = true;
    sim.rebucket(sim.player);

    expect(floor.platform?.height).toBeCloseTo(2.220648768916726, 12);
    expect(startMir4SkillAction(sim.ctx, sim.player, 1501, null)).toBe(true);
    sim.tickCount += 1;
    updateMir4SkillActions(sim.ctx);

    expect(sim.player.pos.x).toBeCloseTo(origin.x + 1, 8);
    expect(sim.player.pos.z).toBeCloseTo(origin.z + 98, 8);
    expect(sim.player.pos.y).toBeCloseTo(2.220648768916726, 12);
  });

  it('stops authored movement at a closed runtime Rift gate', () => {
    const sim = makeWarrior(5);
    sim.enterRift(5, 20, sim.playerId);
    const instance = sim.riftInstances.find((candidate) => candidate.partyKey !== null);
    if (!instance) throw new Error('missing active Rift instance');
    const floor = generateRiftFloor(5, 20, 0);
    const gate = floor.gate;
    if (!gate) throw new Error('pinned Rift gate fixture changed');
    const origin = riftInstanceOrigin(instance.slot, 0);
    sim.player.pos = { x: origin.x, y: DUNGEON_FLOOR_Y, z: origin.z + 24 };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.facing = 0;
    sim.player.onGround = true;
    sim.rebucket(sim.player);

    expect(instance.gateOpen).toBe(false);
    expect(gate).toEqual({ x: 0, z: 28, hw: 18, hd: 1.6, switchX: 0, switchZ: 0, openOnOrb: true });
    expect(startMir4SkillAction(sim.ctx, sim.player, 1501, null)).toBe(true);
    for (let tick = 0; tick < 4; tick += 1) {
      sim.tickCount += 1;
      updateMir4SkillActions(sim.ctx);
    }

    expect(sim.player.pos.z).toBeLessThanOrEqual(origin.z + 25.8);
    expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted).toBe(true);
  });

  it.each([
    { label: 'surface', diving: false, depthBelowSurface: 0 },
    { label: 'diving', diving: true, depthBelowSurface: 1.25 },
  ])('keeps $label authored movement in the swimming column', ({ diving, depthBelowSurface }) => {
    const sim = makeWarrior(42);
    const origin = { x: -92, z: 88 };
    const surface = swimSurfaceY(origin.x, origin.z, sim.cfg.seed);
    sim.player.pos = { x: origin.x, y: surface - depthBelowSurface, z: origin.z };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.facing = Math.PI / 2;
    sim.player.onGround = true;
    sim.player.swimDiving = diving;
    sim.rebucket(sim.player);

    expect(startMir4SkillAction(sim.ctx, sim.player, 1501, null)).toBe(true);
    for (let tick = 0; tick < 4; tick += 1) {
      sim.tickCount += 1;
      updateMir4SkillActions(sim.ctx);
    }

    const destinationSurface = swimSurfaceY(sim.player.pos.x, sim.player.pos.z, sim.cfg.seed);
    expect(sim.player.pos.x).toBeCloseTo(origin.x + 4, 8);
    expect(sim.player.pos.y).toBeCloseTo(destinationSurface - depthBelowSurface, 8);
    expect(sim.player.pos.y).toBeGreaterThan(
      groundHeight(sim.player.pos.x, sim.player.pos.z, sim.cfg.seed),
    );
    expect(sim.player.swimDiving).toBe(diving);
  });

  it('releases the swimming depth and seats authored movement on a dry shore', () => {
    const sim = makeWarrior(42);
    const origin = { x: -71, z: 88 };
    const surface = swimSurfaceY(origin.x, origin.z, sim.cfg.seed);
    sim.player.pos = { x: origin.x, y: surface - 0.2, z: origin.z };
    sim.player.prevPos = { ...sim.player.pos };
    sim.player.facing = Math.PI / 2;
    sim.player.onGround = true;
    sim.player.swimDiving = true;
    sim.rebucket(sim.player);

    expect(
      groundHeight(origin.x, origin.z, sim.cfg.seed),
      'pinned start remains deep water',
    ).toBeLessThan(waterLevelAt(origin.x, origin.z, sim.cfg.seed) - 0.8);
    expect(startMir4SkillAction(sim.ctx, sim.player, 1501, null)).toBe(true);
    for (let tick = 0; tick < 4; tick += 1) {
      sim.tickCount += 1;
      updateMir4SkillActions(sim.ctx);
    }

    const floor = floorHeightAt(
      sim.cfg.seed,
      sim.player.pos.x,
      sim.player.pos.z,
      PLAYER_BODY_RADIUS,
      surface + 2,
    );
    expect(sim.player.pos.x).toBeCloseTo(origin.x + 4, 8);
    expect(sim.player.pos.y).toBeCloseTo(floor, 8);
    expect(sim.player.swimDiving).toBe(false);
  });

  it('interrupts only remaining motion while preserving spend, pending hits, and recovery lock', () => {
    const sim = makeWarrior(35_501);
    const target = spawnTarget(sim, 3, 'interrupted');
    const resourceBefore = sim.player.resource;
    const hpBefore = target.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1501, target.id)).toEqual({ ok: true });
    sim.tick();
    const hpAfterFirstTick = target.hp;
    const stopped = { ...sim.player.pos };
    const resourceBeforeInterrupt = sim.player.resource;
    const cooldownBeforeInterrupt = sim.player.cooldowns.get('1501');

    expect(hpAfterFirstTick).toBeLessThan(hpBefore);
    interruptMir4SkillActionMotion(sim.ctx, sim.playerId);

    expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted).toBe(true);
    expect(sim.player.resource).toBe(resourceBeforeInterrupt);
    expect(resourceBeforeInterrupt).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1501')).toBe(cooldownBeforeInterrupt);

    tickMany(sim, 25);

    expect(sim.player.pos).toEqual(stopped);
    expect(target.hp).toBeLessThan(hpAfterFirstTick);
    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeDefined();
    sim.player.gcdRemaining = 0;
    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({
      ok: false,
      reason: 'on-gcd',
    });
  });

  it('hard displacement cancels approach and interrupts motion without refunding the action', () => {
    const sim = makeWarrior(35_502);
    const target = spawnTarget(sim, 3, 'displacement');
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({ ok: true });
    const pending = sim.player.mir4PendingImpacts;
    const cooldown = sim.player.cooldowns.get('1102');
    interruptMir4SkillMovementOnDisplacement(sim.ctx, sim.player);

    expect(sim.meta(sim.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted).toBe(true);
    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1102')).toBe(cooldown);
    expect(sim.player.mir4PendingImpacts).toBe(pending);
    expect(sim.player.mir4PendingImpacts).toHaveLength(3);
  });

  it('interrupts authored motion for manual input, target loss, root, and hard control', () => {
    const scenarios = [
      {
        name: 'manual',
        interrupt(sim: Sim) {
          const meta = sim.meta(sim.playerId);
          if (!meta) throw new Error('missing player metadata');
          meta.moveInput.forward = true;
        },
      },
      {
        name: 'target-loss',
        interrupt(_sim: Sim, target: Entity) {
          target.dead = true;
        },
      },
      {
        name: 'root',
        interrupt(sim: Sim) {
          sim.ctx.isRooted = () => true;
        },
      },
      {
        name: 'hard-control',
        interrupt(sim: Sim) {
          sim.ctx.isStunned = () => true;
        },
      },
    ] as const;

    for (const [index, scenario] of scenarios.entries()) {
      const sim = makeWarrior(36_000 + index);
      const target = spawnTarget(sim, 3, scenario.name);
      expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({ ok: true });

      scenario.interrupt(sim, target);
      updateMir4SkillActions(sim.ctx);

      expect(sim.meta(sim.playerId)?.mir4SkillAction?.motionInterrupted, scenario.name).toBe(true);
      expect(sim.meta(sim.playerId)?.mir4SkillAction, scenario.name).toBeDefined();
      expect(sim.player.mir4PendingImpacts, scenario.name).toHaveLength(3);
      expect(sim.player.cooldowns.has('1102'), scenario.name).toBe(true);
    }
  });

  it('clears the commit claim when manual input interrupts authored motion', () => {
    const sim = makeWarrior(36_100);
    const target = spawnTarget(sim, 3, 'manual_claim');
    const meta = sim.meta(sim.playerId);
    if (!meta) throw new Error('missing player metadata');

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', sim.playerId, target.id)).toEqual(
      { ok: true },
    );
    expect(meta.mir4SkillActivationClaimedThroughTick).toBe(1);

    meta.moveInput.forward = true;
    sim.tickCount += 1;
    updateMir4SkillActions(sim.ctx);
    meta.moveInput.forward = false;

    expect(meta.mir4SkillAction?.motionInterrupted).toBe(true);
    expect(meta.mir4SkillActivationClaimedThroughTick).toBeUndefined();
    expect(mir4SkillActivationOwnsMotion(meta, sim.tickCount)).toBe(false);
  });

  it('keeps admission locked through the exact end-cut tick after all contacts drain', () => {
    const sim = makeWarrior(37_102);
    const target = spawnTarget(sim, 3, 'end_cut');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({ ok: true });
    tickMany(sim, 25);

    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeDefined();
    sim.player.gcdRemaining = 0;
    sim.player.mir4UltGauge = 100;
    sim.player.cooldowns.delete('1104');
    expect(mir4BasicAttack(sim.ctx, sim.playerId, target.id)).toEqual({
      ok: false,
      reason: 'on-gcd',
    });
    expect(castMir4Skill(sim.ctx, sim.playerId, 1104, target.id)).toEqual({
      ok: false,
      reason: 'on-gcd',
    });
    expect(mir4Ultimate(sim.ctx, sim.playerId, target.id)).toEqual({
      ok: false,
      reason: 'on-gcd',
    });

    sim.tick();
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeUndefined();
    sim.player.gcdRemaining = 0;
    sim.player.cooldowns.delete('1104');
    expect(castMir4Skill(sim.ctx, sim.playerId, 1104, target.id)).toEqual({ ok: true });
  });

  it('keeps a non-tick-aligned end-cut locked at 1150 ms and releases it at 1200 ms', () => {
    const sim = makeWarrior(37_104);
    const target = spawnTarget(sim, 3, 'non_aligned_end_cut');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1104, target.id)).toEqual({ ok: true });
    tickMany(sim, 23);

    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toMatchObject({
      skillId: 1104,
      endCutMs: 1190,
    });
    sim.player.gcdRemaining = 0;
    expect(mir4BasicAttack(sim.ctx, sim.playerId, target.id)).toEqual({
      ok: false,
      reason: 'on-gcd',
    });

    sim.tick();
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeUndefined();
    sim.player.gcdRemaining = 0;
    expect(mir4BasicAttack(sim.ctx, sim.playerId, target.id)).toEqual({ ok: true });
  });

  it('clears committed action state inside the authoritative death teardown', () => {
    const sim = makeWarrior(38_102);
    const target = spawnTarget(sim, 3, 'death');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({ ok: true });
    const pending = sim.player.mir4PendingImpacts;
    sim.ctx.handleDeath(sim.player, null);

    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeUndefined();
    expect(sim.player.mir4PendingImpacts).toBe(pending);
    expect(sim.player.mir4PendingImpacts).toHaveLength(3);
  });

  it('maps the Warrior ultimate to native action 1403 recovery', () => {
    const sim = makeWarrior(39_403);
    const target = spawnTarget(sim, 3, 'ultimate');
    sim.player.mir4UltGauge = 100;
    sim.player.resource = 1_000_000;

    expect(mir4Ultimate(sim.ctx, sim.playerId, target.id)).toEqual({ ok: true });
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toMatchObject({ skillId: 1403 });

    tickMany(sim, 53);
    expect(sim.player.mir4PendingImpacts ?? []).toHaveLength(0);
    expect(sim.meta(sim.playerId)?.mir4SkillAction).toBeDefined();
  });
});
