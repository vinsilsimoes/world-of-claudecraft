// Pure view-core for the MIR4 profile branch of WoC's existing Book of Deeds
// window. It maps authoritative persisted state to flat cards and never owns
// DOM, transport or gameplay mutation.

import {
  MIR4_LEVEL_ACHIEVEMENTS,
  type Mir4AchievementRewards,
  mir4AchievementPortBonus,
} from '../sim/content/mir4/achievements';
import {
  type Mir4AchievementClears,
  type Mir4Currencies,
  mir4AchievementClaimability,
} from '../sim/mir4/achievements';
import type { Mir4Materials } from '../sim/mir4/equipment';
import type { Mir4SkillEvolutionResources } from '../sim/mir4/skill_evolution';

export interface Mir4AchievementsViewState {
  mir4AchievementClears?: Readonly<Mir4AchievementClears>;
  mir4Currencies?: Readonly<Mir4Currencies>;
  mir4SkillResources?: Readonly<Mir4SkillEvolutionResources>;
  mir4Materials?: Readonly<Mir4Materials>;
}

export interface Mir4AchievementEntryModel {
  achievementId: number;
  groupGrade: number;
  requiredLevel: number;
  progress: { current: number; target: number };
  rewards: Mir4AchievementRewards & { knowledgeTomeCommon: number };
  status: 'claimed' | 'claimable' | 'locked' | 'grade-order';
}

export interface Mir4AchievementsViewModel {
  summary: {
    claimed: number;
    total: number;
    copper: number;
    darksteel: number;
    effectPoints: number;
    knowledgeTomeCommon: number;
  };
  entries: Mir4AchievementEntryModel[];
}

export function buildMir4AchievementsView(
  level: number,
  copper: number,
  state: Readonly<Mir4AchievementsViewState>,
): Mir4AchievementsViewModel {
  const safeLevel = Math.max(1, Math.floor(level));
  const claimed = Math.max(0, Math.min(2, state.mir4AchievementClears?.[201] ?? 0));
  return {
    summary: {
      claimed,
      total: MIR4_LEVEL_ACHIEVEMENTS.length,
      copper: Math.max(0, Math.floor(copper)),
      darksteel: Math.max(0, Math.floor(state.mir4Currencies?.darksteel ?? 0)),
      effectPoints: Math.max(0, Math.floor(state.mir4SkillResources?.effectPoints ?? 0)),
      knowledgeTomeCommon: Math.max(0, Math.floor(state.mir4Materials?.knowledgeTomeCommon ?? 0)),
    },
    entries: MIR4_LEVEL_ACHIEVEMENTS.map((definition) => ({
      achievementId: definition.achievementId,
      groupGrade: definition.groupGrade,
      requiredLevel: definition.requiredLevel,
      progress: {
        current: Math.min(safeLevel, definition.requiredLevel),
        target: definition.requiredLevel,
      },
      rewards: {
        ...definition.rewards,
        knowledgeTomeCommon:
          mir4AchievementPortBonus(definition.achievementId)?.knowledgeTomeCommon ?? 0,
      },
      status: mir4AchievementClaimability(definition, safeLevel, state.mir4AchievementClears),
    })),
  };
}

export function mir4AchievementsRefreshSig(
  level: number,
  copper: number,
  state: Readonly<Mir4AchievementsViewState>,
): string {
  return [
    Math.max(1, Math.floor(level)),
    Math.max(0, Math.floor(copper)),
    state.mir4AchievementClears?.[201] ?? 0,
    state.mir4Currencies?.darksteel ?? 0,
    state.mir4SkillResources?.effectPoints ?? 0,
    state.mir4Materials?.knowledgeTomeCommon ?? 0,
  ].join('|');
}
