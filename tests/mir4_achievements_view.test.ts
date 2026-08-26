import { describe, expect, it } from 'vitest';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import {
  buildMir4AchievementsView,
  mir4AchievementsRefreshSig,
} from '../src/ui/mir4_achievements_view';

describe('MIR4 achievements view for the existing Deeds window', () => {
  it('projects locked, ordered and claimable level grades', () => {
    const initial = buildMir4AchievementsView(4, 250, {});
    expect(initial.summary).toEqual({
      claimed: 0,
      total: 2,
      copper: 250,
      darksteel: 0,
      effectPoints: 0,
      knowledgeTomeCommon: 0,
    });
    expect(initial.entries.map((entry) => entry.status)).toEqual(['locked', 'grade-order']);

    const levelTen = buildMir4AchievementsView(10, 250, {});
    expect(levelTen.entries.map((entry) => entry.status)).toEqual(['claimable', 'grade-order']);

    const gradeOne = buildMir4AchievementsView(10, 1_350, {
      mir4AchievementClears: { 201: 1 },
      mir4Currencies: { darksteel: 1_000, energy: 0 },
      mir4SkillResources: { effectPoints: 0, skillTomes: 0 },
    });
    expect(gradeOne.entries.map((entry) => entry.status)).toEqual(['claimed', 'claimable']);
  });

  it('caps progress at each requirement and preserves exact rewards', () => {
    const view = buildMir4AchievementsView(10, 2_300, {
      mir4AchievementClears: { 201: 2 },
      mir4Currencies: { darksteel: 1_000, energy: 0 },
      mir4SkillResources: { effectPoints: 500, skillTomes: 0 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 },
    });

    expect(view.summary).toEqual({
      claimed: 2,
      total: 2,
      copper: 2_300,
      darksteel: 1_000,
      effectPoints: 500,
      knowledgeTomeCommon: 1,
    });
    expect(view.entries).toMatchObject([
      {
        achievementId: 20101,
        progress: { current: 5, target: 5 },
        rewards: {
          copper: 1_100,
          darksteel: 1_000,
          effectPoints: 0,
          knowledgeTomeCommon: 0,
        },
        status: 'claimed',
      },
      {
        achievementId: 20102,
        progress: { current: 10, target: 10 },
        rewards: {
          copper: 1_200,
          darksteel: 0,
          effectPoints: 500,
          knowledgeTomeCommon: 1,
        },
        status: 'claimed',
      },
    ]);
  });

  it('changes the repaint signature for every visible dimension', () => {
    const base = mir4AchievementsRefreshSig(10, 100, {});
    expect(mir4AchievementsRefreshSig(11, 100, {})).not.toBe(base);
    expect(mir4AchievementsRefreshSig(10, 101, {})).not.toBe(base);
    expect(mir4AchievementsRefreshSig(10, 100, { mir4AchievementClears: { 201: 1 } })).not.toBe(
      base,
    );
    expect(
      mir4AchievementsRefreshSig(10, 100, { mir4Currencies: { darksteel: 1, energy: 0 } }),
    ).not.toBe(base);
    expect(
      mir4AchievementsRefreshSig(10, 100, {
        mir4SkillResources: { effectPoints: 1, skillTomes: 0 },
      }),
    ).not.toBe(base);
    expect(
      mir4AchievementsRefreshSig(10, 100, {
        mir4Materials: { ...MIR4_EMPTY_MATERIALS, knowledgeTomeCommon: 1 },
      }),
    ).not.toBe(base);
  });
});
