import { describe, expect, it } from 'vitest';
import { BG_GRAVEYARDS } from '../../src/sim/battleground_layout';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { arenaOrigin, battlegroundOrigin } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { updateMir4SkillActions } from '../../src/sim/mir4/skill_action_scheduler';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import { returnFromArena, startArenaMatch } from '../../src/sim/social/arena';
import {
  bgResolveDesertion,
  endBgMatch,
  startBgMatch,
  updateBattleground,
} from '../../src/sim/social/battleground';
import type { Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const MOVING_SKILL_ID = 1102;

function must<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new Error(label);
  return value;
}

function makeRoster(seed: number): { sim: Sim; fighter: number; opponent: number } {
  const sim = new Sim({
    seed,
    noPlayer: true,
    playerClass: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  const fighter = sim.addPlayer('warrior', 'Displaced');
  const opponent = sim.addPlayer('warrior', 'Opponent');
  for (const [index, pid] of [fighter, opponent].entries()) {
    sim.setPlayerLevel(120, pid);
    const entity = must(sim.entities.get(pid), 'fighter entity');
    entity.pos = sim.groundPos(index * 8, -40);
    entity.prevPos = { ...entity.pos };
    entity.resource = entity.maxResource;
    if (!entity.mir4) throw new Error('MIR4 stats');
    entity.mir4.accuracy = 10_000;
    entity.mir4.critical = 0;
    sim.rebucket(entity);
  }
  // Make an un-interrupted action's authored position replacement decisive:
  // without the displacement hook it can cross an instance band in one update.
  sim.ctx.resolveMove = ((_fromX, _fromZ, toX, toZ) => ({
    x: toX,
    z: toZ,
  })) as typeof sim.ctx.resolveMove;
  sim.drainEvents();
  return { sim, fighter, opponent };
}

function spawnTarget(sim: Sim, actor: Entity, offsetX: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `social_displacement_${suffix}`,
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
    sim.groundPos(actor.pos.x + offsetX, actor.pos.z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function armMovingSkill(
  sim: Sim,
  pid: number,
  suffix: string,
): {
  actor: Entity;
  pending: NonNullable<Entity['mir4PendingImpacts']>;
  pendingSnapshot: NonNullable<Entity['mir4PendingImpacts']>;
  resource: number;
  cooldown: number;
} {
  const actor = must(sim.entities.get(pid), 'skill actor');
  const target = spawnTarget(sim, actor, 3, suffix);
  actor.facing = Math.PI / 2;
  actor.targetId = target.id;
  // Arena normalization uses the classic warrior shell's empty rage pool;
  // seed enough MIR4 MP here so this fixture can commit after that reset.
  actor.resource = 1_000_000;

  expect(castMir4Skill(sim.ctx, pid, MOVING_SKILL_ID, target.id)).toEqual({ ok: true });
  const pending = must(actor.mir4PendingImpacts, 'pending MIR4 impacts');
  return {
    actor,
    pending,
    pendingSnapshot: structuredClone(pending),
    resource: actor.resource,
    cooldown: must(actor.cooldowns.get(String(MOVING_SKILL_ID)), 'skill cooldown'),
  };
}

function armApproach(sim: Sim, pid: number, suffix: string): void {
  const actor = must(sim.entities.get(pid), 'approaching actor');
  const target = spawnTarget(sim, actor, 30, suffix);
  expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1102', pid, target.id)).toEqual({
    ok: true,
    queued: true,
  });
  expect(sim.meta(pid)?.mir4SkillActivation).toBeDefined();
}

function expectMotionInterruptedAtPlacement(sim: Sim, actor: Entity): void {
  const placed = { ...actor.pos };
  expect(sim.meta(actor.id)?.mir4SkillAction?.motionInterrupted).toBe(true);
  for (let tick = 0; tick < 5; tick += 1) {
    sim.tickCount += 1;
    updateMir4SkillActions(sim.ctx);
  }
  expect(actor.pos).toEqual(placed);
}

function expectPendingIntact(
  actor: Entity,
  pending: NonNullable<Entity['mir4PendingImpacts']>,
  pendingSnapshot: NonNullable<Entity['mir4PendingImpacts']>,
): void {
  expect(actor.mir4PendingImpacts).toBe(pending);
  expect(actor.mir4PendingImpacts).toEqual(pendingSnapshot);
}

describe('MIR4 skill ownership across social hard displacement', () => {
  it('interrupts committed motion at arena entry without discarding pending impacts', () => {
    const { sim, fighter, opponent } = makeRoster(61_001);
    const armed = armMovingSkill(sim, fighter, 'arena_entry');
    armApproach(sim, opponent, 'arena_entry_approach');
    const before = { ...armed.actor.pos };

    startArenaMatch(sim.ctx, '1v1', [fighter], [opponent]);

    const origin = arenaOrigin(must(sim.arenaMatchFor(fighter), 'arena match').slot);
    expect(armed.actor.pos.x).toBeGreaterThanOrEqual(origin.x - 100);
    expect(armed.actor.pos).not.toEqual(before);
    expect(sim.meta(opponent)?.mir4SkillActivation).toBeUndefined();
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expectMotionInterruptedAtPlacement(sim, armed.actor);
  });

  it('interrupts committed motion at arena return without discarding pending impacts', () => {
    const { sim, fighter, opponent } = makeRoster(61_002);
    const home = { ...must(sim.entities.get(fighter), 'fighter').pos };
    startArenaMatch(sim.ctx, '1v1', [fighter], [opponent]);
    const match = must(sim.arenaMatchFor(fighter), 'arena match');
    const armed = armMovingSkill(sim, fighter, 'arena_return');

    returnFromArena(sim.ctx, match);

    expect(armed.actor.pos.x).toBeCloseTo(home.x, 8);
    expect(armed.actor.pos.z).toBeCloseTo(home.z, 8);
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expectMotionInterruptedAtPlacement(sim, armed.actor);
  });

  it('interrupts committed motion at battleground entry without discarding pending impacts', () => {
    const { sim, fighter, opponent } = makeRoster(61_003);
    const armed = armMovingSkill(sim, fighter, 'bg_entry');
    armApproach(sim, opponent, 'bg_entry_approach');
    const before = { ...armed.actor.pos };

    startBgMatch(sim.ctx, [fighter], [opponent], { rated: false, slot: 0 });

    const match = must(sim.bgMatches.get(fighter), 'battleground match');
    const origin = battlegroundOrigin(match.slot);
    expect(armed.actor.pos.x).toBeGreaterThanOrEqual(origin.x - 100);
    expect(armed.actor.pos).not.toEqual(before);
    expect(sim.meta(opponent)?.mir4SkillActivation).toBeUndefined();
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expectMotionInterruptedAtPlacement(sim, armed.actor);
  });

  it('preserves committed spend, cooldown, and impacts across the graveyard hard clamp', () => {
    const { sim, fighter, opponent } = makeRoster(61_004);
    startBgMatch(sim.ctx, [fighter], [opponent], { rated: false, slot: 0 });
    const match = must(sim.bgMatches.get(fighter), 'battleground match');
    match.state = 'active';
    match.timer = 0;
    match.waveIn = [10, 10];
    const armed = armMovingSkill(sim, fighter, 'bg_graveyard');
    const origin = battlegroundOrigin(match.slot);
    const graveyard = BG_GRAVEYARDS[0];
    armed.actor.dead = true;
    armed.actor.ghost = true;
    armed.actor.pos = sim.groundPos(origin.x + graveyard.x + 100, origin.z + graveyard.z + 100);
    armed.actor.prevPos = { ...armed.actor.pos };
    sim.rebucket(armed.actor);
    const beforeClamp = { ...armed.actor.pos };

    updateBattleground(sim.ctx);

    expect(armed.actor.pos).not.toEqual(beforeClamp);
    expect(armed.actor.resource).toBe(armed.resource);
    expect(armed.actor.cooldowns.get(String(MOVING_SKILL_ID))).toBe(armed.cooldown);
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expect(sim.meta(fighter)?.mir4SkillAction?.motionInterrupted).toBe(true);
  });

  it('interrupts committed motion at battleground return without discarding pending impacts', () => {
    const { sim, fighter, opponent } = makeRoster(61_005);
    const home = { ...must(sim.entities.get(fighter), 'fighter').pos };
    startBgMatch(sim.ctx, [fighter], [opponent], { rated: false, slot: 0 });
    const match = must(sim.bgMatches.get(fighter), 'battleground match');
    match.state = 'active';
    const armed = armMovingSkill(sim, fighter, 'bg_return');

    endBgMatch(sim.ctx, match, 0, 'forfeit');

    expect(armed.actor.pos.x).toBeCloseTo(home.x, 8);
    expect(armed.actor.pos.z).toBeCloseTo(home.z, 8);
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expectMotionInterruptedAtPlacement(sim, armed.actor);
  });

  it('interrupts committed motion at battleground deserter return without discarding impacts', () => {
    const { sim, fighter, opponent } = makeRoster(61_006);
    const home = { ...must(sim.entities.get(fighter), 'fighter').pos };
    startBgMatch(sim.ctx, [fighter], [opponent], { rated: false, slot: 0 });
    const match = must(sim.bgMatches.get(fighter), 'battleground match');
    match.state = 'active';
    const armed = armMovingSkill(sim, fighter, 'bg_deserter');

    bgResolveDesertion(sim.ctx, fighter);

    expect(armed.actor.pos.x).toBeCloseTo(home.x, 8);
    expect(armed.actor.pos.z).toBeCloseTo(home.z, 8);
    expectPendingIntact(armed.actor, armed.pending, armed.pendingSnapshot);
    expectMotionInterruptedAtPlacement(sim, armed.actor);
  });
});
