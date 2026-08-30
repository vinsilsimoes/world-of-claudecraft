import { describe, expect, it } from 'vitest';
import { mir4SkillById, mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
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

function resolvePendingWarriorSkill(sim: Sim, elapsedSeconds = 3): void {
  sim.time += elapsedSeconds;
  updateMir4PendingImpacts(sim.ctx);
}

describe('the complete MIR4 Warrior kit', () => {
  it('contains the twelve official regular skills in MIR4 unlock order', () => {
    expect(
      mir4SkillsForClass(1).map((skill) => [skill.slot, skill.skillId, skill.displayName]),
    ).toEqual([
      [1, 1102, 'Corte do Vazio'],
      [2, 1104, 'Corte Divisor'],
      [3, 1304, 'Choque Corporal'],
      [4, 1401, 'Esmagamento Terrestre'],
      [5, 1501, 'Corte Vendaval'],
      [6, 1302, 'Rugido de Leão'],
      [7, 1301, 'Riposta'],
      [8, 1201, 'Grilhão de Ferro'],
      [9, 1601, 'Golpe Crescente'],
      [10, 1101, 'Fúria'],
      [11, 1103, 'Investida Bárbara'],
      [12, 1502, 'Postura Inquebrável'],
    ]);
  });

  it('preserves the official Warrior area origins and frontal strike geometry', () => {
    for (const skillId of [1302, 1101, 1103, 1501]) {
      expect(mir4SkillById(skillId)?.effect).toMatchObject({
        areaOrigin: 'actor',
      });
    }
    expect(mir4SkillById(1201)?.effect).toMatchObject({
      areaOrigin: 'forward',
      areaForwardOffsetPx: 80,
    });
    expect(mir4SkillById(1401)?.effect).toMatchObject({
      areaOrigin: 'forward',
      areaForwardOffsetPx: 96,
    });
    expect(mir4SkillById(1601)?.effect).toMatchObject({
      areaShape: 'frontal-strip',
      areaLengthPx: 144,
      areaWidthPx: 80,
    });
  });

  it('preserves the official Warrior damage-contact timeline from SKILL_ATTACK', () => {
    expect(mir4SkillsForClass(1).map((skill) => [skill.skillId, skill.impactOffsetsMs])).toEqual([
      [1102, [520, 699, 900]],
      [1104, [490]],
      [1304, [520]],
      [1401, [610]],
      [1501, [20, 225, 375, 540, 640, 840, 900, 1050, 1275]],
      [1302, [500, 600]],
      [1301, [1240]],
      [1201, [500, 850, 1500]],
      [1601, [750]],
      [1101, [20, 650]],
      [1103, [550, 1100]],
      [1502, [240]],
    ]);
  });

  it('delays Void Slash contacts and its final effect to the official contact frames', () => {
    const sim = makeWarrior(13_010);
    const target = spawnTarget(sim, 3, 0, 'void_timeline');
    const hpBefore = target.hp;
    sim.drainEvents();

    expect(castMir4Skill(sim.ctx, sim.playerId, 1102, target.id)).toEqual({
      ok: true,
    });

    expect(target.hp).toBe(hpBefore);
    expect(sim.player.mir4PendingImpacts?.map((impact) => Math.round(impact.dueAt * 1000))).toEqual(
      [520, 699, 900, 900],
    );
    expect(sim.drainEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'mir4AttackStart',
          action: 'skill',
          ability: 'mir4_skill_1102',
          durationMs: 1500,
        }),
        expect.objectContaining({
          type: 'spellfx',
          ability: 'mir4_skill_1102',
          impactDelayMs: 900,
          attackAnimationStarted: true,
        }),
      ]),
    );

    sim.time = 0.519;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.hp).toBe(hpBefore);

    sim.time = 0.52;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.hp).toBeLessThan(hpBefore);
    const firstContactEvents = sim.drainEvents();
    expect(
      firstContactEvents
        .filter((event) => event.type === 'damage')
        .every((event) => event.attackAnimationStarted === true),
    ).toBe(true);

    sim.time = 0.9;
    updateMir4PendingImpacts(sim.ctx);
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'stun')).toBe(true);
    expect(sim.player.mir4PendingImpacts).toEqual([]);
  });

  it('surfaces every action with its official English name, unlock and live tooltip', () => {
    const actions = mir4ActionAbilities(1, 120, { 1301: 10 }, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );

    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.name)).toEqual([
      'Void Slash',
      'Splitting Slash',
      'Body Check',
      'Ground Smash',
      'Gale Slash',
      "Lion's Roar",
      'Riposte',
      'Iron Shackle',
      'Crescent Strike',
      'Berserk',
      'Barbaric Charge',
      'Unbreakable Stance',
    ]);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
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
    expect(
      actions.find((ability) => ability.def.id === mir4ActionId(1502))?.def.description,
    ).toContain('At rank 8, increases your Dodge by 30; at rank 10, by 60 for 20 sec.');
    expect(
      actions.find((ability) => ability.def.id === mir4ActionId(1101))?.def.description,
    ).toContain('within 7 yards of you');
    expect(
      actions.find((ability) => ability.def.id === mir4ActionId(1201))?.def.description,
    ).toContain('within 10 yards of a point 5 yards in front of you');
    expect(
      actions.find((ability) => ability.def.id === mir4ActionId(1601))?.def.description,
    ).toContain('in a 9-yard-long, 5-yard-wide frontal strip');
  });

  it('charges to the target, damages the group, pulls it in and knocks it down', () => {
    const sim = makeWarrior(13_001);
    const primary = spawnTarget(sim, 10, 0, 'charge_primary');
    const secondary = spawnTarget(sim, 11, 1, 'charge_secondary');
    const secondaryDistanceBefore = dist2d(sim.player.pos, secondary.pos);

    expect(castMir4Skill(sim.ctx, sim.playerId, 1103, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(dist2d(sim.player.pos, primary.pos)).toBeLessThanOrEqual(1.7);
    expect(primary.hp).toBeLessThan(primary.maxHp);
    expect(secondary.hp).toBeLessThan(secondary.maxHp);
    expect(dist2d(sim.player.pos, secondary.pos)).toBeLessThan(secondaryDistanceBefore);
    expect(primary.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(true);
  });

  it('applies the live Berserk damage boost to its caster', () => {
    const sim = makeWarrior(13_002);
    const target = spawnTarget(sim, 3, 0, 'rampant');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1101, target.id)).toEqual({
      ok: true,
    });
    expect(mir4AttackMultiplier(sim.player)).toBeCloseTo(1.12, 8);
  });

  it("centers Lion's Roar on the Warrior instead of the selected target", () => {
    const sim = makeWarrior(13_006);
    const primary = spawnTarget(sim, 3, 0, 'roar_primary');
    const nearWarrior = spawnTarget(sim, -6, 0, 'roar_near_warrior');
    const nearPrimaryOnly = spawnTarget(sim, 9, 0, 'roar_near_primary');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1302, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(nearWarrior.hp).toBeLessThan(nearWarrior.maxHp);
    expect(nearPrimaryOnly.hp).toBe(nearPrimaryOnly.maxHp);
  });

  it('limits Crescent Strike secondary hits to the frontal strip', () => {
    const sim = makeWarrior(13_007);
    const primary = spawnTarget(sim, 0, 3, 'crescent_primary');
    const insideStrip = spawnTarget(sim, 2, 6, 'crescent_inside');
    const outsideSide = spawnTarget(sim, 3, 6, 'crescent_outside_side');
    const behindWarrior = spawnTarget(sim, 0, -1, 'crescent_behind');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1601, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(insideStrip.hp).toBeLessThan(insideStrip.maxHp);
    expect(outsideSide.hp).toBe(outsideSide.maxHp);
    expect(behindWarrior.hp).toBe(behindWarrior.maxHp);
  });

  it('centers Iron Shackle ahead of the Warrior instead of on the selected target', () => {
    const sim = makeWarrior(13_008);
    sim.ctx.hasLineOfSight = () => true;
    const primary = spawnTarget(sim, 3, 0, 'shackle_primary');
    const insideForwardCircle = spawnTarget(sim, 14, 0, 'shackle_inside_forward');
    const outsideForwardCircle = spawnTarget(sim, -6, 0, 'shackle_outside_forward');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1201, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(insideForwardCircle.hp).toBeLessThan(insideForwardCircle.maxHp);
    expect(outsideForwardCircle.hp).toBe(outsideForwardCircle.maxHp);
  });

  it('centers Ground Smash at its official forward impact point', () => {
    const sim = makeWarrior(13_009);
    sim.ctx.hasLineOfSight = () => true;
    const primary = spawnTarget(sim, 3, 0, 'smash_primary');
    const insideForwardCircle = spawnTarget(sim, 13, 0, 'smash_inside_forward');
    const outsideForwardCircle = spawnTarget(sim, -4, 0, 'smash_outside_forward');

    expect(castMir4Skill(sim.ctx, sim.playerId, 1401, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(insideForwardCircle.hp).toBeLessThan(insideForwardCircle.maxHp);
    expect(outsideForwardCircle.hp).toBe(outsideForwardCircle.maxHp);
  });

  it('heals twenty percent at rank ten and grants Riposte defense', () => {
    const sim = makeWarrior(13_003);
    const target = spawnTarget(sim, 3, 0, 'riposte');
    sim.player.hp = Math.floor(sim.player.maxHp / 2);
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing MIR4 player metadata');
    meta.mir4SkillLevels = { 1301: 10 };
    const hpBefore = sim.player.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1301, target.id)).toEqual({
      ok: true,
    });
    expect(sim.player.hp - hpBefore).toBe(Math.floor(sim.player.maxHp * 0.2));
    expect(mir4DefenseMultiplier(sim.player)).toBeCloseTo(1.24, 8);
  });

  it('unlocks the official Unbreakable Stance dodge bonuses at ranks 8 and 10', () => {
    const castAtRank = (rank: number): { damage: number; dodge: number } => {
      const sim = makeWarrior(13_004 + rank);
      const target = spawnTarget(sim, 3, 0, `stance_${rank}`);
      const meta = sim.players.get(sim.playerId);
      if (!meta) throw new Error('missing MIR4 player metadata');
      meta.mir4SkillLevels = { 1502: rank };

      expect(castMir4Skill(sim.ctx, sim.playerId, 1502)).toEqual({ ok: true });
      resolvePendingWarriorSkill(sim);
      return {
        damage: target.maxHp - target.hp,
        dodge: mir4DodgeBonus(sim.player),
      };
    };

    const rank1 = castAtRank(1);
    const rank8 = castAtRank(8);
    const rank10 = castAtRank(10);
    expect(rank1).toMatchObject({ dodge: 0 });
    expect(rank8).toMatchObject({ dodge: 30 });
    expect(rank10).toMatchObject({ dodge: 60 });
    expect(rank10.damage).toBeGreaterThan(rank1.damage);
  });

  it('resolves all nine Gale Slash contacts as one 380 percent source action', () => {
    const sim = makeWarrior(13_005);
    const primary = spawnTarget(sim, 3, 0, 'gale_primary');
    const secondary = spawnTarget(sim, 4, 1, 'gale_secondary');
    const primaryHpBefore = primary.hp;
    const secondaryHpBefore = secondary.hp;

    expect(castMir4Skill(sim.ctx, sim.playerId, 1501, primary.id)).toEqual({
      ok: true,
    });
    resolvePendingWarriorSkill(sim);

    expect(primary.hp).toBeLessThan(primaryHpBefore);
    expect(secondary.hp).toBeLessThan(secondaryHpBefore);
    expect(primary.mir4Effects?.active.some((effect) => effect.kind === 'slow')).toBe(true);
  });
});
