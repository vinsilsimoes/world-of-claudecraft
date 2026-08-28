// MIR4 desktop action dock: two independent automation tools plus fixed health
// and mana potion seats. It composes the existing WoC action-button markup,
// ActionBarView, ActionBarPainter, icon registry and tooltip system; neither
// automation toggle enters the ability/hotbar model.

import { audio } from '../../../game/audio';
import { mir4PotionRule } from '../../../sim/content/mir4/potions';
import { ITEMS } from '../../../sim/data';
import { MIR4_GAME_PROFILE } from '../../../sim/game_profile';
import type { ItemDef } from '../../../sim/types';
import type { IWorld } from '../../../world_api';
import { formatAbilityNumber } from '../../ability_description';
import { itemDisplayName } from '../../entity_i18n';
import { esc } from '../../esc';
import { formatNumber, t } from '../../i18n';
import type { PainterHostWriters } from '../../painter_host';
import { svgIcon, type UiIconName } from '../../ui_icons';
import { ActionBarPainter, type ActionBarSlotElements } from './action_bar_painter';
import { type ActionBarWorldInput, createActionBarView, inventoryCount } from './action_bar_view';
import { Mir4ActionToolsPainter } from './mir4_action_tools_painter';
import { createMir4ActionToolsView } from './mir4_action_tools_view';
import { buildMir4PotionThresholdController } from './mir4_potion_threshold_controller';

const HEALTH_SLOT = 0;

export interface Mir4ActionToolsDeps {
  writers: PainterHostWriters;
  actionBar: HTMLElement;
  world: Pick<
    IWorld,
    | 'cfg'
    | 'mir4AutoBattleActive'
    | 'setMir4AutoBattle'
    | 'mir4AutoPotionThresholds'
    | 'setMir4AutoPotionThreshold'
    | 'useItem'
  >;
  autoCollectActive(): boolean;
  setAutoCollect(on: boolean): void;
  keyCap(actionId: string): string;
  iconBackground(iconKey: string): string;
  canUseItem(): boolean;
  afterUseItem(): void;
  flash(button: HTMLButtonElement): void;
  attachTooltip(el: HTMLElement, html: () => string): void;
  itemTooltip(item: ItemDef): string;
  hideTooltip(): void;
}

export interface Mir4ActionToolsController {
  paint(world: ActionBarWorldInput): void;
  relocalize(): void;
}

function slotElements(btn: HTMLButtonElement): ActionBarSlotElements {
  const label = document.createElement('span');
  label.className = 'icon-label';
  const countEl = document.createElement('span');
  countEl.className = 'item-count';
  const keybindEl = document.createElement('span');
  keybindEl.className = 'keybind';
  const cdOverlay = document.createElement('div');
  cdOverlay.className = 'cd-overlay';
  const rechargeOverlay = document.createElement('div');
  rechargeOverlay.className = 'recharge-overlay';
  const cdText = document.createElement('div');
  cdText.className = 'cdtext';
  btn.append(label, countEl, keybindEl, cdOverlay, rechargeOverlay, cdText);
  return { btn, label, countEl, keybindEl, cdOverlay, rechargeOverlay, cdText };
}

function toolButton(
  iconName: UiIconName,
  modifier: string,
): {
  button: HTMLButtonElement;
  keybind: HTMLSpanElement;
} {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `mir4-tool-btn ${modifier}`;
  const icon = document.createElement('span');
  icon.className = 'mir4-tool-icon';
  icon.innerHTML = svgIcon(iconName);
  const keybind = document.createElement('span');
  keybind.className = 'keybind';
  button.append(icon, keybind);
  return { button, keybind };
}

