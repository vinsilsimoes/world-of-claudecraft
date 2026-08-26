import { describe, expect, it } from 'vitest';
import { mir4EquipmentItem } from '../../src/sim/content/mir4/equipment_catalog';
import { createPlayer } from '../../src/sim/entity';
import {
  MIR4_NATIVE_ARMOR_MASK,
  mir4NativeEquipmentPresentation,
  mir4NativeHeldItemId,
  mir4NativeVisualItem,
} from '../../src/sim/mir4/native_equipment_visuals';
import { recalcMir4PlayerStats } from '../../src/sim/mir4/stats';

function item(id: number) {
  const def = mir4EquipmentItem(id);
  if (!def) throw new Error(`missing test equipment ${id}`);
  return def;
}

describe('MIR4 native WoC equipment presentation', () => {
  it('uses deliberate native weapon silhouettes for the five classes', () => {
    expect(mir4NativeHeldItemId(item(991010101))).toBe('eastbrook_greatsword');
    expect(mir4NativeHeldItemId(item(991010201))).toBe('gnarled_staff');
    expect(mir4NativeHeldItemId(item(991010301))).toBe('hickory_shortstaff');
    expect(mir4NativeHeldItemId(item(991010401))).toBeNull();
    expect(mir4NativeHeldItemId(item(991010501))).toBe('ironbark_boar_spear');
    expect(mir4NativeVisualItem(item(991010401)).id).toBeTruthy();
  });

  it('projects equipped body sockets and the legacy starter weapon without stats', () => {
    expect(
      mir4NativeEquipmentPresentation(1, {
        weapon: 200201000,
        5: 991050101,
        6: 991060101,
        8: 991080101,
      }),
    ).toEqual({
      classId: 1,
      armorMask:
        MIR4_NATIVE_ARMOR_MASK.chest | MIR4_NATIVE_ARMOR_MASK.head | MIR4_NATIVE_ARMOR_MASK.feet,
      mainhandItemId: 'eastbrook_greatsword',
      offhandItemId: null,
    });
  });

  it('stamps the render-only mirror through the authoritative stat funnel', () => {
    const player = createPlayer(1, 'warrior', { x: 0, y: 0, z: 0 }, 'Elementalist');
    recalcMir4PlayerStats(player, 'elementalist', 10, {
      1: 991010202,
      5: 991050202,
      7: 991070202,
    });
    expect(player.mir4VisualClassId).toBe(2);
    expect(player.mir4VisualArmorMask).toBe(
      MIR4_NATIVE_ARMOR_MASK.chest | MIR4_NATIVE_ARMOR_MASK.hands,
    );
    expect(player.mainhandItemId).toBe('apprentice_staff');
    expect(player.offhandItemId).toBeNull();
    expect(player.weaponSkinId).toBeNull();
  });
});
