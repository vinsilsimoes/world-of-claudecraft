import { aeldruneKey, guideArticle, pageHeader, translatedBlock } from './aeldrune_shared';
import type { GuidePage } from './types';

export const combat: GuidePage = {
  titleKey: aeldruneKey('combat.title'),
  render: () =>
    guideArticle(
      pageHeader('combat') +
        translatedBlock('combat', 'target') +
        translatedBlock('combat', 'auto') +
        translatedBlock('combat', 'skills') +
        translatedBlock('combat', 'recovery'),
    ),
};
