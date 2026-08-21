// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/ui/portrait_chip', () => ({
  hydratePortraits: vi.fn(),
  modularLookFor: vi.fn(() => null),
  portraitChipHtml: vi.fn(() => '<span class="portrait-chip"></span>'),
}));

import { mir4EquipmentItem } from '../src/sim/content/mir4/equipment_catalog';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4EquipmentItemView } from '../src/ui/mir4_character_view';
import {
  mir4EquipmentTooltipHtml,
  paintMir4CharacterWindow,
  paintMir4InventoryWindow,
} from '../src/ui/mir4_equipment_window_adapter';
import type { IWorld } from '../src/world_api';

function harness() {
  const state: Mir4PlayerUiState = {
    classId: 1,
    ultimateGauge: 25,
    mir4Equipment: {
      1: 991010101,
      5: 991050101,
      6: 991060101,
      7: 991070101,
      8: 991080101,
    },
    mir4EquipmentInstances: {
      991010101: { itemId: 991010101, enhancement: 1 },
      991020101: { itemId: 991020101, enhancement: 3 },
    },
    mir4Materials: {
      sunStone: 4,
      moonStone: 3,
      solarScroll: 2,
      lunarSeal: 1,
      dawnTear: 0,
      solarWard: 5,
    },
  };
  const mir4EquipItem = vi.fn(() => 'equipped');
  const mir4UnequipSlot = vi.fn(() => 'unequipped');
  const mir4RedeemTicket = vi.fn();
  const mir4ConfirmSpirit = vi.fn();
  const mir4EquipSpirit = vi.fn();
  const mir4CombineSpirits = vi.fn();
  const mir4ConfirmMount = vi.fn();
  const mir4EquipMount = vi.fn();
  const mir4CombineMounts = vi.fn();
  const useItem = vi.fn();
  const world = {
    cfg: { gameProfile: 'mir4-gameplay-port', playerClass: 'warrior' },
    player: { id: 1, name: 'Asha', level: 10, skin: 0, skinCatalog: 'class' },
    copper: 12_345,
    mir4PlayerState: () => state,
    mir4EquipItem,
    mir4UnequipSlot,
    mir4RedeemTicket,
    mir4ConfirmSpirit,
    mir4EquipSpirit,
    mir4CombineSpirits,
    mir4ConfirmMount,
    mir4EquipMount,
    mir4CombineMounts,
    useItem,
    inventory: [],
  } as unknown as IWorld;
  return {
    world,
    state,
    mir4EquipItem,
    mir4UnequipSlot,
    mir4RedeemTicket,
    mir4ConfirmSpirit,
    mir4EquipSpirit,
    mir4CombineSpirits,
    mir4ConfirmMount,
    mir4EquipMount,
    mir4CombineMounts,
    useItem,
  };
}

const presentation = {
  itemIcon: () => '<img class="item-icon" alt="">',
  moneyHtml: (copper: number) => `<span>${copper}</span>`,
  itemTooltip: () => '',
  attachTooltip: vi.fn(),
};

