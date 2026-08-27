import { aeldruneKey, guideArticle, pageHeader, translatedBlock } from './aeldrune_shared';
import type { GuidePage } from './types';

export const howToPlay: GuidePage = {
  titleKey: aeldruneKey('how.title'),
  render: () =>
    guideArticle(
      pageHeader('how') +
        translatedBlock('how', 'start') +
        translatedBlock('how', 'mission') +
        translatedBlock('how', 'battle') +
        translatedBlock('how', 'grow'),
    ),
};
