// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/ui/portrait_chip', () => ({
  hydratePortraits: vi.fn(),
  modularLookFor: vi.fn(() => null),
  portraitChipHtml: vi.fn(() => '<span class="portrait-chip"></span>'),
}));

import { mir4EquipmentItem } from '../src/sim/content/mir4/equipment_catalog';
import { MIR4_EMPTY_MATERIALS, MIR4_SPECIAL_AFFIX_STATUS_IDS } from '../src/sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4EquipmentItemView } from '../src/ui/mir4_character_view';
import {
  mir4EquipmentTooltipHtml,
  mir4StatusLabel,
  mir4StatusValue,
  paintMir4CharacterWindow,
  paintMir4InventoryWindow,
} from '../src/ui/mir4_equipment_window_adapter';
import type { IWorld } from '../src/world_api';

describe('MIR4 Energy status labels', () => {
  it('uses the official Energy gain and gathering names', () => {
    expect(mir4StatusLabel(86)).toBe('Energy Gain Boost');
    expect(mir4StatusLabel(92)).toBe('Energy Gathering Boost');
  });

  it('labels and formats the two equipment penetration channels as percentages', () => {
    expect(mir4StatusLabel(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration)).toBe('Defense Penetration');
    expect(mir4StatusLabel(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense)).toBe(
      'Defense Penetration Protection',
    );
    expect(mir4StatusValue(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration, 250)).toBe('2.5%');
    expect(mir4StatusValue(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense, 175)).toBe('1.75%');
  });

  it.each([
    [50, 'Debilitation Success'],
    [51, 'Debilitation Resistance'],
    [52, 'Silence Success'],
    [53, 'Silence Resistance'],
    [80, 'Health Drain'],
    [81, 'Mana Drain'],
    [95, 'Skill Cooldown Reduction'],
    [143, 'Basic Attack Damage'],
    [146, 'Health Potion Effect'],
    [147, 'Mana Potion Effect'],
    [160, 'Basic Attack Damage Reduction'],
  ] as const)('labels status %i as %s and formats its affix value as basis points', (id, label) => {
    expect(mir4StatusLabel(id)).toBe(label);
    expect(mir4StatusValue(id, 250)).toBe('2.5%');
  });

  it('keeps critical damage and protection as ratings rather than percentages', () => {
    expect(mir4StatusValue(32, 250)).toBe('250');
    expect(mir4StatusValue(33, 175)).toBe('175');
  });
});

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
      991010101: {
        itemId: 991010101,
        enhancement: 1,
        affixes: {
          blessing: [
            [50, 100],
            [52, 200],
            [80, 300],
            [81, 400],
            [143, 500],
            [159, 600],
          ],
        },
      },
      991020101: { itemId: 991020101, enhancement: 3 },
      991050101: {
        itemId: 991050101,
        enhancement: 0,
        affixes: {
          blessing: [
            [33, 175],
            [51, 700],
            [53, 800],
            [146, 900],
            [147, 1_000],
            [160, 1_100],
          ],
        },
      },
    },
    mir4Materials: {
      ...MIR4_EMPTY_MATERIALS,
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
    fame: 2_000,
    pkMarked: false,
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
    expect(root.textContent).toContain('Fame: 2,000');
    expect(root.textContent).toContain('Status: peaceful');
    expect(root.textContent).toContain('Boss Damage');
    expect(root.textContent).toContain('Defense Penetration');
    expect(root.textContent).toContain('Defense Penetration Protection');
    expect(root.textContent).toContain('Monster Damage Reduction');
    expect(root.textContent).toContain('Critical Damage Reduction 175');
    expect(root.textContent).not.toContain('Critical Damage Reduction 1.75%');
    expect(root.textContent).toContain('Debilitation Success 1%');
    expect(root.textContent).toContain('Silence Success 2%');
    expect(root.textContent).toContain('Health Drain 3%');
    expect(root.textContent).toContain('Mana Drain 4%');
    expect(root.textContent).toContain('Basic Attack Damage 11%');
    expect(root.textContent).toContain('Debilitation Resistance 7%');
    expect(root.textContent).toContain('Silence Resistance 8%');
    expect(root.textContent).toContain('Health Potion Effect 9%');
    expect(root.textContent).toContain('Mana Potion Effect 10%');
    expect(root.textContent).toContain('Basic Attack Damage Reduction 11%');
    expect(root.textContent).toContain('Recovery Potion Boost');
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

  it('makes the PK penalty visible on the character sheet', () => {
    const { world } = harness();
    Object.assign(world, { fame: 500, pkMarked: true });
    const root = document.createElement('section');

    paintMir4CharacterWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      renderPreview: vi.fn(),
      afterEquipmentChange: vi.fn(),
      restoreFocus: vi.fn(),
      focusedAct: null,
      hadFocus: false,
    });

    expect(root.textContent).toContain('Fame: 500');
    expect(root.textContent).toContain('Status: PK - all stats reduced by 50%');
    expect(root.querySelector('.char-fame-status')?.classList.contains('is-pk')).toBe(true);
  });

  it('paints unequipped WoC visual shells and MIR4 materials into #bags', () => {
    const { world, state, mir4EquipItem } = harness();
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
    expect(root.textContent).not.toContain('Spirit Sanctuary');
    expect(root.querySelectorAll(':scope > .bag-grid')).toHaveLength(0);
    root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-item:991020101"]')?.click();
    expect(mir4EquipItem).toHaveBeenCalledWith(991020101);
    expect(root.querySelectorAll('[aria-disabled="true"]')).toHaveLength(5);
    expect(root.querySelectorAll('[data-mir4-currency]')).toHaveLength(0);
    expect(root.querySelector('[data-focus-key="mir4-item:991020101"]')?.classList).toContain(
      'mir4-equip-ready',
    );
    expect(
      root.querySelector('[data-focus-key="mir4-item:991020101"] .mir4-equip-ready-mark'),
    ).not.toBeNull();

    const unchangedScroll = root.querySelector('.mir4-bag-scroll');
    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });
    expect(root.querySelector('.mir4-bag-scroll')).toBe(unchangedScroll);

    state.mir4Materials = {
      ...state.mir4Materials!,
      knowledgeTomeCommon: 7,
    };
    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });
    expect(root.textContent).toContain('7');
    expect(root.querySelector('.mir4-bag-scroll')).not.toBe(unchangedScroll);
  });

  it('equips a campaign reward from #bags before an equipment instance exists', () => {
    const { world, state, mir4EquipItem } = harness();
    state.mir4Equipment = {};
    state.mir4EquipmentInstances = undefined;
    state.mir4ArcRewards = { items: { '991010101': 1 } };
    const root = document.createElement('section');

    paintMir4InventoryWindow({
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    });

    const reward = root.querySelector<HTMLButtonElement>('[data-focus-key="mir4-item:991010101"]');
    expect(reward).not.toBeNull();
    expect(reward?.getAttribute('aria-label')).toContain('Equip');
    reward?.click();
    expect(mir4EquipItem).toHaveBeenCalledWith(991010101);
  });

  it('repaints an open #bags window when a quest grants equipment', () => {
    const { world, state } = harness();
    state.mir4Equipment = {};
    state.mir4EquipmentInstances = undefined;
    state.mir4ArcRewards = { items: {} };
    const root = document.createElement('section');
    const deps = {
      ...presentation,
      root,
      world,
      close: vi.fn(),
      hideTooltip: vi.fn(),
      afterEquipmentChange: vi.fn(),
    };

    paintMir4InventoryWindow(deps);
    const before = root.querySelector('.mir4-bag-scroll');
    expect(root.querySelector('[data-focus-key="mir4-item:991010101"]')).toBeNull();

    state.mir4ArcRewards.items = { '991010101': 1 };
    paintMir4InventoryWindow(deps);

    expect(root.querySelector('.mir4-bag-scroll')).not.toBe(before);
    expect(root.querySelector('[data-focus-key="mir4-item:991010101"]')).not.toBeNull();
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
    expect(html).toContain('Aeldrune appearance');
    expect(html).toContain('Crafting rarity: Common');
    expect(html).not.toContain('Required level');
    expect(html).not.toContain('MIR4');
    expect(html).not.toContain(def!.name);
  });

  it('shows special affixes in the item tooltip instead of hiding live combat power', () => {
    const weapon = mir4EquipmentItem(991010101)!;
    const armor = mir4EquipmentItem(991050101)!;
    const weaponHtml = mir4EquipmentTooltipHtml(
      buildMir4EquipmentItemView(weapon, {
        itemId: weapon.itemId,
        enhancement: 0,
        affixes: { enchantment: [[0, 250]] },
      }),
    );
    const armorHtml = mir4EquipmentTooltipHtml(
      buildMir4EquipmentItemView(armor, {
        itemId: armor.itemId,
        enhancement: 0,
        affixes: { enchantment: [[0, 300]] },
      }),
    );

    expect(weaponHtml).toContain('Defense Penetration');
    expect(weaponHtml).toContain('+2.5%');
    expect(armorHtml).toContain('Defense Penetration Protection');
    expect(armorHtml).toContain('+3%');
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

  it('uses native WoC potion and reins items while keeping Mount tickets outside #bags', () => {
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
    expect(useItem).toHaveBeenCalledWith('minor_healing_potion', { slotIndex: 0 });
    expect(mir4RedeemTicket).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Native Aeldrune Items');
    expect(root.textContent).not.toContain('Collection Tickets');
    expect(root.querySelector('[data-focus-key^="mir4-ticket:mount-"]')).toBeNull();
  });

  it('keeps the independent Spirit system entirely outside #bags', () => {
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

    expect(root.querySelector('[data-focus-key^="mir4-ticket:spirit-"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-spirit:"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-spirit-pending:"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-spirit-combine:"]')).toBeNull();
    expect(root.textContent).not.toContain('Spirits');
    expect(mir4RedeemTicket).not.toHaveBeenCalled();
    expect(mir4EquipSpirit).not.toHaveBeenCalled();
    expect(mir4ConfirmSpirit).not.toHaveBeenCalled();
    expect(mir4CombineSpirits).not.toHaveBeenCalled();
  });

  it('keeps the independent Mount system entirely outside #bags', () => {
    const { world, state, mir4RedeemTicket, mir4ConfirmMount, mir4EquipMount, mir4CombineMounts } =
      harness();
    state.mir4ArcRewards = {
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 100_000 },
    };
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

    expect(root.querySelector('[data-focus-key^="mir4-ticket:mount-"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-mount:"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-mount-pending:"]')).toBeNull();
    expect(root.querySelector('[data-focus-key^="mir4-mount-combine:"]')).toBeNull();
    expect(root.textContent).not.toContain('Mounts Awaiting Confirmation');
    expect(mir4RedeemTicket).not.toHaveBeenCalled();
    expect(mir4EquipMount).not.toHaveBeenCalled();
    expect(mir4ConfirmMount).not.toHaveBeenCalled();
    expect(mir4CombineMounts).not.toHaveBeenCalled();
  });
});
