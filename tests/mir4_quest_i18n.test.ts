import { afterEach, describe, expect, it } from 'vitest';
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
  it('resolves stable campaign ids without leaking source-authored Portuguese', () => {
    expect(mir4QuestTitle('M03-Q04')).toBe('Campaign M03-Q04');
    expect(mir4QuestNarrative('M03-Q04')).toBe(
      'Complete the current campaign objectives for M03-Q04.',
    );
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

  it('builds noticeboard feedback from the quest id rather than wire prose', () => {
    expect(mir4NoticeboardMessage('M03-Q04')).toBe('Contract active: Campaign M03-Q04');
    expect(mir4NoticeboardMessage()).toBe('Nothing seems posted.');
  });

  it('falls back to localized English rather than source prose in another resident locale', async () => {
    await ensureLocaleLoaded('ja_JP');
    setLanguage('ja_JP');
    const title = mir4QuestTitle('M03-Q04');
    const objective = mir4QuestObjectiveLabel({
      questId: 'M03-Q04',
      kind: 'campaign-stage',
      stageKind: 'inspect-clues',
      ready: false,
    });
    expect(title).not.toContain('Covil');
    expect(objective).not.toContain('vestígios');
  });
});
