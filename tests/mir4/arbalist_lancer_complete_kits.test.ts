import { describe, expect, it } from 'vitest';
import { mir4SkillsForClass } from '../../src/sim/content/mir4';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4ActionAbilities, mir4ActionId } from '../../src/sim/mir4/action_abilities';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeStatusBonus } from '../../src/sim/mir4/effects';
import { Sim } from '../../src/sim/sim';
import { dist2d, type Entity, type Mir4ClassKey } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeClass(playerClassMir4: Mir4ClassKey, seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: playerClassMir4 === 'arbalist' ? 'hunter' : 'paladin',
    playerClassMir4,
    playerName: 'CompleteKitTester',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  sim.player.level = 120;
  sim.player.resource = sim.player.maxResource;
  return sim;
}

function spawnTarget(sim: Sim, dx: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `complete_ranged_melee_${suffix}`,
    hpBase: 100_000,
    hpPerLevel: 0,
    moveSpeed: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + dx, sim.player.pos.z),
  );
  target.wanderTimer = 999_999;
  sim.addEntity(target);
  return target;
}

describe('the complete MIR4 Arbalist kit', () => {
  it('contains the twelve official regular skills and names', () => {
    expect(mir4SkillsForClass(4).map((skill) => [skill.skillId, skill.displayName])).toEqual([
      [4101, 'Tiro Rápido'],
      [4106, 'Vendaval de Golpe de Dor'],
      [4102, 'Seta da Ilusão'],
      [4103, 'Projétil Explosivo'],
      [4107, 'Seta do Clarão'],
      [4108, 'Arco Celestial'],
      [4111, 'Olho da Mente'],
      [4105, 'Prisão de Gelo'],
      [4109, 'Escudo de Aniquilação'],
      [4104, 'Escudo da Névoa Venenosa'],
      [4110, 'Seta da Procura'],
      [4112, 'Ocultação'],
    ]);
    const actions = mir4ActionAbilities(4, 120, undefined, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );
    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
    ]);
    expect(actions.find((ability) => ability.def.id === mir4ActionId(4110))?.def.name).toBe(
      'Seeking Bolt',
    );
  });

  it('controls at range and applies Cloaking only at its native contact', () => {
    const painstrike = makeClass('arbalist', 16_001);
    const target = spawnTarget(painstrike, 10, 'painstrike');
    expect(castMir4Skill(painstrike.ctx, painstrike.playerId, 4106, target.id)).toEqual({
      ok: true,
    });
    for (let tick = 0; tick < 20; tick += 1) painstrike.tick();
    expect(target.mir4Effects?.active.some((effect) => effect.kind === 'stun')).toBe(true);

    const cloaking = makeClass('arbalist', 16_002);
    expect(castMir4Skill(cloaking.ctx, cloaking.playerId, 4112)).toEqual({
      ok: true,
    });
    expect(cloaking.player.stealthed).toBe(false);
    cloaking.time += 0.08;
    updateMir4PendingImpacts(cloaking.ctx);
    expect(cloaking.player.stealthed).toBe(true);
    expect(mir4NativeStatusBonus(cloaking.player, 47)).toBe(0);
  });
});

describe('the complete MIR4 Lancer kit', () => {
  it('contains the twelve official regular skills and names', () => {
    expect(mir4SkillsForClass(5).map((skill) => [skill.skillId, skill.displayName])).toEqual([
      [5201, 'Ataque Devastador'],
      [5101, 'Lâmina Crescente'],
      [5104, 'Pontapé Nirvana'],
      [5301, 'Golpe Duplo'],
      [5401, 'Tempestade Arrebatadora'],
      [5102, 'Cauda do Dragão'],
      [5103, 'Dragão Ascendente'],
      [5303, 'Ataque Esmagador'],
      [5403, 'Muralha de Vento'],
      [5205, 'Lança Penetrante'],
      [5304, 'Absorção'],
      [5202, 'Golpe Relâmpago'],
    ]);
    const actions = mir4ActionAbilities(5, 120, undefined, 204).filter((ability) =>
      ability.def.id.startsWith('mir4_skill_'),
    );
    expect(actions).toHaveLength(12);
    expect(actions.map((ability) => ability.def.learnLevel)).toEqual([
      1, 1, 1, 1, 5, 8, 16, 24, 32, 40, 48, 56,
    ]);
  });

  it('protects with Wind Wall, heals on Absorption contact, and charges with Blitz Strike', () => {
    const wall = makeClass('lancer', 16_003);
    const wallTarget = spawnTarget(wall, 3, 'wind_wall');
    expect(castMir4Skill(wall.ctx, wall.playerId, 5403, wallTarget.id)).toEqual({ ok: true });
    expect(mir4NativeStatusBonus(wall.player, 47)).toBe(0);
    wall.time += 0.02;
    updateMir4PendingImpacts(wall.ctx);
    expect(mir4NativeStatusBonus(wall.player, 47)).toBe(2_000);

    const absorb = makeClass('lancer', 16_004);
    absorb.player.hp = Math.floor(absorb.player.maxHp / 2);
    const absorbTarget = spawnTarget(absorb, 4, 'absorption');
    const hpBefore = absorb.player.hp;
    expect(castMir4Skill(absorb.ctx, absorb.playerId, 5304, absorbTarget.id)).toEqual({ ok: true });
    expect(absorb.player.hp).toBe(hpBefore);
    const absorptionContact = absorb.player.mir4PendingImpacts?.find(
      (impact) => impact.skillId === 5304 && impact.attackId === 530401,
    );
    expect(absorptionContact).toBeDefined();
    if (absorptionContact) {
      absorptionContact.forceHit = true;
      absorptionContact.forceCritical = false;
      absorb.time = absorptionContact.dueAt;
      updateMir4PendingImpacts(absorb.ctx);
    }
    expect(absorb.player.hp).toBeGreaterThan(hpBefore);

    const blitz = makeClass('lancer', 16_005);
    const blitzTarget = spawnTarget(blitz, 10, 'blitz');
    blitz.ctx.hasLineOfSight = () => true;
    const before = dist2d(blitz.player.pos, blitzTarget.pos);
    expect(castMir4Skill(blitz.ctx, blitz.playerId, 5202, blitzTarget.id)).toEqual({ ok: true });
    for (const impact of blitz.player.mir4PendingImpacts ?? []) {
      if (impact.skillId !== 5202) continue;
      impact.forceHit = true;
      impact.forceCritical = false;
    }
    for (let tick = 0; tick < 12; tick += 1) blitz.tick();
    expect(dist2d(blitz.player.pos, blitzTarget.pos)).toBeLessThan(before);
    expect(blitzTarget.mir4Effects?.active.some((effect) => effect.kind === 'knockdown')).toBe(
      true,
    );
  });
});
