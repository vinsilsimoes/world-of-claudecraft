// Stable-id localization for MIR4 Mounts, Spirits, and their special skills.
// Simulation catalogs preserve source identity and numbers; player-facing
// names resolve only through the generated i18n tables.

import { type TranslationKey, t } from './i18n';

function collectibleName(group: 'mounts' | 'spirits' | 'spiritSkills', id: string): string {
  return t(`hudChrome.mir4.collectibles.${group}.${id}` as TranslationKey);
}

export function mir4MountDisplayName(id: string): string {
  return collectibleName('mounts', id);
}

export function mir4SpiritDisplayName(id: string): string {
  return collectibleName('spirits', id);
}

export function mir4SpiritSkillDisplayName(id: string): string {
  return collectibleName('spiritSkills', id);
}
