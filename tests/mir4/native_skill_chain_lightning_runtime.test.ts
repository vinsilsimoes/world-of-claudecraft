import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import {
  mir4NativeChainLightningPolicy,
  mir4NativeChainLightningTargets,
} from '../../src/sim/mir4/native_skill_chain_lightning';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed = 23_030): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Chain Lightning Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.player.resource = sim.player.maxResource;
  sim.player.spellPower = 10_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `chain_lightning_target_${suffix}`,
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
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

describe('MIR4 Sorcerer 2303 Chain Lightning runtime', () => {
  it('seals the native timings, geometry and diminishing seven-contact plan', () => {
    expect(mir4NativeChainLightningPolicy(2303)).toMatchObject({
      skillId: 2303,
      attackId: 230301,
      maxTargets: 7,
      jumpRadiusYards: 11,
      targetHeightYards: 8,
      impactOffsetsMs: [979, 1110, 1250, 1390, 1530, 1670, 1800],
      contactCoefficientScaleBasisPoints: [
        20_000, 18_750, 17_500, 16_250, 15_000, 13_750, 12_500,
      ],
    });
    expect(
      mir4RuntimeSkillExecutionPlan(2303)?.rows[0]?.contacts.map((contact) => [
        contact.offsetMs,
        contact.damage.coefficient,
        contact.damage.levelUpCoefficient,
      ]),
    ).toEqual([
      [979, 35_200, 600],
      [1110, 33_000, 562],
      [1250, 30_800, 525],
      [1390, 28_600, 487],
      [1530, 26_400, 450],
      [1670, 24_200, 412],
      [1800, 22_000, 375],
    ]);
  });

  it('walks nearest unvisited hostiles from the selected target and stops at seven', () => {
    const sim = makeSorcerer();
    const targets = Array.from({ length: 8 }, (_, index) =>
      spawnTarget(sim, 3 + index * 9, String(index)),
    );
    expect(
      mir4NativeChainLightningTargets(sim.ctx, sim.player, 2303, targets[0])?.map(
        (target) => target.id,
      ),
    ).toEqual(targets.slice(0, 7).map((target) => target.id));
  });

  it('schedules one diminishing contact per acquired target at native timestamps', () => {
    const sim = makeSorcerer(23_031);
    const targets = Array.from({ length: 7 }, (_, index) =>
      spawnTarget(sim, 3 + index * 9, String(index)),
    );
    expect(castMir4Skill(sim.ctx, sim.playerId, 2303, targets[0].id)).toEqual({ ok: true });
    expect(
      (sim.player.mir4PendingImpacts ?? []).map((impact) => [
        impact.targetId,
        Math.round((impact.dueAt - sim.time) * 1_000),
        impact.rawDamage,
        impact.actionGroupId,
      ]),
    ).toEqual(
      targets.map((target, index) => [
        target.id,
        [979, 1110, 1250, 1390, 1530, 1670, 1800][index],
        [35_200, 33_000, 30_800, 28_600, 26_400, 24_200, 22_000][index],
        `${sim.playerId}:skill:2303:0`,
      ]),
    );
  });

  it('does not repeat the primary when no second target can receive a jump', () => {
    const sim = makeSorcerer(23_032);
    const primary = spawnTarget(sim, 3, 'isolated');
    spawnTarget(sim, 15, 'outside-hop');
    expect(castMir4Skill(sim.ctx, sim.playerId, 2303, primary.id)).toEqual({ ok: true });
    const contacts = sim.player.mir4PendingImpacts ?? [];
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ targetId: primary.id, rawDamage: 35_200 });
  });

  it('applies the rank-1 50% Bash bonus only when the target is Chilled', () => {
    const sim = makeSorcerer(23_033);
    const target = spawnTarget(sim, 3, 'chilled');
    target.mir4Effects = {
      active: [
        {
          effectId: 'mir4_native_buff_20020',
          kind: 'native-status-boost',
          remaining: 10,
          duration: 10,
          magnitude: -25,
          nativeStatusId: 45,
          sourceId: sim.playerId,
          name: 'Chill',
        },
      ],
      controlImmuneUntil: 0,
    };
    expect(castMir4Skill(sim.ctx, sim.playerId, 2303, target.id)).toEqual({ ok: true });
    const impact = sim.player.mir4PendingImpacts?.[0];
    if (!impact) throw new Error('missing Chain Lightning impact');
    impact.forceHit = true;
    impact.forceCritical = false;
    sim.time = impact.dueAt;
    const hpBefore = target.hp;
    updateMir4PendingImpacts(sim.ctx);
    expect(hpBefore - target.hp).toBeGreaterThan(impact.rawDamage);
  });
});
