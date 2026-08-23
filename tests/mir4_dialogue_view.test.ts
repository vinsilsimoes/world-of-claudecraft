import { describe, expect, it } from 'vitest';
import {
  mir4ArcNpcIdentity,
  mir4ArcNpcTemplateId,
  mir4ArcQuest,
} from '../src/sim/content/mir4/arc_campaign';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4NpcDialogueView } from '../src/ui/hud/quest/mir4_dialogue_view';

function state(
  mir4ArcQuests: Mir4PlayerUiState['mir4ArcQuests'] = {},
): Readonly<Mir4PlayerUiState> {
  return { playerLevel: 1, mir4ArcQuests } as Readonly<Mir4PlayerUiState>;
}

describe('MIR4 dialogue projection on the existing WoC quest dialog', () => {
  it('shows the authored acceptance conversation for the next main quest', () => {
    const quest = mir4ArcQuest('M01-Q01')!;
    const npc = mir4ArcNpcIdentity(quest.giverNpcId)!;
    const view = buildMir4NpcDialogueView(mir4ArcNpcTemplateId(npc.id), state());

    expect(view).toMatchObject({
      npcName: npc.name,
      questId: quest.questId,
      questTitle: quest.title,
      action: 'accept',
    });
    expect(view?.lines.some((line) => line.text.includes('Primeiros Rastros'.toLowerCase()))).toBe(
      true,
    );
  });

  it('switches to completion dialogue only at the authored turn-in NPC', () => {
    const quest = mir4ArcQuest('M01-Q01')!;
    const progress = {
      questId: quest.questId,
      stageIndex: quest.stages.length,
      stageProgress: 0,
      state: 'ready' as const,
    };
    const turnIn = buildMir4NpcDialogueView(
      mir4ArcNpcTemplateId(quest.turnInNpcId),
      state({ [quest.questId]: progress }),
    );

    expect(turnIn?.action).toBe('complete');
    expect(turnIn?.lines.some((line) => line.text.includes('Registramos'))).toBe(true);
  });

  it('shows current objective progress when a talk stage targets this NPC', () => {
    const quest = mir4ArcQuest('M01-Q02')!;
    const progress = {
      questId: quest.questId,
      stageIndex: 0,
      stageProgress: 0,
      state: 'active' as const,
    };
    const view = buildMir4NpcDialogueView(
      mir4ArcNpcTemplateId(quest.giverNpcId),
      state({ [quest.questId]: progress }),
    );

    expect(view?.action).toBe('advance');
    expect(view?.objectiveText).toBe(quest.stages[0]!.text);
    expect(view?.progress).toEqual({ current: 0, total: 1 });
  });
});
