import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect } from '../../src/sim/mir4/effects';
import { mir4NativeRuntimeFrozenBlockPolicy } from '../../src/sim/mir4/native_skill_frozen_block';
import { mir4FrozenBlockActive } from '../../src/sim/mir4/native_skill_frozen_block_state';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Aura, Entity, SimEvent } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Frozen Block Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  sim.player.spellPower = 10_000;
  sim.player.maxHp = 1_000_000;
  sim.player.hp = sim.player.maxHp;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `frozen_block_target_${suffix}`,
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
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceHits(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 2202 || impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Sorcerer 2202 Frozen Block runtime', () => {
  it('seals the exact source buff and three actor-centred contacts', () => {
    expect(mir4NativeRuntimeFrozenBlockPolicy()).toEqual({
      skillId: 2202,
      sourceAttackId: 220201,
      applyAtMs: 20,
      buffId: 22021,
      durationMs: 3_000,
      radiusYards: 7,
      heightYards: 4,
      targetCap: 5,
    });
    const plan = mir4RuntimeSkillExecutionPlan(2202);
    expect(plan).toMatchObject({
      skillId: 2202,
      cooldownMs: 53_000,
      skillCostType: 2,
      skillCost: 6_300,
      attackAnimationMs: 4_000,
      endCutAnimationMs: 3_600,
    });
    expect(
      plan?.rows.flatMap((row) =>
        row.contacts.map((contact) => [
          row.attackId,
          contact.offsetMs,
          contact.damage.coefficient,
          row.geometry.nativeDistanceMax,
          row.target.authorialTargetValue,
        ]),
      ),
    ).toEqual([
      [220201, 20, 2_200, 700, 5],
      [220202, 3_000, 9_900, 700, 5],
      [220203, 3_400, 9_900, 700, 5],
    ]);
  });

  it('casts targetless and applies the three-second invulnerable stasis at 20 ms', () => {
    const sim = makeSorcerer(22_021);
    const attacker = spawnTarget(sim, 3, 'attacker');
    expect(castMir4Skill(sim.ctx, sim.playerId, 2202)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2202)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.targetId,
        ]),
    ).toEqual([
      [220201, 'frozen-block-source-buff', 20, sim.playerId],
      [220201, null, 20, sim.playerId],
      [220202, null, 3_000, sim.playerId],
      [220203, null, 3_400, sim.playerId],
    ]);
    expect(
      sim.drainEvents().find(
        (event): event is Extract<SimEvent, { type: 'mir4SkillPresentation' }> =>
          event.type === 'mir4SkillPresentation' && event.skillId === 2202,
      ),
    ).toMatchObject({ profile: 'sorcerer-frozen-block', targetId: sim.playerId });

    sim.time = 0.019;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4FrozenBlockActive(sim.player)).toBe(false);
    sim.time = 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4FrozenBlockActive(sim.player)).toBe(true);
    const hpBefore = sim.player.hp;
    expect(sim.dealDamage(attacker, sim.player, 100, false, 'magic', 'QA', 'hit')).toBe(0);
    expect(sim.player.hp).toBe(hpBefore);
  });

  it('cleanses removable debuffs and rejects new classic and MIR4 debuffs while active', () => {
    const sim = makeSorcerer(22_022);
    const attacker = spawnTarget(sim, 3, 'attacker');
    const oldDebuff: Aura = {
      id: 'old_poison',
      name: 'Old poison',
      kind: 'dot',
      remaining: 10,
      duration: 10,
      value: 5,
      sourceId: attacker.id,
      school: 'nature',
    };
    sim.ctx.applyAura(sim.player, oldDebuff);
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'old_burn',
        kind: 'burn',
        durationSeconds: 10,
        magnitude: 0.1,
        name: 'Old burn',
        sourceId: attacker.id,
      }).ok,
    ).toBe(true);

    sim.player.resource = 100_000;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2202)).toEqual({ ok: true });
    sim.time = 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(sim.player.auras.some((aura) => aura.id === oldDebuff.id)).toBe(false);
    expect(sim.player.mir4Effects?.active.some((effect) => effect.effectId === 'old_burn')).toBe(
      false,
    );

    const newDebuff: Aura = { ...oldDebuff, id: 'new_poison', name: 'New poison' };
    expect(sim.ctx.tryApplyAura?.(sim.player, newDebuff)).toBe(false);
    expect(
      applyMir4Effect(sim.ctx, sim.player, {
        effectId: 'new_burn',
        kind: 'burn',
        durationSeconds: 10,
        magnitude: 0.1,
        name: 'New burn',
        sourceId: attacker.id,
      }),
    ).toEqual({ ok: false, code: 'MIR4_CC_IMMUNE' });
  });

  it('reselects at most five enemies for each wave and does not freeze or displace them', () => {
    const sim = makeSorcerer(22_023);
    const targets = Array.from({ length: 6 }, (_, index) =>
      spawnTarget(sim, 2 + index * 0.25, String(index)),
    );
    const positions = targets.map((target) => ({ ...target.pos }));
    expect(castMir4Skill(sim.ctx, sim.playerId, 2202)).toEqual({ ok: true });
    forceHits(sim);

    sim.time = 0.02;
    updateMir4PendingImpacts(sim.ctx);
    expect(targets.slice(0, 5).every((target) => target.hp < target.maxHp)).toBe(true);
    expect(targets[5].hp).toBe(targets[5].maxHp);
    expect(
      targets.every(
        (target) =>
          !target.mir4Effects?.active.some((effect) => effect.kind === 'freeze') &&
          target.pos.x === positions[targets.indexOf(target)].x &&
          target.pos.z === positions[targets.indexOf(target)].z,
      ),
    ).toBe(true);
  });
});
