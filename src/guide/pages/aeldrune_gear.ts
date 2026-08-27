import type { Mir4EquipmentMetal } from '../../sim/content/mir4/item_progression';
import { esc } from '../../ui/esc';
import { formatNumber, type TranslationKey, t } from '../../ui/i18n';
import {
  AELDRUNE_ITEM_RANKS,
  AELDRUNE_MINING_DISTRICTS,
  AELDRUNE_PUBLIC_FACTS,
} from '../aeldrune_data';
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

const METAL_NAME_KEYS: Readonly<Record<Mir4EquipmentMetal, TranslationKey>> = {
  metalCommon: 'hudChrome.mir4.materials.metalCommon',
  metalUncommon: 'hudChrome.mir4.materials.metalUncommon',
  metalRare: 'hudChrome.mir4.materials.metalRare',
  metalEpic: 'hudChrome.mir4.materials.metalEpic',
  metalLegendary: 'hudChrome.mir4.materials.metalLegendary',
  metalMythic: 'hudChrome.mir4.materials.metalMythic',
};

const RARITY_NAME_KEYS: readonly TranslationKey[] = [
  'itemUi.quality.common',
  'itemUi.quality.uncommon',
  'itemUi.quality.rare',
  'itemUi.quality.epic',
  'itemUi.quality.legendary',
  'game.milestone.mythic',
];

export const gear: GuidePage = {
  titleKey: aeldruneKey('gear.title'),
  render() {
    const ranks = AELDRUNE_ITEM_RANKS.map((rank) =>
      contentCard(
        aeldruneText('gear.rankTitle', {
          rarity: t(RARITY_NAME_KEYS[rank.catalogRank - 1] ?? 'itemUi.quality.common'),
        }),
        aeldruneText('gear.rankMeta', {
          metal: t(METAL_NAME_KEYS[rank.metal]),
          metalCount: formatNumber(rank.metalCount),
          darksteel: formatNumber(rank.darksteelCost),
        }),
        `<p>${esc(
          aeldruneText(
            rank.previousCatalogRank === null
              ? 'gear.commonRequirement'
              : 'gear.previousItemRequirement',
          ),
        )}</p>`,
      ),
    );
    const miningBands = AELDRUNE_MINING_DISTRICTS.reduce<
      Array<{ first: number; last: number; metals: readonly Mir4EquipmentMetal[] }>
    >((bands, district) => {
      const metals = district.metals.join('|');
      const previous = bands.at(-1);
      if (previous && previous.metals.join('|') === metals) {
        previous.last = district.sequence;
      } else {
        bands.push({ first: district.sequence, last: district.sequence, metals: district.metals });
      }
      return bands;
    }, []);
    const miningCards = miningBands.map((band) =>
      contentCard(
        aeldruneText('gear.miningBandTitle', {
          first: formatNumber(band.first),
          last: formatNumber(band.last),
        }),
        aeldruneText('gear.miningBandBody', {
          metals: band.metals.map((metal) => t(METAL_NAME_KEYS[metal])).join(', '),
        }),
      ),
    );
    return guideArticle(
      pageHeader('gear') +
        translatedBlock('gear', 'inventory') +
        translatedBlock('gear', 'progression') +
        `<p>${esc(aeldruneText('gear.campaignGate'))}</p>` +
        contentBlock(aeldruneText('gear.progression'), cardGrid(ranks)) +
        translatedBlock('gear', 'metalConversion') +
        translatedBlock('gear', 'miningSources') +
        contentBlock(aeldruneText('gear.miningBands'), cardGrid(miningCards)) +
        contentBlock(
          aeldruneText('gear.codex'),
          `<p>${esc(
            aeldruneText('gear.codexBody', {
              level: formatNumber(AELDRUNE_PUBLIC_FACTS.codexUnlockLevel),
            }),
          )}</p>`,
        ),
    );
  },
};
