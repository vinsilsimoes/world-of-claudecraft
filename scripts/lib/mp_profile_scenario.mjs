const CLASSIC_SCENARIO = Object.freeze({
  profile: 'woc-classic',
  primary: Object.freeze({
    namePrefix: 'Thorg',
    classKey: 'warrior',
    mir4ClassId: null,
    starterItemId: null,
    starterArmorItemId: null,
  }),
  secondary: Object.freeze({
    namePrefix: 'Zappy',
    classKey: 'mage',
    mir4ClassId: null,
    starterItemId: null,
    starterArmorItemId: null,
  }),
});

const MIR4_SCENARIO = Object.freeze({
  profile: 'mir4-gameplay-port',
  primary: Object.freeze({
    namePrefix: 'Elyra',
    classKey: 'elementalist',
    mir4ClassId: 2,
    starterItemId: 200202000,
    starterArmorItemId: 301202000,
  }),
  secondary: Object.freeze({
    namePrefix: 'Kael',
    classKey: 'lancer',
    mir4ClassId: 5,
    starterItemId: 200205000,
    starterArmorItemId: 301205000,
  }),
});

export function multiplayerScenarioForProfile(profile) {
  if (profile === 'mir4-gameplay-port') return MIR4_SCENARIO;
  if (profile === 'woc-classic') return CLASSIC_SCENARIO;
  throw new Error(`Unsupported multiplayer profile: ${String(profile)}`);
}
