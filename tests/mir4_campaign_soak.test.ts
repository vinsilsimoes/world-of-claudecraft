import { describe, expect, it } from 'vitest';

import {
  isForwardMir4SoakProgress,
  isMir4PowerGrindXpProgress,
  mir4SoakStageAllowsPowerGrind,
  selectMir4StrengtheningQuest,
  shouldResumeMir4MainQuest,
  shouldStartMir4PowerGrind,
} from '../scripts/lib/mir4_campaign_soak.mjs';

const questOrder = ['M06-Q01', 'M06-Q02', 'M06-Q03'];

describe('MIR4 campaign soak progress', () => {
  it('does not mistake a repeating escort checkpoint for forward progress', () => {
    const checkpoint = {
      completed: 31,
      activeQuestId: 'M06-Q02',
      stageIndex: 2,
      stageProgress: 1,
    };

    expect(
      isForwardMir4SoakProgress(checkpoint, { ...checkpoint, stageProgress: 0 }, questOrder),
    ).toBe(false);
    expect(
      isForwardMir4SoakProgress(checkpoint, { ...checkpoint, stageProgress: 2 }, questOrder),
    ).toBe(true);
    expect(
      isForwardMir4SoakProgress(
        checkpoint,
        { ...checkpoint, stageIndex: 3, stageProgress: 0 },
        questOrder,
      ),
    ).toBe(true);
  });

  it('enters a needed power grind before the stall detector ends the run', () => {
    expect(
      shouldStartMir4PowerGrind({
        tick: 4,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(false);
    expect(
      shouldStartMir4PowerGrind({
        tick: 5,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(true);
    expect(
      shouldStartMir4PowerGrind({
        tick: 3_995,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(true);
    expect(
      shouldStartMir4PowerGrind({
        tick: 3_995,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 53,
        recommendedLevel: 53,
      }),
    ).toBe(false);
  });

  it('counts earned XP as progress only while strengthening is active', () => {
    expect(isMir4PowerGrindXpProgress(823_633, 825_401, 53)).toBe(true);
    expect(isMir4PowerGrindXpProgress(825_401, 825_401, 53)).toBe(false);
    expect(isMir4PowerGrindXpProgress(823_633, 825_401, null)).toBe(false);
  });

  it('reserves power grinding for stages whose outcome depends on combat strength', () => {
    expect(mir4SoakStageAllowsPowerGrind('activate-sequence')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('guardian-resolution')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('escort-entity')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('system-tutorial')).toBe(false);
    expect(mir4SoakStageAllowsPowerGrind('craft-receipt')).toBe(false);
  });

  it('strengthens through unfinished side quests in the reached campaign region', () => {
    const sideQuests = [
      { questId: 'M07-S01', mapId: 'm07-old', levelRange: null },
      { questId: 'M08-S01', mapId: 'm08-current', levelRange: null },
      { questId: 'M08-S02', mapId: 'm08-current', levelRange: [76, 77] as const },
      { questId: 'M09-S01', mapId: 'm09-future', levelRange: null },
    ];
    const progresses = {
      'M08-S01': { state: 'done' },
      'M07-S01': { state: 'active' },
    };

    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses,
        currentMainMapId: 'm08-current',
        playerLevel: 72,
      }),
    ).toBe('M07-S01');
    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses: { 'M08-S01': { state: 'done' }, 'M07-S01': { state: 'done' } },
        currentMainMapId: 'm08-current',
        playerLevel: 72,
      }),
    ).toBeNull();
    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses: {},
        currentMainMapId: 'm08-current',
        playerLevel: 76,
      }),
    ).toBe('M08-S01');
  });

  it('returns to the main journey after the last strengthening quest', () => {
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: 'M01-S03',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(true);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: 'M06-Q02',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: 'M05-S01',
        autoQuestId: 'M04-S02',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: null,
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: 'M06-Q02',
      }),
    ).toBe(false);
  });
});
