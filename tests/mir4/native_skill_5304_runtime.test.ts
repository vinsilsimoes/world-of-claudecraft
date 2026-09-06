import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { applyMir4Effect, mir4DamageTakenAddend, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { applyMir4NativeDarknessStack } from '../../src/sim/mir4/native_darkness';
import {
  applyMir4NativeAbsorptionCharacterKill,
  applyMir4NativeAbsorptionContact,
  mir4NativeAbsorptionPolicy,
  mir4NativeAbsorptionShieldBlocked,
  mir4NativeAbsorptionSourceMatches,
} from '../../src/sim/mir4/native_skill_absorption';
import { applyMir4NativeWindWallPartyBuffs } from '../../src/sim/mir4/native_skill_wind_wall';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeLancer(): Sim {
  const sim = new Sim({
    seed: 53_040,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Absorption Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.attackPower = 1_000;
  sim.player.spellPower = 1_000;
  sim.player.maxHp = 10_000;
  sim.player.hp = 1_000;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'absorption_target',
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
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + 5),
  );
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Lancer 5304 Absorption runtime', () => {
  it('compiles the exact rank milestones from the native action and passive rows', () => {
    expect(mir4NativeAbsorptionSourceMatches()).toBe(true);
    expect([1, 5, 8, 10].map((rank) => mir4NativeAbsorptionPolicy(rank))).toEqual([
      expect.objectContaining({
        skillLevel: 1,
        damageRecoveryBasisPoints: 10_000,
        selfChillDurationMs: 5_000,
        damageAmplificationBasisPoints: 0,
        shieldBlockDurationMs: 0,
        magicShieldDispelChanceBasisPoints: 0,
        cloakingDispelChanceBasisPoints: 0,
        darknessPoisonChanceBasisPoints: [0, 0, 0],
        characterKillRecoveryBasisPoints: 0,
      }),
      expect.objectContaining({
        skillLevel: 5,
        damageRecoveryBasisPoints: 25_000,
        selfChillDurationMs: 10_000,
        damageAmplificationBasisPoints: 2_500,
      }),
      expect.objectContaining({
        skillLevel: 8,
        damageRecoveryBasisPoints: 50_000,
        selfChillDurationMs: 15_000,
        damageAmplificationBasisPoints: 5_000,
        shieldBlockDurationMs: 30_000,
        magicShieldDispelChanceBasisPoints: 7_000,
        cloakingDispelChanceBasisPoints: 7_000,
        characterKillRecoveryBasisPoints: 1_000,
      }),
      expect.objectContaining({
        skillLevel: 10,
        damageRecoveryBasisPoints: 80_000,
        selfChillDurationMs: 30_000,
        damageAmplificationBasisPoints: 7_500,
        magicShieldDispelChanceBasisPoints: 10_000,
        cloakingDispelChanceBasisPoints: 10_000,
        darknessPoisonChanceBasisPoints: [7_000, 8_500, 10_000],
        characterKillRecoveryBasisPoints: 3_000,
      }),
    ]);
  });

  it('waits for the native 950ms contact and heals from integrated landed damage', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim);
    sim.player.targetId = target.id;
    const healthBefore = sim.player.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 5304, target.id)).toEqual({ ok: true });
    expect(sim.player.hp).toBe(healthBefore);
    const impact = sim.player.mir4PendingImpacts?.find(
      (candidate) => candidate.skillId === 5304 && candidate.attackId === 530401,
    );
    expect(impact).toMatchObject({ sourceImpactIndex: 0 });
    if (!impact) throw new Error('missing Absorption contact');
    impact.forceHit = true;
    impact.forceCritical = false;

    sim.time = impact.dueAt;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(sim.player.hp).toBeGreaterThan(healthBefore);
  });

  it('heals from landed damage, chills the caster only against a Chilled target, and amplifies later damage', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim);
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'mir4_native_buff_20020',
        kind: 'native-status-boost',
        durationSeconds: 20,
        magnitude: -25,
        nativeStatusId: 45,
        name: 'Chill',
        sourceId: sim.player.id,
      }),
    ).toEqual({ ok: true });

    const result = applyMir4NativeAbsorptionContact(
      sim.ctx,
      sim.player,
      target,
      530401,
      0,
      5,
      400,
      () => 9_999,
    );

    expect(result).toMatchObject({ applied: true, healing: 1_000, selfChilled: true });
    expect(sim.player.hp).toBe(2_000);
    expect(mir4NativeStatusBonus(sim.player, 45)).toBe(-25);
    expect(mir4DamageTakenAddend(target)).toBe(0.25);
  });

  it('removes Shield, blocks its reapplication, and independently dispels Magic Shield and Cloaking', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim);
    target.mir4Shield = {
      remaining: 25,
      damageReductionBasisPoints: 3_000,
      bashDamageReductionBasisPoints: 0,
      absorptionRemaining: 1_000,
      hitsRemaining: 5,
    };
    expect(
      applyMir4Effect(sim.ctx, target, {
        effectId: 'mir4_native_buff_50010_47',
        kind: 'native-status-boost',
        durationSeconds: 8,
        magnitude: 7_000,
        nativeStatusId: 47,
        name: 'Shield',
        sourceId: sim.player.id,
      }),
    ).toEqual({ ok: true });
    target.auras.push({
      id: 'mir4_native_buff_40108',
      name: 'Cloaking',
      kind: 'stealth',
      remaining: 12,
      duration: 12,
      value: 8,
      sourceId: target.id,
      school: 'physical',
    });
    target.stealthed = true;

    const result = applyMir4NativeAbsorptionContact(
      sim.ctx,
      sim.player,
      target,
      530401,
      0,
      8,
      100,
      () => 0,
    );

    expect(result).toMatchObject({
      shieldRemoved: true,
      shieldBlocked: true,
      magicShieldDispelled: true,
      cloakingDispelled: true,
    });
    expect(target.mir4Shield).toBeUndefined();
    expect(target.stealthed).toBe(false);
    expect(mir4NativeAbsorptionShieldBlocked(target)).toBe(true);
    expect(applyMir4NativeWindWallPartyBuffs(sim.ctx, sim.player, target, 10)).toBe(true);
    expect(
      target.mir4Effects?.active.some((effect) => effect.effectId === 'mir4_native_buff_50010_47'),
    ).toBe(false);
  });

  it('uses Darkness stacks for the rank-10 poison chance and snapshots 20% Spell ATK', () => {
    const sim = makeLancer();
    const target = spawnTarget(sim);
    for (let stack = 0; stack < 2; stack += 1) {
      applyMir4NativeDarknessStack(sim.ctx, sim.player, target, 20_000, 'Darkness');
    }

    const result = applyMir4NativeAbsorptionContact(
      sim.ctx,
      sim.player,
      target,
      530401,
      0,
      10,
      100,
      () => 8_499,
    );

    expect(result.poisonApplied).toBe(true);
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        effectId: 'mir4_native_buff_50516',
        kind: 'burn',
        duration: 5,
        ticksRemaining: 5,
        periodicRawDamage: 200,
      }),
    );
  });

  it('restores HP on character kills at ranks 8 and 10 with the native 30-second cooldown', () => {
    const sim = makeLancer();
    const victim = spawnTarget(sim);
    victim.kind = 'player';
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4SkillLevels ??= {};
    meta.mir4SkillLevels[5304] = 8;

    expect(applyMir4NativeAbsorptionCharacterKill(sim.ctx, sim.player, victim)).toBe(1_000);
    expect(sim.player.hp).toBe(2_000);
    expect(applyMir4NativeAbsorptionCharacterKill(sim.ctx, sim.player, victim)).toBe(0);
    sim.time += 30;
    meta.mir4SkillLevels[5304] = 10;
    expect(applyMir4NativeAbsorptionCharacterKill(sim.ctx, sim.player, victim)).toBe(3_000);
    expect(sim.player.hp).toBe(5_000);
  });
});
