// Cold, interactive configuration popover for the two fixed MIR4 potion
// seats. The native range previews continuously but commits only on change, so
// dragging cannot flood the authoritative snapshot revision or persistence.

import {
  MIR4_AUTO_POTION_MAX_PERCENT,
  MIR4_AUTO_POTION_MIN_PERCENT,
  MIR4_AUTO_POTION_STEP_PERCENT,
  type Mir4AutoPotionKind,
  type Mir4AutoPotionThresholds,
} from '../../../sim/auto_battle/potion_thresholds';
import { formatNumber, t } from '../../i18n';
import { svgIcon } from '../../ui_icons';

export interface Mir4PotionThresholdSlot {
  seat: HTMLElement;
  kind: Mir4AutoPotionKind;
}

export interface Mir4PotionThresholdControllerDeps {
  root: HTMLElement;
  slots: readonly Mir4PotionThresholdSlot[];
  thresholds(): Mir4AutoPotionThresholds;
  setThreshold(kind: Mir4AutoPotionKind, percent: number): void;
  hideTooltip(): void;
}

export interface Mir4PotionThresholdController {
  close(): void;
  relocalize(): void;
}

function percentText(percent: number): string {
  return formatNumber(percent / 100, { style: 'percent', maximumFractionDigits: 0 });
}

export function buildMir4PotionThresholdController(
  deps: Mir4PotionThresholdControllerDeps,
): Mir4PotionThresholdController {
  const doc = deps.root.ownerDocument;
  const popover = doc.createElement('div');
  popover.className = 'mir4-potion-threshold-popover';
  popover.hidden = true;
  popover.setAttribute('role', 'dialog');

  const header = doc.createElement('div');
  header.className = 'mir4-potion-threshold-header';
  const title = doc.createElement('strong');
  const close = doc.createElement('button');
  close.type = 'button';
  close.className = 'mir4-potion-threshold-close';
  close.innerHTML = svgIcon('close');
  header.append(title, close);

  const description = doc.createElement('p');
  const slider = doc.createElement('input');
  slider.type = 'range';
  slider.min = String(MIR4_AUTO_POTION_MIN_PERCENT);
  slider.max = String(MIR4_AUTO_POTION_MAX_PERCENT);
  slider.step = String(MIR4_AUTO_POTION_STEP_PERCENT);
  const output = doc.createElement('output');
  output.className = 'mir4-potion-threshold-value';
  const rangeRow = doc.createElement('div');
  rangeRow.className = 'mir4-potion-threshold-range';
  rangeRow.append(slider, output);
  popover.append(header, description, rangeRow);
  deps.root.appendChild(popover);

  let activeKind: Mir4AutoPotionKind = 'health';
  const resourceName = (kind: Mir4AutoPotionKind): string =>
    t(
      kind === 'health'
        ? 'hudChrome.mir4.actionTools.healthResource'
        : 'hudChrome.mir4.actionTools.manaResource',
    );
  const potionName = (kind: Mir4AutoPotionKind): string =>
    t(
      kind === 'health'
        ? 'hudChrome.mir4.actionTools.healthPotion'
        : 'hudChrome.mir4.actionTools.manaPotion',
    );
  const paintCopy = (): void => {
    const percent = Number(slider.value);
    title.textContent = t('hudChrome.mir4.actionTools.thresholdTitle', {
      potion: potionName(activeKind),
    });
    description.textContent = t('hudChrome.mir4.actionTools.thresholdDescription', {
      resource: resourceName(activeKind),
    });
    output.textContent = percentText(percent);
    slider.setAttribute(
      'aria-label',
      t('hudChrome.mir4.actionTools.thresholdSliderAria', {
        resource: resourceName(activeKind),
      }),
    );
    slider.setAttribute('aria-valuetext', percentText(percent));
    popover.setAttribute('aria-label', title.textContent);
  };
  const open = (kind: Mir4AutoPotionKind): void => {
    activeKind = kind;
    slider.value = String(deps.thresholds()[kind]);
    paintCopy();
    popover.hidden = false;
    deps.hideTooltip();
    slider.focus();
  };
  const closePopover = (): void => {
    popover.hidden = true;
  };

  const configButtons: { button: HTMLButtonElement; kind: Mir4AutoPotionKind }[] = [];
  for (const slot of deps.slots) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = `mir4-potion-config potion-${slot.kind}-config`;
    button.innerHTML = svgIcon('meters');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!popover.hidden && activeKind === slot.kind) closePopover();
      else open(slot.kind);
    });
    slot.seat.appendChild(button);
    configButtons.push({ button, kind: slot.kind });
  }

  slider.addEventListener('input', paintCopy);
  slider.addEventListener('change', () => {
    const percent = Number(slider.value);
    deps.setThreshold(activeKind, percent);
    paintCopy();
  });
  close.addEventListener('click', closePopover);
  popover.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePopover();
      configButtons.find(({ kind }) => kind === activeKind)?.button.focus();
    }
  });

  const relocalize = (): void => {
    close.setAttribute('aria-label', t('hudChrome.mir4.actionTools.thresholdClose'));
    for (const entry of configButtons) {
      entry.button.setAttribute(
        'aria-label',
        t('hudChrome.mir4.actionTools.thresholdConfigureAria', {
          potion: potionName(entry.kind),
        }),
      );
    }
    paintCopy();
  };
  relocalize();

  return { close: closePopover, relocalize };
}
