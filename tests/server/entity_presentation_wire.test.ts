import { describe, expect, it } from 'vitest';
import {
  appendEntityPresentationDynamic,
  appendEntityPresentationIdentity,
  entityIdentityFields,
} from '../../server/entity_presentation_wire';
import {
  applyEntityPresentationIdentity,
  decodeMir4EquipmentPresentationWire,
  decodeNpcVendorItemsWire,
} from '../../src/net/entity_presentation_wire';
import type { Entity } from '../../src/sim/types';

function entity(overrides: Partial<Entity>): Entity {
  return {
    kind: 'mob',
    templateId: 'mir4_runtime_boss',
    mobFamily: 'dragonkin',
    mobElite: true,
    mobBoss: true,
    equippedItems: {},
    equippedInstances: {},
    ...overrides,
  } as Entity;
}

describe('entity presentation wire encoder', () => {
  it('emits runtime mob identity and native visual equipment only when present', () => {
    const out: Record<string, unknown> = {};
    appendEntityPresentationIdentity(
      out,
      entity({ mainhandItemId: 'steel_longsword', offhandItemId: null, mountKey: '' }),
    );
    expect(out).toEqual({ mfr: 'dragonkin', mel: 1, mbs: 1, mh: 'steel_longsword' });

    const staticMob: Record<string, unknown> = {};
    appendEntityPresentationIdentity(staticMob, entity({ templateId: 'forest_wolf' }));
    expect(staticMob).toEqual({});
  });

  it('round-trips the MIR4 native class and armour mask as player presentation only', () => {
    const player = entity({
      kind: 'player',
      mir4VisualClassId: 4,
      mir4VisualArmorMask: 13,
    });
    const out: Record<string, unknown> = {};
    appendEntityPresentationIdentity(out, player);
    expect(out).toEqual({ mvc: 4, mva: 13 });
    expect(decodeMir4EquipmentPresentationWire(out)).toEqual({ classId: 4, armorMask: 13 });

    const mirror = entity({ kind: 'player' });
    applyEntityPresentationIdentity(mirror, out);
    expect(mirror.mir4VisualClassId).toBe(4);
    expect(mirror.mir4VisualArmorMask).toBe(13);
    applyEntityPresentationIdentity(mirror, { mvc: 99, mva: 99 });
    expect(mirror.mir4VisualClassId).toBeUndefined();
    expect(mirror.mir4VisualArmorMask).toBeUndefined();
  });

  it('round-trips the authoritative PK mark and clears it from a later identity record', () => {
    const marked = entity({ kind: 'player', pkMarked: true });
    const wire = entityIdentityFields(marked);
    expect(wire.pk).toBe(1);

    const mirror = entity({ kind: 'player', pkMarked: false });
    applyEntityPresentationIdentity(mirror, wire);
    expect(mirror.pkMarked).toBe(true);
    applyEntityPresentationIdentity(mirror, {});
    expect(mirror.pkMarked).toBe(false);
  });

  it('rounds an active MIR4 shield and omits an expired shield', () => {
    const active: Record<string, unknown> = {};
    appendEntityPresentationDynamic(
      active,
      entity({ mir4Shield: { remaining: 3.456, damageReductionBasisPoints: 2_000, bashDamageReductionBasisPoints: 0, absorptionRemaining: 100, hitsRemaining: 5 } }),
    );
    expect(active).toEqual({ msh: [3.46, 0.2] });

    const expired: Record<string, unknown> = {};
    appendEntityPresentationDynamic(
      expired,
      entity({ mir4Shield: { remaining: 0, damageReductionBasisPoints: 2_000, bashDamageReductionBasisPoints: 0, absorptionRemaining: 100, hitsRemaining: 5 } }),
    );
    expect(expired).toEqual({});
  });

  it('projects the complete sparse identity while excluding private item-instance state', () => {
    const out = entityIdentityFields(
      entity({
        kind: 'player',
        name: 'Owner',
        level: 42,
        scale: 1,
        color: 0xffffff,
        equippedItems: { mainhand: 'steel_longsword' },
        equippedInstances: {
          mainhand: {
            signer: 'Smith',
            enchant: 'sharp',
            rolled: { masterwork: true, stats: { str: 7 } },
            boundTo: 99,
            charges: { sharp: 3 },
          },
        },
      }),
    );

    expect(out).toMatchObject({
      k: 'player',
      tid: 'mir4_runtime_boss',
      nm: 'Owner',
      lv: 42,
      eq: { mainhand: 'steel_longsword' },
      eqi: {
        mainhand: {
          signer: 'Smith',
          enchant: 'sharp',
          rolled: { masterwork: true, stats: { str: 7 } },
        },
      },
    });
    expect(JSON.stringify(out)).not.toContain('boundTo');
    expect(JSON.stringify(out)).not.toContain('charges');
  });

  it('projects authoritative NPC vendor stock only when the service is present', () => {
    expect(
      entityIdentityFields(
        entity({
          kind: 'npc',
          name: 'Sara das Ervas',
          level: 10,
          vendorItems: ['minor_healing_potion', 'minor_mana_potion'],
        }),
      ),
    ).toMatchObject({
      k: 'npc',
      vi: ['minor_healing_potion', 'minor_mana_potion'],
    });

    expect(
      entityIdentityFields(entity({ kind: 'npc', name: 'Guide', level: 10, vendorItems: [] })),
    ).not.toHaveProperty('vi');
  });

  it('accepts bounded vendor catalogs and rejects malformed wire stock', () => {
    expect(decodeNpcVendorItemsWire(['minor_healing_potion', 'minor_mana_potion'])).toEqual([
      'minor_healing_potion',
      'minor_mana_potion',
    ]);
    expect(decodeNpcVendorItemsWire([])).toBeUndefined();
    expect(decodeNpcVendorItemsWire(['valid', 3])).toBeUndefined();
    expect(decodeNpcVendorItemsWire(Array.from({ length: 257 }, () => 'item'))).toBeUndefined();
  });
});
