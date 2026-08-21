import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import {
  MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES,
  MIR4_SKILL_LEVEL_TWO_COST,
  mir4SkillEvolutionFor,
  upgradeMir4Skill,
} from '../../src/sim/mir4/skill_evolution';
import { Sim } from '../../src/sim/sim';
import { type Mir4ClassKey, PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(cls: Mir4ClassKey = 'warrior'): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  return new Sim({
    seed: 963,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Evolution',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 skill evolution', () => {
  it('projects the exact source-backed level-two cost and missing resources', () => {
    expect(MIR4_SKILL_LEVEL_TWO_COST).toEqual({
      copper: 3_200,
      effectPoints: 400,
      skillTomes: 3,
    });
    expect(
      mir4SkillEvolutionFor(1, 1102, 1, 3_199, {
        effectPoints: 399,
        skillTomes: 2,
      }),
    ).toEqual({
      skillId: 1102,
      currentLevel: 1,
      nextLevel: 2,
      maxLevel: 2,
      status: 'blocked',
      canUpgrade: false,
      missing: ['copper', 'effect-points', 'skill-tomes'],
      costs: MIR4_SKILL_LEVEL_TWO_COST,
      balances: { copper: 3_199, effectPoints: 399, skillTomes: 2 },
    });
  });

  it('rejects another class skill and a capped-at-one skill', () => {
    expect(
      mir4SkillEvolutionFor(2, 1102, 1, 99_999, {
        effectPoints: 99_999,
        skillTomes: 99_999,
      }),
    ).toBeNull();
    expect(
      mir4SkillEvolutionFor(1, 1501, 1, 99_999, {
        effectPoints: 99_999,
        skillTomes: 99_999,
      }),
    ).toBeNull();
  });

  it.each([
    ['warrior', 1102],
    ['elementalist', 2101],
    ['taoist', 3101],
    ['arbalist', 4101],
    ['lancer', 5101],
  ] as const)('applies the sealed level-two gate for %s', (classKey, skillId) => {
    const sim = makeSim(classKey);
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = MIR4_SKILL_LEVEL_TWO_COST.copper;
    meta.mir4SkillResources = {
      effectPoints: MIR4_SKILL_LEVEL_TWO_COST.effectPoints,
      skillTomes: MIR4_SKILL_LEVEL_TWO_COST.skillTomes,
    };

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, skillId, 1)).toMatchObject({
      ok: true,
      skillId,
      previousLevel: 1,
      currentLevel: 2,
    });
    expect(meta.copper).toBe(0);
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 0, skillTomes: 0 });
  });

  it('does not mutate any purse when resources are insufficient', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 3_199;
    meta.mir4SkillResources = { effectPoints: 399, skillTomes: 2 };

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: false,
      reason: 'insufficient-resources',
    });
    expect(meta.copper).toBe(3_199);
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 399, skillTomes: 2 });
    expect(meta.mir4SkillLevels).toBeUndefined();
  });

  it.each(['copper', 'effectPoints', 'skillTomes'] as const)(
    'rejects when only %s is insufficient and leaves the complete MIR4 state unchanged',
    (missingResource) => {
      const sim = makeSim();
      const meta = sim.players.get(sim.playerId)!;
      meta.copper = MIR4_SKILL_LEVEL_TWO_COST.copper;
      meta.mir4SkillResources = {
        effectPoints: MIR4_SKILL_LEVEL_TWO_COST.effectPoints,
        skillTomes: MIR4_SKILL_LEVEL_TWO_COST.skillTomes,
      };
      if (missingResource === 'copper') meta.copper -= 1;
      else meta.mir4SkillResources[missingResource] -= 1;
      const before = JSON.stringify(sim.mir4PlayerState());

      expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
        ok: false,
        reason: 'insufficient-resources',
      });
      expect(JSON.stringify(sim.mir4PlayerState())).toBe(before);
    },
  );

  it('atomically debits resources, raises only one skill, and refreshes its rank', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 10_000;
    meta.mir4SkillResources = { effectPoints: 900, skillTomes: 8 };
    const rankOneDamage = mir4ActionRawDamage(mir4ActionId(1102), 1, 100, 100);

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: true,
      skillId: 1102,
      previousLevel: 1,
      currentLevel: 2,
    });
    expect(meta.copper).toBe(6_800);
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 500, skillTomes: 5 });
    expect(meta.mir4SkillLevels).toEqual({ 1102: 2 });
    expect(sim.known.find((ability) => ability.def.id === mir4ActionId(1102))?.rank).toBe(2);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 2, 100, 100)).toBeGreaterThan(
      rankOneDamage ?? 0,
    );
  });

  it('rejects a stale retry and a maxed skill without a second debit', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.copper = 10_000;
    meta.mir4SkillResources = { ...MIR4_EMPTY_SKILL_EVOLUTION_RESOURCES };
    meta.mir4SkillResources.effectPoints = 900;
    meta.mir4SkillResources.skillTomes = 8;
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1).ok).toBe(true);
    const after = {
      copper: meta.copper,
      resources: { ...meta.mir4SkillResources },
      levels: { ...meta.mir4SkillLevels },
    };

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: false,
      reason: 'stale-level',
    });
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 2)).toEqual({
      ok: false,
      reason: 'maxed',
    });
    expect(meta.copper).toBe(after.copper);
    expect(meta.mir4SkillResources).toEqual(after.resources);
    expect(meta.mir4SkillLevels).toEqual(after.levels);
  });
});
