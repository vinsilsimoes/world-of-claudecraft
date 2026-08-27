import { esc } from '../../ui/esc';
import { formatNumber } from '../../ui/i18n';
import { AELDRUNE_MAPS } from '../aeldrune_data';
import {
  aeldruneKey,
  aeldruneText,
  cardGrid,
  contentBlock,
  contentCard,
  guideArticle,
  humanizeCatalogToken,
  pageHeader,
  translatedBlock,
} from './aeldrune_shared';
import type { GuidePage } from './types';

export const world: GuidePage = {
  titleKey: aeldruneKey('world.title'),
  render() {
    const mapCards = AELDRUNE_MAPS.map((map) =>
      contentCard(
        `${formatNumber(map.sequence)}. ${map.name}`,
        `${aeldruneText('world.act', { act: formatNumber(map.act) })} · ${aeldruneText('world.levels', { min: formatNumber(map.levelMin), max: formatNumber(map.levelMax) })} · ${aeldruneText(map.isCity ? 'world.city' : 'world.wilderness')}`,
        `<p>${esc(humanizeCatalogToken(map.environment))}</p>`,
        `map-${map.mapId}`,
      ),
    );
    return guideArticle(
      pageHeader('world') +
        translatedBlock('world', 'route') +
        contentBlock(aeldruneText('world.title'), cardGrid(mapCards)),
    );
  },
};
