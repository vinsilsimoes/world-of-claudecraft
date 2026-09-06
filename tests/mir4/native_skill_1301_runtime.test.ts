import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  mir4AllDamageReductionBonusBps,
  mir4BossDamageReductionBonusBps,
} from '../../src/sim/mir4/effects';
import { mir4NativeControlImmune } from '../../src/sim/mir4/native_control_immunity';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, skillLevel = 1, devCommands = false): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Riposte Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    devCommands,
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  const meta = sim.players.get(sim.playerId);
  if (!meta || !sim.player.mir4) throw new Error('missing MIR4 player state');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1301: skillLevel };
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offsetX: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `riposte_runtime_${suffix}`,
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
  return target;
}

function spawnPlayerTarget(sim: Sim, offsetX: number, suffix: string): Entity {
  const targetId = sim.addPlayer('warrior', `Riposte PvP ${suffix}`);
  const target = sim.entities.get(targetId);
  if (!target?.mir4) throw new Error('missing MIR4 PvP target state');
  sim.setPlayerLevel(120, targetId);
  target.pos = sim.groundPos(sim.player.pos.x + offsetX, sim.player.pos.z);
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.mir4.dodge = 0;
  target.mir4.avoidCritical = 10_000;
  target.mir4.statusValues = {};
  sim.rebucket(target);
  return target;
}

describe('MIR4 Warrior 1301 integrated runtime', () => {
  it('commits the source buffs and the exact 20/1240ms setup and damage contacts', () => {
    const sim = makeWarrior(51_301);
    const target = spawnTarget(sim, 3, 'primary');
    sim.player.targetId = target.id;
    const start = { ...sim.player.pos };
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, target.id)).toEqual({ ok: true });

    expect(sim.player.resource).toBeLessThan(resourceBefore);
    expect(sim.player.cooldowns.get('1301')).toBe(25);
    expect(sim.player.pos).toEqual(start);
    expect(mir4NativeControlImmune(sim.player)).toBe(true);
    expect(mir4AllDamageReductionBonusBps(sim.player)).toBe(2400);
    expect(mir4BossDamageReductionBonusBps(sim.player)).toBe(0);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 1301)
        .map((impact) => [
          impact.attackId,
          impact.effectOnly === true,
          Math.round((impact.dueAt - sim.time) * 1_000),
        ]),
    ).toEqual([
      [130102, false, 1240],
      [130101, true, 20],
    ]);
    expect(
      sim
        .drainEvents()
        .filter((event) => event.type === 'mir4SkillGuide')
        .map((event) => [event.attackId, event.shape, event.applyTo, event.aliveMs]),
    ).toEqual([
      [130101, 'circle', 'self', 350],
      [130102, 'circle', 'self', 400],
    ]);
  });

  it('taunts only inside the 12-yard setup circle, then damages and knocks down in the 4.5-yard circle', () => {
    const sim = makeWarrior(51_311);
    const primary = spawnTarget(sim, 3, 'primary');
    const inner = spawnTarget(sim, 6, 'inner');
    const setupOnly = spawnTarget(sim, 10, 'setup_only');
    const outside = spawnTarget(sim, 15, 'outside');
    sim.player.targetId = primary.id;
    const healthBefore = new Map(
      [primary, inner, setupOnly, outside].map((target) => [target.id, target.hp]),
    );
    const events: SimEvent[] = [];

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, primary.id)).toEqual({ ok: true });
    events.push(...sim.tick());

    for (const target of [primary, inner, setupOnly]) {
      expect(target.forcedTargetId).toBe(sim.playerId);
      expect(target.forcedTargetTimer).toBeGreaterThan(4.8);
      expect(target.hp).toBe(healthBefore.get(target.id));
    }
    expect(outside.forcedTargetId).not.toBe(sim.playerId);

    for (let tick = 1; tick < 27; tick += 1) events.push(...sim.tick());

    expect(primary.hp).toBeLessThan(healthBefore.get(primary.id) ?? 0);
    expect(inner.hp).toBeLessThan(healthBefore.get(inner.id) ?? 0);
    expect(setupOnly.hp).toBe(healthBefore.get(setupOnly.id));
    expect(outside.hp).toBe(healthBefore.get(outside.id));
    for (const target of [primary, inner]) {
      expect(
        target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_1301_knockdown'),
      ).toMatchObject({ kind: 'knockdown', duration: 3 });
    }
    expect(
      events.filter(
        (event) =>
          event.type === 'mir4HitReaction' && event.skillId === 1301 && event.attackId === 130102,
      ),
    ).toHaveLength(2);
  });

  it('applies rank-8 immediate healing and keeps only its ten-second milestone reductions after the base buff expires', () => {
    const sim = makeWarrior(51_381, 8);
    const target = spawnTarget(sim, 3, 'rank8');
    sim.player.targetId = target.id;
    sim.player.hp = Math.floor(sim.player.maxHp / 2);
    const healthBefore = sim.player.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, target.id)).toEqual({ ok: true });

    expect(sim.player.hp - healthBefore).toBe(Math.floor(sim.player.maxHp / 10));
    expect(mir4AllDamageReductionBonusBps(sim.player)).toBe(7200);
    expect(mir4BossDamageReductionBonusBps(sim.player)).toBe(3000);

    for (let tick = 0; tick < 62; tick += 1) sim.tick();
    expect(mir4NativeControlImmune(sim.player)).toBe(false);
    expect(mir4AllDamageReductionBonusBps(sim.player)).toBe(2000);
    expect(mir4BossDamageReductionBonusBps(sim.player)).toBe(3000);
  });

  it('knocks down hostile players and caps rank-10 recovery at five successful targets', () => {
    const sim = makeWarrior(51_310, 10);
    const targets = Array.from({ length: 6 }, (_, index) =>
      spawnPlayerTarget(sim, 2.5 + index * 0.2, `target_${index}`),
    );
    const targetIds = new Set(targets.map((target) => target.id));
    const originalIsHostileTo = sim.ctx.isHostileTo;
    sim.ctx.isHostileTo = (source, target) =>
      (source.id === sim.playerId && targetIds.has(target.id)) ||
      originalIsHostileTo(source, target);
    sim.player.targetId = targets[0]?.id ?? null;
    sim.player.hp = Math.floor(sim.player.maxHp / 10);
    const healthBefore = sim.player.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, targets[0]?.id)).toEqual({ ok: true });
    const healthAfterImmediateHeal = sim.player.hp;
    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      impact.dueAt = sim.time;
      impact.forceHit = true;
      impact.forceCritical = false;
      impact.spiritProcEligible = false;
    }
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);

    updateMir4PendingImpacts(sim.ctx);
    sim.ctx.isHostileTo = originalIsHostileTo;

    expect(healthAfterImmediateHeal - healthBefore).toBe(Math.floor(sim.player.maxHp * 0.2));
    expect(sim.player.hp - healthAfterImmediateHeal).toBe(Math.floor(sim.player.maxHp * 0.5));
    for (const target of targets) {
      expect(
        target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_1301_knockdown'),
      ).toMatchObject({ kind: 'knockdown', duration: 3 });
    }
  });

  it('keeps mana fixed only when the development QA resource lock is enabled', () => {
    const sim = makeWarrior(51_391, 1, true);
    const target = spawnTarget(sim, 3, 'resource_lock');
    sim.player.targetId = target.id;
    sim.chat('/dev resource infinite on');
    const resourceBefore = sim.player.resource;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, target.id)).toEqual({ ok: true });
    expect(sim.player.resource).toBe(resourceBefore);
  });
});
