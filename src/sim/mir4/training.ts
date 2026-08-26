// Source-backed first Training tier distilled from the extracted MIR4 client.
// CHARACTER_MASTERY owns Constitution, while CHARACTER_FORCE_BLOOD owns the
// four channels of the first Inner Force manual. Persist only the levels; all
// costs and derived statuses remain catalog facts.

import type { Mir4ClassId } from '../content/mir4/classes';
import type { Mir4Materials } from './equipment';
import {
  type Mir4SolitudeTrainingState,
  mir4SolitudeStatusBonuses,
  sanitizeMir4SolitudeTrainingState,
} from './solitude_training';

export const MIR4_TRAINING_STATE_VERSION = 1 as const;
export const MIR4_TRAINING_FIRST_TIER_MAX_LEVEL = 5;
export const MIR4_TRAINING_UPGRADE_ENERGY_COST = 100;

export interface Mir4TrainingBranchDef {
  readonly id: number;
  readonly name: string;
}

export type Mir4TrainingMaterialRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Mir4TrainingMaterialDef {
  readonly key: keyof Mir4Materials;
  readonly name: string;
  readonly rarity: Mir4TrainingMaterialRarity;
  readonly source: 'herbalism' | 'hunting' | 'crafting';
}

export interface Mir4TrainingMaterialRequirement {
  readonly key: keyof Mir4Materials;
  readonly count: number;
}

export const MIR4_TRAINING_MATERIALS: Readonly<
  Partial<Record<keyof Mir4Materials, Mir4TrainingMaterialDef>>
> = Object.freeze({
  herbLeaf: { key: 'herbLeaf', name: 'Herb Leaf', rarity: 'common', source: 'herbalism' },
  reishi: { key: 'reishi', name: 'Reishi', rarity: 'common', source: 'herbalism' },
  herbRoot: { key: 'herbRoot', name: 'Herb Root', rarity: 'uncommon', source: 'herbalism' },
  unihornSlice: {
    key: 'unihornSlice',
    name: 'Unihorn Slice',
    rarity: 'common',
    source: 'hunting',
  },
  flowerOil: { key: 'flowerOil', name: 'Flower Oil', rarity: 'rare', source: 'herbalism' },
  centuryFruit: {
    key: 'centuryFruit',
    name: 'Century Fruit',
    rarity: 'epic',
    source: 'herbalism',
  },
  etherealShard: {
    key: 'etherealShard',
    name: 'Ethereal Shard',
    rarity: 'uncommon',
    source: 'hunting',
  },
  lunarShard: {
    key: 'lunarShard',
    name: 'Lunar Shard',
    rarity: 'uncommon',
    source: 'hunting',
  },
  solarShard: {
    key: 'solarShard',
    name: 'Solar Shard',
    rarity: 'uncommon',
    source: 'hunting',
  },
  boundlessShard: {
    key: 'boundlessShard',
    name: 'Boundless Shard',
    rarity: 'uncommon',
    source: 'hunting',
  },
  greaterYangPill: {
    key: 'greaterYangPill',
    name: 'Greater Yang Pill',
    rarity: 'common',
    source: 'crafting',
  },
  greaterYinPill: {
    key: 'greaterYinPill',
    name: 'Greater Yin Pill',
    rarity: 'common',
    source: 'crafting',
  },
  lesserYangPill: {
    key: 'lesserYangPill',
    name: 'Lesser Yang Pill',
    rarity: 'common',
    source: 'crafting',
  },
  lesserYinPill: {
    key: 'lesserYinPill',
    name: 'Lesser Yin Pill',
    rarity: 'common',
    source: 'crafting',
  },
});

export const MIR4_CONSTITUTION_BRANCHES: readonly Mir4TrainingBranchDef[] = [
  { id: 1, name: 'Iron Skin' },
  { id: 2, name: 'Clever' },
  { id: 3, name: 'Insightful' },
  { id: 4, name: 'Awakened' },
  { id: 5, name: 'Agility' },
  { id: 6, name: 'Focused' },
  { id: 7, name: 'Strength' },
];

export const MIR4_INNER_FORCE_MANUAL_NAME = 'Muscle Strength Manual';
export const MIR4_INNER_FORCE_BRANCHES: readonly Mir4TrainingBranchDef[] = [
  { id: 1, name: 'Sky Palace' },
  { id: 2, name: 'Royal Decree' },
  { id: 3, name: 'Pulsing Sky' },
  { id: 4, name: 'Great Ruler' },
];

export interface Mir4TrainingState {
  readonly version: typeof MIR4_TRAINING_STATE_VERSION;
  readonly constitution: readonly number[];
  readonly innerForce: readonly number[];
  readonly solitude?: Mir4SolitudeTrainingState;
}

const EMPTY_CONSTITUTION = Object.freeze(Array<number>(MIR4_CONSTITUTION_BRANCHES.length).fill(0));
const EMPTY_INNER_FORCE = Object.freeze(Array<number>(MIR4_INNER_FORCE_BRANCHES.length).fill(0));

export function emptyMir4TrainingState(): Mir4TrainingState {
  return {
    version: MIR4_TRAINING_STATE_VERSION,
    constitution: [...EMPTY_CONSTITUTION],
    innerForce: [...EMPTY_INNER_FORCE],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeLevels(value: unknown, length: number): number[] {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) => {
    const candidate = raw[index];
    if (typeof candidate !== 'number' || !Number.isFinite(candidate)) return 0;
    return Math.max(0, Math.min(MIR4_TRAINING_FIRST_TIER_MAX_LEVEL, Math.floor(candidate)));
  });
}

