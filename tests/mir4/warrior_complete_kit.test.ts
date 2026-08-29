import { describe, expect, it } from 'vitest';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill } from '../../src/sim/mir4/combat';
import {
  mir4AttackMultiplier,
  mir4DefenseMultiplier,
  mir4DodgeBonus,
} from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import { dist2d, type Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeWarrior(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'WarriorTester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.player.level = 120;
  sim.player.resource = sim.player.maxResource;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `warrior_kit_${suffix}`,
    hpBase: 50_000,
    hpPerLevel: 0,
    moveSpeed: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z + dz),
  );
  target.wanderTimer = 999_999;
  sim.addEntity(target);
  return target;
}

describe('the complete MIR4 Warrior kit', () => {
  it('contains the twelve official regular skills in Aeldrune unlock order', () => {
    expect(
      mir4SkillsForClass(1).map((skill) => [skill.slot, skill.skillId, skill.displayName]),
    ).toEqual([
      [1, 1102, 'Corte do Vazio'],
      [2, 1302, 'Rugido de Leão'],
      [3, 1301, 'Riposta'],
      [4, 1101, 'Fúria'],
      [5, 1103, 'Investida Bárbara'],
      [6, 1104, 'Corte Divisor'],
      [7, 1501, 'Corte Vendaval'],
      [8, 1201, 'Grilhão de Ferro'],
      [9, 1601, 'Golpe Crescente'],
      [10, 1304, 'Choque Corporal'],
      [11, 1401, 'Esmagamento Terrestre'],
      [12, 1502, 'Postura Inquebrável'],
    ]);
  });

  it('surfaces every action with its official English name, unlock and live tooltip', () => {
    const actions = mir4ActionAbilities(1, 120, { 1301: 10 }, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );

    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110,
    ]);
    expect(actions.find((ability) => ability.def.id === mir4ActionId(1103))?.def).toMatchObject({
      name: 'Barbaric Charge',
      range: 20,
      requiresTarget: true,
    });
    expect(
      actions.find((ability) => ability.def.id === mir4ActionId(1301))?.def.description,
    ).toContain('At rank 8, restores 10% of your maximum health; at rank 10, restores 20%.');
    expect(actions.find((ability) => ability.def.id === mir4ActionId(1502))?.def).toMatchObject({
      name: 'Unbreakable Stance',
      requiresTarget: false,
    });
  });

  it('charges to the target, damages the group, pulls it in and knocks it down', () => {
    const sim = makeWarrior(13_001);
    const primary = spawnTarget(sim, 10, 0, 'charge_primary');
    const secondary = spawnTarget(sim, 11, 1, 'charge_secondary');
    const secondaryDistanceBefore = dist2d(sim.player.pos, secondary.pos);

    expect(castMir4Skill(sim.ctx, sim.playerId, 1103, primary.id)).toEqual({ ok: true });

    expect(dist2d(sim.player.pos, primary.pos)).toBeLessThanOrEqual(1.7);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(secondary.hp).toBeLessThan(secondary.maxHp);
    expect(dist2d(sim.player.pos, secondary.pos)).toBeLessThan(secondaryDistanceBefore);
    expect(primary.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(true);
  });

  it('applies the live Rampant damage boost to its caster', () => {
    const sim = makeWarrior(13_002);
    const target = spawnTarget(sim, 3, 0, 'rampant');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, target.id)).toEqual({ ok: true });
    expect(mir4AttackMultiplier(sim.player)).toBeCloseTo(1.12, 8);
  });

  it('heals twenty percent at rank ten and grants Riposte defense', () => {
    const sim = makeWarrior(13_003);
    const target = spawnTarget(sim, 3, 0, 'riposte');
    sim.player.hp = Math.floor(sim.player.maxHp / 2);
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');
    meta.mir4SkillLevels = { 1301: 10 };
    const hpBefore = sim.player.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, target.id)).toEqual({ ok: true });
    expect(sim.player.hp - hpBefore).toBe(Math.floor(sim.player.maxHp * 0.2));
    expect(mir4DefenseMultiplier(sim.player)).toBeCloseTo(1.24, 8);
  });

  it('damages nearby enemies and grants 60 dodge with Unbreakable Stance', () => {
    const sim = makeWarrior(13_004);
    const target = spawnTarget(sim, 3, 0, 'stance');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1502)).toEqual({ ok: true });
    expect(target.hp).toBeLessThan(target.maxHp);
    expect(mir4DodgeBonus(sim.player)).toBe(60);
  });
});
