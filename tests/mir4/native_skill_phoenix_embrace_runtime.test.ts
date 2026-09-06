import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { mir4SkillById } from '../../src/sim/content/mir4';
import { createMob } from '../../src/sim/entity';
import {
  castMir4Skill,
  mir4UsePotion,
  updateMir4PendingImpacts,
} from '../../src/sim/mir4/combat';
import {
  mir4AttackMultiplier,
  mir4EffectiveSpellPower,
  mir4NativeStatusBonus,
} from '../../src/sim/mir4/effects';
import {
  mir4NativeRuntimePhoenixEmbracePolicy,
} from '../../src/sim/mir4/native_skill_phoenix_embrace';
import { mir4NativePhoenixEmbracePersistentSkillDamageBonusBps } from '../../src/sim/mir4/native_skill_phoenix_embrace_runtime';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';
import { mir4ModifiedPotionAmount } from '../../src/sim/mir4/status_effects';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number, skillLevel = 1): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Phoenix Embrace Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  sim.player.spellPower = 1_000;
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 player metadata');
  meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 2204: skillLevel };
  sim.drainEvents();
  return sim;
}

function movePlayer(sim: Sim, playerId: number, x: number, z = 0): Entity {
  const player = sim.entities.get(playerId);
  if (!player) throw new Error(`missing player ${playerId}`);
  player.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z + z);
  player.pos.y = sim.player.pos.y;
  player.prevPos = { ...player.pos };
  return player;
}

function addPartyMember(sim: Sim, name: string, x: number): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = movePlayer(sim, memberId, x);
  member.spellPower = 500;
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

function spawnTarget(sim: Sim, x: number): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `phoenix_target_${sim.nextId}`,
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

function resolvePhoenixBuff(sim: Sim): void {
  sim.time = 0.85;
  updateMir4PendingImpacts(sim.ctx);
}

