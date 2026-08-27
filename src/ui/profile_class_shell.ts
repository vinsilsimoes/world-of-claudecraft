import { browserGameProfile } from '../game_profile_runtime';
import { CLASSES } from '../sim/data';
import { MIR4_GAME_PROFILE } from '../sim/game_profile';
import { isMir4ClassKey, mir4ShellClassFor } from '../sim/mir4/stats';
import type { Mir4ClassKey, PlayableClass, PlayerClass } from '../sim/types';
import { classIconUrl } from './class_icon_art';
import { classDisplayName } from './entity_i18n';
import { formatNumber, type TranslationKey, t } from './i18n';
import { iconDataUrl } from './icons';
import {
  type ProfileClassPresentation,
  profileClassPresentation,
} from './profile_class_presentation';
import { mir4ClassDetailsView, profileClassOptions } from './profile_class_select';

export const ACTIVE_GAME_PROFILE = browserGameProfile();

export function entryShellClass(cls: PlayableClass): PlayerClass {
  return mir4ShellClassFor(cls, ACTIVE_GAME_PROFILE);
}

export function entryClassPresentation(cls: PlayableClass): ProfileClassPresentation {
  return profileClassPresentation(cls, ACTIVE_GAME_PROFILE);
}

export function profileClassDisplayName(cls: PlayableClass): string {
  return isMir4ClassKey(cls) && cls !== 'warrior'
    ? t(`classes.${cls}` as TranslationKey)
    : classDisplayName(cls as PlayerClass);
}

export function isActiveMir4Class(cls: PlayableClass): cls is Mir4ClassKey {
  return ACTIVE_GAME_PROFILE === MIR4_GAME_PROFILE && isMir4ClassKey(cls);
}

/** Replace the static classic fallback roster before its event handlers attach. */
export function installProfileClassChips(): void {
  const options = profileClassOptions(ACTIVE_GAME_PROFILE);
  document
    .querySelectorAll<HTMLElement>(
      '#charcreate-panel .mini-class-row, #offline-select .mini-class-row',
    )
    .forEach((row) => {
      const elementName = row.firstElementChild?.tagName.toLowerCase() === 'li' ? 'li' : 'button';
      row.replaceChildren(
        ...options.map((option) => {
          const chip = document.createElement(elementName);
          chip.className = 'mini-class';
          chip.dataset.class = option.key;
          chip.dataset.visualClass = option.visualClass;
          chip.dataset.i18n = option.labelKey;
          chip.dataset.i18nAria = option.ariaKey;
          chip.textContent = t(option.labelKey);
          chip.setAttribute('aria-label', t(option.ariaKey));
          chip.setAttribute('aria-pressed', 'false');
          if (elementName === 'button') (chip as HTMLButtonElement).type = 'button';
          else {
            chip.setAttribute('role', 'button');
            chip.tabIndex = 0;
          }
          return chip;
        }),
      );
    });
}

/** Paint the entry rails with the profile presentation emblem, never the
 * simulation shell used to host the class. */
export function decorateProfileClassChips(root: ParentNode = document): void {
  root
    .querySelectorAll<HTMLElement>('#charcreate-panel .mini-class, #offline-select .mini-class')
    .forEach((chip) => {
      if (chip.querySelector('.mini-class-portrait')) return;
      const visualClass =
        (chip.dataset.visualClass as PlayerClass | undefined) ??
        entryClassPresentation(chip.dataset.class as PlayableClass).visualClass;
      const key = chip.dataset.i18n;
      const label = document.createElement('span');
      label.className = 'mini-class-label';
      if (key) label.dataset.i18n = key;
      label.textContent = (chip.textContent ?? '').trim();
      chip.removeAttribute('data-i18n');
      chip.textContent = '';
      const img = document.createElement('img');
      img.className = 'mini-class-portrait';
      img.alt = '';
      img.decoding = 'async';
      img.src = classIconUrl(visualClass) ?? iconDataUrl('crest', `class_${visualClass}`, 96);
      chip.append(img, label);
      chip.classList.add('has-portrait');
    });
}

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] ?? char;
  });
}

export function renderMir4ClassDetails(panel: HTMLElement, className: Mir4ClassKey): void {
  const view = mir4ClassDetailsView(className);
  const classLabel = t(view.labelKey);
  const damageLabel = t(view.damageKey);
  const rangeLabel = t(view.rangeKey);
  const weaponLabel = t(view.weaponKey);
  panel.classList.add('visible');
  panel.style.setProperty(
    '--class-color',
    `#${CLASSES.warrior.color.toString(16).padStart(6, '0')}`,
  );
  panel.innerHTML = `
    <div class="class-details-content">
      <div class="class-details-header">
        <div class="class-details-header-text">
          <h3 class="class-details-name">${esc(classLabel)}</h3>
          <span class="class-details-role role-dps">${esc(damageLabel)}</span>
        </div>
      </div>
      <div class="class-details-grid">
        <div class="class-details-gear-col">
          <h4 class="details-section-title">${esc(t('classDetails.sections.equipment'))}</h4>
          <div class="details-gear-row"><strong>${esc(t('classDetails.labels.weapons'))}:</strong> <span class="badge">${esc(weaponLabel)}</span></div>
          <div class="details-gear-row"><strong>${esc(t('classDetails.mir4.labels.damage'))}:</strong> <span class="badge">${esc(damageLabel)}</span></div>
          <div class="details-gear-row"><strong>${esc(t('classDetails.mir4.labels.combatRange'))}:</strong> <span class="badge">${esc(rangeLabel)}</span></div>
          <div class="details-gear-row"><strong>${esc(t('classDetails.mir4.labels.startingSkills'))}:</strong> <span class="badge">${formatNumber(view.startingSkills)}</span></div>
        </div>
      </div>
    </div>`;
  panel.setAttribute(
    'aria-label',
    t('classDetails.mir4.aria', {
      className: classLabel,
      damage: damageLabel,
      range: rangeLabel,
      weapon: weaponLabel,
      skills: view.startingSkills,
    }),
  );
}
