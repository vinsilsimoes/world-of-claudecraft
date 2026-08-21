import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/sim/data';
import {
  buildMir4CharacterPreview,
  buildMir4CharacterView,
  MIR4_EQUIPMENT_SLOT_IDS,
  resolveMir4PreviewHands,
} from '../src/ui/mir4_character_view';

describe('mir4 character view', () => {
  it('builds the native class, eight shared paperdoll sockets and live stats', () => {
    const view = buildMir4CharacterView(
      {
        classId: 3,
        ultimateGauge: 42,
        mir4Equipment: { 1: 991010301, 5: 991050301 },
        mir4EquipmentInstances: {
          991010301: { itemId: 991010301, enhancement: 2 },
          991050301: { itemId: 991050301, enhancement: 0 },
        },
      },
      10,
    );

    expect(view?.classKey).toBe('taoist');
    expect(view?.slots.map((slot) => slot.slotId)).toEqual(MIR4_EQUIPMENT_SLOT_IDS);
    expect(view?.slots.filter((slot) => slot.item !== null)).toHaveLength(2);
    expect(view?.slots[0]?.item?.enhancement).toBe(2);
    expect(ITEMS[view?.slots[0]?.item?.visualItemId ?? '']).toBeDefined();
    expect(view?.slots[0]?.item?.visualSlot).toBe('mainhand');
    expect(view?.slots[0]?.item?.runtimeAttributes).toEqual(
      expect.arrayContaining([expect.objectContaining({ statusId: 20 })]),
    );
    expect(view?.stats.combatPower).toBeGreaterThan(0);
  });

  it('projects the source-backed starter loadout through native WoC equipment visuals', () => {
    const view = buildMir4CharacterView(
      {
        classId: 2,
        ultimateGauge: 0,
        mir4Equipment: { 1: 200202000, 5: 301202000 },
        mir4EquipmentInstances: {
          200202000: { itemId: 200202000, enhancement: 0 },
          301202000: { itemId: 301202000, enhancement: 0 },
        },
      },
      1,
    );

    expect(view?.slots[0]?.item).toMatchObject({
      itemId: 200202000,
      visualItemId: 'gnarled_staff',
      visualSlot: 'mainhand',
    });
    expect(view?.slots[4]?.item).toMatchObject({
      itemId: 301202000,
      visualSlot: 'chest',
    });
    expect(view?.stats.magicAttack).toBe(125);
    expect(view?.stats.physicalDefense).toBe(12);
    expect(view?.stats.magicDefense).toBe(12);
    expect(buildMir4CharacterPreview(view!)).toEqual({
      visualClass: 'mage',
      equipment: { mainhand: 'gnarled_staff', offhand: null },
      worn: { chest: 'mage', arms: 'mage', legs: 'mage', back: 'mage' },
    });
  });

  it('fails closed without an authoritative MIR4 state', () => {
    expect(buildMir4CharacterView(null, 1)).toBeNull();
  });

  it('overrides only the native preview hands supplied by the MIR4 paperdoll', () => {
    expect(
      resolveMir4PreviewHands(
        { mainhand: 'runtime_sword', offhand: 'runtime_shield' },
        { mainhand: 'mir4_visual_sword' },
      ),
    ).toEqual({ mainhand: 'mir4_visual_sword', offhand: 'runtime_shield' });
    expect(resolveMir4PreviewHands({ mainhand: 'runtime_sword' }, { mainhand: null })).toEqual({
      mainhand: null,
      offhand: null,
    });
  });

  it('projects native WoC body sets and explicit empty hands into the shared 3D preview', () => {
    const view = buildMir4CharacterView(
      {
        classId: 4,
        ultimateGauge: 0,
        mir4Equipment: {
          5: 991050401,
          6: 991060401,
          7: 991070401,
          8: 991080401,
        },
      },
      10,
    );

    expect(view).not.toBeNull();
    expect(buildMir4CharacterPreview(view!)).toEqual({
      visualClass: 'hunter',
      equipment: { mainhand: null, offhand: null },
      worn: {
        head: 'ranger',
        chest: 'ranger',
        arms: 'ranger',
        legs: 'ranger',
        back: 'ranger',
        hands: 'ranger',
        feet: 'ranger',
      },
    });
  });

  it('does not leak the classic body kit into empty MIR4 equipment slots', () => {
    const view = buildMir4CharacterView({ classId: 2, ultimateGauge: 0 }, 1);

    expect(view).not.toBeNull();
    expect(buildMir4CharacterPreview(view!)).toEqual({
      visualClass: 'mage',
      equipment: { mainhand: null, offhand: null },
      worn: {},
    });
  });
});
