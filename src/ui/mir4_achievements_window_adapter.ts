// Profile adapter for WoC's existing #deeds-window. The shared window root,
// focus trap, dark-fantasy card classes and progression crest stay intact;
// only the MIR4 provider, reward copy and authoritative claim verb change.

import type { IWorld } from '../world_api';
import { markDialogRoot } from './dialog_root';
import { esc } from './esc';
import { focusedWithin, restoreFirstEnabled } from './focus_restore';
import { formatList, formatNumber, t } from './i18n';
import { iconDataUrl } from './icons';
import { buildMir4AchievementsView } from './mir4_achievements_view';
import { svgIcon } from './ui_icons';

const CREST_SIZE = 96;
const CLAIM_ECHO_TIMEOUT_MS = 6_000;
let nextClaimRequestId = 1;
const fmt = (value: number): string => formatNumber(value, { maximumFractionDigits: 0 });

export interface Mir4AchievementsWindowDeps {
  root: HTMLElement;
  world: IWorld;
  close(): void;
  afterMutation(): void;
}

function rewardText(rewards: {
  copper: number;
  darksteel: number;
  effectPoints: number;
  skillTomes: number;
}): string {
  const parts: string[] = [];
  if (rewards.copper > 0) {
    parts.push(t('hudChrome.mir4.achievements.rewardCopper', { amount: fmt(rewards.copper) }));
  }
  if (rewards.darksteel > 0) {
    parts.push(
      t('hudChrome.mir4.achievements.rewardDarksteel', { amount: fmt(rewards.darksteel) }),
    );
  }
  if (rewards.effectPoints > 0) {
    parts.push(
      t('hudChrome.mir4.achievements.rewardEffectPoints', {
        amount: fmt(rewards.effectPoints),
      }),
    );
  }
  if (rewards.skillTomes > 0) {
    parts.push(
      t('hudChrome.mir4.achievements.rewardSkillTomes', {
        amount: fmt(rewards.skillTomes),
      }),
    );
  }
  return formatList(parts);
}

function focusAfterClaim(root: HTMLElement, achievementId: number): void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-achievement-claim]')];
  const exact = buttons.find((button) => Number(button.dataset.achievementClaim) === achievementId);
  const next = buttons.find((button) => Number(button.dataset.achievementClaim) > achievementId);
  restoreFirstEnabled([exact, next, ...buttons, root.querySelector<HTMLElement>('[data-close]')]);
}

function clearPendingClaim(
  root: HTMLElement,
  achievementId: number,
  requestToken: string,
  afterMutation: () => void,
): void {
  if (
    root.dataset.mir4AchievementFocus !== String(achievementId) ||
    root.dataset.mir4AchievementRequest !== requestToken
  ) {
    return;
  }
  delete root.dataset.mir4AchievementFocus;
  delete root.dataset.mir4AchievementRequest;
  afterMutation();
}

