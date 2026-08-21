import { describe, expect, it } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4QuestLogView } from '../src/ui/hud/quest/mir4_questlog_view';

function state(over: Partial<Mir4PlayerUiState> = {}): Mir4PlayerUiState {
  return { classId: 1, ultimateGauge: 0, ...over };
}

describe('buildMir4QuestLogView', () => {
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
    expect(view.item?.objective).toEqual({ kind: 'reach-giver', current: 0, total: 1 });
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
    expect(view.item?.objective).toEqual({ kind: 'inspect-clues', current: 2, total: 3 });
    expect(view.item?.xpReward).toBe(1432);
    expect(view.item?.copperReward).toBe(200);
  });

  it('shows the return objective when ready and moves done quests to completed', () => {
    const ready = buildMir4QuestLogView(
      state({ mir4Quests: { mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] } } }),
    );
    expect(ready.item?.ready).toBe(true);
    expect(ready.item?.objective).toEqual({ kind: 'return-giver', current: 0, total: 1 });

    const done = buildMir4QuestLogView(
      state({ mir4Quests: { mir4_m01_q01: { state: 'done', inspected: [0, 1, 2] } } }),
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
});
