import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import {
  castMir4Skill,
  mir4BasicAttack,
  updateMir4PendingImpacts,
} from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4NativeImpactType1Targets } from '../../src/sim/mir4/native_impact_type1_targets';
import { applyMir4NativeBlastingCharmContact } from '../../src/sim/mir4/native_skill_blasting_charm';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Blasting Charm Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.spellPower = 1_000;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
  sim.player.mir4.accuracy = 1_000_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing Taoist metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 3505: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, suffix: string, x: number, z = 0): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `blasting_charm_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
    mir4Dodge: 0,
    mir4AvoidCritical: 1_000_000,
  };
  const target = createMob(
    sim.nextId++,
    template as never,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function resolveAt(sim: Sim, seconds: number): void {
  sim.time = seconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Taoist 3505 Blasting Charm integrated runtime', () => {
  it('rebuilds the six-yard ImpactType 1 area around the live target and caps it at five', () => {
    const sim = makeTaoist(35_051);
    const anchor = spawnTarget(sim, 'anchor', 5);
    const nearby = Array.from({ length: 5 }, (_, index) =>
      spawnTarget(sim, `nearby_${index}`, 5, index + 1),
    );
    const outside = spawnTarget(sim, 'outside', 5, 6.1);

    expect(
      mir4NativeImpactType1Targets(sim.ctx, sim.player, anchor, 3505, 350502)?.map(
        (target) => target.id,
      ),
    ).toEqual([anchor.id, ...nearby.slice(0, 4).map((target) => target.id)]);
    expect(outside.hp).toBe(outside.maxHp);
  });

  it('waits for the 1.08-second explosion, damages five enemies, and applies rank-1 debuffs', () => {
    const sim = makeTaoist(35_052);
    const anchor = spawnTarget(sim, 'anchor', 5);
    const nearby = Array.from({ length: 5 }, (_, index) =>
      spawnTarget(sim, `nearby_${index}`, 5, index + 1),
    );
    const outside = spawnTarget(sim, 'outside', 5, 6.1);
    sim.player.targetId = anchor.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3505, anchor.id)).toEqual({ ok: true });
    expect(
      sim
        .drainEvents()
        .find(
          (event) => event.type === 'mir4SkillPresentation' && event.skillId === 3505,
        ),
    ).toMatchObject({
      type: 'mir4SkillPresentation',
      profile: 'taoist-blasting-charm',
      targetId: anchor.id,
    });
    expect(
      (sim.player.mir4PendingImpacts ?? []).find(
        (impact) => impact.skillId === 3505 && impact.attackId === 350502,
      ),
    ).toMatchObject({ rawDamage: 2_400, dueAt: 1.08, targetId: anchor.id });

    resolveAt(sim, 1.079);
    expect([anchor, ...nearby].every((target) => target.hp === target.maxHp)).toBe(true);
    resolveAt(sim, 1.08);

    const hit = [anchor, ...nearby.slice(0, 4)];
    expect(hit.every((target) => target.hp < target.maxHp)).toBe(true);
    expect(nearby[4]?.hp).toBe(nearby[4]?.maxHp);
    expect(outside.hp).toBe(outside.maxHp);
    for (const target of hit) {
      expect(mir4NativeStatusBonus(target, 24)).toBe(-50);
      expect(mir4NativeStatusBonus(target, 53)).toBe(-250);
    }
  });

  it('at rank 10 adds the monster-only damage reduction vulnerability ladder', () => {
    const sim = makeTaoist(35_060, 10);
    const anchor = spawnTarget(sim, 'anchor', 5);
    sim.player.targetId = anchor.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 3505, anchor.id)).toEqual({ ok: true });
    resolveAt(sim, 1.08);

    expect(mir4NativeStatusBonus(anchor, 24)).toBe(-50);
    expect(mir4NativeStatusBonus(anchor, 47)).toBe(-3_000);
    expect(mir4NativeStatusBonus(anchor, 42)).toBe(0);
    expect(mir4NativeStatusBonus(anchor, 39)).toBe(0);
    expect(mir4NativeStatusBonus(anchor, 51)).toBe(-3_000);
    expect(mir4NativeStatusBonus(anchor, 53)).toBe(-3_250);
    expect(mir4NativeStatusBonus(anchor, 49)).toBe(-2_000);
  });

  it('makes a monster with negative All Damage Reduction take more follow-up magic damage', () => {
    const clean = makeTaoist(35_061, 10);
    const debuffed = makeTaoist(35_061, 10);
    const cleanTarget = spawnTarget(clean, 'clean', 2);
    const debuffedTarget = spawnTarget(debuffed, 'debuffed', 2);

    expect(
      applyMir4NativeBlastingCharmContact(
        debuffed.ctx,
        debuffed.player,
        debuffedTarget,
        350502,
        0,
        10,
      ),
    ).toBe(true);
    expect(mir4BasicAttack(clean.ctx, clean.playerId, cleanTarget.id)).toEqual({ ok: true });
    expect(mir4BasicAttack(debuffed.ctx, debuffed.playerId, debuffedTarget.id)).toEqual({ ok: true });
    resolveAt(clean, 2);
    resolveAt(debuffed, 2);

    const cleanDamage = cleanTarget.maxHp - cleanTarget.hp;
    const debuffedDamage = debuffedTarget.maxHp - debuffedTarget.hp;
    expect(cleanDamage).toBeGreaterThan(0);
    expect(debuffedDamage).toBeGreaterThan(cleanDamage);
  });
});
