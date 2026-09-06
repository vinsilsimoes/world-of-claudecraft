import { afterAll, describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { mir4NativeRuntimeCrowdControlReaction } from '../../src/sim/mir4/native_skill_crowd_control';
import { mir4NativePushToPointDestination } from '../../src/sim/mir4/native_skill_push_to_point';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(seed = 1_104): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Crowd Control Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.level = 20;
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz = 0, id = 'native_1104_cc_target'): Entity {
  const player = sim.player;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
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
    sim.groundPos(player.pos.x + dx, player.pos.z + dz),
  );
  target.pos.y = player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  return Array.from({ length: count }, () => sim.tick()).flat();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 native knock-down runtime', () => {
  it('admits only the exact recovered Warrior knock-down rows', () => {
    expect(mir4NativeRuntimeCrowdControlReaction(1103, 110106)).toBeNull();
    expect(mir4NativeRuntimeCrowdControlReaction(1103, 110107)).toEqual({
      effectId: 'mir4_1103_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 3,
      heightYards: 1,
      displacementDirection: 'radial',
    });
    expect(mir4NativeRuntimeCrowdControlReaction(1104, 110401)).toBeNull();
    expect(mir4NativeRuntimeCrowdControlReaction(1104, 110402)).toEqual({
      effectId: 'mir4_1104_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 1.5,
      heightYards: 2,
      displacementDirection: 'source-facing',
    });
    expect(mir4NativeRuntimeCrowdControlReaction(1304, 130402)).toEqual({
      effectId: 'mir4_1304_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 4,
      heightYards: 1,
      displacementDirection: 'source-facing',
    });
    expect(mir4NativeRuntimeCrowdControlReaction(1304, 130401)).toBeNull();
    expect(mir4NativeRuntimeCrowdControlReaction(1401, 140102)).toEqual({
      effectId: 'mir4_1401_knockdown',
      kind: 'knockdown',
      stance: 'down-03',
      durationMs: 2_490,
      moveDurationMs: 490,
      moveDistanceYards: 1.5,
      heightYards: 0,
      displacementDirection: 'source-facing',
    });
    expect(mir4NativeRuntimeCrowdControlReaction(1401, 140101)).toBeNull();
    expect(mir4NativeRuntimeCrowdControlReaction(1403, 140304)).toEqual({
      effectId: 'mir4_1403_knockdown',
      kind: 'knockdown',
      stance: 'down-02',
      durationMs: 3_000,
      moveDurationMs: 900,
      moveDistanceYards: 5,
      heightYards: 3,
      displacementDirection: 'radial',
    });
    expect(mir4NativeRuntimeCrowdControlReaction(1403, 140303)).toBeNull();
  });

  it('executes both 1103 native contacts at 550ms and 1100ms', () => {
    const sim = makeSim(1_103);
    const target = spawnTarget(sim, 5, 0, 'native_1103_cc_target');
    sim.player.level = 48;
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    sim.player.targetId = target.id;
    sim.drainEvents();

    expect(sim.mir4CastSkill(1103, target.id)).toEqual({ ok: true });
    expect(
      sim.player.mir4PendingImpacts?.find(
        (impact) => impact.skillId === 1103 && impact.effectOnly === true,
      )?.attackId,
    ).toBe(110107);

    expect(tickMany(sim, 10).some((event) => event.type === 'mir4HitReaction')).toBe(false);
    const pushDestination = mir4NativePushToPointDestination(
      {
        x: sim.player.pos.x,
        z: sim.player.pos.z,
        facing: sim.player.facing,
      },
      { x: target.pos.x, z: target.pos.z },
      1,
    );
    const firstContact = tickMany(sim, 1);
    expect(
      firstContact.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === target.id &&
          event.ability === 'Investida Bárbara',
      ),
    ).toHaveLength(1);
    expect(firstContact).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1103,
        attackId: 110106,
        targetId: target.id,
        stance: 'hit-01',
        durationMs: 200,
      }),
    );
    expect(target.pos.x).toBeCloseTo(pushDestination.x, 8);
    expect(target.pos.z).toBeCloseTo(pushDestination.z, 8);

    tickMany(sim, 10);
    const beforeKnockdown = { ...target.pos };
    const finalContact = tickMany(sim, 1);
    expect(
      finalContact.filter(
        (event) =>
          event.type === 'damage' &&
          event.targetId === target.id &&
          event.ability === 'Investida Bárbara',
      ),
    ).toHaveLength(1);
    expect(
      Math.hypot(target.pos.x - beforeKnockdown.x, target.pos.z - beforeKnockdown.z),
    ).toBeCloseTo(3, 8);
    expect(finalContact).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1103,
        attackId: 110107,
        targetId: target.id,
        stance: 'down-02',
        durationMs: 3_000,
      }),
    );
  });

  it('applies each 1103 contact once to the first ten native circle targets', () => {
    const sim = makeSim(11_103);
    sim.player.level = 48;
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    const targets = Array.from({ length: 11 }, (_, index) =>
      spawnTarget(sim, 4 + index * 0.1, index % 2 === 0 ? 0.15 : -0.15, `native_1103_cap_${index}`),
    );
    const primary = targets[0];
    if (!primary) throw new Error('Missing primary 1103 target');
    sim.player.targetId = primary.id;
    sim.drainEvents();

    expect(sim.mir4CastSkill(1103, primary.id)).toEqual({ ok: true });
    const events = tickMany(sim, 22);
    const damaged = targets.filter((target) => target.hp < target.maxHp);
    const untouched = targets.filter((target) => target.hp === target.maxHp);
    const downTargets = events
      .filter(
        (event): event is Extract<SimEvent, { type: 'mir4HitReaction'; stance: 'down-02' }> =>
          event.type === 'mir4HitReaction' &&
          event.skillId === 1103 &&
          event.attackId === 110107 &&
          event.stance === 'down-02',
      )
      .map((event) => event.targetId);

    expect(damaged.map((target) => target.id)).toEqual(
      targets.slice(0, 10).map((target) => target.id),
    );
    expect(untouched.map((target) => target.id)).toEqual([targets[10]?.id]);
    expect(downTargets).toEqual(targets.slice(0, 10).map((target) => target.id));
    expect(new Set(damaged.map((target) => target.maxHp - target.hp)).size).toBe(1);
  });

  it('waits for the 490ms contact, then pushes every target along the source facing', () => {
    const sim = makeSim();
    const primary = spawnTarget(sim, 5);
    const secondary = spawnTarget(sim, 7, 2, 'native_1104_cc_secondary');
    const primaryStart = { ...primary.pos };
    const secondaryStart = { ...secondary.pos };
    sim.player.targetId = primary.id;
    sim.drainEvents();

    sim.castAbility(mir4ActionId(1104));
    expect(tickMany(sim, 9).some((event) => event.type === 'mir4HitReaction')).toBe(false);
    expect(primary.pos).toEqual(primaryStart);
    expect(secondary.pos).toEqual(secondaryStart);

    const events = tickMany(sim, 1);
    const reactions = events.filter(
      (event): event is Extract<SimEvent, { type: 'mir4HitReaction'; stance: 'down-02' }> =>
        event.type === 'mir4HitReaction' && event.stance === 'down-02',
    );

    expect(primary.pos.x - primaryStart.x).toBeCloseTo(1.5, 8);
    expect(secondary.pos.x - secondaryStart.x).toBeCloseTo(1.5, 8);
    expect(secondary.pos.z - secondaryStart.z).toBeCloseTo(0, 8);
    expect(
      Math.hypot(secondary.pos.x - secondaryStart.x, secondary.pos.z - secondaryStart.z),
    ).toBeCloseTo(1.5, 8);
    expect(reactions).toHaveLength(2);
    expect(
      reactions.map(({ targetId, attackId, durationMs, stance, moveDurationMs, heightYards }) => ({
        targetId,
        attackId,
        durationMs,
        stance,
        moveDurationMs,
        heightYards,
      })),
    ).toEqual([
      {
        targetId: primary.id,
        attackId: 110402,
        durationMs: 3_000,
        stance: 'down-02',
        moveDurationMs: 900,
        heightYards: 2,
      },
      {
        targetId: secondary.id,
        attackId: 110402,
        durationMs: 3_000,
        stance: 'down-02',
        moveDurationMs: 900,
        heightYards: 2,
      },
    ]);
  });

  it('launches Body Check targets four yards along the attack direction at 520ms', () => {
    const sim = makeSim(1_304);
    const target = spawnTarget(sim, 5, 0, 'native_1304_cc_target');
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    const start = { ...target.pos };
    sim.player.targetId = target.id;
    sim.drainEvents();

    expect(sim.mir4CastSkill(1304, target.id)).toEqual({ ok: true });
    expect(
      sim.player.mir4PendingImpacts?.find(
        (impact) => impact.skillId === 1304 && impact.effectOnly === true,
      )?.attackId,
    ).toBe(130402);
    expect(tickMany(sim, 10).some((event) => event.type === 'mir4HitReaction')).toBe(false);
    expect(target.pos).toEqual(start);

    const events = tickMany(sim, 1);
    const reaction = events.find(
      (event): event is Extract<SimEvent, { type: 'mir4HitReaction'; stance: 'down-02' }> =>
        event.type === 'mir4HitReaction' && event.attackId === 130402,
    );

    expect(reaction).toMatchObject({
      targetId: target.id,
      skillId: 1304,
      attackId: 130402,
      durationMs: 3_000,
      stance: 'down-02',
      moveDurationMs: 900,
      heightYards: 1,
    });
    expect(target.pos.x - start.x).toBeCloseTo(4, 8);
    expect(target.pos.z - start.z).toBeCloseTo(0, 8);
  });

  it('applies Body Check once to the first eight native frontal targets', () => {
    const sim = makeSim(13_004);
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    const targets = Array.from({ length: 9 }, (_, index) =>
      spawnTarget(
        sim,
        5 + index * 0.15,
        index % 2 === 0 ? 0.25 : -0.25,
        `native_1304_cap_${index}`,
      ),
    );
    const primary = targets[0];
    if (!primary) throw new Error('Missing primary 1304 target');
    sim.player.targetId = primary.id;
    sim.drainEvents();

    expect(sim.mir4CastSkill(1304, primary.id)).toEqual({ ok: true });
    const events = tickMany(sim, 11);
    const damageEvents = events.filter(
      (event): event is Extract<SimEvent, { type: 'damage' }> =>
        event.type === 'damage' && event.ability === 'Choque Corporal',
    );
    const reactions = events.filter(
      (event): event is Extract<SimEvent, { type: 'mir4HitReaction' }> =>
        event.type === 'mir4HitReaction' &&
        event.skillId === 1304 &&
        event.attackId === 130402 &&
        event.stance === 'down-02',
    );

    expect(damageEvents.map((event) => event.targetId)).toEqual(
      targets.slice(0, 8).map((target) => target.id),
    );
    expect(reactions.map((event) => event.targetId)).toEqual(
      targets.slice(0, 8).map((target) => target.id),
    );
    expect(new Set(damageEvents.map((event) => event.targetId)).size).toBe(8);
    expect(new Set(reactions.map((event) => event.targetId)).size).toBe(8);
    expect(targets[8]?.hp).toBe(targets[8]?.maxHp);
  });

  it('moves into Ground Smash range, then applies one Down03 contact at 610ms', () => {
    const sim = makeSim(1_401);
    const target = spawnTarget(sim, 6.5, 0, 'native_1401_cc_target');
    const sourceStart = { ...sim.player.pos };
    const targetStart = { ...target.pos };
    sim.player.targetId = target.id;
    sim.drainEvents();

    expect(sim.mir4CastSkill(1401, target.id)).toEqual({ ok: true });
    expect(tickMany(sim, 12).some((event) => event.type === 'damage')).toBe(false);
    const events = tickMany(sim, 1);
    const damageEvents = events.filter(
      (event) => event.type === 'damage' && event.ability === 'Esmagamento Terrestre',
    );

    expect(damageEvents).toHaveLength(1);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 1401,
        attackId: 140102,
        targetId: target.id,
        stance: 'down-03',
        durationMs: 2_490,
        moveDurationMs: 490,
        heightYards: 0,
      }),
    );
    expect(
      Math.hypot(sim.player.pos.x - sourceStart.x, sim.player.pos.z - sourceStart.z),
    ).toBeCloseTo(7.3, 1);
    expect(Math.hypot(target.pos.x - targetStart.x, target.pos.z - targetStart.z)).toBeCloseTo(
      1.5,
      8,
    );
  });

  it('honors the collision-resolved endpoint instead of passing through world geometry', () => {
    const sim = makeSim(1_105);
    const target = spawnTarget(sim, 5);
    sim.player.targetId = target.id;
    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 9);
    const originalResolveMove = sim.ctx.resolveMove;
    const blockedX = target.pos.x + 0.35;
    const resolveMove = vi
      .spyOn(sim.ctx, 'resolveMove')
      .mockImplementation((fromX, fromZ, nextX, nextZ, radius, entity, ignoreFences) =>
        entity.id === target.id
          ? { x: blockedX, z: fromZ }
          : originalResolveMove(fromX, fromZ, nextX, nextZ, radius, entity, ignoreFences),
      );

    tickMany(sim, 1);

    expect(resolveMove).toHaveBeenCalled();
    expect(target.pos.x).toBeCloseTo(blockedX, 8);
  });

  it('still deals damage but neither moves nor presents a resisted knock-down', () => {
    const sim = makeSim(1_106);
    const target = spawnTarget(sim, 5);
    const playerMir4 = sim.player.mir4;
    if (!playerMir4) throw new Error('MIR4 player state is missing');
    target.mir4 = {
      ...playerMir4,
      statusValues: Object.freeze({ 120: 10_000 }),
      dodge: 0,
      avoidCritical: 0,
      physicalDefense: 0,
      magicDefense: 0,
      penetrationDefenseBps: 0,
      pvpDamageReductionBps: 0,
      monsterDamageReductionBps: 0,
      bossDamageReductionBps: 0,
      allDamageReductionBps: 0,
      skillDamageReductionBps: 0,
    };
    const start = { ...target.pos };
    sim.player.targetId = target.id;
    sim.drainEvents();

    sim.castAbility(mir4ActionId(1104));
    const events = tickMany(sim, 10);

    expect(target.hp).toBeLessThan(target.maxHp);
    expect(target.pos).toEqual(start);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'knockdown') ?? false).toBe(
      false,
    );
    expect(events.some((event) => event.type === 'mir4HitReaction')).toBe(false);
  });
});
