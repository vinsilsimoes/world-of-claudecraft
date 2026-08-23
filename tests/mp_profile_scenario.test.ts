import { describe, expect, it } from 'vitest';
import { multiplayerScenarioForProfile } from '../scripts/lib/mp_profile_scenario.mjs';

describe('multiplayer profile scenarios', () => {
  it('uses two native MIR4 roster keys and their authoritative class ids', () => {
    expect(multiplayerScenarioForProfile('mir4-gameplay-port')).toEqual({
      profile: 'mir4-gameplay-port',
      primary: {
        namePrefix: 'Elyra',
        classKey: 'elementalist',
        mir4ClassId: 2,
        starterItemId: 200202000,
        starterArmorItemId: 301202000,
      },
      secondary: {
        namePrefix: 'Kael',
        classKey: 'lancer',
        mir4ClassId: 5,
        starterItemId: 200205000,
        starterArmorItemId: 301205000,
      },
    });
  });

  it('keeps the established classic warrior and mage scenario', () => {
    expect(multiplayerScenarioForProfile('woc-classic')).toEqual({
      profile: 'woc-classic',
      primary: {
        namePrefix: 'Thorg',
        classKey: 'warrior',
        mir4ClassId: null,
        starterItemId: null,
        starterArmorItemId: null,
      },
      secondary: {
        namePrefix: 'Zappy',
        classKey: 'mage',
        mir4ClassId: null,
        starterItemId: null,
        starterArmorItemId: null,
      },
    });
  });
});
