// Source-backed subset of the original runtime's player-level achievement
// group. The original browser product admits only grades 1 and 2 because
// later grades include item rewards whose canonical mappings are not sealed.

export interface Mir4AchievementRewards {
  copper: number;
  darksteel: number;
  effectPoints: number;
}

export interface Mir4LevelAchievementDef {
  achievementId: number;
  groupId: 201;
  groupGrade: number;
  requiredLevel: number;
  rewards: Mir4AchievementRewards;
}

/**
 * WoC-port progression bridge for a source item that the original runtime
 * consumes but never awards. Keeping this separate from `rewards` preserves
 * the observed achievement row while making the first sealed L2 transition
 * earnable without a development grant or a source-project asset.
 */
export interface Mir4AchievementPortBonus {
  knowledgeTomeCommon: number;
}

export const MIR4_LEVEL_ACHIEVEMENTS = [
  {
    achievementId: 20101,
    groupId: 201,
    groupGrade: 1,
    requiredLevel: 5,
    rewards: { copper: 1_100, darksteel: 1_000, effectPoints: 0 },
  },
  {
    achievementId: 20102,
    groupId: 201,
    groupGrade: 2,
    requiredLevel: 10,
    rewards: { copper: 1_200, darksteel: 0, effectPoints: 500 },
  },
] as const satisfies readonly Mir4LevelAchievementDef[];

export const MIR4_ACHIEVEMENT_PORT_BONUSES: Readonly<
  Partial<Record<number, Readonly<Mir4AchievementPortBonus>>>
> = {
  20102: { knowledgeTomeCommon: 1 },
};

export function mir4LevelAchievement(achievementId: number): Mir4LevelAchievementDef | null {
  return (
    MIR4_LEVEL_ACHIEVEMENTS.find((definition) => definition.achievementId === achievementId) ?? null
  );
}

export function mir4AchievementPortBonus(
  achievementId: number,
): Readonly<Mir4AchievementPortBonus> | null {
  return MIR4_ACHIEVEMENT_PORT_BONUSES[achievementId] ?? null;
}
