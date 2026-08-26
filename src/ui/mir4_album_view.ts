import {
  MIR4_ALBUM_STAT_KEYS,
  type Mir4AlbumBonuses,
  type Mir4AlbumStatKey,
} from '../sim/mir4/collection_album';
import { formatNumber, type TranslationKey, t } from './i18n';

const STAT_KEYS: Readonly<Record<Mir4AlbumStatKey, TranslationKey>> = {
  maxHp: 'hudChrome.mir4.stats.maxHp',
  maxMana: 'hudChrome.mir4.stats.maxMana',
  physicalAttack: 'hudChrome.mir4.stats.physicalAttack',
  magicAttack: 'hudChrome.mir4.stats.magicAttack',
  physicalDefense: 'hudChrome.mir4.stats.physicalDefense',
  magicDefense: 'hudChrome.mir4.stats.magicDefense',
  accuracy: 'hudChrome.mir4.stats.accuracy',
  dodge: 'hudChrome.mir4.stats.dodge',
  critical: 'hudChrome.mir4.stats.critical',
  avoidCritical: 'hudChrome.mir4.stats.avoidCritical',
  criticalOutcome: 'hudChrome.mir4.stats.criticalOutcome',
  penetrationBps: 'hudChrome.mir4.stats.penetration',
  bossDamageBps: 'hudChrome.mir4.stats.bossDamage',
  skillDamageBps: 'hudChrome.mir4.stats.skillDamage',
};

export interface Mir4AlbumStatView {
  key: Mir4AlbumStatKey;
  label: string;
  current: string;
  maximum: string;
}

export function mir4AlbumStatLabel(stat: Mir4AlbumStatKey): string {
  return t(STAT_KEYS[stat]);
}

export function formatMir4AlbumAmount(stat: Mir4AlbumStatKey, amount: number): string {
  if (stat === 'penetrationBps' || stat === 'bossDamageBps' || stat === 'skillDamageBps') {
    return `${formatNumber(amount / 100, { maximumFractionDigits: 2 })}%`;
  }
  return formatNumber(amount, { maximumFractionDigits: 0 });
}

export function buildMir4AlbumStatViews(
  current: Readonly<Mir4AlbumBonuses>,
  maximum: Readonly<Mir4AlbumBonuses>,
): readonly Mir4AlbumStatView[] {
  return MIR4_ALBUM_STAT_KEYS.filter((key) => maximum[key] > 0).map((key) => ({
    key,
    label: mir4AlbumStatLabel(key),
    current: formatMir4AlbumAmount(key, current[key]),
    maximum: formatMir4AlbumAmount(key, maximum[key]),
  }));
}
