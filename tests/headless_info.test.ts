import { describe, expect, it } from 'vitest';
import { buildHeadlessEpisodeInfo } from '../headless/info';
import { buildMir4ArcWorld } from '../src/sim/content/mir4/arc_world';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import { Sim } from '../src/sim/sim';

describe('headless episode info', () => {
  it('keeps the classic contract free of MIR4-only progression fields', () => {
    const sim = new Sim({ seed: 1, playerClass: 'warrior' });
    expect(buildHeadlessEpisodeInfo(sim, 7)).toEqual({
      level: 1,
      xp: 0,
      hp: sim.player.hp,
      kills: 0,
      deaths: 0,
      quests_done: 0,
      copper: 0,
      step: 7,
      game_profile: 'woc-classic',
    });
  });

  it('reports the authoritative MIR4 achievement grade and currencies', () => {
    const sim = new Sim({
      seed: 2,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world: buildMir4ArcWorld(),
    });
    sim.setPlayerLevel(10);
    expect(sim.mir4ClaimAchievement(20101)).toMatchObject({ ok: true });
    expect(sim.mir4ClaimAchievement(20102)).toMatchObject({ ok: true });
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      knowledgeFragment: 5,
      knowledgeTomeCommon: 2,
      knowledgeTomeRare: 3,
      knowledgeTomeEpic: 4,
      knowledgeTomeLegendary: 5,
      sunStone: 0,
      moonStone: 0,
      solarScroll: 0,
      lunarSeal: 0,
      dawnTear: 0,
      solarWard: 0,
    };
    meta.mir4SkillLevels = { 1102: 7 };

    expect(buildHeadlessEpisodeInfo(sim, 9)).toMatchObject({
      achievement_grade: 2,
      copper: 2_300,
      darksteel: 1_000,
      effect_points: 500,
      skill_tomes: 3,
      knowledge_fragments: 5,
      knowledge_tomes: { common: 2, rare: 3, epic: 4, legendary: 5 },
      skill_levels: { 1102: 7 },
      game_profile: 'mir4-gameplay-port',
      step: 9,
    });
  });
});
