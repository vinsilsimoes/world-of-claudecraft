import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4DamageTakenAddend, mir4HardControlled } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeIronShackleImpactEffects,
  mir4NativeIronShacklePersistentCombatBonuses,
} from '../../src/sim/mir4/native_skill_iron_shackle_runtime';
import { Sim } from '../../src/sim/sim';
import type { Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number, skillLevel: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Iron Shackle Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.facing = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta || !sim.player.mir4) throw new Error('missing MIR4 player state');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 1201: skillLevel };
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, z: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `iron_shackle_${suffix}`,
    hpBase: 10_000_000,
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
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + z),
  );
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Warrior 1201 integrated runtime', () => {
  it('applies the exact rank milestone effects to the corresponding landed rows', () => {
    const sim = makeWarrior(12_018, 8);
    const target = spawnTarget(sim, 4, 'rank8');

    expect(mir4NativeIronShacklePersistentCombatBonuses(sim.ctx, sim.player)).toEqual({
      monsterDamageBasisPoints: 800,
      allDamageReductionBasisPoints: 400,
    });
    expect(
      applyMir4NativeIronShackleImpactEffects(sim.ctx, sim.player, target, 1201, 120102, 8, 0),
    ).toEqual({ damageAmplificationApplied: true, finalStunApplied: false });
    expect(mir4DamageTakenAddend(target)).toBe(0.25);
    expect(target.mir4Effects?.active[0]).toMatchObject({
      effectId: 'mir4_1201_buff_10511',
      kind: 'damage-amplification',
      duration: 6,
      magnitude: 0.25,
    });
  });

  it('upgrades the amplification and lands the rank-10 one-second final stun', () => {
    const sim = makeWarrior(12_011, 10);
    const target = spawnTarget(sim, 4, 'rank10');

    expect(
      applyMir4NativeIronShackleImpactEffects(sim.ctx, sim.player, target, 1201, 120102, 10, 0),
    ).toEqual({ damageAmplificationApplied: true, finalStunApplied: false });
    expect(mir4DamageTakenAddend(target)).toBe(0.35);
    expect(
      applyMir4NativeIronShackleImpactEffects(sim.ctx, sim.player, target, 1201, 120103, 10, 0),
    ).toEqual({ damageAmplificationApplied: false, finalStunApplied: true });
    expect(mir4HardControlled(target)).toBe(true);
    expect(target.mir4Effects?.active.find((effect) => effect.effectId === 'mir4_1201_buff_10521'))
      .toMatchObject({ kind: 'stun', duration: 1 });
  });

  it('executes the three native circles, knocks out, pulls to two yards, and hits again', () => {
    const sim = makeWarrior(12_101, 10);
    const target = spawnTarget(sim, 5, 'primary');
    const secondary = spawnTarget(sim, 8, 'secondary');
    const outside = spawnTarget(sim, 19, 'outside');
    sim.player.targetId = target.id;
    const events: SimEvent[] = [];
    const healthBefore = new Map(
      [target, secondary, outside].map((entity) => [entity.id, entity.hp]),
    );

    expect(castMir4Skill(sim.ctx, sim.playerId, 1201, target.id)).toEqual({ ok: true });
    for (const impact of sim.player.mir4PendingImpacts ?? []) {
      impact.dueAt = sim.time;
      impact.forceHit = true;
      impact.forceCritical = false;
      impact.spiritProcEligible = false;
    }
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0);
    updateMir4PendingImpacts(sim.ctx);
    events.push(...sim.drainEvents());

    expect(target.hp).toBeLessThan(healthBefore.get(target.id) ?? 0);
    expect(secondary.hp).toBeLessThan(healthBefore.get(secondary.id) ?? 0);
    expect(outside.hp).toBe(healthBefore.get(outside.id));
    for (const pulled of [target, secondary]) {
      expect(Math.hypot(pulled.pos.x - sim.player.pos.x, pulled.pos.z - sim.player.pos.z)).toBeCloseTo(
        2,
        5,
      );
      expect(mir4DamageTakenAddend(pulled)).toBe(0.35);
      expect(mir4HardControlled(pulled)).toBe(true);
    }
    expect(
      events.filter((event) => event.type === 'mir4HitReaction' && event.skillId === 1201),
    ).toHaveLength(6);
  });
});
