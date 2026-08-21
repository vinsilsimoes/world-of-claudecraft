// Visibility matrix for profile content that has not yet been adapted to the
// existing UI providers. The DOM remains shared; MIR4 hides classic-only
// launchers/windows until each provider has authoritative MIR4 data.

import { type GameProfile, MIR4_GAME_PROFILE } from '../sim/game_profile';
import { formatAbilityNumber } from './ability_description';
import { abilityDisplayName } from './ability_display_name';
import { itemDisplayName } from './entity_i18n';
import type { ActionBarDeps } from './hud/action_bar/action_bar_view';
import { formatNumber, t } from './i18n';
import type { UltimateGaugePresentation } from './paladin_devotion_view';

export function profileAttackName(profile: GameProfile | undefined): string {
  return t(
    profile === MIR4_GAME_PROFILE
      ? 'abilityUi.actionBar.autoBattleName'
      : 'abilityUi.actionBar.attackName',
  );
}

export function profileAttackSummary(profile: GameProfile | undefined): string {
  return t(
    profile === MIR4_GAME_PROFILE
      ? 'abilityUi.actionBar.autoBattleTooltip'
      : 'abilityUi.actionBar.attackTooltip',
  );
}

export function createProfileActionBarDeps(profile: () => GameProfile | undefined): ActionBarDeps {
  return {
    t,
    attackName: () => profileAttackName(profile()),
    abilityName: abilityDisplayName,
    itemName: itemDisplayName,
    slotLabel: (index) => formatAbilityNumber(index + 1),
    formatCount: (value) => formatNumber(value, { maximumFractionDigits: 0 }),
  };
}

export function mir4UltimateGaugePresentation(): UltimateGaugePresentation {
  return {
    label: t('hudChrome.mir4.ultimateGauge'),
    formatStatus: (value, max) => t('hudChrome.mir4.ultimateGaugeStatus', { value, max }),
    readyAnnouncement: t('hudChrome.mir4.ultimateReadyAnnouncement'),
  };
}

export const MIR4_CLASSIC_ONLY_SELECTORS = [
  '#mm-talents',
  '#mobile-talents',
  '#talents-window',
  '#deed-tracker',
  '#mm-reliquary',
  '#mobile-reliquary',
  '#reliquary-window',
  '#reliquary-tracker',
  '#mm-professions',
  '#mobile-professions',
  '#professions-window',
  '#daily-rewards-button',
  '#mobile-daily-rewards',
  '#daily-rewards-window',
  '#claudium-window',
  '#mm-arena',
  '#mobile-arena',
  '#arena-window',
  '#arena-status',
  '#mm-dfinder',
  '#mobile-dfinder',
  '#dungeon-finder-window',
  '#mm-valecup',
  '#mobile-valecup',
  '#vcup-indicator',
  '#valecup-window',
  '#mm-cardduel',
  '#card-duel-window',
  '#mm-leaderboard',
  '#mobile-leaderboard',
  '#leaderboard-window',
  '#mobile-mounts',
  '#delve-tracker',
  '#rift-tracker',
  '#delve-board',
  '#delve-rite-panel',
] as const;

export function applyProfileFeatureGate(
  document: Document,
  profile: GameProfile | undefined,
): void {
  const hideClassic = profile === MIR4_GAME_PROFILE;
  for (const selector of MIR4_CLASSIC_ONLY_SELECTORS) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      node.hidden = hideClassic;
      node.setAttribute('aria-hidden', hideClassic ? 'true' : 'false');
    }
  }

  // The Book root and both launchers are shared. MIR4 swaps the provider to
  // source-backed achievements while classic keeps the original Deeds copy.
  const deedsTitleKey = hideClassic ? 'hudChrome.mir4.achievements.title' : 'hudChrome.deeds.title';
  const deedsTitle = t(deedsTitleKey);
  for (const selector of ['#mm-deeds', '#mobile-deeds', '#deeds-window'] as const) {
    for (const node of document.querySelectorAll<HTMLElement>(selector)) {
      node.hidden = false;
      node.setAttribute('aria-hidden', 'false');
      if (selector === '#deeds-window') continue;
      node.setAttribute('data-i18n-title', deedsTitleKey);
      node.setAttribute('data-i18n-aria', deedsTitleKey);
      node.setAttribute('title', deedsTitle);
      node.setAttribute('aria-label', deedsTitle);
      const mobileLabel = node.querySelector<HTMLElement>('.mobile-label');
      if (mobileLabel) {
        const labelKey = hideClassic
          ? 'hudChrome.mir4.achievements.title'
          : 'hudChrome.mobile.deeds';
        mobileLabel.setAttribute('data-i18n', labelKey);
        mobileLabel.textContent = t(labelKey);
      }
    }
  }
}
