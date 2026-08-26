import { MIR4_GAME_PROFILE } from '../src/game_profile';
import type { Sim } from '../src/sim/sim';

/** Build the profile-aware diagnostic payload returned with reset and step. */
export function buildHeadlessEpisodeInfo(sim: Sim, stepCount: number): object {
  const base = {
    level: sim.player.level,
    xp: sim.xp,
    hp: sim.player.hp,
    kills: sim.counters.kills,
    deaths: sim.counters.deaths,
    quests_done: sim.counters.questsCompleted,
    copper: sim.copper,
    step: stepCount,
    game_profile: sim.cfg.gameProfile,
  };
  if (sim.cfg.gameProfile !== MIR4_GAME_PROFILE) return base;

  const meta = sim.players.get(sim.playerId);
  return {
    ...base,
    achievement_grade: meta?.mir4AchievementClears?.[201] ?? 0,
    darksteel: meta?.mir4Currencies?.darksteel ?? 0,
    effect_points: meta?.mir4SkillResources?.effectPoints ?? 0,
    skill_tomes: meta?.mir4SkillResources?.skillTomes ?? 0,
    knowledge_fragments: meta?.mir4Materials?.knowledgeFragment ?? 0,
    knowledge_tomes: {
      common: meta?.mir4Materials?.knowledgeTomeCommon ?? 0,
      rare: meta?.mir4Materials?.knowledgeTomeRare ?? 0,
      epic: meta?.mir4Materials?.knowledgeTomeEpic ?? 0,
      legendary: meta?.mir4Materials?.knowledgeTomeLegendary ?? 0,
    },
    skill_levels: { ...meta?.mir4SkillLevels },
  };
}
