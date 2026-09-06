import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Magic Shield Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.maxHp = 1_000_000;
  sim.player.hp = sim.player.maxHp;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 player metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 2503: skillLevel };
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, offsetX: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `magic_shield_target_${suffix}`,
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
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceShieldContacts(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 2503 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Sorcerer 2503 integrated runtime', () => {
  it('casts without a target and schedules the source buff plus three native waves', () => {
    const sim = makeSorcerer(25_031);
    expect(castMir4Skill(sim.ctx, sim.playerId, 2503)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2503)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.targetId,
        ]),
    ).toEqual([
      [250301, 'magic-shield-source-buff', 450, sim.playerId],
      [250301, null, 450, sim.playerId],
      [250302, null, 850, sim.playerId],
      [250303, null, 1050, sim.playerId],
    ]);
  });

  it('applies the shield at 450 ms and damages enemies through expanding live circles', () => {
    const sim = makeSorcerer(25_032);
    const inner = spawnTarget(sim, 3, 'inner');
    const middle = spawnTarget(sim, 5.2, 'middle');
    const outer = spawnTarget(sim, 6.2, 'outer');
    expect(castMir4Skill(sim.ctx, sim.playerId, 2503)).toEqual({ ok: true });
    forceShieldContacts(sim);

    sim.time = 0.449;
    updateMir4PendingImpacts(sim.ctx);
    expect(sim.player.mir4Shield).toBeUndefined();

    sim.time = 0.45;
    updateMir4PendingImpacts(sim.ctx);
    expect(sim.player.mir4Shield).toEqual({
      remaining: 25,
      damageReductionBasisPoints: 2_400,
      bashDamageReductionBasisPoints: 1_500,
      absorptionRemaining: 2_000,
      hitsRemaining: 20,
    });
    expect(inner.hp).toBeLessThan(inner.maxHp);
    expect(middle.hp).toBe(middle.maxHp);
    expect(outer.hp).toBe(outer.maxHp);

    sim.time = 0.85;
    updateMir4PendingImpacts(sim.ctx);
    expect(middle.hp).toBeLessThan(middle.maxHp);
    expect(outer.hp).toBe(outer.maxHp);

    sim.time = 1.05;
    updateMir4PendingImpacts(sim.ctx);
    expect(outer.hp).toBeLessThan(outer.maxHp);
  });

  it('reduces all incoming damage and expires after twenty hostile damage events', () => {
    const sim = makeSorcerer(25_033);
    const attacker = spawnTarget(sim, 3, 'attacker');
    expect(castMir4Skill(sim.ctx, sim.playerId, 2503)).toEqual({ ok: true });
    sim.time = 0.45;
    updateMir4PendingImpacts(sim.ctx);

    const hpBefore = sim.player.hp;
    expect(sim.dealDamage(attacker, sim.player, 100, false, 'physical', 'QA', 'hit')).toBe(76);
    expect(sim.player.hp).toBe(hpBefore - 76);
    expect(sim.player.mir4Shield).toMatchObject({
      absorptionRemaining: 1_976,
      hitsRemaining: 19,
    });
    for (let hit = 1; hit < 20; hit += 1) {
      sim.dealDamage(attacker, sim.player, 100, false, 'magic', 'QA', 'hit');
    }
    expect(sim.player.mir4Shield).toBeUndefined();
  });

  it('expires after the prevented-damage budget is consumed', () => {
    const sim = makeSorcerer(25_034);
    const attacker = spawnTarget(sim, 3, 'attacker');
    sim.player.mir4Shield = {
      remaining: 25,
      damageReductionBasisPoints: 2_400,
      bashDamageReductionBasisPoints: 1_500,
      absorptionRemaining: 10,
      hitsRemaining: 20,
    };
    expect(sim.dealDamage(attacker, sim.player, 100, false, 'shadow', 'QA', 'hit')).toBe(76);
    expect(sim.player.mir4Shield).toBeUndefined();
  });
});
