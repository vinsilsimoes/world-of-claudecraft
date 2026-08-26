// Source-backed first Solitude Training vessel. CLOSED_TRAINING_STATUS and
// CLOSED_TRAINING_LEVEL own the unlocks, status totals, costs and outcome
// weights. This pure module resolves catalog facts only; the authoritative
// mutation and RNG draw live in solitude_training_commands.ts.

import type { Mir4Materials } from './equipment';
import type { Mir4TrainingMaterialRarity } from './training';

export const MIR4_SOLITUDE_MAX_LEVEL = 10;
export const MIR4_SOLITUDE_VESSEL_NAME = 'Conception Vessel';

export interface Mir4SolitudeBranchDef {
  readonly id: number;
  readonly statusId: number;
  readonly unlockLevel: number;
  readonly materialFamily: Mir4SolitudeMaterialFamily;
  readonly valuePerLevel: number;
}

export type Mir4SolitudeMaterialFamily =
  | 'noirsoulHerb'
  | 'unihorn'
  | 'flowerOil'
  | 'centuryFruit'
  | 'greaterYangPill'
  | 'greaterYinPill'
  | 'lesserYangPill'
  | 'lesserYinPill';

export type Mir4SolitudeMaterialKey = Extract<
  keyof Mir4Materials,
  | `${Mir4SolitudeMaterialFamily}Rare`
  | `${Mir4SolitudeMaterialFamily}Epic`
  | `${Mir4SolitudeMaterialFamily}Legendary`
>;

export interface Mir4SolitudeMaterialDef {
  readonly key: Mir4SolitudeMaterialKey;
  readonly family: Mir4SolitudeMaterialFamily;
  readonly rarity: Extract<Mir4TrainingMaterialRarity, 'rare' | 'epic' | 'legendary'>;
  readonly sourceItemId: number;
  readonly source: 'herbalism' | 'hunting' | 'crafting';
}

export interface Mir4SolitudeRequirement {
  readonly key: Mir4SolitudeMaterialKey;
  readonly count: number;
}

export interface Mir4SolitudeAttemptDef {
  readonly targetLevel: number;
  readonly statusValue: number;
  readonly darksteelCost: number;
  readonly successBps: number;
  readonly failBps: number;
  readonly criticalFailBps: number;
  readonly requirements: readonly Mir4SolitudeRequirement[];
}

export interface Mir4SolitudeTrainingState {
  readonly conceptionVessel: readonly number[];
}

export type Mir4SolitudeOutcome = 'success' | 'failure' | 'critical-failure';

export const MIR4_SOLITUDE_BRANCHES: readonly Mir4SolitudeBranchDef[] = Object.freeze([
  { id: 1, statusId: 40, unlockLevel: 70, materialFamily: 'unihorn', valuePerLevel: 50 },
  { id: 2, statusId: 42, unlockLevel: 70, materialFamily: 'flowerOil', valuePerLevel: 50 },
  {
    id: 3,
    statusId: 41,
    unlockLevel: 70,
    materialFamily: 'greaterYangPill',
    valuePerLevel: 50,
  },
  {
    id: 4,
    statusId: 43,
    unlockLevel: 70,
    materialFamily: 'greaterYinPill',
    valuePerLevel: 50,
  },
  { id: 5, statusId: 89, unlockLevel: 75, materialFamily: 'flowerOil', valuePerLevel: 300 },
  {
    id: 6,
    statusId: 82,
    unlockLevel: 75,
    materialFamily: 'centuryFruit',
    valuePerLevel: 300,
  },
  {
    id: 7,
    statusId: 84,
    unlockLevel: 75,
    materialFamily: 'lesserYangPill',
    valuePerLevel: 300,
  },
  {
    id: 8,
    statusId: 93,
    unlockLevel: 75,
    materialFamily: 'lesserYinPill',
    valuePerLevel: 300,
  },
]);

const RARITY_SUFFIX = {
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
} as const;

const SOURCE_ITEM_IDS: Readonly<
  Record<Mir4SolitudeMaterialFamily, Readonly<Record<'rare' | 'epic' | 'legendary', number>>>
> = Object.freeze({
  noirsoulHerb: { rare: 517000411, epic: 517000412, legendary: 517000413 },
  unihorn: { rare: 501000013, epic: 501000014, legendary: 501000015 },
  flowerOil: { rare: 501000023, epic: 501000024, legendary: 501000025 },
  centuryFruit: { rare: 501000043, epic: 501000044, legendary: 501000045 },
  greaterYangPill: { rare: 517000103, epic: 517000104, legendary: 517000105 },
  greaterYinPill: { rare: 517000203, epic: 517000204, legendary: 517000205 },
  lesserYangPill: { rare: 517000303, epic: 517000304, legendary: 517000305 },
  lesserYinPill: { rare: 517000403, epic: 517000404, legendary: 517000405 },
});

const MATERIAL_SOURCES: Readonly<
  Record<Mir4SolitudeMaterialFamily, Mir4SolitudeMaterialDef['source']>