export function paintMir4AchievementsWindow(deps: Mir4AchievementsWindowDeps): void {
  const state = deps.world.mir4PlayerState();
  const root = deps.root;
  const active = focusedWithin(root);
  const hadFocus = active !== null;
  const pendingFocus = root.dataset.mir4AchievementFocus ?? null;
  const focusAchievement = active?.dataset.achievementClaim ?? pendingFocus;
  const previousScrollTop = root.querySelector('.deeds-scroll')?.scrollTop ?? 0;
  const title = t('hudChrome.mir4.achievements.title');
  markDialogRoot(root, { label: title });

  if (!state) {
    root.innerHTML =
      `<div class="panel-title"><span>${esc(title)}</span>` +
      `<button type="button" class="x-btn" data-close aria-label="${esc(t('hudChrome.mir4.achievements.close'))}">${svgIcon('close')}</button></div>` +
      `<div class="empty-state">${esc(t('hudChrome.mir4.awaitingState'))}</div>`;
    root.querySelector('[data-close]')?.addEventListener('click', deps.close);
    if (hadFocus || pendingFocus) {
      restoreFirstEnabled([root.querySelector<HTMLElement>('[data-close]')]);
    }
    return;
  }

  const model = buildMir4AchievementsView(deps.world.player.level, deps.world.copper, state);
  const pendingId = pendingFocus === null ? null : Number(pendingFocus);
  const pendingEntry = model.entries.find((entry) => entry.achievementId === pendingId);
  const pendingResolved = pendingEntry !== undefined && pendingEntry.status !== 'claimable';
  if (pendingResolved) {
    delete root.dataset.mir4AchievementFocus;
    delete root.dataset.mir4AchievementRequest;
  }
  const summary = model.summary;
  const cards = model.entries
    .map((entry) => {
      const progressPercent = Math.round((entry.progress.current / entry.progress.target) * 100);
      const level = fmt(entry.requiredLevel);
      const status =
        entry.status === 'claimed'
          ? `<span class="deed-chip deed-renown">${esc(t('hudChrome.mir4.achievements.claimed'))}</span>`
          : entry.status === 'claimable'
            ? `<button type="button" class="deed-watch" data-achievement-claim="${entry.achievementId}" aria-label="${esc(t('hudChrome.mir4.achievements.claimAria', { level }))}"${pendingId === entry.achievementId ? ' disabled' : ''}>${esc(t('hudChrome.mir4.achievements.claim'))}</button>`
            : `<span class="deed-chip">${esc(t(entry.status === 'locked' ? 'hudChrome.mir4.achievements.locked' : 'hudChrome.mir4.achievements.previousGrade', { level }))}</span>`;
      return (
        `<div class="deed-card${entry.status === 'claimed' ? ' earned' : ' unearned'}" data-deed="${entry.achievementId}">` +
        `<img class="deed-crest${entry.status === 'claimed' ? '' : ' desat'}" src="${iconDataUrl('crest', 'deed_cat_progression', CREST_SIZE)}" alt="">` +
        `<div class="deed-main"><div class="deed-head"><span class="deed-name">${esc(t('hudChrome.mir4.achievements.levelTitle', { level }))}</span>${status}</div>` +
        `<div class="deed-desc">${esc(t('hudChrome.mir4.achievements.levelDescription', { level }))}</div>` +
        `<div class="deed-progress" role="img" aria-label="${esc(t('hudChrome.mir4.achievements.progressAria', { current: fmt(entry.progress.current), target: level }))}">` +
        `<span class="deed-bar"><span class="deed-bar-fill" style="width:${progressPercent}%"></span></span>` +
        `<span class="deed-progress-text">${esc(t('hudChrome.mir4.achievements.progressText', { current: fmt(entry.progress.current), target: level }))}</span></div>` +
        `<div class="deed-rarity">${esc(t('hudChrome.mir4.achievements.rewards', { rewards: rewardText(entry.rewards) }))}</div>` +
        `</div></div>`
      );
    })
    .join('');

  root.innerHTML =
    `<div class="panel-title"><span>${esc(title)}</span>` +
    `<button type="button" class="x-btn" data-close aria-label="${esc(t('hudChrome.mir4.achievements.close'))}">${svgIcon('close')}</button></div>` +
    `<div class="deeds-summary"><span><b>${esc(t('hudChrome.mir4.achievements.summary', { claimed: fmt(summary.claimed), total: fmt(summary.total) }))}</b></span>` +
    `<span>${esc(t('hudChrome.mir4.achievements.balances', { copper: fmt(summary.copper), darksteel: fmt(summary.darksteel), effectPoints: fmt(summary.effectPoints), skillTomes: fmt(summary.skillTomes) }))}</span></div>` +
    `<div class="deeds-body"><div class="deeds-scroll"><div class="deeds-list">${cards}</div></div></div>`;

  root.querySelector('[data-close]')?.addEventListener('click', deps.close);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-achievement-claim]')) {
    button.addEventListener('click', () => {
      const achievementId = Number(button.dataset.achievementClaim);
      if (!Number.isSafeInteger(achievementId)) return;
      const requestToken = `${achievementId}:${nextClaimRequestId++}`;
      root.dataset.mir4AchievementFocus = String(achievementId);
      root.dataset.mir4AchievementRequest = requestToken;
      button.disabled = true;
      focusAfterClaim(root, achievementId);
      const outcome = deps.world.mir4ClaimAchievement(achievementId);
      deps.afterMutation();
      void Promise.resolve(outcome).then((result) => {
        const succeeded = typeof result === 'boolean' ? result : result.ok;
        if (!succeeded) {
          clearPendingClaim(root, achievementId, requestToken, deps.afterMutation);
        }
      });
      window.setTimeout(
        () => clearPendingClaim(root, achievementId, requestToken, deps.afterMutation),
        CLAIM_ECHO_TIMEOUT_MS,
      );
    });
  }
  const scroll = root.querySelector('.deeds-scroll');
  if (scroll) scroll.scrollTop = previousScrollTop;
  if (hadFocus || focusAchievement !== null) {
    if (focusAchievement !== null) {
      const achievementId = Number(focusAchievement);
      if (Number.isSafeInteger(achievementId)) focusAfterClaim(root, achievementId);
      else restoreFirstEnabled([root.querySelector<HTMLElement>('[data-close]')]);
    } else {
      restoreFirstEnabled([root.querySelector<HTMLElement>('[data-close]')]);
    }
  }
}
