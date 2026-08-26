import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ActionId, mir4ActionRawDamage } from '../../src/sim/mir4/action_abilities';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { mir4SkillEvolutionFor, upgradeMir4Skill } from '../../src/sim/mir4/skill_evolution';
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
  it('projects the required tome, held count and level-15 cap', () => {
    expect(mir4SkillEvolutionFor(1, 1102, 1, MIR4_EMPTY_MATERIALS)).toEqual({
      skillId: 1102,
      currentLevel: 1,
      nextLevel: 2,
      maxLevel: 15,
      status: 'blocked',
      canUpgrade: false,
      missing: ['knowledge-tome'],
      cost: { key: 'knowledgeTomeCommon', count: 1 },
      held: 0,
    });
    expect(
      mir4SkillEvolutionFor(1, 1102, 14, {
        ...MIR4_EMPTY_MATERIALS,
        knowledgeTomeLegendary: 1,
      }),
    ).toMatchObject({
      currentLevel: 14,
      nextLevel: 15,
      status: 'ready',
      cost: { key: 'knowledgeTomeLegendary', count: 1 },
      held: 1,
    });
    expect(mir4SkillEvolutionFor(1, 1102, 15, MIR4_EMPTY_MATERIALS)).toMatchObject({
      currentLevel: 15,
      nextLevel: null,
      status: 'maxed',
      cost: null,
    });
  });

  it('rejects a skill from another class and a locked skill upgrade', () => {
    expect(mir4SkillEvolutionFor(2, 1102, 1, MIR4_EMPTY_MATERIALS)).toBeNull();

    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 };
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1104, 1)).toEqual({
      ok: false,
      reason: 'skill-locked',
    });
    expect(meta.mir4Materials.knowledgeTomeCommon).toBe(1);
  });

  it.each([
    ['warrior', 1102],
    ['elementalist', 2101],
    ['taoist', 3506],
    ['arbalist', 4101],
    ['lancer', 5201],
  ] as const)('uses one common tome for the first %s upgrade', (classKey, skillId) => {
    const sim = makeSim(classKey);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 };

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, skillId, 1)).toEqual({
      ok: true,
      skillId,
      previousLevel: 1,
      currentLevel: 2,
    });
    expect(meta.mir4Materials.knowledgeTomeCommon).toBe(0);
  });

  it('consumes the four tome bands atomically through rank 15 and refreshes damage', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      knowledgeTomeCommon: 3,
      knowledgeTomeRare: 3,
      knowledgeTomeEpic: 3,
      knowledgeTomeLegendary: 5,
    };
    const rankOneDamage = mir4ActionRawDamage(mir4ActionId(1102), 1, 100, 100);

    for (let current = 1; current < 15; current++) {
      expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, current)).toMatchObject({
        ok: true,
        previousLevel: current,
        currentLevel: current + 1,
      });
    }

    expect(meta.mir4SkillLevels).toEqual({ 1102: 15 });
    expect(meta.mir4Materials).toEqual(MIR4_EMPTY_MATERIALS);
    expect(sim.known.find((ability) => ability.def.id === mir4ActionId(1102))?.rank).toBe(15);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 15, 100, 100)).toBeGreaterThan(
      rankOneDamage ?? 0,
    );
  });

  it('rejects insufficient materials, stale retries and a maxed skill without a debit', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS };
    const beforeInsufficient = structuredClone(meta.mir4Materials);
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: false,
      reason: 'insufficient-resources',
    });
    expect(meta.mir4Materials).toEqual(beforeInsufficient);
    expect(meta.mir4SkillLevels).toBeUndefined();

    meta.mir4Materials.knowledgeTomeCommon = 1;
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1).ok).toBe(true);
    const beforeStale = {
      materials: structuredClone(meta.mir4Materials),
      levels: structuredClone(meta.mir4SkillLevels),
    };
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: false,
      reason: 'stale-level',
    });
    expect(meta.mir4Materials).toEqual(beforeStale.materials);
    expect(meta.mir4SkillLevels).toEqual(beforeStale.levels);

    meta.mir4SkillLevels = { 1102: 15 };
    meta.mir4Materials.knowledgeTomeLegendary = 1;
    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 15)).toEqual({
      ok: false,
      reason: 'maxed',
    });
    expect(meta.mir4Materials.knowledgeTomeLegendary).toBe(1);
  });
});
