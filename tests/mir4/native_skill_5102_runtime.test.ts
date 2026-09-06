import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeDragonTailContact,
  applyMir4NativeDragonTailHitReaction,
  mir4NativeDragonTailMonsterDamageBasisPoints,
  mir4NativeDragonTailPersistentBossDamageReductionBps,
  mir4NativeDragonTailPolicy,
} from '../../src/sim/mir4/native_skill_dragon_tail';
import {
  applyMir4NativeKnockbackReaction,
  mir4NativeRuntimeKnockbackReaction,
} from '../../src/sim/mir4/native_skill_knockback';
import {
  mir4ModifiedPotionAmount,
  mir4ModifiedSkillHealing,
} from '../../src/sim/mir4/status_effects';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function setup() {
  const sim = new Sim({
    seed: 51_020,
    playerClass: 'warrior',
    playerClassMir4: 'lancer',
    playerName: 'Dragon Tail QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 2_500 });
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.attackPower = 1_000;
  sim.player.facing = 0;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: 'dragon_tail_target',
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
    120,
    sim.groundPos(sim.player.pos.x, sim.player.pos.z + 3),
  );
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return { sim, target };
}

describe('MIR4 Lancer 5102 Dragon Tail runtime', () => {
  it('schedules three contacts and advances exactly 6 yards during the opening sweep', () => {
    const { sim, target } = setup();
    const start = { ...sim.player.pos };
    sim.player.targetId = target.id;
    expect(castMir4Skill(sim.ctx, sim.playerId, 5102, target.id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? []).filter((impact) => impact.skillId === 5102),
    ).toHaveLength(3);
    expect(
      (sim.player.mir4PendingImpacts ?? [])
        .filter((impact) => impact.skillId === 5102)
        .map((impact) => Math.round((impact.dueAt - sim.time) * 1_000)),
    ).toEqual([400, 790, 890]);
    for (let tick = 0; tick < 36; tick += 1) sim.tick();
    expect(Math.hypot(sim.player.pos.x - start.x, sim.player.pos.z - start.z)).toBeCloseTo(6, 4);
  });

  it('projects every rank milestone without leaking the monster bonus into PvP', () => {
    expect(mir4NativeDragonTailPolicy(1)).toMatchObject({
      monsterSkillDamageBasisPoints: 3_000,
      persistentBossDamageReductionBasisPoints: 0,
      recoveryDebuff: null,
      manaPotionDebuff: null,
      darknessDurationMs: 0,
    });
    expect(mir4NativeDragonTailPolicy(5)).toMatchObject({
      monsterSkillDamageBasisPoints: 5_000,
      persistentBossDamageReductionBasisPoints: 500,
      recoveryDebuff: { magnitudeBasisPoints: -1_000, durationMs: 10_000 },
      manaPotionDebuff: null,
    });
    expect(mir4NativeDragonTailPolicy(8)).toMatchObject({
      monsterSkillDamageBasisPoints: 7_000,
      persistentBossDamageReductionBasisPoints: 1_000,
      recoveryDebuff: { magnitudeBasisPoints: -2_000, durationMs: 15_000 },
      manaPotionDebuff: { magnitudeBasisPoints: -3_000, durationMs: 15_000 },
      darknessDurationMs: 10_000,
    });
    expect(mir4NativeDragonTailPolicy(10)).toMatchObject({
      monsterSkillDamageBasisPoints: 10_000,
      persistentBossDamageReductionBasisPoints: 1_500,
      recoveryDebuff: { magnitudeBasisPoints: -3_000, durationMs: 20_000 },
      manaPotionDebuff: { magnitudeBasisPoints: -3_000, durationMs: 30_000 },
      darknessDurationMs: 10_000,
    });

    const { sim, target } = setup();
    expect(mir4NativeDragonTailMonsterDamageBasisPoints(target, 10)).toBe(20_000);
    expect(mir4NativeDragonTailMonsterDamageBasisPoints(sim.player, 10)).toBe(10_000);
  });

  it('applies Darkness and both recovery penalties on the first damaging contact', () => {
    const { sim, target } = setup();
    expect(applyMir4NativeDragonTailContact(sim.ctx, sim.player, target, 510202, 0, 10)).toEqual({
      applied: true,
      darknessStacks: 1,
      recoveryReduced: true,
      manaPotionRecoveryReduced: true,
    });
    expect(mir4NativeStatusBonus(target, 53)).toBe(-250);
    expect(mir4NativeStatusBonus(target, 148)).toBe(-3_000);
    expect(mir4NativeStatusBonus(target, 147)).toBe(-3_000);
    expect(mir4ModifiedSkillHealing(1_000, undefined, mir4NativeStatusBonus(target, 148))).toBe(
      700,
    );
    expect(
      mir4ModifiedPotionAmount(1_000, 'mp', undefined, mir4NativeStatusBonus(target, 147)),
    ).toBe(700);
  });

  it('honors the native 10% chance for knockback and final flinch', () => {
    const failed = setup();
    const firstReaction = mir4NativeRuntimeKnockbackReaction(5102, 510202);
    if (!firstReaction) throw new Error('missing Dragon Tail knockback');
    const failedPosition = { ...failed.target.pos };
    expect(
      applyMir4NativeKnockbackReaction(
        failed.sim.ctx,
        failed.sim.player,
        failed.target,
        5102,
        510202,
        0,
        firstReaction,
        () => 1_000,
      ),
    ).toBe(false);
    expect(failed.target.pos).toEqual(failedPosition);
    expect(
      applyMir4NativeDragonTailHitReaction(
        failed.sim.ctx,
        failed.sim.player,
        failed.target,
        510204,
        0,
        () => 1_000,
      ),
    ).toBe(false);

    const landed = setup();
    const before = Math.hypot(
      landed.target.pos.x - landed.sim.player.pos.x,
      landed.target.pos.z - landed.sim.player.pos.z,
    );
    expect(
      applyMir4NativeKnockbackReaction(
        landed.sim.ctx,
        landed.sim.player,
        landed.target,
        5102,
        510202,
        0,
        firstReaction,
        () => 999,
      ),
    ).toBe(true);
    expect(
      Math.hypot(
        landed.target.pos.x - landed.sim.player.pos.x,
        landed.target.pos.z - landed.sim.player.pos.z,
      ),
    ).toBeGreaterThan(before);

    const flinch = setup();
    expect(
      applyMir4NativeDragonTailHitReaction(
        flinch.sim.ctx,
        flinch.sim.player,
        flinch.target,
        510204,
        0,
        () => 999,
      ),
    ).toBe(true);
    expect(flinch.sim.drainEvents()).toContainEqual(
      expect.objectContaining({
        type: 'mir4HitReaction',
        skillId: 5102,
        attackId: 510204,
        durationMs: 300,
      }),
    );
  });

  it('reads the learned rank for the persistent Boss Damage Reduction bonus', () => {
    const { sim } = setup();
    const meta = sim.ctx.players.get(sim.playerId);
    if (!meta) throw new Error('missing player metadata');
    meta.mir4SkillLevels = { ...(meta.mir4SkillLevels ?? {}), 5102: 10 };
    expect(mir4NativeDragonTailPersistentBossDamageReductionBps(sim.ctx, sim.player)).toBe(1_500);
  });
});
