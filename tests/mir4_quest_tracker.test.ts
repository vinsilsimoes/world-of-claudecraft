import { describe, expect, it } from 'vitest';
import { mir4QuestTrackerEntries } from '../src/sim/mir4/quest_tracker';

describe('MIR4 quest tracker campaign priority', () => {
  it('shows initial campaign Q01 on a full host with zero quest state', () => {
    const entries = mir4QuestTrackerEntries({
      playerLevel: 1,
      fullCampaignAvailable: true,
    });

    expect(entries).toEqual([
      expect.objectContaining({
        id: 'M01-Q01',
        autoJourneyAvailable: true,
        autoJourneyActive: false,
        objective: { kind: 'reach-giver', current: 0, total: 1 },
      }),
    ]);
  });

  it('offers explicit Auto Mission routes for the main quest and a ready repeatable', () => {
    const entries = mir4QuestTrackerEntries({
      mir4ArcQuests: {
        'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'ready' },
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(['M01-Q01', 'M01-R01']);
    expect(entries[0]).toMatchObject({
      autoJourneyAvailable: true,
      autoJourneyActive: false,
      objective: { kind: 'reach-giver' },
    });
    expect(entries[1]?.autoJourneyAvailable).toBe(true);
  });

  it('keeps the planned main quest visible before ready repeatables', () => {
    const entries = mir4QuestTrackerEntries({
      mir4ArcQuests: {
        'M01-Q01': { questId: 'M01-Q01', stageIndex: 7, stageProgress: 0, state: 'done' },
        'M01-Q02': { questId: 'M01-Q02', stageIndex: 7, stageProgress: 0, state: 'done' },
        'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'ready' },
        'M01-R02': { questId: 'M01-R02', stageIndex: 2, stageProgress: 0, state: 'ready' },
      },
      mir4AutoQuest: {
        questId: 'M01-Q03',
        phase: 'to-giver',
        siteIndex: 0,
        suspended: false,
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(['M01-Q03', 'M01-R01', 'M01-R02']);
    expect(entries[0]).toMatchObject({
      autoJourneyAvailable: true,
      autoJourneyActive: true,
      objective: { kind: 'reach-giver' },
    });
    expect(entries.slice(1).every((entry) => entry.autoJourneyAvailable === true)).toBe(true);
  });

  it('offers Stop on the active journey and lets another row replace it', () => {
    const entries = mir4QuestTrackerEntries({
      mir4ArcQuests: {
        'M01-Q01': { questId: 'M01-Q01', stageIndex: 7, stageProgress: 0, state: 'done' },
        'M01-Q02': { questId: 'M01-Q02', stageIndex: 7, stageProgress: 0, state: 'done' },
        'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'ready' },
      },
      mir4AutoQuest: {
        questId: 'M01-R01',
        phase: 'return',
        siteIndex: 2,
        suspended: false,
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(['M01-Q03', 'M01-R01']);
    expect(entries[0]).toMatchObject({
      autoJourneyAvailable: true,
      autoJourneyActive: false,
    });
    expect(entries[1]).toMatchObject({
      autoJourneyAvailable: true,
      autoJourneyActive: true,
    });
  });

  it('keeps Stop on the active journey during the turn-in completion tick', () => {
    const entries = mir4QuestTrackerEntries({
      playerLevel: 3,
      mir4ArcQuests: {
        'M01-Q01': {
          questId: 'M01-Q01',
          stageIndex: 7,
          stageProgress: 0,
          state: 'done',
        },
      },
      mir4AutoQuest: {
        questId: 'M01-Q01',
        phase: 'return',
        siteIndex: 7,
        suspended: false,
      },
    });

    expect(entries.find((entry) => entry.id === 'M01-Q01')).toMatchObject({
      complete: true,
      autoJourneyActive: true,
      autoJourneyAvailable: true,
    });
    expect(entries.find((entry) => entry.id === 'M01-Q02')?.autoJourneyAvailable).toBe(true);
  });

  it('keeps the next main quest ahead of repeatable grind regardless of its recommended level', () => {
    const mir4ArcQuests = {
      'M01-Q01': { questId: 'M01-Q01', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q03': { questId: 'M01-Q03', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q04': { questId: 'M01-Q04', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'ready' as const },
    };

    const levelSeven = mir4QuestTrackerEntries({ playerLevel: 7, mir4ArcQuests });
    expect(levelSeven.map((entry) => entry.id)).toEqual(['M01-Q05', 'M01-R01']);
    expect(levelSeven[0]?.autoJourneyAvailable).toBe(true);
    expect(levelSeven[1]?.autoJourneyAvailable).toBe(true);

    const levelEight = mir4QuestTrackerEntries({ playerLevel: 8, mir4ArcQuests });
    expect(levelEight).toEqual(levelSeven);
  });

  it('keeps restored progress from unbuilt maps out of the tracker', () => {
    const entries = mir4QuestTrackerEntries({
      campaignMapIds: ['m01-vila-do-vau', 'm02-trilha-dos-juncos'],
      mir4ArcQuests: {
        'M02-Q04': { questId: 'M02-Q04', stageIndex: 2, stageProgress: 1, state: 'active' },
        'M03-Q01': { questId: 'M03-Q01', stageIndex: 2, stageProgress: 1, state: 'active' },
      },
    });

    expect(entries.map((entry) => entry.id)).toEqual(['M02-Q04']);
  });

  it('keeps manual side-quest receipt stages as detail rows instead of false routes', () => {
    const entries = mir4QuestTrackerEntries({
      playerLevel: 7,
      mir4ArcQuests: {
        'M01-Q05': { questId: 'M01-Q05', stageIndex: 1, stageProgress: 0, state: 'active' },
        'M01-S01': { questId: 'M01-S01', stageIndex: 2, stageProgress: 0, state: 'active' },
        'M01-S02': { questId: 'M01-S02', stageIndex: 1, stageProgress: 0, state: 'active' },
      },
    });

    expect(entries.find((entry) => entry.id === 'M01-S01')?.autoJourneyAvailable).toBe(false);
    expect(entries.find((entry) => entry.id === 'M01-S02')?.autoJourneyAvailable).toBe(true);
  });
});
