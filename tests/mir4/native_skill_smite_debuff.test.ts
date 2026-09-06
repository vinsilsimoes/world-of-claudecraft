import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4/native_skill_actions';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { DUNGEON_X_THRESHOLD, setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { mir4MobAttackPlayer } from '../../src/sim/mir4/combat';
import { mir4AttackMultiplier } from '../../src/sim/mir4/effects';
import {
  applyMir4NativeSkillSmiteDebuff,
  compileMir4NativeSkillSmiteDebuff,
  MIR4_NATIVE_1104_SMITE_EVIDENCE,
  MIR4_NATIVE_1401_SMITE_EVIDENCE,
  mir4NativeRuntimeSmiteDebuff,
} from '../../src/sim/mir4/native_skill_smite_debuff';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';

function makeSim(seed = 11_040): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Native Smite Debuff Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  for (const entity of sim.entities.values()) {
    if (entity.kind === 'mob') entity.dead = true;
  }
  placePlayerInOpenField(sim, sim.playerId, { x: DUNGEON_X_THRESHOLD + 100, z: 1_000 });
  if (!sim.player.mir4) throw new Error('MIR4 player state is missing');
  sim.player.level = 20;
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz = 0, id = 'native_1104_daze_target'): Entity {
  const player = sim.player;
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id,
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
    sim.groundPos(player.pos.x + dx, player.pos.z + dz),
  );
  target.pos.y = player.pos.y;
  target.prevPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.moveSpeed = 0;
  target.swingTimer = Number.POSITIVE_INFINITY;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function tickMany(sim: Sim, count: number): void {
  for (let tick = 0; tick < count; tick += 1) sim.tick();
}

function dazeEffects(target: Entity) {
  return (target.mir4Effects?.active ?? []).filter(
    (effect) => effect.kind === 'physical-attack-reduction',
  );
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 1104 native Smite debuff evidence', () => {
  it('compiles the exact auto-learned passive and rank-1 BUFF into Daze', () => {
    const action = mir4NativeSkillActionById(1104);
    if (!action) throw new Error('Missing native 1104 action');

    expect(compileMir4NativeSkillSmiteDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 1104,
        contactAttackId: 110402,
        passiveId: 101001,
        buffId: 10010,
        effectId: 'mir4_native_buff_10010',
        kind: 'physical-attack-reduction',
        durationMs: 5_000,
        magnitude: 0.25,
        probabilityBasisPoints: 10_000,
      },
    });
    expect(MIR4_NATIVE_1104_SMITE_EVIDENCE.externalEligibilityOnlyPassiveIds).toEqual([706005]);
  });

  it('rejects a changed skill tuple instead of generalizing Smite semantics', () => {
    const action = mir4NativeSkillActionById(1104);
    if (!action) throw new Error('Missing native 1104 action');
    const changed = {
      ...action,
      nativeBehavior: {
        ...action.nativeBehavior,
        smiteBuffIds: [10011],
      },
    };

    const result = compileMir4NativeSkillSmiteDebuff(changed, 1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: 'source-mismatch',
      path: 'action.nativeBehavior.smiteBuffIds',
    });
  });

  it('admits only the exact damaging contact and keeps 706005 dormant', () => {
    expect(mir4NativeRuntimeSmiteDebuff(1104, 110401, 1)).toBeNull();
    expect(mir4NativeRuntimeSmiteDebuff(1104, 110402, 1)).toMatchObject({
      buffId: 10010,
      passiveId: 101001,
    });
    expect(mir4NativeRuntimeSmiteDebuff(1104, 706005, 1)).toBeNull();
    expect(mir4NativeRuntimeSmiteDebuff(1102, 110402, 1)).toBeNull();
  });
});

describe('MIR4 1401 native Smite debuff evidence', () => {
  it('compiles the exact group-104 Ground Smash chain into the same Daze buff', () => {
    const action = mir4NativeSkillActionById(1401);
    if (!action) throw new Error('Missing native 1401 action');
    expect(MIR4_NATIVE_1401_SMITE_EVIDENCE.skillCostRows).toHaveLength(10);
    expect(compileMir4NativeSkillSmiteDebuff(action, 1)).toEqual({
      ok: true,
      debuff: {
        skillId: 1401,
        contactAttackId: 140102,
        passiveId: 101001,
        buffId: 10010,
        effectId: 'mir4_native_buff_10010',
        kind: 'physical-attack-reduction',
        durationMs: 5_000,
        magnitude: 0.25,
        probabilityBasisPoints: 10_000,
      },
    });
    expect(mir4NativeRuntimeSmiteDebuff(1401, 140101, 1)).toBeNull();
    expect(mir4NativeRuntimeSmiteDebuff(1401, 140102, 1)).toMatchObject({
      skillId: 1401,
      buffId: 10010,
    });
  });
});

