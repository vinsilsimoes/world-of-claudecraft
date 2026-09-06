import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  mir4NativeBerserkInvincible,
  mir4NativeBerserkSkillDamageBonusBps,
} from '../../src/sim/mir4/native_skill_berserk_runtime';
import { mir4NativeRuntimeBerserkPolicy } from '../../src/sim/mir4/native_skill_berserk';
import { requestMir4SkillActivation } from '../../src/sim/mir4/skill_activation';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { dist2d } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Berserk Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 player metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1101: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offsetX = 3): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'berserk_runtime_target',
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

describe('MIR4 Warrior 1101 integrated runtime', () => {
  it('compiles the exact two source-owned native buffs at ranks 1 and 10', () => {
    expect(mir4NativeRuntimeBerserkPolicy(1)).toEqual({
      skillId: 1101,
      skillLevel: 1,
      rows: [
        {
          attackId: 110100,
          applyAtMs: 20,
          buff: { buffId: 11011, durationMs: 1_500, kind: 'invincible' },
        },
        {
          attackId: 110101,
          applyAtMs: 650,
          buff: {
            buffId: 11012,
            durationMs: 15_000,
            kind: 'native-status-boost',
            statusId: 44,
            magnitudeBasisPoints: 1_200,
          },
        },
      ],
    });
    expect(mir4NativeRuntimeBerserkPolicy(10)?.rows[1]?.buff).toMatchObject({
      buffId: 11012,
      statusId: 44,
      magnitudeBasisPoints: 3_000,
    });
  });

  it('schedules both source buffs before their matching contact target loop', () => {
    const sim = makeWarrior(11_011, 1);
    const target = spawnTarget(sim);

    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 1101)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      [110100, 'berserk-source-buff', 20],
      [110101, 'berserk-source-buff', 650],
      [110100, null, 20],
      [110101, null, 650],
    ]);
  });

  it('is invincible for 1.5 seconds and then accepts damage again', () => {
    const sim = makeWarrior(11_012, 1);
    const target = spawnTarget(sim);
    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, target.id)).toEqual({ ok: true });

    sim.time = 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeBerserkInvincible(sim.player)).toBe(true);
    const hpBefore = sim.player.hp;
    expect(sim.dealDamage(target, sim.player, 100, false, 'physical', 'QA', 'hit')).toBe(0);
    expect(sim.player.hp).toBe(hpBefore);

    for (let tick = 0; tick < 31; tick += 1) sim.tick();
    expect(mir4NativeBerserkInvincible(sim.player)).toBe(false);
    expect(sim.dealDamage(target, sim.player, 100, false, 'physical', 'QA', 'hit')).toBeGreaterThan(0);
  });

  it('applies the exact rank-scaled STATUS 44 boost at the second contact', () => {
    const sim = makeWarrior(11_013, 10);
    const target = spawnTarget(sim);
    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, target.id)).toEqual({ ok: true });

    sim.time = 0.649;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeBerserkSkillDamageBonusBps(sim.player)).toBe(0);
    sim.time = 0.65;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeBerserkSkillDamageBonusBps(sim.player)).toBe(3_000);
  });

  it('applies both contacts only inside each native five-yard self circle', () => {
    const sim = makeWarrior(11_014, 1);
    const primary = spawnTarget(sim, 3);
    const inside = spawnTarget(sim, 4);
    const outside = spawnTarget(sim, 7);
    sim.player.targetId = primary.id;
    const healthBefore = new Map(
      [primary, inside, outside].map((target) => [target.id, target.hp]),
    );
    const events: SimEvent[] = [];

    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, primary.id)).toEqual({ ok: true });
    for (let tick = 0; tick < 15; tick += 1) events.push(...sim.tick());

    expect(primary.hp).toBeLessThan(healthBefore.get(primary.id) ?? 0);
    expect(inside.hp).toBeLessThan(healthBefore.get(inside.id) ?? 0);
    expect(outside.hp).toBe(healthBefore.get(outside.id));
    expect(
      events
        .filter(
          (event): event is Extract<SimEvent, { type: 'damage' }> =>
            event.type === 'damage' && event.ability === 'Fúria',
        )
        .map((event) => event.targetId),
    ).toEqual([primary.id, inside.id, primary.id, inside.id]);
  });

  it('approaches an out-of-range target, faces it, and commits exactly once', () => {
    const sim = makeWarrior(11_015, 1);
    const target = spawnTarget(sim, 10);
    const start = { ...sim.player.pos };
    const resourceBefore = sim.player.resource;
    const events: SimEvent[] = [];

    sim.drainEvents();
    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1101', sim.playerId)).toEqual({
      ok: true,
      queued: true,
    });
    expect(sim.player.cooldowns.has('1101')).toBe(false);
    expect(sim.player.resource).toBe(resourceBefore);

    let ticks = 0;
    while (!sim.player.cooldowns.has('1101') && ticks++ < 160) events.push(...sim.tick());

    expect(ticks).toBeLessThan(160);
    expect(dist2d(start, sim.player.pos)).toBeGreaterThan(0);
    // Native trace stop is 4.5 yards plus the 0.2-yard body radius, minus
    // the one-yard trace padding.
    expect(dist2d(sim.player.pos, target.pos)).toBeCloseTo(3.7, 8);
    expect(sim.player.facing).toBeCloseTo(
      Math.atan2(target.pos.x - sim.player.pos.x, target.pos.z - sim.player.pos.z),
      8,
    );
    expect(
      events.filter(
        (event) =>
          event.type === 'mir4AttackStart' &&
          event.action === 'skill' &&
          event.ability === 'mir4_skill_1101',
      ),
    ).toHaveLength(1);
  });

  it('lets manual movement cancel an out-of-range activation before resource spend', () => {
    const sim = makeWarrior(11_016, 1);
    spawnTarget(sim, 10);
    const resourceBefore = sim.player.resource;

    expect(requestMir4SkillActivation(sim.ctx, 'mir4_skill_1101', sim.playerId)).toEqual({
      ok: true,
      queued: true,
    });
    sim.moveInput.forward = true;
    sim.tick();
    sim.moveInput.forward = false;

    expect(sim.players.get(sim.playerId)?.mir4SkillActivation).toBeUndefined();
    expect(sim.player.cooldowns.has('1101')).toBe(false);
    expect(sim.player.resource).toBe(resourceBefore);
  });
});