export function buildMir4ActionTools(
  deps: Mir4ActionToolsDeps,
): Mir4ActionToolsController | undefined {
  const host = deps.actionBar.parentElement;
  if (deps.world.cfg.gameProfile !== MIR4_GAME_PROFILE || !host) return undefined;
  const root = document.createElement('div');
  root.id = 'mir4-action-tools';
  root.className = 'mir4-action-tools';
  root.style.display = 'none';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'mir4-action-tool-group';
  const collect = toolButton('interact', 'auto-collect');
  const battle = toolButton('attack', 'auto-battle');
  toolGroup.append(collect.button, battle.button);

  const potionGroup = document.createElement('div');
  potionGroup.className = 'mir4-potion-group';
  const potionButtons = Array.from({ length: 2 }, (_, index) => {
    const seat = document.createElement('div');
    seat.className = 'mir4-potion-seat';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-btn mir4-potion-btn empty potion-${index === HEALTH_SLOT ? 'health' : 'mana'}`;
    seat.appendChild(button);
    potionGroup.appendChild(seat);
    return { seat, button, elements: slotElements(button) };
  });
  root.append(toolGroup, potionGroup);
  host.insertBefore(root, deps.actionBar);

  const toolsView = createMir4ActionToolsView((itemId) => ITEMS[itemId]);
  const toolsPainter = new Mir4ActionToolsPainter(deps.writers, {
    root,
    autoBattleButton: battle.button,
    autoCollectButton: collect.button,
    mobileAutoCollectButton:
      document.getElementById('mobile-auto-collect') instanceof HTMLElement
        ? (document.getElementById('mobile-auto-collect') as HTMLElement)
        : undefined,
    autoBattleKeybind: battle.keybind,
    autoCollectKeybind: collect.keybind,
  });
  let potionIds: readonly (string | null)[] = [null, null];
  let inventory: readonly { itemId: string; count: number }[] = [];
  const potionView = createActionBarView(
    {
      slots: potionButtons.map((_, index) => ({
        slotIndex: index,
        isAttack: () => false,
        hasAction: () => potionIds[index] !== null,
        ability: () => null,
        item: () => {
          const itemId = potionIds[index];
          return itemId === null ? null : (ITEMS[itemId] ?? null);
        },
        keybindLabel: () => '',
      })),
    },
    {
      t,
      abilityName: (ability) => ability.id,
      itemName: itemDisplayName,
      slotLabel: (index) =>
        t(
          index === HEALTH_SLOT
            ? 'hudChrome.mir4.actionTools.healthPotion'
            : 'hudChrome.mir4.actionTools.manaPotion',
        ),
      formatCount: (value) => formatNumber(value, { maximumFractionDigits: 0 }),
    },
  );
  const potionPainter = new ActionBarPainter(
    deps.writers,
    { container: potionGroup, slots: potionButtons.map((slot) => slot.elements) },
    deps.iconBackground,
  );
  const thresholdController = buildMir4PotionThresholdController({
    root,
    slots: potionButtons.map((slot, index) => ({
      seat: slot.seat,
      kind: index === HEALTH_SLOT ? 'health' : 'mana',
    })),
    thresholds: () => deps.world.mir4AutoPotionThresholds(),
    setThreshold: (kind, percent) => deps.world.setMir4AutoPotionThreshold(kind, percent),
    hideTooltip: deps.hideTooltip,
  });

  const usePotion = (index: number): void => {
    const itemId = potionIds[index];
    if (itemId === null || !deps.canUseItem()) return;
    deps.world.useItem(itemId);
    deps.afterUseItem();
    audio.click();
    deps.flash(potionButtons[index].button);
  };
  for (let index = 0; index < potionButtons.length; index++) {
    potionButtons[index].button.addEventListener('click', () => usePotion(index));
    deps.attachTooltip(potionButtons[index].button, () => {
      const itemId = potionIds[index];
      const item = itemId === null ? undefined : ITEMS[itemId];
      if (!item) {
        const role = t(
          index === HEALTH_SLOT
            ? 'hudChrome.mir4.actionTools.healthPotion'
            : 'hudChrome.mir4.actionTools.manaPotion',
        );
        return `<div class="tt-title">${esc(role)}</div><div class="tt-sub">${esc(t('hudChrome.mir4.actionTools.noPotion'))}</div>`;
      }
      const rule = mir4PotionRule(item.id);
      const requiredLevel = rule
        ? `<div class="tt-sub">${esc(
            t('hudChrome.bg.levelRequirement', {
              level: formatNumber(rule.requiredLevel, { maximumFractionDigits: 0 }),
            }),
          )}</div>`
        : '';
      return (
        deps.itemTooltip(item) +
        requiredLevel +
        `<div class="tt-sub">${esc(t('hudChrome.mir4.actionTools.inBags', { count: formatAbilityNumber(inventoryCount(inventory, item.id)) }))}</div>` +
        `<div class="tt-sub">${esc(
          t('hudChrome.mir4.actionTools.autoUseThreshold', {
            percent: formatNumber(
              deps.world.mir4AutoPotionThresholds()[index === HEALTH_SLOT ? 'health' : 'mana'] /
                100,
              { style: 'percent', maximumFractionDigits: 0 },
            ),
            resource: t(
              index === HEALTH_SLOT
                ? 'hudChrome.mir4.actionTools.healthResource'
                : 'hudChrome.mir4.actionTools.manaResource',
            ),
          }),
        )}</div>` +
        `<div class="tt-sub">${esc(t('hudChrome.mir4.actionTools.thresholdHint'))}</div>`
      );
    });
  }

  const toggleAutoCollect = (): void => {
    audio.click();
    deps.setAutoCollect(!deps.autoCollectActive());
    deps.hideTooltip();
  };
  collect.button.addEventListener('click', toggleAutoCollect);
  document.getElementById('mobile-auto-collect')?.addEventListener('click', toggleAutoCollect);
  battle.button.addEventListener('click', () => {
    audio.click();
    deps.world.setMir4AutoBattle(!deps.world.mir4AutoBattleActive());
    deps.hideTooltip();
  });
  deps.attachTooltip(
    collect.button,
    () =>
      `<div class="tt-title">${esc(t('hudChrome.mir4.actionTools.autoCollect'))}</div><div class="tt-sub">${esc(t('hudChrome.mir4.actionTools.autoCollectTooltip'))}</div>`,
  );
  deps.attachTooltip(
    battle.button,
    () =>
      `<div class="tt-title">${esc(t('abilityUi.actionBar.autoBattleName'))}</div><div class="tt-sub">${esc(t('abilityUi.actionBar.autoBattleTooltip'))}</div>`,
  );

  const relocalize = (): void => {
    const dockLabel = t('hudChrome.mir4.actionTools.label');
    const collectLabel = t('hudChrome.mir4.actionTools.autoCollect');
    const battleLabel = t('abilityUi.actionBar.autoBattleName');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', dockLabel);
    collect.button.setAttribute('aria-label', collectLabel);
    collect.button.title = collectLabel;
    const mobileCollect = document.getElementById('mobile-auto-collect');
    mobileCollect?.setAttribute('aria-label', collectLabel);
    if (mobileCollect instanceof HTMLElement) mobileCollect.title = collectLabel;
    battle.button.setAttribute('aria-label', battleLabel);
    battle.button.title = battleLabel;
    thresholdController.relocalize();
  };
  relocalize();

  return {
    paint(world): void {
      inventory = world.inventory;
      const state = toolsView.tick({
        profile: deps.world.cfg.gameProfile,
        autoBattleActive: deps.world.mir4AutoBattleActive(),
        autoCollectActive: deps.autoCollectActive(),
        autoBattleKeybind: deps.keyCap('toggleAutoBattle'),
        autoCollectKeybind: deps.keyCap('toggleAutoCollect'),
        inventory,
        playerLevel: world.player.level,
      });
      potionIds = state.potionIds;
      toolsPainter.paint(state);
      potionPainter.paint(potionView.tick(world));
    },
    relocalize,
  };
}
