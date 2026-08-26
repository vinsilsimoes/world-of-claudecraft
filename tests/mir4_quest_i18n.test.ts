import { afterEach, describe, expect, it } from 'vitest';
import {
  MIR4_QUESTS_ARC,
  mir4ArcNpcIdentity,
  mir4ArcQuest,
} from '../src/sim/content/mir4/arc_campaign';
import { ensureLocaleLoaded, setLanguage } from '../src/ui/i18n';
import {
  mir4NoticeboardMessage,
  mir4QuestNarrative,
  mir4QuestObjectiveLabel,
  mir4QuestTitle,
  mir4QuestTurnInName,
} from '../src/ui/mir4_quest_i18n';

afterEach(() => setLanguage('en'));

describe('MIR4 campaign quest localization', () => {
  it('renders the canonical campaign script instead of placeholder copy', () => {
    const quest = mir4ArcQuest('M03-Q04')!;
    expect(mir4QuestTitle('M03-Q04')).toBe(quest.title);
    expect(mir4QuestNarrative('M03-Q04')).toBe(quest.purpose);
    expect(mir4QuestTurnInName()).toBe('Campaign contact');
  });

  it.each([
    ['talk', 'Speak with the campaign contact'],
    ['travel', 'Travel to the marked objective'],
    ['selective-hunt', 'Defeat the marked enemies'],
    ['escort-supply-run', 'Escort the supply group'],
    ['craft-receipt', 'Craft the requested supplies'],
    ['short-dungeon-clear', 'Clear the campaign dungeon'],
  ])('localizes the %s stage through its stable kind', (stageKind, expected) => {
    expect(
      mir4QuestObjectiveLabel({
        questId: 'M03-Q04',
        kind: 'campaign-stage',
        stageKind,
        ready: false,
      }),
    ).toBe(expected);
  });

  it('uses the existing localized First Traces copy for the legacy slice', () => {
    expect(
      mir4QuestObjectiveLabel({
        questId: 'mir4_m01_q01',
        kind: 'inspect-clues',
        ready: false,
      }),
    ).toBe('Inspect clues');
    expect(mir4QuestTitle('mir4_m01_q01')).toBe('First Traces');
  });

  it('names the actual canonical campaign giver and turn-in contact', () => {
    expect(
      mir4QuestObjectiveLabel({
        questId: 'M01-Q03',
        kind: 'reach-giver',
        ready: false,
      }),
    ).toBe('Travel to the marked objective: Ilyra da Centelha');
    expect(
      mir4QuestObjectiveLabel({
        questId: 'M01-Q03',
        kind: 'return-giver',
        ready: true,
      }),
    ).toBe('Return to Ilyra da Centelha');
  });

  it('always names the canonical turn-in NPC for authored main and side quests', () => {
    for (const quest of MIR4_QUESTS_ARC.filter((candidate) => candidate.group !== 'repeatable')) {
      const contact = mir4ArcNpcIdentity(quest.turnInNpcId);
      expect(contact, quest.questId).toBeDefined();
      const displayedName = mir4QuestTurnInName(quest.questId);
      const label = mir4QuestObjectiveLabel({
        questId: quest.questId,
        kind: 'campaign-stage',
        ready: true,
      });
      expect(label, quest.questId).toContain(displayedName);
      expect(label, quest.questId).not.toContain('campaign contact');
    }
  });

  it('builds noticeboard feedback from the canonical quest title', () => {
    expect(mir4NoticeboardMessage('M03-Q04')).toBe('Contract active: O Covil em Silêncio');
    expect(mir4NoticeboardMessage()).toBe('Nothing seems posted.');
  });

  it('keeps canonical local-playtest copy stable in another resident locale', async () => {
    await ensureLocaleLoaded('ja_JP');
    setLanguage('ja_JP');
    const title = mir4QuestTitle('M03-Q04');
    const objective = mir4QuestObjectiveLabel({
      questId: 'M03-Q04',
      kind: 'campaign-stage',
      stageKind: 'inspect-clues',
      ready: false,
    });
    expect(title).toBe(mir4ArcQuest('M03-Q04')!.title);
    expect(objective).toBe('マークされた証拠を調べる');
  });

  it('renders the exact current campaign stage when its index is available', () => {
    const quest = mir4ArcQuest('M03-Q04')!;
    expect(
      mir4QuestObjectiveLabel({
        questId: quest.questId,
        kind: 'campaign-stage',
        stageKind: quest.stages[3]!.kind,
        stageIndex: 3,
        ready: false,
      }),
    ).toBe(quest.stages[3]!.text);
  });

  it('names the exact place and objects used by the Vila do Vau oath', () => {
    const quest = mir4ArcQuest('M01-S03');
    expect(
      mir4QuestObjectiveLabel({
        questId: 'M01-S03',
        kind: 'campaign-stage',
        stageKind: 'prepare-civilians',
        stageIndex: 1,
        ready: false,
      }),
    ).toBe(
      'Vá à Ponte das Sete Marcas e prepare as 3 caixas de suprimentos civis marcadas, uma de cada vez.',
    );
    expect(quest?.dialogue[0]).toBe(
      'Maela do Vau: Leve mantimentos à Ponte das Sete Marcas. Prepare as três caixas marcadas, uma de cada vez, antes de assumir a defesa.',
    );
  });
});