describe('MIR4 equipment adapters reuse the existing WoC windows', () => {
  it('paints native stats and WoC visual equipment into #char-window', () => {
    const { world, state, mir4UnequipSlot } = harness();
    const root = document.createElement('section');
    const renderPreview = vi.fn();

    expect(
      paintMir4CharacterWindow({
        ...presentation,
        root,
        world,
        close: vi.fn(),
        hideTooltip: vi.fn(),
        renderPreview,
        afterEquipmentChange: vi.fn(),
        restoreFocus: vi.fn(),
        focusedAct: null,
        hadFocus: false,
      }),
    ).toBe(true);

    expect(root.textContent).toContain('Combat Power');
    expect(root.textContent).toContain('Boss Damage');
    expect(root.querySelectorAll('.equip-slot')).toHaveLength(8);
    expect(renderPreview).toHaveBeenCalledWith(
      {
        mainhand: buildMir4EquipmentItemView(
          mir4EquipmentItem(991010101)!,
          state.mir4EquipmentInstances?.[991010101],
        ).visualItemId,
        offhand: null,
      },
      'warrior',
      {
        head: 'knight',
        chest: 'knight',
        arms: 'knight',
        legs: 'knight',
        back: 'knight',
        hands: 'knight',
        feet: 'knight',
      },
    );
    root.querySelector<HTMLButtonElement>('[data-act="mir4-unequip-1"]')?.click();
    expect(mir4UnequipSlot).toHaveBeenCalledWith(1);
  });

  it('paints unequipped WoC visual shells and MIR4 materials into #bags', () => {
    const { world, mir4EquipItem } = harness();
    const root = document.createElement('section');

    expect(
      paintMir4InventoryWindow({
        ...presentation,
        root,
        world,
        close: vi.fn(),
        hideTooltip: vi.fn(),
        afterEquipmentChange: vi.fn(),
      }),
    ).toBe(true);

    expect(root.textContent).toContain('Refinement Materials');
    expect(root.querySelectorAll('.mir4-bag-scroll')).toHaveLength(1);
    expect(root.querySelectorAll(':scope > .bag-grid')).toHaveLength(0);
    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-item:991020101"]')?.click();
    expect(mir4EquipItem).toHaveBeenCalledWith(991020101);
    expect(root.querySelectorAll('[aria-disabled="true"]')).toHaveLength(6);
  });

  it('describes live MIR4 attributes but uses the WoC visual item name', () => {
    const def = mir4EquipmentItem(991010101);
    expect(def).not.toBeNull();
    const item = buildMir4EquipmentItemView(def!, {
      itemId: def!.itemId,
      enhancement: 1,
      affixes: { enchantment: [[20, 7]] },
    });
    const html = mir4EquipmentTooltipHtml(item);

    expect(html).toContain('Physical Attack');
    expect(html).toContain('+25');
    expect(html).toContain('World of ClaudeCraft appearance');
    expect(html).not.toContain(def!.name);
  });

  it('labels and formats the native skill-damage attribute as basis points', () => {
    const def = mir4EquipmentItem(991010103);
    expect(def).not.toBeNull();
    const html = mir4EquipmentTooltipHtml(
      buildMir4EquipmentItemView(def!, { itemId: def!.itemId, enhancement: 0 }),
    );

    expect(html).toContain('Skill Damage');
    expect(html).toContain('+0.03%');
    expect(html).not.toContain('Combat Attribute');
  });

  it('uses native WoC potion and reins items and redeems collection tickets inside #bags', () => {
    const { world, state, mir4RedeemTicket, useItem } = harness();
    world.inventory = [
      { itemId: 'minor_healing_potion', count: 2 },
      { itemId: 'reins_valorsteed', count: 1 },
    ];
    state.mir4ArcRewards = {
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
    };
    const root = document.createElement('section');

    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });

    root.querySelector<HTMLButtonElement>('[data-focus-key="runtime-item:0"]')?.click();
    root
      .querySelector<HTMLButtonElement>('[data-focus-key="mir4-ticket:mount-ticket-dawn"]')
      ?.click();
    expect(useItem).toHaveBeenCalledWith('minor_healing_potion', { slotIndex: 0 });
    expect(mir4RedeemTicket).toHaveBeenCalledWith('mount-ticket-dawn');
    expect(root.textContent).toContain('Native World of ClaudeCraft Items');
    expect(root.textContent).toContain('Collection Tickets');
    const ticketTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => (element as HTMLElement).dataset.focusKey === 'mir4-ticket:mount-ticket-dawn',
    )?.[1] as (() => string) | undefined;
    expect(ticketTooltip?.()).toContain('79% Common, 20% Uncommon, or 1% Rare');
    expect(ticketTooltip?.()).toContain('native World of ClaudeCraft visual shell');
    expect(ticketTooltip?.()).toContain('MIR4 stats are authoritative');
  });

  it('summons, equips, and confirms Spirits through the existing #bags surface', () => {
    const {
      world,
      state,
      mir4RedeemTicket,
      mir4ConfirmSpirit,
      mir4EquipSpirit,
      mir4CombineSpirits,
    } = harness();
    state.mir4ArcRewards = {
      systems: ['spirit-summon'],
      tickets: { 'spirit-ticket-sunset': 1 },
    };
    state.mir4Spirits = {
      owned: { 'spirit-common-01': 4 },
      discovered: ['spirit-common-01'],
      equippedSpiritId: 'spirit-common-01',
      pending: [{ id: 'spirit-pending-1-1', spiritId: 'spirit-epic-01', grade: 4 }],
    };
    const root = document.createElement('section');

    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });

    root
      .querySelector<HTMLButtonElement>('[data-focus-key="mir4-ticket:spirit-ticket-sunset"]')
      ?.click();
    root
      .querySelector<HTMLButtonElement>('[data-focus-key="mir4-spirit:spirit-common-01"]')
      ?.click();
    root
      .querySelector<HTMLButtonElement>('[data-focus-key="mir4-spirit-pending:spirit-pending-1-1"]')
      ?.click();
    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-spirit-combine:1"]')?.click();
    expect(mir4RedeemTicket).toHaveBeenCalledWith('spirit-ticket-sunset');
    expect(mir4EquipSpirit).toHaveBeenCalledWith(null);
    expect(mir4ConfirmSpirit).toHaveBeenCalledWith('spirit-pending-1-1');
    expect(mir4CombineSpirits).toHaveBeenCalledWith(1);
    expect(root.textContent).toContain('Spirits');
    expect(root.textContent).toContain('Spirits Awaiting Confirmation');
    const ticketTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) =>
        (element as HTMLElement).dataset.focusKey === 'mir4-ticket:spirit-ticket-sunset',
    )?.[1] as (() => string) | undefined;
    expect(ticketTooltip?.()).toContain('94.5% Uncommon, 5% Rare, or 0.5% Epic');
    expect(ticketTooltip?.()).toContain('Epic results wait for confirmation');
    const combineTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => (element as HTMLElement).dataset.focusKey === 'mir4-spirit-combine:1',
    )?.[1] as (() => string) | undefined;
    expect(combineTooltip?.()).toContain('Consumes four owned Spirits');
    expect(combineTooltip?.()).toContain('20% chance');
    expect(combineTooltip?.()).toContain('On failure');
    const spiritTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => (element as HTMLElement).dataset.focusKey === 'mir4-spirit:spirit-common-01',
    )?.[1] as (() => string) | undefined;
    expect(spiritTooltip?.()).toContain('12% chance · 6.55s cooldown');
    expect(spiritTooltip?.()).toContain('triggering hit&#39;s raw damage by 3.5%');
  });

  it('equips and combines logical Mounts through #bags while retaining native reins visuals', () => {
    const { world, state, mir4ConfirmMount, mir4EquipMount, mir4CombineMounts } = harness();
    state.mir4Mounts = {
      owned: { 'meadow-courser': 4 },
      discovered: ['meadow-courser'],
      equippedMountId: 'meadow-courser',
      pending: [{ id: 'mount-pending-1-1', mountId: 'eclipse-lion', grade: 4 }],
    };
    const root = document.createElement('section');

    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });

    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-mount:meadow-courser"]')?.click();
    root
      .querySelector<HTMLButtonElement>('[data-focus-key="mir4-mount-pending:mount-pending-1-1"]')
      ?.click();
    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-mount-combine:1"]')?.click();
    expect(mir4EquipMount).toHaveBeenCalledWith(null);
    expect(mir4ConfirmMount).toHaveBeenCalledWith('mount-pending-1-1');
    expect(mir4CombineMounts).toHaveBeenCalledWith(1);
    expect(root.textContent).toContain('Mounts');
    expect(root.textContent).toContain('Mounts Awaiting Confirmation');
    const mountTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => (element as HTMLElement).dataset.focusKey === 'mir4-mount:meadow-courser',
    )?.[1] as (() => string) | undefined;
    expect(mountTooltip?.()).toContain('Native World of ClaudeCraft model with MIR4 Mount stats');
    expect(mountTooltip?.()).toContain('Movement Speed: +4%');
    expect(mountTooltip?.()).toContain('Physical Defense: +4 · Magic Defense: +4');
    const combineTooltip = presentation.attachTooltip.mock.calls.find(
      ([element]) => (element as HTMLElement).dataset.focusKey === 'mir4-mount-combine:1',
    )?.[1] as (() => string) | undefined;
    expect(combineTooltip?.()).toContain('Consumes four owned Mounts');
    expect(combineTooltip?.()).toContain('20% chance');
  });
});
