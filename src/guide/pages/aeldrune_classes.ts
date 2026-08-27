import { esc } from '../../ui/esc';
import { AELDRUNE_CLASSES } from '../aeldrune_data';
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

export const classes: GuidePage = {
  titleKey: aeldruneKey('classes.title'),
  render() {
    const classCards = AELDRUNE_CLASSES.map((entry) => {
      const detail = [
        `${aeldruneText('classes.weapon')}: ${humanizeCatalogToken(entry.weapon)}`,
        `${aeldruneText('classes.damage')}: ${humanizeCatalogToken(entry.damageChannel)}`,
        `${aeldruneText('classes.range')}: ${humanizeCatalogToken(entry.rangeBand)}`,
      ].join(' · ');
      const skillNames = entry.skills.map((skill) => skill.displayName).join(', ');
      return contentCard(
        entry.name,
        detail,
        `<p><strong>${esc(aeldruneText('classes.skills'))}:</strong> ${esc(skillNames)}</p>`,
      );
    });
    return guideArticle(
      pageHeader('classes') +
        contentBlock(aeldruneText('classes.title'), cardGrid(classCards)) +
        translatedBlock('classes', 'skillUnlocks'),
    );
  },
};