export function sanitizeMir4TrainingState(value: unknown): Mir4TrainingState | undefined {
  if (!isRecord(value) || value.version !== MIR4_TRAINING_STATE_VERSION) return undefined;
  const solitude = sanitizeMir4SolitudeTrainingState(value.solitude);
  return {
    version: MIR4_TRAINING_STATE_VERSION,
    constitution: sanitizeLevels(value.constitution, MIR4_CONSTITUTION_BRANCHES.length),
    innerForce: sanitizeLevels(value.innerForce, MIR4_INNER_FORCE_BRANCHES.length),
    ...(solitude ? { solitude } : {}),
  };
}

function addStatus(target: Map<number, number>, statusId: number, amount: number): void {
  if (amount <= 0) return;
  target.set(statusId, (target.get(statusId) ?? 0) + amount);
}

function attackStatusesForClass(classId: Mir4ClassId): readonly number[] {
  if (classId === 2) return [22];
  if (classId === 3 || classId === 5) return [20, 22];
  return [20];
}

const INNER_FORCE_ATTACK_BY_LEVEL = [0, 5, 9, 14, 18, 23] as const;
const INNER_FORCE_HYBRID_ATTACK_BY_LEVEL = [0, 9, 18, 27, 36, 45] as const;

/** Effective status rows for the saved levels. Table values are totals at a
 * level, so this must never sum every prior row. */
export function mir4TrainingStatusBonuses(
  classId: Mir4ClassId,
  state: Mir4TrainingState | undefined,
): ReadonlyMap<number, number> {
  const statuses = new Map<number, number>();
  const constitution = state?.constitution ?? EMPTY_CONSTITUTION;
  addStatus(statuses, 24, (constitution[0] ?? 0) * 6);
  addStatus(statuses, 26, (constitution[1] ?? 0) * 6);
  addStatus(statuses, 1, (constitution[2] ?? 0) * 100);
  addStatus(statuses, 6, (constitution[3] ?? 0) * 20);
  addStatus(statuses, 29, (constitution[4] ?? 0) * 4);
  addStatus(statuses, 28, (constitution[5] ?? 0) * 4);
  for (const statusId of attackStatusesForClass(classId)) {
    addStatus(statuses, statusId, (constitution[6] ?? 0) * 9);
  }

  const innerForce = state?.innerForce ?? EMPTY_INNER_FORCE;
  const attackLevel = innerForce[0] ?? 0;
  const attackByLevel =
    classId === 3 || classId === 5
      ? INNER_FORCE_HYBRID_ATTACK_BY_LEVEL
      : INNER_FORCE_ATTACK_BY_LEVEL;
  // The extracted first manual gives hybrid classes physical ATK only.
  const innerAttackStatus = classId === 2 ? 22 : 20;
  addStatus(statuses, innerAttackStatus, attackByLevel[attackLevel] ?? 0);
  addStatus(statuses, 40, (innerForce[1] ?? 0) * 5);
  addStatus(statuses, 24, (innerForce[2] ?? 0) * 6);
  addStatus(statuses, 26, (innerForce[3] ?? 0) * 6);
  for (const [statusId, value] of mir4SolitudeStatusBonuses(state?.solitude)) {
    addStatus(statuses, statusId, value);
  }
  return statuses;
}

export type Mir4TrainingTrack = 'constitution' | 'innerForce';

const CONSTITUTION_PRIMARY_COUNTS = [2, 3, 4, 6, 9] as const;
const CONSTITUTION_MATERIAL_KEYS: readonly (readonly [keyof Mir4Materials, keyof Mir4Materials])[] =
  [
    ['herbLeaf', 'reishi'],
    ['herbLeaf', 'herbRoot'],
    ['herbLeaf', 'unihornSlice'],
    ['herbLeaf', 'flowerOil'],
    ['reishi', 'unihornSlice'],
    ['reishi', 'flowerOil'],
    ['herbRoot', 'centuryFruit'],
  ];
const INNER_FORCE_PILLS: readonly (keyof Mir4Materials)[] = [
  'greaterYangPill',
  'greaterYinPill',
  'lesserYangPill',
  'lesserYinPill',
];

/** Exact first-cycle material rows from CHARACTER_MASTERY_SLOT and
 * CHARACTER_FORCE_BLOOD. `targetLevel` is 1..5. */
export function mir4TrainingRequirements(
  track: Mir4TrainingTrack,
  branchId: number,
  targetLevel: number,
): readonly Mir4TrainingMaterialRequirement[] {
  const branchIndex = Math.floor(branchId) - 1;
  const levelIndex = Math.floor(targetLevel) - 1;
  if (levelIndex < 0 || levelIndex >= MIR4_TRAINING_FIRST_TIER_MAX_LEVEL) return [];
  if (track === 'innerForce') {
    const key = INNER_FORCE_PILLS[branchIndex];
    return key ? [{ key, count: 1 }] : [];
  }
  const keys = CONSTITUTION_MATERIAL_KEYS[branchIndex];
  const primaryCount = CONSTITUTION_PRIMARY_COUNTS[levelIndex];
  if (!keys || primaryCount === undefined) return [];
  return [
    { key: keys[0], count: primaryCount },
    { key: keys[1], count: branchIndex < 2 ? primaryCount : 1 },
  ];
}

export function mir4TrainingLevel(
  state: Mir4TrainingState | undefined,
  track: Mir4TrainingTrack,
  branchId: number,
): number {
  const index = Math.floor(branchId) - 1;
  if (index < 0) return 0;
  return state?.[track]?.[index] ?? 0;
}
