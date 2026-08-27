import { aeldruneKey, guideArticle, pageHeader, translatedBlock } from './aeldrune_shared';
import type { GuidePage } from './types';

export const systems: GuidePage = {
  titleKey: aeldruneKey('systems.title'),
  render: () =>
    guideArticle(
      pageHeader('systems') +
        translatedBlock('systems', 'training') +
        translatedBlock('systems', 'crafting') +
        translatedBlock('systems', 'gathering') +
        translatedBlock('systems', 'codex'),
    ),
};
