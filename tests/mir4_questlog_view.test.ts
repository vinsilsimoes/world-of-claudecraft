import { describe, expect, it } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4QuestLogView } from '../src/ui/hud/quest/mir4_questlog_view';

function state(over: Partial<Mir4PlayerUiState> = {}): Mir4PlayerUiState {
  return { classId: 1, ultimateGauge: 0, ...over };
}

describe('buildMir4QuestLogView', () => {
  it('shows initial campaign Q01 when the full host reports zero quest state', () => {
    const view = buildMir4QuestLogView(state({ playerLevel: 1, fullCampaignAvailable: true }));

    expect(view.item).toMatchObject({
      questId: 'M01-Q01',
      autoJourneyAvailable: true,
      autoJourneyActive: false,
      objective: { kind: 'reach-giver', current: 0, total: 1 },
    });
  });

  it('keeps the log empty before the quest or journey begins', () => {
    expect(buildMir4QuestLogView(state())).toEqual({
      summary: { active: 0, completed: 0 },
      item: null,
      empty: true,
    });
  });

  it('shows the planned journey to the giver before acceptance', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4AutoQuest: {
          questId: 'mir4_m01_q01',
          phase: 'to-giver',
          siteIndex: 0,
          suspended: true,
        },
      }),
    );
    expect(view.summary).toEqual({ active: 1, completed: 0 });
    expect(view.item?.objective).toEqual({
      kind: 'reach-giver',
      current: 0,
      total: 1,
    });
    expect(view.item?.autoJourneyActive).toBe(true);
    expect(view.item?.autoJourneySuspended).toBe(true);
  });

  it('projects authoritative clue progress and exact rewards', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4Quests: {
          mir4_m01_q01: { state: 'active', inspected: [0, 2] },
        },
      }),
    );
    expect(view.item?.objective).toEqual({
      kind: 'inspect-clues',
      current: 2,
      total: 3,
    });
    expect(view.item?.xpReward).toBe(1432);
    expect(view.item?.copperReward).toBe(200);
  });

  it('shows the return objective when ready and moves done quests to completed', () => {
    const ready = buildMir4QuestLogView(
      state({
        mir4Quests: { mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] } },
      }),
    );
    expect(ready.item?.ready).toBe(true);
    expect(ready.item?.objective).toEqual({
      kind: 'return-giver',
      current: 0,
      total: 1,
    });

    const done = buildMir4QuestLogView(
      state({
        mir4Quests: { mir4_m01_q01: { state: 'done', inspected: [0, 1, 2] } },
      }),
    );
    expect(done).toEqual({
      summary: { active: 0, completed: 1 },
      item: null,
      empty: true,
    });
  });

  it('projects the active full-campaign contract through the existing quest log chrome', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4ArcQuests: {
          'M03-Q04': {
            questId: 'M03-Q04',
            stageIndex: 3,
            stageProgress: 2,
            state: 'active',
          },
          'M01-Q01': {
            questId: 'M01-Q01',
            stageIndex: 7,
            stageProgress: 0,
            state: 'done',
          },
        },
      }),
    );
    expect(view.summary).toEqual({ active: 1, completed: 1 });
    expect(view.item).toMatchObject({
      questId: 'M03-Q04',
      objective: {
        kind: 'campaign-stage',
        stageKind: 'selective-hunt',
        current: 2,
        total: 4,
      },
      xpReward: 84223,
      copperReward: 7200,
    });
    expect(view.item).not.toHaveProperty('title');
    expect(view.item).not.toHaveProperty('narrative');
    expect(view.item?.objective).not.toHaveProperty('label');
  });

  it('does not surface restored quest rows from maps that are not built yet', () => {
    const view = buildMir4QuestLogView(
      state({
        campaignMapIds: ['m01-vila-do-vau', 'm02-trilha-dos-juncos'],
        mir4ArcQuests: {
          'M02-Q04': {
            questId: 'M02-Q04',
            stageIndex: 2,
            stageProgress: 1,
            state: 'active',
          },
          'M03-Q01': {
            questId: 'M03-Q01',
            stageIndex: 2,
            stageProgress: 1,
            state: 'active',
          },
        },
      }),
    );

    expect(view.item?.questId).toBe('M02-Q04');
    expect(view.summary).toEqual({ active: 1, completed: 0 });
  });

  it('shows the next main quest ahead of ready repeatables', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4ArcQuests: {
          'M01-Q01': {
            questId: 'M01-Q01',
            stageIndex: 7,
            stageProgress: 0,
            state: 'done',
          },
          'M01-Q02': {
            questId: 'M01-Q02',
            stageIndex: 7,
            stageProgress: 0,
            state: 'done',
          },
          'M01-R01': {
            questId: 'M01-R01',
            stageIndex: 2,
            stageProgress: 0,
            state: 'ready',
          },
          'M01-R02': {
            questId: 'M01-R02',
            stageIndex: 2,
            stageProgress: 0,
            state: 'ready',
          },
        },
        mir4AutoQuest: {
          questId: 'M01-Q03',
          phase: 'to-giver',
          siteIndex: 0,
          suspended: false,
        },
      }),
    );

    expect(view.item).toMatchObject({
      questId: 'M01-Q03',
      autoJourneyActive: true,
      autoJourneyAvailable: true,
      objective: { kind: 'reach-giver', current: 0, total: 1 },
    });
    expect(view.item?.questId).not.toBe('M01-R01');
  });

  it('shows initial M01-Q01 instead of offering Auto Journey on a repeatable', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4ArcQuests: {
          'M01-R01': {
            questId: 'M01-R01',
            stageIndex: 2,
            stageProgress: 0,
            state: 'ready',
          },
        },
      }),
    );

    expect(view.item).toMatchObject({
      questId: 'M01-Q01',
      autoJourneyActive: false,
      autoJourneyAvailable: true,
      objective: { kind: 'reach-giver' },
    });
  });

  it('shows Stop on the active repeatable instead of Start on the next main quest', () => {
    const view = buildMir4QuestLogView(
      state({
        mir4ArcQuests: {
          'M01-Q01': {
            questId: 'M01-Q01',
            stageIndex: 7,
            stageProgress: 0,
            state: 'done',
          },
          'M01-Q02': {
            questId: 'M01-Q02',
            stageIndex: 7,
            stageProgress: 0,
            state: 'done',
          },
          'M01-R01': {
            questId: 'M01-R01',
            stageIndex: 2,
            stageProgress: 0,
            state: 'ready',
          },
        },
        mir4AutoQuest: {
          questId: 'M01-R01',
          phase: 'return',
          siteIndex: 2,
          suspended: false,
        },
      }),
    );

    expect(view.item).toMatchObject({
      questId: 'M01-R01',
      autoJourneyActive: true,
      autoJourneyAvailable: true,
    });
  });

  it('keeps Stop on the active journey during the turn-in completion tick', () => {
    const view = buildMir4QuestLogView(
      state({
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
      }),
    );

    expect(view.item).toMatchObject({
      questId: 'M01-Q01',
      ready: true,
      autoJourneyActive: true,
      autoJourneyAvailable: true,
    });
  });

  it('keeps the next main visible when its recommended level exceeds the player level', () => {
    const mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done' as const,
      },
      'M01-Q02': {
        questId: 'M01-Q02',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done' as const,
      },
      'M01-Q03': {
        questId: 'M01-Q03',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done' as const,
      },
      'M01-Q04': {
        questId: 'M01-Q04',
        stageIndex: 7,
        stageProgress: 0,
        state: 'done' as const,
      },
      'M01-R01': {
        questId: 'M01-R01',
        stageIndex: 2,
        stageProgress: 0,
        state: 'ready' as const,
      },
    };

    expect(buildMir4QuestLogView(state({ playerLevel: 7, mir4ArcQuests })).item?.questId).toBe(
      'M01-Q05',
    );
    expect(buildMir4QuestLogView(state({ playerLevel: 8, mir4ArcQuests })).item?.questId).toBe(
      'M01-Q05',
    );
  });
});
