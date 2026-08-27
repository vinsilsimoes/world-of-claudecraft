import { formatNumber } from '../../ui/i18n';
import {
  AELDRUNE_OPEN_DUNGEONS,
  AELDRUNE_PUBLIC_FACTS,
  AELDRUNE_TICKET_DUNGEONS,
} from '../aeldrune_data';
import {
  aeldruneKey,
  aeldruneText,
  cardGrid,
  contentBlock,
  contentCard,
  guideArticle,
  pageHeader,
} from './aeldrune_shared';
import type { GuidePage } from './types';

export const dungeons: GuidePage = {
  titleKey: aeldruneKey('dungeons.title'),
  render() {
    const open = cardGrid(
      AELDRUNE_OPEN_DUNGEONS.map((dungeon) =>
        contentCard(dungeon.name, aeldruneText('dungeons.openBody')),
      ),
    );
    const ticketed = cardGrid(
      AELDRUNE_TICKET_DUNGEONS.map((dungeon, index) =>
        contentCard(
          aeldruneText('dungeons.ticketName', { tier: formatNumber(index + 1) }),
          aeldruneText('dungeons.ticketMeta', {
            level: formatNumber(dungeon.startLevel),
            players: formatNumber(dungeon.recommendedPlayers),
          }),
          `<p>${aeldruneText('dungeons.recommended', { power: formatNumber(dungeon.recommendedCombatPower) })}</p>`,
        ),
      ),
    );
    return guideArticle(
      pageHeader('dungeons') +
        contentBlock(
          aeldruneText('dungeons.open'),
          `<p>${aeldruneText('dungeons.openBody')}</p>${open}`,
        ) +
        contentBlock(
          aeldruneText('dungeons.ticketed'),
          `<p>${aeldruneText('dungeons.ticketedBody', {
            cost: formatNumber(AELDRUNE_PUBLIC_FACTS.dungeonTicketCost),
            cap: formatNumber(AELDRUNE_PUBLIC_FACTS.dungeonTicketCap),
            hour: formatNumber(AELDRUNE_PUBLIC_FACTS.dungeonResetHour),
          })}</p>${ticketed}`,
        ),
    );
  },
};
