import { describe, expect, it } from 'vitest';
import {
  mir4AutoJourneyCandidate,
  mir4AutoJourneyCandidateForQuest,
  mir4AutoJourneyStageSupported,
} from '../src/sim/mir4/auto_journey_selection';

describe('MIR4 Auto Journey selection', () => {
  it('selects campaign M01-Q01 on a full host with no saved quest state', () => {
    expect(mir4AutoJourneyCandidate({ fullCampaignAvailable: true })).toMatchObject({
      questId: 'M01-Q01',
      phase: 'to-giver',
      active: false,
    });
  });

  it('keeps the campaign first when only a repeatable contract is restored', () => {
    const candidate = mir4AutoJourneyCandidate({
      mir4ArcQuests: {
        'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'active' },
      },
    });

    expect(candidate).toMatchObject({
      questId: 'M01-Q01',
      phase: 'to-giver',
      active: false,
    });
  });

  it('selects the currently active journey as the only global stop target', () => {
    const candidate = mir4AutoJourneyCandidate({
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

    expect(candidate).toMatchObject({
      questId: 'M01-R01',
      phase: 'return',
      active: true,
    });
  });

  it('matches the non-main stages the runtime can drive', () => {
    expect(mir4AutoJourneyStageSupported({ kind: 'system-tutorial' })).toBe(true);
    expect(mir4AutoJourneyStageSupported({ kind: 'inspect-and-resolve-elite' })).toBe(true);
    expect(mir4AutoJourneyStageSupported({ kind: 'escort-supply-run' })).toBe(true);
    expect(mir4AutoJourneyStageSupported({ kind: 'repair-public-anchor' })).toBe(true);
    expect(mir4AutoJourneyStageSupported({ kind: 'deliver-local-materials' })).toBe(false);
  });

  it('starts supported side stages only when the full campaign host is unavailable', () => {
    expect(
      mir4AutoJourneyCandidate(
        {
          playerLevel: 0,
          mir4ArcQuests: {
            'M01-R02': {
              questId: 'M01-R02',
              stageIndex: 0,
              stageProgress: 0,
              state: 'active',
            },
          },
        },
        { fullCampaignAvailable: false },
      )?.questId,
    ).toBe('M01-R02');

    expect(
      mir4AutoJourneyCandidate(
        {
          playerLevel: 0,
          mir4ArcQuests: {
            'M01-R01': {
              questId: 'M01-R01',
              stageIndex: 0,
              stageProgress: 0,
              state: 'active',
            },
          },
        },
        { fullCampaignAvailable: true },
      )?.questId,
    ).toBe('M01-Q01');
  });

  it('keeps the main campaign available below its recommended level', () => {
    const progress = {
      'M01-Q01': { questId: 'M01-Q01', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q03': { questId: 'M01-Q03', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-Q04': { questId: 'M01-Q04', stageIndex: 7, stageProgress: 0, state: 'done' as const },
      'M01-R01': { questId: 'M01-R01', stageIndex: 2, stageProgress: 0, state: 'ready' as const },
    };

    expect(mir4AutoJourneyCandidate({ playerLevel: 7, mir4ArcQuests: progress })?.questId).toBe(
      'M01-Q05',
    );
    expect(mir4AutoJourneyCandidate({ playerLevel: 8, mir4ArcQuests: progress })?.questId).toBe(
      'M01-Q05',
    );
  });

  it('stops at the last approved map instead of selecting an unbuilt next map', () => {
    const done = Object.fromEntries(
      [
        'M01-Q01',
        'M01-Q02',
        'M01-Q03',
        'M01-Q04',
        'M01-Q05',
        'M01-Q06',
        'M02-Q01',
        'M02-Q02',
        'M02-Q03',
        'M02-Q04',
        'M02-Q05',
        'M02-Q06',
      ].map((questId) => [
        questId,
        { questId, stageIndex: 99, stageProgress: 0, state: 'done' as const },
      ]),
    );
    const state = {
      campaignMapIds: ['m01-vila-do-vau', 'm02-trilha-dos-juncos'],
      mir4ArcQuests: done,
    } as const;

    expect(mir4AutoJourneyCandidate(state)).toBeNull();
    expect(mir4AutoJourneyCandidateForQuest(state, 'M03-Q01')).toBeNull();
  });

  it('selects an explicitly clicked side quest while the main campaign remains active', () => {
    const state = {
      playerLevel: 72,
      fullCampaignAvailable: true,
      mir4ArcQuests: {
        'M08-Q04': {
          questId: 'M08-Q04',
          stageIndex: 2,
          stageProgress: 0,
          state: 'active' as const,
        },
        'M08-S01': {
          questId: 'M08-S01',
          stageIndex: 0,
          stageProgress: 0,
          state: 'active' as const,
        },
      },
    };

    expect(mir4AutoJourneyCandidate(state)?.questId).toBe('M08-Q04');
    expect(mir4AutoJourneyCandidateForQuest(state, 'M08-S01')).toMatchObject({
      questId: 'M08-S01',
      phase: 'to-site',
      active: false,
    });
  });
});