describe('MIR4 Sorcerer 2204 Phoenix Embrace runtime', () => {
  it('seals the exact targetless party-buff contract from the extracted rows', () => {
    expect(mir4NativeRuntimePhoenixEmbracePolicy(1)).toEqual({
      skillId: 2204,
      skillLevel: 1,
      sourceAttackId: 220402,
      applyAtMs: 850,
      buffId: 22042,
      durationMs: 60_000,
      radiusYards: 7,
      heightYards: 4,
      targetCap: 5,
      spellAttackFlat: 25,
      cooldownReductionBasisPoints: 0,
      mpPotionEfficiencyBasisPoints: 0,
      persistentSkillDamageBasisPoints: 0,
      globalCooldownMs: 0,
    });
    expect(mir4NativeRuntimePhoenixEmbracePolicy(5)).toMatchObject({
      spellAttackFlat: 45,
      cooldownReductionBasisPoints: 2_500,
    });
    expect(mir4NativeRuntimePhoenixEmbracePolicy(8)).toMatchObject({
      spellAttackFlat: 60,
      cooldownReductionBasisPoints: 4_000,
      mpPotionEfficiencyBasisPoints: 2_000,
      persistentSkillDamageBasisPoints: 400,
    });
    expect(mir4NativeRuntimePhoenixEmbracePolicy(10)).toMatchObject({
      spellAttackFlat: 70,
      cooldownReductionBasisPoints: 6_000,
      mpPotionEfficiencyBasisPoints: 3_000,
      persistentSkillDamageBasisPoints: 800,
    });

    expect(mir4RuntimeSkillExecutionPlan(2204)).toMatchObject({
      skillId: 2204,
      cooldownMs: 54_000,
      skillCostType: 2,
      skillCost: 3_000,
      attackAnimationMs: 1_600,
      endCutAnimationMs: 1_300,
    });
  });

  it('casts without a target and applies BUFF 22042 only at the 850 ms contact', () => {
    const sim = makeSorcerer(22_041);
    const hpBefore = sim.player.hp;
    expect(castMir4Skill(sim.ctx, sim.playerId, 2204)).toEqual({ ok: true });
    expect(sim.player.gcdRemaining).toBe(0);
    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(0);
    expect(mir4AttackMultiplier(sim.player, 'magic')).toBe(1);
    expect(sim.player.hp).toBe(hpBefore);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 2204)
        .map((impact) => [
          impact.attackId,
          impact.nativeSetup ?? null,
          Math.round((impact.dueAt - sim.time) * 1_000),
          impact.targetId,
        ]),
    ).toEqual([[220402, 'phoenix-embrace-source-buff', 850, sim.playerId]]);

    sim.time = 0.849;
    updateMir4PendingImpacts(sim.ctx);
    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(0);
    resolvePhoenixBuff(sim);
    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(25);
    expect(sim.player.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_22042_22',
        nativeStatusId: 22,
        magnitude: 25,
        remaining: 60,
      }),
    );
    expect(mir4AttackMultiplier(sim.player, 'magic')).toBe(1);
  });

  it('buffs the caster and at most four nearby party members, never outsiders', () => {
    const sim = makeSorcerer(22_042);
    const members = Array.from({ length: 5 }, (_, index) =>
      addPartyMember(sim, `Phoenix Party ${index}`, 1 + index),
    );
    const outsiderId = sim.addPlayer('warrior', 'Phoenix Outsider');
    const outsider = movePlayer(sim, outsiderId, 1, 1);

    expect(castMir4Skill(sim.ctx, sim.playerId, 2204)).toEqual({ ok: true });
    resolvePhoenixBuff(sim);

    expect(mir4NativeStatusBonus(sim.player, 22)).toBe(25);
    expect(members.slice(0, 4).map((member) => mir4NativeStatusBonus(member, 22))).toEqual([
      25, 25, 25, 25,
    ]);
    expect(mir4NativeStatusBonus(members[4]!, 22)).toBe(0);
    expect(mir4NativeStatusBonus(outsider, 22)).toBe(0);
  });

  it('applies rank-5/8/10 self benefits while the 60-second Spell ATK buff remains party-wide', () => {
    for (const [rank, cooldownBps, potionBps, persistentBps] of [
      [5, 2_500, 0, 0],
      [8, 4_000, 2_000, 400],
      [10, 6_000, 3_000, 800],
    ] as const) {
      const sim = makeSorcerer(22_050 + rank, rank);
      const member = addPartyMember(sim, `Phoenix Rank ${rank}`, 2);
      expect(castMir4Skill(sim.ctx, sim.playerId, 2204)).toEqual({ ok: true });
      resolvePhoenixBuff(sim);

      expect(mir4NativeStatusBonus(sim.player, 95)).toBe(cooldownBps);
      expect(mir4NativeStatusBonus(sim.player, 147)).toBe(potionBps);
      expect(mir4NativeStatusBonus(member, 95)).toBe(0);
      expect(mir4NativeStatusBonus(member, 147)).toBe(0);
      expect(mir4NativePhoenixEmbracePersistentSkillDamageBonusBps(sim.ctx, sim.player)).toBe(
        persistentBps,
      );
      expect(
        mir4ModifiedPotionAmount(
          100,
          'mp',
          sim.player.mir4?.statusValues,
          mir4NativeStatusBonus(sim.player, 147),
        ),
      ).toBe(100 + potionBps / 100);
    }
  });

  it('uses the active rank-5 cooldown buff on the next skill, not retroactively on Phoenix', () => {
    const sim = makeSorcerer(22_045, 5);
    const target = spawnTarget(sim, 3);
    expect(castMir4Skill(sim.ctx, sim.playerId, 2204)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('2204')).toBe(54);
    resolvePhoenixBuff(sim);
    sim.time = 1.601;
    sim.tickCount = 33;
    const nextSkill = mir4SkillById(2101);
    if (!nextSkill) throw new Error('missing Flame Orb');
    expect(castMir4Skill(sim.ctx, sim.playerId, 2101, target.id)).toEqual({ ok: true });
    expect(sim.player.cooldowns.get('2101')).toBeCloseTo((nextSkill.cooldownMs / 1_000) * 0.75, 8);
  });

  it('feeds the flat Spell ATK and rank-8 passive into skill combat', () => {
    const baseline = makeSorcerer(22_046, 7);
    const empowered = makeSorcerer(22_046, 8);
    const baselineTarget = spawnTarget(baseline, 3);
    const empoweredTarget = spawnTarget(empowered, 3);

    expect(castMir4Skill(empowered.ctx, empowered.playerId, 2204)).toEqual({ ok: true });
    resolvePhoenixBuff(empowered);
    expect(mir4EffectiveSpellPower(empowered.player)).toBe(1_060);
    empowered.time = 1.601;
    empowered.tickCount = 33;

    expect(castMir4Skill(baseline.ctx, baseline.playerId, 2101, baselineTarget.id)).toEqual({
      ok: true,
    });
    expect(castMir4Skill(empowered.ctx, empowered.playerId, 2101, empoweredTarget.id)).toEqual({
      ok: true,
    });
    const baselineRaw = (baseline.player.mir4PendingImpacts ?? []).reduce(
      (sum, impact) => sum + impact.rawDamage,
      0,
    );
    const empoweredRaw = (empowered.player.mir4PendingImpacts ?? []).reduce(
      (sum, impact) => sum + impact.rawDamage,
      0,
    );
    expect(empoweredRaw).toBeGreaterThan(baselineRaw);

    for (const sim of [baseline, empowered]) {
      for (const impact of sim.player.mir4PendingImpacts ?? []) {
        impact.forceHit = true;
        impact.forceCritical = false;
      }
      sim.time = Math.max(...(sim.player.mir4PendingImpacts ?? []).map((impact) => impact.dueAt));
      updateMir4PendingImpacts(sim.ctx);
    }
    expect(empoweredTarget.hp).toBeLessThan(baselineTarget.hp);
  });

  it('raises actual MP-potion recovery by 20% at rank 8', () => {
    const sim = makeSorcerer(22_048, 8);
    expect(castMir4Skill(sim.ctx, sim.playerId, 2204)).toEqual({ ok: true });
    resolvePhoenixBuff(sim);
    sim.player.resource = 0;
    expect(mir4UsePotion(sim.ctx, sim.playerId, 'mp')).toBe(true);
    expect(sim.player.resource).toBe(144);
  });
});
