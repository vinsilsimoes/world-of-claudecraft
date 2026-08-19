// The mir4 slice item registry: the warrior's starter weapon, ported
// verbatim from the source character-core starterItems (itemId 200201000).
// Attributes are [statusId, value] pairs exactly as the source ships them;
// status 44 is not yet mapped by the combat bridge (kept in data until
// identified, applied never). The full 240-item equipment catalog is the
// Phase 4 port; ids here are the NATIVE source ids, never reused.

export interface Mir4ItemDef {
  id: number;
  /** PT-BR source-facing name; English i18n source lands with the UI facet. */
  name: string;
  slot: 'weapon';
  attributes: readonly (readonly [number, number])[];
}

export const MIR4_ITEMS: Record<number, Mir4ItemDef> = {
  200201000: {
    id: 200201000,
    name: 'Arma Inicial do Guerreiro',
    slot: 'weapon',
    attributes: [
      [20, 75],
      [28, 5],
      [44, 10],
    ],
  },
};

/** Status ids the combat bridge applies (mir4/math.ts MIR4_STATUS_IDS). */
export const MIR4_APPLIED_STATUS_IDS = new Set([20, 28]);
