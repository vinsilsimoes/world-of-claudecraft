import { describe, expect, it, vi } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4Invincible } from '../../src/sim/mir4/effects';
import { mir4NativeUltimateExecutionPlan } from '../../src/sim/mir4/native_ultimate_runtime';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed = 24_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Dragon Tornado Tester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.setPlayerLevel(120);
  sim.player.mir4UltGauge = 100;
  sim.player.spellPower = 1000;
  sim.player.resource = 1000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.manaCostStat = 100;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `dragon_tornado_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(sim.nextId++, template, 1, sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z + dz));
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Sorcerer native ultimate runtime', () => {
  it('compiles Dragon Tornado from the exact source action, buff, and Totem', () => {
    const plan = mir4NativeUltimateExecutionPlan(2);
    expect(plan).toMatchObject({
      classId: 2,
      skillId: 2403,
      requiredGauge: 100,
      skillCostType: 2,
      skillCost: 7000,
      cooldownMs: 10_000,
      attackAnimationMs: 3330,
      endCutAnimationMs: 2760,
      channel: 'magic',
      sourceInvincibility: {
        attackId: 240302,
        buffId: 24031,
        applyAtMs: 100,
        durationMs: 3000,
        effectId: 'mir4_native_buff_24031',
      },
      totem: { totemId: 1013 },
    });
    expect(plan?.contacts).toHaveLength(10);
    expect(plan?.contacts.every((contact) => contact.coefficient === 6800)).toBe(true);
  });

  it('spends the native gauge and proportional mana cost, then schedules the exact timeline', () => {
    const sim = makeSorcerer();
    const target = spawnTarget(sim, 2, 0, 'timeline');
    const startedAt = sim.time;

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.player.mir4UltGauge).toBe(0);
    expect(sim.player.resource).toBe(930);
    expect(sim.player.cooldowns.get('mir4_ult')).toBe(10);
    expect(sim.player.mir4PendingImpacts?.map((impact) => ({
      attackId: impact.attackId,
      dueMs: Math.round((impact.dueAt - startedAt) * 1000),
      rawDamage: impact.rawDamage,
      effectOnly: impact.effectOnly ?? false,
      channel: impact.channel,
      totemId: impact.nativeTotem?.totemId ?? null,
    }))).toEqual([
      { attackId: 240302, dueMs: 100, rawDamage: 0, effectOnly: true, channel: 'magic', totemId: null },
      ...[555, 700, 800, 950, 1050, 1150, 1250, 1450, 1650, 1850].map((dueMs, index) => ({
        attackId: [240321, 240321, 240321, 240322, 240322, 240323, 240324, 240324, 240324, 240325][index],
        dueMs,
        rawDamage: 680,
        effectOnly: false,
        channel: 'magic',
        totemId: 1013,
      })),
    ]);

    sim.time = startedAt + 0.1;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4Invincible(sim.player)).toBe(true);
  });

  it('anchors to the selected position and reacquires enemies at every contact', () => {
    const sim = makeSorcerer(24_031);
    const selected = spawnTarget(sim, 2, 0, 'selected');
    const replacement = spawnTarget(sim, 3, 0, 'replacement');
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.5);
    expect(sim.mir4UltimateCast(selected.id)).toEqual({ ok: true });
    const selectedHp = selected.hp;
    const replacementHp = replacement.hp;
    selected.pos.x += 30;
    sim.ctx.rebucket(selected);

    sim.time += 0.555;
    updateMir4PendingImpacts(sim.ctx);
    expect(selected.hp).toBe(selectedHp);
    expect(replacement.hp).toBeLessThan(replacementHp);
  });

  it('caps every contact at ten hostiles and preserves the native knock-down height', () => {
    const sim = makeSorcerer(24_032);
    const targets = Array.from({ length: 11 }, (_, index) =>
      spawnTarget(sim, 2 + (index % 3) * 0.4, (index % 2) * 0.3, `cap_${index}`),
    );
    vi.spyOn(sim.ctx.rng, 'next').mockReturnValue(0.5);
    expect(sim.mir4UltimateCast(targets[0].id)).toEqual({ ok: true });
    const hpBefore = targets.map((target) => target.hp);
    sim.time += 0.555;
    updateMir4PendingImpacts(sim.ctx);
    expect(targets.filter((target, index) => target.hp < hpBefore[index])).toHaveLength(10);
    expect(targets[10].hp).toBe(hpBefore[10]);

    const reactionSim = makeSorcerer(24_033);
    const reactionTarget = spawnTarget(reactionSim, 2, 0, 'knockdown');
    vi.spyOn(reactionSim.ctx.rng, 'next').mockReturnValue(0);
    expect(reactionSim.mir4UltimateCast(reactionTarget.id)).toEqual({ ok: true });
    const startedAt = reactionSim.time;
    reactionSim.drainEvents();
    reactionSim.time = startedAt + 1.15;
    updateMir4PendingImpacts(reactionSim.ctx);
    expect(reactionTarget.mir4Effects?.active).toContainEqual(expect.objectContaining({
      effectId: 'mir4_240323_totem_knockdown',
      kind: 'knockdown',
      duration: 2.1,
    }));
    expect(reactionSim.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'mir4HitReaction',
      skillId: 2403,
      attackId: 240323,
      stance: 'down-02',
      durationMs: 2100,
      heightYards: 7,
    }));
  });

  it('emits the extracted Tornado presentation as one persistent fixed area', () => {
    const sim = makeSorcerer(24_034);
    const target = spawnTarget(sim, 2, 0, 'presentation');
    sim.drainEvents();
    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    expect(sim.drainEvents()).toContainEqual(expect.objectContaining({
      type: 'mir4SkillPresentation',
      skillId: 2403,
      ability: 'mir4_ultimate_2',
      profile: 'sorcerer-dragon-tornado',
      durationMs: 6100,
      endCutMs: 2760,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
      persistentArea: expect.objectContaining({
        spawnOffsetMs: 100,
        expiresOffsetMs: 6100,
        radiusYards: 7,
        heightYards: 4,
      }),
      contacts: expect.arrayContaining([
        expect.objectContaining({ attackId: 240321, offsetMs: 555, damageCoefficient: 6800 }),
        expect.objectContaining({ attackId: 240325, offsetMs: 1850, damageCoefficient: 6800 }),
      ]),
    }));
  });
});
