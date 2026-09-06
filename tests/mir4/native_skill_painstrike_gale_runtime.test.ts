import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeArbalist(seed = 41_060): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'hunter',
    playerClassMir4: 'arbalist',
    playerName: 'Painstrike Gale Runtime QA',
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

function spawnTarget(sim: Sim, suffix: string, x: number, z: number, hp = 1_000_000): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `painstrike_${suffix}`,
    hpBase: hp,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(x, z));
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  target.maxHp = hp;
  target.hp = hp;
  sim.addEntity(target);
  return target;
}

function forceSkillContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 4106 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

function tickMany(sim: Sim, count: number): SimEvent[] {
  const events: SimEvent[] = [];
  for (let tick = 0; tick < count; tick += 1) events.push(...sim.tick());
  return events;
}

describe('MIR4 Painstrike Gale integrated runtime', () => {
  it('approaches from outside 14 yards, spends only at trace reach, and schedules one kick', () => {
    const sim = makeArbalist();
    const target = spawnTarget(sim, 'approach', sim.player.pos.x, sim.player.pos.z + 20);
    sim.player.targetId = target.id;
    const resource = sim.player.resource;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_4106', sim.playerId, target.id)).toEqual(
      { ok: true, queued: true },
    );
    expect(sim.player.resource).toBe(resource);
    expect(sim.player.cooldowns.has('4106')).toBe(false);

    let ticks = 0;
    while (!sim.player.cooldowns.has('4106') && ticks++ < 240) sim.tick();

    expect(ticks).toBeLessThan(240);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThanOrEqual(13.5);
    expect(sim.player.resource).toBeLessThan(resource);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 4106)
        .map((impact) => [
          impact.effectOnly === true ? impact.nativeSetup : impact.attackId,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      [410602, 450],
      ['arbalist-painstrike-source-buffs', 20],
    ]);
  });

  it('rushes 0.3 yard through the target, kicks at 450ms, then retreats exactly 8 yards', () => {
    const sim = makeArbalist(41_061);
    const origin = { ...sim.player.pos };
    const target = spawnTarget(sim, 'motion', origin.x, origin.z + 10);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4106, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 5);
    expect(sim.player.pos.z).toBeCloseTo(target.pos.z + 0.3, 6);

    tickMany(sim, 4);
    expect(sim.player.pos.z).toBeCloseTo(target.pos.z - 0.5, 6);
    expect(target.hp).toBeLessThan(target.maxHp);

    tickMany(sim, 9);
    expect(sim.player.pos.z).toBeCloseTo(target.pos.z - 7.7, 6);
    expect(sim.player.pos.z).toBeCloseTo(origin.z + 2.3, 6);
    expect(sim.players.get(sim.playerId)?.mir4SkillAction).toBeUndefined();
  });

  it('keeps the committed retreat after the kick kills its selected target', () => {
    const sim = makeArbalist(41_061);
    const origin = { ...sim.player.pos };
    const target = spawnTarget(sim, 'fatal', origin.x, origin.z + 10, 1);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4106, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 9);
    expect(target.dead).toBe(true);
    const contactPosition = sim.player.pos.z;

    tickMany(sim, 9);
    expect(sim.player.pos.z).toBeLessThan(contactPosition);
    expect(sim.player.pos.z).toBeCloseTo(origin.z + 2.3, 6);
  });

  it('grants Focus and one second of invincibility at the 20ms setup contact', () => {
    const sim = makeArbalist(41_063);
    const target = spawnTarget(sim, 'source_buffs', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4106, target.id)).toEqual({ ok: true });
    sim.tick();

    expect(mir4Invincible(sim.player)).toBe(true);
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_41010'),
    ).toMatchObject({ nativeStacks: 1, duration: 30 });
    expect(
      sim.player.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40115'),
    ).toMatchObject({ kind: 'invincible', duration: 1 });

    tickMany(sim, 20);
    expect(mir4Invincible(sim.player)).toBe(false);
  });

  it('re-resolves the native 6-yard, five-target kick strip at contact time', () => {
    const sim = makeArbalist(41_061);
    const origin = { ...sim.player.pos };
    const anchor = spawnTarget(sim, 'anchor', origin.x, origin.z + 10);
    const admitted = Array.from({ length: 4 }, (_, index) =>
      spawnTarget(sim, `strip_${index}`, origin.x, origin.z + 11 + index),
    );
    const outside = spawnTarget(sim, 'outside', origin.x, origin.z + 16.1);
    sim.player.targetId = anchor.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 4106, anchor.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    const events = tickMany(sim, 9);

    for (const target of [anchor, ...admitted]) {
      expect(
        events.filter(
          (event) =>
            event.type === 'damage' &&
            event.targetId === target.id &&
            event.ability === 'Vendaval de Golpe de Dor',
        ),
      ).toHaveLength(1);
    }
    expect(events.some((event) => event.type === 'damage' && event.targetId === outside.id)).toBe(
      false,
    );
  });

  it('applies the rank-10 Mark, stun, CRIT DMG Reduction, and CRIT EVA debuffs on hit', () => {
    const sim = makeArbalist(41_065);
    const target = spawnTarget(sim, 'rank10', sim.player.pos.x, sim.player.pos.z + 4);
    sim.player.targetId = target.id;
    sim.players.get(sim.playerId)!.mir4SkillLevels = { 4106: 10 };
    vi.spyOn(sim.rng, 'next').mockReturnValue(0);

    expect(castMir4Skill(sim.ctx, sim.playerId, 4106, target.id)).toEqual({ ok: true });
    forceSkillContacts(sim);
    tickMany(sim, 9);

    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40010_31'),
    ).toMatchObject({ duration: 10, magnitude: -25, nativeStatusId: 31 });
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_10523'),
    ).toMatchObject({ kind: 'stun', duration: 3 });
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40511_33'),
    ).toMatchObject({ duration: 8, magnitude: -400, nativeStatusId: 33 });
    expect(
      target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_native_buff_40512_31'),
    ).toMatchObject({ duration: 8, magnitude: -400, nativeStatusId: 31 });
    expect(mir4NativeStatusBonus(target, 31)).toBe(-425);
    expect(mir4NativeStatusBonus(target, 33)).toBe(-400);
  });
});
