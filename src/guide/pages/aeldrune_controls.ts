import { aeldruneKey, guideArticle, pageHeader, translatedBlock } from './aeldrune_shared';
import type { GuidePage } from './types';

export const controls: GuidePage = {
  titleKey: aeldruneKey('controls.title'),
  render: () =>
    guideArticle(
      pageHeader('controls') +
        translatedBlock('controls', 'movement') +
        translatedBlock('controls', 'panels') +
        translatedBlock('controls', 'action'),
    ),
};
