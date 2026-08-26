import { describe, expect, it } from 'vitest';
import {
  createMir4ActionToolsView,
  MIR4_ACTION_POTION_SLOTS,
  mir4PotionBarItems,
} from '../src/ui/hud/action_bar/mir4_action_tools_view';

const items = {
  minor_healing_potion: {
    id: 'minor_healing_potion',
    kind: 'potion',
    potionHp: 110,
  },
  healing_potion: { id: 'healing_potion', kind: 'potion', potionHp: 320 },
  minor_mana_potion: { id: 'minor_mana_potion', kind: 'potion', potionMana: 145 },
  mana_potion: { id: 'mana_potion', kind: 'potion', potionMana: 410 },
  food: { id: 'food', kind: 'food' },
} as const;

describe('MIR4 action tools view', () => {
  it('selects the strongest carried healing and mana potion in stable role order', () => {
    const out: (string | null)[] = [];
    const result = mir4PotionBarItems(
      [
        { itemId: 'minor_mana_potion' },
        { itemId: 'food' },
        { itemId: 'minor_healing_potion' },
        { itemId: 'mana_potion' },
        { itemId: 'healing_potion' },
      ],
      (id) => items[id as keyof typeof items],
      out,
    );

    expect(MIR4_ACTION_POTION_SLOTS).toBe(2);
    expect(result).toBe(out);
    expect(result).toEqual(['healing_potion', 'mana_potion']);
  });

  it('keeps empty health and mana roles instead of shifting or filling them', () => {
    expect(
      mir4PotionBarItems(
        [{ itemId: 'minor_mana_potion' }, { itemId: 'food' }],
        (id) => items[id as keyof typeof items],
        [],
      ),
    ).toEqual([null, 'minor_mana_potion']);
  });

  it('reuses its state and potion array while exposing tools only for MIR4', () => {
    const view = createMir4ActionToolsView((id) => items[id as keyof typeof items]);
    const first = view.tick({
      profile: 'mir4-gameplay-port',
      autoBattleActive: true,
      autoCollectActive: false,
      autoBattleKeybind: 'F9',
      autoCollectKeybind: 'F10',
      inventory: [{ itemId: 'minor_healing_potion' }],
    });
    const potionIds = first.potionIds;

    expect(first).toMatchObject({
      visible: true,
      autoBattleActive: true,
      autoCollectActive: false,
      autoBattleKeybind: 'F9',
      autoCollectKeybind: 'F10',
      potionIds: ['minor_healing_potion', null],
    });

    const second = view.tick({
      profile: 'woc-classic',
      autoBattleActive: false,
      autoCollectActive: true,
      autoBattleKeybind: '',
      autoCollectKeybind: '',
      inventory: [],
    });
    expect(second).toBe(first);
    expect(second.potionIds).toBe(potionIds);
    expect(second.visible).toBe(false);
    expect(second.potionIds).toEqual([null, null]);
  });
});