describe('MIR4 1104 native Smite debuff runtime', () => {
  it('lands at the 490ms contact on every hit target, never during windup', () => {
    const sim = makeSim();
    const primary = spawnTarget(sim, 5);
    const secondary = spawnTarget(sim, 7, 2, 'native_1104_daze_secondary');
    sim.player.targetId = primary.id;

    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 9);
    expect(dazeEffects(primary)).toHaveLength(0);
    expect(dazeEffects(secondary)).toHaveLength(0);

    tickMany(sim, 1);
    for (const target of [primary, secondary]) {
      expect(dazeEffects(target)).toEqual([
        expect.objectContaining({
          effectId: 'mir4_native_buff_10010',
          duration: 5,
          remaining: 5,
          magnitude: 0.25,
          sourceId: sim.playerId,
        }),
      ]);
    }
  });

  it('does not apply Daze when the authored damage contact misses', () => {
    const sim = makeSim(11_041);
    const target = spawnTarget(sim, 5);
    target.mir4 = {
      ...sim.player.mir4!,
      statusValues: Object.freeze({}),
      dodge: 10_000,
      avoidCritical: 0,
      physicalDefense: 0,
      magicDefense: 0,
      penetrationDefenseBps: 0,
      pvpDamageReductionBps: 0,
      monsterDamageReductionBps: 0,
      bossDamageReductionBps: 0,
      allDamageReductionBps: 0,
      skillDamageReductionBps: 0,
    };
    sim.player.targetId = target.id;

    sim.castAbility(mir4ActionId(1104));
    const damagingImpact = (sim.player.mir4PendingImpacts ?? []).find(
      (impact) => impact.skillId === 1104 && impact.attackId === 110402 && !impact.effectOnly,
    );
    if (!damagingImpact) throw new Error('Missing 1104 damaging impact');
    damagingImpact.forceHit = false;
    tickMany(sim, 10);

    expect(dazeEffects(target)).toHaveLength(0);
  });

  it('refreshes the same native BuffId without stacking duplicate reductions', () => {
    const sim = makeSim(11_042);
    const target = spawnTarget(sim, 5);
    sim.player.targetId = target.id;

    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 10);
    tickMany(sim, 20);
    const beforeRefresh = dazeEffects(target)[0];
    expect(beforeRefresh?.remaining).toBeCloseTo(4, 8);

    sim.player.cooldowns.delete('1104');
    sim.player.gcdRemaining = 0;
    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 10);

    expect(dazeEffects(target)).toHaveLength(1);
    expect(dazeEffects(target)[0]?.remaining).toBe(5);
  });

  it('reduces only physical output while blind and damage boosts remain channel-neutral', () => {
    const sim = makeSim(11_043);
    const target = spawnTarget(sim, 5);
    sim.player.targetId = target.id;
    sim.castAbility(mir4ActionId(1104));
    tickMany(sim, 10);

    expect(mir4AttackMultiplier(target, 'physical')).toBeCloseTo(0.75, 10);
    expect(mir4AttackMultiplier(target, 'magic')).toBe(1);
  });

  it('reduces the live mob physical attack by 25% without relying on the multiplier helper', () => {
    const baseline = makeSim(11_044);
    const dazed = makeSim(11_044);
    const baselineMob = spawnTarget(baseline, 5, 0, 'native_1104_baseline_attacker');
    const dazedMob = spawnTarget(dazed, 5, 0, 'native_1104_dazed_attacker');

    for (const [sim, mob] of [
      [baseline, baselineMob],
      [dazed, dazedMob],
    ] as const) {
      const template = sim.mir4RuntimeMobTemplates.get(mob.templateId);
      if (!template) throw new Error('Missing native 1104 attacker template');
      sim.mir4RuntimeMobTemplates.set(template.id, {
        ...template,
        dmgBase: 1_000,
        dmgPerLevel: 0,
      });
    }

    const spec = mir4NativeRuntimeSmiteDebuff(1104, 110402, 1);
    if (!spec) throw new Error('Missing native 1104 Daze spec');
    expect(applyMir4NativeSkillSmiteDebuff(dazed.ctx, dazed.player, dazedMob, spec)).toBe(true);

    const baselineHp = baseline.player.hp;
    const dazedHp = dazed.player.hp;
    mir4MobAttackPlayer(baseline.ctx, baselineMob, baseline.player);
    mir4MobAttackPlayer(dazed.ctx, dazedMob, dazed.player);

    const baselineLoss = baselineHp - baseline.player.hp;
    const dazedLoss = dazedHp - dazed.player.hp;
    expect(baselineLoss).toBeGreaterThan(0);
    expect(dazedLoss).toBeGreaterThan(0);
    expect(dazedLoss).toBeLessThan(baselineLoss);
    expect(dazedLoss / baselineLoss).toBeCloseTo(0.75, 2);
  });
});

describe('MIR4 1401 native Smite debuff runtime', () => {
  it('lands Daze only with the 610ms Ground Smash damage contact', () => {
    const sim = makeSim(14_011);
    const target = spawnTarget(sim, 6.5, 0, 'native_1401_daze_target');
    sim.player.targetId = target.id;

    expect(sim.mir4CastSkill(1401, target.id)).toEqual({ ok: true });
    tickMany(sim, 12);
    expect(dazeEffects(target)).toHaveLength(0);

    tickMany(sim, 1);
    expect(dazeEffects(target)).toEqual([
      expect.objectContaining({
        effectId: 'mir4_native_buff_10010',
        duration: 5,
        remaining: 5,
        magnitude: 0.25,
        sourceId: sim.playerId,
      }),
    ]);
  });
});
