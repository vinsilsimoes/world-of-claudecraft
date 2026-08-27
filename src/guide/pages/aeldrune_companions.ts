import { formatNumber } from '../../ui/i18n';
import { AELDRUNE_MOUNTS, AELDRUNE_SPIRITS } from '../aeldrune_data';
import {
  aeldruneKey,
  aeldruneText,
  contentBlock,
  guideArticle,
  pageHeader,
  translatedBlock,
} from './aeldrune_shared';
import type { GuidePage } from './types';

export const companions: GuidePage = {
  titleKey: aeldruneKey('companions.title'),
  render() {
    const spiritGrades = new Set(AELDRUNE_SPIRITS.map((entry) => entry.gradeKey)).size;
    const mountGrades = new Set(AELDRUNE_MOUNTS.map((entry) => entry.gradeKey)).size;
    return guideArticle(
      pageHeader('companions') +
        contentBlock(
          aeldruneText('companions.spirits'),
          `<p>${aeldruneText('companions.spiritsBody', { count: formatNumber(AELDRUNE_SPIRITS.length) })}</p><p>${aeldruneText('companions.gradeCount', { count: formatNumber(spiritGrades) })}</p>`,
        ) +
        contentBlock(
          aeldruneText('companions.mounts'),
          `<p>${aeldruneText('companions.mountsBody', { count: formatNumber(AELDRUNE_MOUNTS.length) })}</p><p>${aeldruneText('companions.gradeCount', { count: formatNumber(mountGrades) })}</p>`,
        ) +
        translatedBlock('companions', 'summon'),
    );
  },
};