> = Object.freeze({
  noirsoulHerb: 'herbalism',
  unihorn: 'hunting',
  flowerOil: 'herbalism',
  centuryFruit: 'herbalism',
  greaterYangPill: 'crafting',
  greaterYinPill: 'crafting',
  lesserYangPill: 'crafting',
  lesserYinPill: 'crafting',
});

export function mir4SolitudeMaterialKey(
  family: Mir4SolitudeMaterialFamily,
  rarity: 'rare' | 'epic' | 'legendary',
): Mir4SolitudeMaterialKey {
  return `${family}${RARITY_SUFFIX[rarity]}` as Mir4SolitudeMaterialKey;
}

export const MIR4_SOLITUDE_MATERIALS: Readonly<
  Record<Mir4SolitudeMaterialKey, Mir4SolitudeMaterialDef>
> = Object.freeze(
  Object.fromEntries(
    (Object.keys(SOURCE_ITEM_IDS) as Mir4SolitudeMaterialFamily[]).flatMap((family) =>
      (['rare', 'epic', 'legendary'] as const).map((rarity) => {
        const key = mir4SolitudeMaterialKey(family, rarity);
        return [
          key,
          Object.freeze({
            key,
            family,
            rarity,
            sourceItemId: SOURCE_ITEM_IDS[family][rarity],
            source: MATERIAL_SOURCES[family],
          }),
        ];
      }),
    ),
  ) as Record<Mir4SolitudeMaterialKey, Mir4SolitudeMaterialDef>,
);

const SUCCESS_BPS = [7_000, 5_000, 4_000, 3_500, 3_000, 2_500, 2_000, 1_500, 1_000, 500] as const;
const FAIL_BPS = [3_000, 5_000, 5_500, 5_500, 4_500, 4_500, 4_500, 4_500, 4_500, 4_500] as const;
const CRITICAL_FAIL_BPS = [0, 0, 500, 1_000, 2_500, 3_000, 3_500, 4_000, 4_500, 5_000] as const;

export function emptyMir4SolitudeTrainingState(): Mir4SolitudeTrainingState {
  return { conceptionVessel: Array<number>(MIR4_SOLITUDE_BRANCHES.length).fill(0) };
}

export function sanitizeMir4SolitudeTrainingState(
  value: unknown,
): Mir4SolitudeTrainingState | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const raw = (value as { conceptionVessel?: unknown }).conceptionVessel;
  if (!Array.isArray(raw)) return undefined;
  return {
    conceptionVessel: Array.from({ length: MIR4_SOLITUDE_BRANCHES.length }, (_, index) => {
      const level = raw[index];
      return typeof level === 'number' && Number.isFinite(level)
        ? Math.max(0, Math.min(MIR4_SOLITUDE_MAX_LEVEL, Math.floor(level)))
        : 0;
    }),
  };
}

export function mir4SolitudeAttempt(
  branchId: number,
  targetLevel: number,
): Mir4SolitudeAttemptDef | null {
  const branch = MIR4_SOLITUDE_BRANCHES[Math.floor(branchId) - 1];
  const index = Math.floor(targetLevel) - 1;
  if (!branch || index < 0 || index >= MIR4_SOLITUDE_MAX_LEVEL) return null;
  const rarity = targetLevel <= 4 ? 'rare' : targetLevel <= 8 ? 'epic' : 'legendary';
  const secondaryCount = targetLevel <= 4 ? 5 : targetLevel <= 8 ? 3 : 2;
  return {
    targetLevel,
    statusValue: branch.valuePerLevel * targetLevel,
    darksteelCost: targetLevel <= 4 ? 1_000 : targetLevel <= 8 ? 10_000 : 50_000,
    successBps: SUCCESS_BPS[index] ?? 0,
    failBps: FAIL_BPS[index] ?? 0,
    criticalFailBps: CRITICAL_FAIL_BPS[index] ?? 0,
    requirements: [
      { key: mir4SolitudeMaterialKey('noirsoulHerb', rarity), count: 1 },
      { key: mir4SolitudeMaterialKey(branch.materialFamily, rarity), count: secondaryCount },
    ],
  };
}

export function resolveMir4SolitudeOutcome(
  roll: number,
  attempt: Pick<Mir4SolitudeAttemptDef, 'successBps' | 'failBps'>,
): Mir4SolitudeOutcome {
  const bps = Math.max(0, Math.min(9_999, Math.floor(roll * 10_000)));
  if (bps < attempt.successBps) return 'success';
  if (bps < attempt.successBps + attempt.failBps) return 'failure';
  return 'critical-failure';
}

export function mir4SolitudeStatusBonuses(
  state: Mir4SolitudeTrainingState | undefined,
): ReadonlyMap<number, number> {
  const statuses = new Map<number, number>();
  const levels = state?.conceptionVessel ?? [];
  for (let index = 0; index < MIR4_SOLITUDE_BRANCHES.length; index += 1) {
    const branch = MIR4_SOLITUDE_BRANCHES[index];
    if (!branch) continue;
    const level = levels[index] ?? 0;
    if (level > 0) statuses.set(branch.statusId, level * branch.valuePerLevel);
  }
  return statuses;
}
