import { esc } from '../../ui/esc';
import { formatNumber } from '../../ui/i18n';
import { AELDRUNE_QUEST_GROUPS, AELDRUNE_QUESTS } from '../aeldrune_data';
import {
  aeldruneKey,
  aeldruneText,
  cardGrid,
  contentBlock,
  contentCard,
  guideArticle,
  pageHeader,
  translatedBlock,
} from './aeldrune_shared';
import type { GuidePage } from './types';

export const quests: GuidePage = {
  titleKey: aeldruneKey('quests.title'),
  render() {
    const counts = cardGrid(
      AELDRUNE_QUEST_GROUPS.map((group) =>
        contentCard(aeldruneText(group.labelKey), formatNumber(group.count)),
      ),
    );
    const catalog = AELDRUNE_QUEST_GROUPS.map((group) => {
      const entries = AELDRUNE_QUESTS.filter((quest) => quest.group === group.id).map((quest) =>
        contentCard(
          quest.title,
          quest.purpose ?? quest.stages[0]?.text ?? quest.questId,
          `<p>${esc(quest.questId)}</p>`,
          `quest-${quest.questId}`,
        ),
      );
      return contentBlock(
        `${aeldruneText(group.labelKey)} · ${formatNumber(group.count)}`,
        cardGrid(entries),
      );
    }).join('');
    return guideArticle(
      pageHeader('quests') +
        contentBlock(aeldruneText('quests.catalog'), counts) +
        translatedBlock('quests', 'campaign') +
        translatedBlock('quests', 'objectives') +
        catalog,
    );
  },
};
