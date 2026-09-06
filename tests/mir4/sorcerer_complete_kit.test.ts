import { describe, expect, it } from 'vitest';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4AttackMultiplier, mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4FrozenBlockActive } from '../../src/sim/mir4/native_skill_frozen_block_state';
import { Sim } from '../../src/sim/sim';
import { dist2d, type Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'SorcererTester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.player.level = 120;
  sim.player.maxResource = 100_000;
  sim.player.resource = sim.player.maxResource;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, dz: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `sorcerer_kit_${suffix}`,
    hpBase: 80_000,
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

function resolveSkill(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.effectOnly) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
  sim.time += 5;
  updateMir4PendingImpacts(sim.ctx);
}

describe('the complete MIR4 Sorcerer kit', () => {
  it('contains the twelve official regular skills in Aeldrune unlock order', () => {
    expect(
      mir4SkillsForClass(2).map((skill) => [skill.slot, skill.skillId, skill.displayName]),
    ).toEqual([
      [1, 2101, 'Esfera Flamejante'],
      [2, 2111, 'Esfera Gelada'],
      [3, 2501, 'Vórtice das Trevas'],
      [4, 2301, 'Tempestade de Relâmpagos'],
      [5, 2503, 'Escudo Mágico'],
      [6, 2203, 'Nevão'],
      [7, 2303, 'Cadeia de Relâmpagos'],
      [8, 2201, 'Coluna de Chamas'],
      [9, 2502, 'Devoração da Alma'],
      [10, 2103, 'Imolar'],
      [11, 2204, 'Abraço da Fênix'],
      [12, 2202, 'Bloqueio de Gelo'],
    ]);
  });

  it('surfaces every action with its official English name and unlock level', () => {
    const actions = mir4ActionAbilities(2, 120, undefined, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );

    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
    ]);
    expect(actions.find((ability) => ability.def.id === mir4ActionId(2303))?.def.name).toBe(
      'Chain Lightning',
    );
    expect(actions.find((ability) => ability.def.id === mir4ActionId(2204))?.def).toMatchObject({
      name: 'Phoenix Embrace',
      requiresTarget: false,
    });
    expect(actions.find((ability) => ability.def.id === mir4ActionId(2202))?.def).toMatchObject({
      name: 'Frozen Block',
      requiresTarget: false,
    });
  });

  it('keeps Flame Orb on its selected target without invented splash or Burn', () => {
    const sim = makeSorcerer(14_001);
    const primary = spawnTarget(sim, 5, 0, 'flame_primary');
    const secondary = spawnTarget(sim, 6, 1, 'flame_secondary');

    expect(castMir4Skill(sim.ctx, sim.playerId, 2101, primary.id)).toEqual({
      ok: true,
    });
    resolveSkill(sim);

    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(secondary.hp).toBe(secondary.maxHp);
    expect(primary.mir4Effects?.active.some((effect) => effect.kind === 'burn') ?? false).toBe(false);
    expect(secondary.mir4Effects?.active.some((effect) => effect.kind === 'burn') ?? false).toBe(false);
  });

  it('keeps Frost Orb free of invented Slow and chains lightning through a group', () => {
    const frost = makeSorcerer(14_002);
    const frostTarget = spawnTarget(frost, 5, 0, 'frost');
    expect(castMir4Skill(frost.ctx, frost.playerId, 2111, frostTarget.id)).toEqual({ ok: true });
    resolveSkill(frost);
    expect(frostTarget.hp).toBeLessThan(frostTarget.maxHp);
    expect(frostTarget.mir4Effects?.active.some((effect) => effect.kind === 'slow')).toBe(false);

    const lightning = makeSorcerer(14_003);
    const primary = spawnTarget(lightning, 5, 0, 'chain_primary');
    const secondary = spawnTarget(lightning, 6, 1, 'chain_secondary');
    expect(castMir4Skill(lightning.ctx, lightning.playerId, 2303, primary.id)).toEqual({
      ok: true,
    });
    resolveSkill(lightning);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(secondary.hp).toBeLessThan(secondary.maxHp);
  });

  it('anchors Dark Vortex at the cast target and gives Flame Strike only its native hit reaction', () => {
    const vortex = makeSorcerer(14_004);
    const vortexTarget = spawnTarget(vortex, 7, 0, 'vortex');
    expect(castMir4Skill(vortex.ctx, vortex.playerId, 2501, vortexTarget.id)).toEqual({ ok: true });
    resolveSkill(vortex);
    expect(vortexTarget.hp).toBeLessThan(vortexTarget.maxHp);
    expect(vortexTarget.mir4Effects?.active.some((effect) => effect.kind === 'root')).toBe(false);

    const flameStrike = makeSorcerer(14_005);
    const flameTarget = spawnTarget(flameStrike, 3, 0, 'flame_strike');
    const distanceBeforePush = dist2d(flameStrike.player.pos, flameTarget.pos);
    expect(castMir4Skill(flameStrike.ctx, flameStrike.playerId, 2201)).toEqual({
      ok: true,
    });
    resolveSkill(flameStrike);
    expect(dist2d(flameStrike.player.pos, flameTarget.pos)).toBe(distanceBeforePush);
    expect(flameTarget.mir4Effects?.active.some((effect) => effect.kind === 'hit-react')).toBe(true);
  });

  it('buffs spell damage with Phoenix Embrace and protects with Frozen Block', () => {
    const phoenix = makeSorcerer(14_006);
    expect(castMir4Skill(phoenix.ctx, phoenix.playerId, 2204)).toEqual({
      ok: true,
    });
    expect(mir4NativeStatusBonus(phoenix.player, 22)).toBe(0);
    phoenix.time = 0.85;
    updateMir4PendingImpacts(phoenix.ctx);
    expect(mir4NativeStatusBonus(phoenix.player, 22)).toBe(25);
    expect(mir4AttackMultiplier(phoenix.player)).toBe(1);

    const frozen = makeSorcerer(14_007);
    const attacker = spawnTarget(frozen, 3, 0, 'frozen_block');
    expect(castMir4Skill(frozen.ctx, frozen.playerId, 2202)).toEqual({
      ok: true,
    });
    frozen.time = 0.02;
    updateMir4PendingImpacts(frozen.ctx);
    expect(mir4FrozenBlockActive(frozen.player)).toBe(true);
    expect(attacker.mir4Effects?.active.some((effect) => effect.kind === 'freeze')).toBe(false);
  });
});
