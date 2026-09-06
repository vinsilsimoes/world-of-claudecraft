import { describe, expect, it } from 'vitest';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { mir4NativeGreaterHealAmount } from '../../src/sim/mir4/native_skill_greater_heal';
import { Sim } from '../../src/sim/sim';
import { dist2d, type Entity } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'TaoistTester',
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
    id: `taoist_kit_${suffix}`,
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
  sim.time += 5;
  updateMir4PendingImpacts(sim.ctx);
}

describe('the complete MIR4 Taoist kit', () => {
  it('contains the twelve official regular skills in Aeldrune unlock order', () => {
    expect(
      mir4SkillsForClass(3).map((skill) => [skill.slot, skill.skillId, skill.displayName]),
    ).toEqual([
      [1, 3506, 'Onda Lunar'],
      [2, 3101, 'Espada de Raio Solar'],
      [3, 3301, 'Esfera Lunar'],
      [4, 3104, 'Chuva de Lâminas'],
      [5, 3503, 'Cura'],
      [6, 3103, 'Lâminas Perfurantes'],
      [7, 3501, 'Círculo do Guardião'],
      [8, 3201, 'Tai Chi'],
      [9, 3505, 'Amuleto Explosivo'],
      [10, 3203, 'Golpe Esvoaçante'],
      [11, 3404, 'Círculo de Expulsão'],
      [12, 3504, 'Cura Maior'],
    ]);
  });

  it('surfaces every action with its official English name and unlock level', () => {
    const actions = mir4ActionAbilities(3, 120, undefined, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );

    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
    ]);
    expect(actions.find((ability) => ability.def.id === mir4ActionId(3101))?.def.name).toBe(
      'Sunbeam Sword',
    );
    expect(actions.find((ability) => ability.def.id === mir4ActionId(3504))?.def).toMatchObject({
      name: 'Greater Heal',
      requiresTarget: false,
    });
  });

  it('uses Moonlight Wave without an invented slow and Moonlight Orb without a fake root', () => {
    const wave = makeTaoist(15_001);
    const waveTarget = spawnTarget(wave, 4, 0, 'moonlight_wave');
    expect(castMir4Skill(wave.ctx, wave.playerId, 3506, waveTarget.id)).toEqual({ ok: true });
    resolveSkill(wave);
    expect(waveTarget.hp).toBeLessThan(waveTarget.maxHp);
    expect(Boolean(waveTarget.mir4Effects?.active.some((effect) => effect.kind === 'slow'))).toBe(
      false,
    );

    const orb = makeTaoist(15_002);
    const orbTarget = spawnTarget(orb, 6, 0, 'moonlight_orb');
    expect(castMir4Skill(orb.ctx, orb.playerId, 3301, orbTarget.id)).toEqual({
      ok: true,
    });
    resolveSkill(orb);
    expect(orbTarget.hp).toBeLessThan(orbTarget.maxHp);
    expect(Boolean(orbTarget.mir4Effects?.active.some((effect) => effect.kind === 'root'))).toBe(
      false,
    );
  });

  it('pulls through Tai Chi intermediate contacts before the final outward knockdown', () => {
    const sim = makeTaoist(15_003);
    const target = spawnTarget(sim, 6, 0, 'tai_chi');
    const distanceBefore = dist2d(sim.player.pos, target.pos);

    expect(castMir4Skill(sim.ctx, sim.playerId, 3201, target.id)).toEqual({
      ok: true,
    });
    sim.time = 1;
    updateMir4PendingImpacts(sim.ctx);
    expect(dist2d(sim.player.pos, target.pos)).toBeLessThan(distanceBefore);
    sim.time = 1.34;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(true);
  });

  it('unlocks Piercing Blades stun at rank five', () => {
    const rankOne = makeTaoist(15_004);
    const firstTarget = spawnTarget(rankOne, 5, 0, 'piercing_rank_one');
    expect(castMir4Skill(rankOne.ctx, rankOne.playerId, 3103, firstTarget.id)).toEqual({
      ok: true,
    });
    resolveSkill(rankOne);
    expect(Boolean(firstTarget.mir4Effects?.active.some((effect) => effect.kind === 'stun'))).toBe(
      false,
    );

    const rankFive = makeTaoist(15_005);
    const meta = rankFive.players.get(rankFive.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');
    meta.mir4SkillLevels = { 3103: 5 };
    const secondTarget = spawnTarget(rankFive, 5, 0, 'piercing_rank_five');
    expect(castMir4Skill(rankFive.ctx, rankFive.playerId, 3103, secondTarget.id)).toEqual({
      ok: true,
    });
    resolveSkill(rankFive);
    expect(secondTarget.mir4Effects?.active.some((effect) => effect.kind === 'stun')).toBe(true);
  });

  it('applies the exact rank-1 Darkness and Physical Defense loss with Blasting Charm', () => {
    const sim = makeTaoist(15_006);
    const target = spawnTarget(sim, 6, 0, 'blasting_charm');

    expect(castMir4Skill(sim.ctx, sim.playerId, 3505, target.id)).toEqual({
      ok: true,
    });
    resolveSkill(sim);

    expect(mir4NativeStatusBonus(target, 53)).toBe(-250);
    expect(mir4NativeStatusBonus(target, 24)).toBe(-50);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'blind')).toBe(false);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'defense-break')).toBe(false);
  });

  it('heals with both recovery skills and protects with Guardian Circle', () => {
    const heal = makeTaoist(15_007);
    heal.player.hp = Math.floor(heal.player.maxHp / 2);
    const hpBeforeHeal = heal.player.hp;
    expect(castMir4Skill(heal.ctx, heal.playerId, 3503)).toEqual({ ok: true });
    heal.time += 6;
    updateMir4PendingImpacts(heal.ctx);
    const regularHeal = heal.player.hp - hpBeforeHeal;
    expect(regularHeal).toBeGreaterThan(0);

    const greater = makeTaoist(15_008);
    greater.player.hp = Math.floor(greater.player.maxHp / 2);
    const hpBeforeGreater = greater.player.hp;
    expect(castMir4Skill(greater.ctx, greater.playerId, 3504)).toEqual({
      ok: true,
    });
    greater.time += 0.74;
    updateMir4PendingImpacts(greater.ctx);
    expect(greater.player.hp - hpBeforeGreater).toBe(
      mir4NativeGreaterHealAmount(greater.player.maxHp, 1, true),
    );

    const guardian = makeTaoist(15_009);
    const enemy = spawnTarget(guardian, 3, 0, 'guardian_circle');
    expect(castMir4Skill(guardian.ctx, guardian.playerId, 3501)).toEqual({
      ok: true,
    });
    resolveSkill(guardian);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    expect(mir4NativeStatusBonus(guardian.player, 24)).toBe(25);
    expect(mir4NativeStatusBonus(guardian.player, 35)).toBe(1_000);
  });
});
