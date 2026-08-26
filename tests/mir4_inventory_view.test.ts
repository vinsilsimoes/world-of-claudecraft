import { describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../src/sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG } from '../src/sim/content/mir4/spirits_catalog';
import { ITEMS } from '../src/sim/data';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import {
  buildMir4InventoryView,
  MIR4_SPIRIT_GRADE_VISUAL_ITEMS,
  MIR4_SPIRIT_TICKET_VISUAL_ITEMS,
} from '../src/ui/mir4_inventory_view';

describe('mir4 inventory view', () => {
  it('projects Energy and Darksteel as currencies instead of inventory items', () => {
    const view = buildMir4InventoryView({
      classId: 1,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 450, energy: 12_500 },
    });

    expect(view.currencies).toEqual([
      { key: 'energy', count: 12_500 },
      { key: 'darksteel', count: 450 },
    ]);
    expect(view.nativeItems).toEqual([]);
  });

  it('uses intentional native mystical shells rather than mining or herb placeholders', () => {
    const materialPlaceholders = new Set([
      'copper_ore',
      'silverleaf_herb',
      'thorium_ore',
      'arcanite_bar',
      'goldleaf_herb',
      'ironbark_log',
    ]);
    const spiritVisuals = [
      ...Object.values(MIR4_SPIRIT_GRADE_VISUAL_ITEMS),
      ...Object.values(MIR4_SPIRIT_TICKET_VISUAL_ITEMS),
    ];
    expect(spiritVisuals).toHaveLength(8);
    expect(spiritVisuals.every((itemId) => !materialPlaceholders.has(itemId))).toBe(true);
  });

  it('shows owned unequipped instances and only materials the character owns', () => {
    const view = buildMir4InventoryView({
      classId: 1,
      ultimateGauge: 0,
      mir4Equipment: { 1: 991010101 },
      mir4EquipmentInstances: {
        991010101: { itemId: 991010101, enhancement: 1 },
        991020101: { itemId: 991020101, enhancement: 3 },
        991030101: { itemId: 991030101, enhancement: 0, destroyed: true },
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
    });

    expect(view.equipment.map((entry) => entry.itemId)).toEqual([991020101]);
    expect(view.equipment[0]?.enhancement).toBe(3);
    expect(view.materials).toEqual([
      { key: 'sunStone', count: 4 },
      { key: 'moonStone', count: 3 },
      { key: 'solarScroll', count: 2 },
      { key: 'lunarSeal', count: 1 },
      { key: 'solarWard', count: 5 },
    ]);
  });

  it('shows unequipped starter items with WoC-native inventory shells', () => {
    const view = buildMir4InventoryView({
      classId: 5,
      ultimateGauge: 0,
      mir4EquipmentInstances: {
        200205000: { itemId: 200205000, enhancement: 0 },
        301205000: { itemId: 301205000, enhancement: 0 },
      },
    });

    expect(view.equipment.map((item) => item.itemId)).toEqual([200205000, 301205000]);
    expect(view.equipment[0]?.visualItemId).toBe('ironbark_boar_spear');
    expect(ITEMS[view.equipment[1]?.visualItemId ?? '']?.slot).toBe('chest');
  });

  it('shows campaign equipment rewards before their first equip creates an instance', () => {
    const view = buildMir4InventoryView({
      classId: 1,
      ultimateGauge: 0,
      mir4ArcRewards: {
        items: {
          '991010101': 1,
          'material-presa': 2,
        },
      },
    });

    expect(view.equipment).toEqual([
      expect.objectContaining({
        itemId: 991010101,
        enhancement: 0,
      }),
    ]);
    expect(view.equipment[0]?.visualItemId).toBeTruthy();
  });

  it('returns a stable empty projection before the first owned item', () => {
    expect(buildMir4InventoryView({ classId: 5, ultimateGauge: 0 })).toMatchObject({
      equipment: [],
      nativeItems: [],
      mountTickets: [],
      spiritTickets: [],
      spirits: [],
      pendingSpirits: [],
      spiritCombinations: [],
      currencies: [],
      materials: [],
    });
  });

  it('omits zero-count native items and legacy equipment tokens from Bags', () => {
    const view = buildMir4InventoryView(
      {
        classId: 1,
        ultimateGauge: 0,
        mir4ArcRewards: {
          items: {
            '991010101': 0,
            'material-presa': 0,
          },
        },
      },
      [
        { itemId: 'minor_healing_potion', count: 0 },
        { itemId: 'worn_sword', count: 0 },
      ],
    );

    expect(view.equipment).toEqual([]);
    expect(view.nativeItems).toEqual([]);
    expect(view.materials).toEqual([]);
  });

  it('projects every owned native runtime item and mount tickets into the existing Bags surface', () => {
    const view = buildMir4InventoryView(
      {
        classId: 1,
        ultimateGauge: 0,
        mir4ArcRewards: {
          tickets: {
            'mount-ticket-dawn': 2,
            'mount-ticket-twilight': 1,
            'spirit-ticket-dawn': 3,
          },
        },
        mir4Spirits: {
          owned: { 'spirit-common-01': 4 },
          discovered: ['spirit-common-01'],
          equippedSpiritId: 'spirit-common-01',
          pending: [{ id: 'spirit-pending-1-1', spiritId: 'spirit-epic-01', grade: 4 }],
        },
        mir4Mounts: {
          owned: { 'meadow-courser': 4 },
          discovered: ['meadow-courser'],
          equippedMountId: 'meadow-courser',
          pending: [{ id: 'mount-pending-1-1', mountId: 'eclipse-lion', grade: 4 }],
        },
      },
      [
        { itemId: 'minor_healing_potion', count: 4 },
        { itemId: 'reins_valorsteed', count: 1 },
        { itemId: 'worn_sword', count: 1 },
      ],
    );

    expect(view.nativeItems.map(({ slotIndex, slot }) => [slotIndex, slot.itemId])).toEqual([
      [0, 'minor_healing_potion'],
      [1, 'reins_valorsteed'],
      [2, 'worn_sword'],
    ]);
    expect(view.mountTickets).toEqual([
      { ticketId: 'mount-ticket-dawn', count: 2, visualItemId: 'reins_valorsteed' },
      {
        ticketId: 'mount-ticket-twilight',
        count: 1,
        visualItemId: 'reins_aether_hover_cycle',
      },
    ]);
    expect(view.spiritTickets).toEqual([
      { ticketId: 'spirit-ticket-dawn', count: 3, visualItemId: 'soul_stone' },
    ]);
    expect(view.spirits).toEqual([
      expect.objectContaining({
        spiritId: 'spirit-common-01',
        count: 4,
        equipped: true,
        visualItemId: 'ghostly_essence',
      }),
    ]);
    expect(view.pendingSpirits).toEqual([
      expect.objectContaining({
        pendingId: 'spirit-pending-1-1',
        spiritId: 'spirit-epic-01',
        visualItemId: 'wraithfire_orb',
      }),
    ]);
    expect(view.spiritCombinations).toEqual([
      { grade: 1, owned: 4, attempts: 1, visualItemId: 'ghostly_essence' },
    ]);
    expect(view.mounts).toEqual([
      expect.objectContaining({
        mountId: 'meadow-courser',
        count: 4,
        equipped: true,
        stats: {
          moveSpeedBps: 1_000,
          basicAttackSpeedBps: 500,
          physicalDefense: 4,
          magicDefense: 4,
        },
      }),
    ]);
    expect(view.pendingMounts).toEqual([
      expect.objectContaining({
        pendingId: 'mount-pending-1-1',
        mountId: 'eclipse-lion',
        grade: 4,
        stats: {
          moveSpeedBps: 2_500,
          basicAttackSpeedBps: 2_000,
          physicalDefense: 36,
          magicDefense: 36,
        },
      }),
    ]);
    expect(view.mountCombinations).toEqual([
      expect.objectContaining({ grade: 1, owned: 4, attempts: 1 }),
    ]);
  });

  it('resolves native WoC visuals and special skills for every collectible catalog entry', () => {
    const view = buildMir4InventoryView({
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: {
        owned: Object.fromEntries(MIR4_MOUNTS_CATALOG.map((mount) => [mount.id, 1])),
        discovered: MIR4_MOUNTS_CATALOG.map((mount) => mount.id),
        pending: [],
      },
      mir4Spirits: {
        owned: Object.fromEntries(MIR4_SPIRITS_CATALOG.map((spirit) => [spirit.id, 1])),
        discovered: MIR4_SPIRITS_CATALOG.map((spirit) => spirit.id),
        pending: [],
      },
    });

    expect(view.mounts).toHaveLength(85);
    expect(view.spirits).toHaveLength(30);
    const expectedMoveSpeedByGrade = new Map([
      [1, 1_000],
      [2, 1_500],
      [3, 2_000],
      [4, 2_500],
      [5, 5_000],
      [6, 8_000],
    ]);
    const expectedBasicAttackSpeedByGrade = new Map([
      [1, 500],
      [2, 1_000],
      [3, 1_500],
      [4, 2_000],
      [5, 3_500],
      [6, 5_000],
    ]);
    expect(
      view.mounts.every(
        (mount) =>
          mount.stats.moveSpeedBps === expectedMoveSpeedByGrade.get(mount.grade) &&
          mount.stats.basicAttackSpeedBps === expectedBasicAttackSpeedByGrade.get(mount.grade),
      ),
    ).toBe(true);
    expect(view.mounts.every((mount) => mount.visualItemId.length > 0)).toBe(true);
    expect(
      view.spirits.every((spirit) => spirit.visualItemId.length > 0 && spirit.skill.id.length > 0),
    ).toBe(true);
  });
});
