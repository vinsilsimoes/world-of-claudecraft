// The five mir4-gameplay-port classes, ported from the source project's
// server/mir4-class-combat-identity-v1.js (CLASS_IDENTITIES),
// server/mir4-class-combat-range-v1.js (CLASS_PROFILES),
// server/mir4-character-appearance-v1.js (names), and
// server/data/mir4-character-core-v1.json (classCreates). DO NOT change values
// without a documented decision in docs/migration/survival-game-port-plan.md.
// The stat/level table itself is class_levels.ts.

export type Mir4ClassId = 1 | 2 | 3 | 4 | 5;
export type Mir4ClassKey = 'warrior' | 'elementalist' | 'taoist' | 'arbalist' | 'lancer';
export type Mir4DamageChannel = 'physical' | 'magic';
export type Mir4RangeBand = 'melee' | 'medium-range' | 'long-range' | 'melee-extended';

export interface Mir4ClassDef {
  classId: Mir4ClassId;
  key: Mir4ClassKey;
  /** PT-BR product name from the source project; English i18n source is authored when the profile surfaces it. */
  name: string;
  weapon: 'heavySword' | 'largeStaff' | 'shortStaff' | 'arbalest' | 'spear';
  damageChannel: Mir4DamageChannel;
  rangeBand: Mir4RangeBand;
  /** Source range envelope in tiles (basic/ultimate/targeted are identical per class). */
  rangeTiles: number;
  /** The initial skill deck (4 skills); the 5th supplemental skill unlocks at level 5. */
  initialSkillIds: readonly number[];
  initialStageId: number;
  initialPosition: readonly [number, number, number];
  initialCostumeId: number;
  initialWeaponItemId: number;
  initialArmorTopItemId: number;
  initialWeaponMeshIds: readonly number[];
  questStartId: number;
  initialVehicleId: number;
}

/** The classId roster, in source order. */
export const MIR4_CLASS_IDS: readonly Mir4ClassId[] = [1, 2, 3, 4, 5];

export const MIR4_CLASSES: readonly Mir4ClassDef[] = [
  {
    classId: 1,
    key: 'warrior',
    name: 'Guerreiro',
    weapon: 'heavySword',
    damageChannel: 'physical',
    rangeBand: 'melee',
    rangeTiles: 2,
    initialSkillIds: [1102, 1104, 1304, 1401],
    initialStageId: 100004010,
    initialPosition: [29722, 74350, 9065],
    initialCostumeId: 103001,
    initialWeaponItemId: 200201000,
    initialArmorTopItemId: 301201000,
    initialWeaponMeshIds: [101111],
    questStartId: 100000000,
    initialVehicleId: 1011,
  },
  {
    classId: 2,
    key: 'elementalist',
    name: 'Elementalista',
    weapon: 'largeStaff',
    damageChannel: 'magic',
    rangeBand: 'medium-range',
    rangeTiles: 4,
    initialSkillIds: [2101, 2111, 2501, 2301],
    initialStageId: 100004010,
    initialPosition: [29722, 74350, 9065],
    initialCostumeId: 203001,
    initialWeaponItemId: 200202000,
    initialArmorTopItemId: 301202000,
    initialWeaponMeshIds: [121111],
    questStartId: 100000000,
    initialVehicleId: 1011,
  },
  {
    classId: 3,
    key: 'taoist',
    name: 'Taoista',
    weapon: 'shortStaff',
    damageChannel: 'physical',
    rangeBand: 'melee',
    rangeTiles: 2,
    initialSkillIds: [3506, 3101, 3301, 3104],
    initialStageId: 100004010,
    initialPosition: [29722, 74350, 9065],
    initialCostumeId: 303001,
    initialWeaponItemId: 200203000,
    initialArmorTopItemId: 301203000,
    initialWeaponMeshIds: [141111],
    questStartId: 100000000,
    initialVehicleId: 1011,
  },
  {
    classId: 4,
    key: 'arbalist',
    name: 'Besteiro',
    weapon: 'arbalest',
    damageChannel: 'physical',
    rangeBand: 'long-range',
    rangeTiles: 6,
    initialSkillIds: [4101, 4106, 4102, 4103],
    initialStageId: 100004010,
    initialPosition: [29722, 74350, 9065],
    initialCostumeId: 403001,
    initialWeaponItemId: 200204000,
    initialArmorTopItemId: 301204000,
    initialWeaponMeshIds: [161101, 162101],
    questStartId: 100000000,
    initialVehicleId: 1011,
  },
  {
    classId: 5,
    key: 'lancer',
    name: 'Lanceiro',
    weapon: 'spear',
    damageChannel: 'physical',
    rangeBand: 'melee-extended',
    rangeTiles: 3,
    initialSkillIds: [5201, 5101, 5104, 5301],
    initialStageId: 100004010,
    initialPosition: [29722, 74350, 9065],
    initialCostumeId: 503001,
    initialWeaponItemId: 200205000,
    initialArmorTopItemId: 301205000,
    initialWeaponMeshIds: [181103],
    questStartId: 100000000,
    initialVehicleId: 1011,
  },
];

const BY_ID = new Map<number, Mir4ClassDef>(MIR4_CLASSES.map((c) => [c.classId, c]));
const BY_KEY = new Map<Mir4ClassKey, Mir4ClassDef>(MIR4_CLASSES.map((c) => [c.key, c]));

export function mir4ClassById(classId: number): Mir4ClassDef | null {
  return BY_ID.get(classId) ?? null;
}

export function mir4ClassByKey(key: string): Mir4ClassDef | null {
  return BY_KEY.get(key as Mir4ClassKey) ?? null;
}

/**
 * Standing decision #3 in the port plan: one source tile converts to 2 yards at
 * content-definition time (source TILE is 32 px). The only place this scale
 * lives; never mix px/tiles/yards at a call site.
 */
export const MIR4_TILES_TO_YARDS = 2;

/** The class's full range envelope in world yards. */
export function mir4ClassRangeYards(def: Mir4ClassDef): number {
  return def.rangeTiles * MIR4_TILES_TO_YARDS;
}
