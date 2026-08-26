import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { MIR4_EMPTY_MATERIALS } from './equipment';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import {
  emptyMir4TrainingState,
  MIR4_CONSTITUTION_BRANCHES,
  MIR4_INNER_FORCE_BRANCHES,
  MIR4_TRAINING_FIRST_TIER_MAX_LEVEL,
  MIR4_TRAINING_UPGRADE_ENERGY_COST,
  type Mir4TrainingTrack,
  mir4TrainingRequirements,
} from './training';
import { markMir4WireDirty } from './wire_revision';

export type Mir4TrainingResultCode =
  | 'success'
  | 'invalid-branch'
  | 'stale-level'
  | 'insufficient-energy'
  | 'insufficient-materials'
  | 'promotion-required'
  | 'unavailable';

export interface Mir4TrainingResult {
  readonly ok: boolean;
  readonly code: Mir4TrainingResultCode;
  readonly level: number;
  readonly energySpent: number;
  readonly materialsSpent?: Readonly<Record<string, number>>;
}

function denied(code: Mir4TrainingResultCode, level = 0): Mir4TrainingResult {
  return { ok: false, code, level, energySpent: 0 };
}

function train(
  ctx: SimContext,
  pid: number,
  track: Mir4TrainingTrack,
  branchId: number,
  expectedCurrentLevel: number,
): Mir4TrainingResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return denied('unavailable');
  const resolved = ctx.resolve(pid);
  if (!resolved) return denied('unavailable');
  const { meta, e: entity } = resolved;
  const definitions =
    track === 'constitution' ? MIR4_CONSTITUTION_BRANCHES : MIR4_INNER_FORCE_BRANCHES;
  const branchIndex = Math.floor(branchId) - 1;
  if (!Number.isSafeInteger(branchId) || branchIndex < 0 || branchIndex >= definitions.length) {
    return denied('invalid-branch');
  }
  const currentState = meta.mir4Training ?? emptyMir4TrainingState();
  const currentLevel = currentState[track][branchIndex] ?? 0;
  if (!Number.isSafeInteger(expectedCurrentLevel) || expectedCurrentLevel !== currentLevel) {
    return denied('stale-level', currentLevel);
  }
  if (currentLevel >= MIR4_TRAINING_FIRST_TIER_MAX_LEVEL) {
    return denied('promotion-required', currentLevel);
  }
  const currencies = meta.mir4Currencies ?? { darksteel: 0, energy: 0 };
  if (currencies.energy < MIR4_TRAINING_UPGRADE_ENERGY_COST) {
    return denied('insufficient-energy', currentLevel);
  }
  const requirements = mir4TrainingRequirements(track, branchId, currentLevel + 1);
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  if (requirements.some((requirement) => wallet[requirement.key] < requirement.count)) {
    return denied('insufficient-materials', currentLevel);
  }

  // All admission checks are complete. Energy, materials and level now move
  // together, so a retry or short wallet cannot partially spend progression.
  for (const requirement of requirements) wallet[requirement.key] -= requirement.count;
  const nextLevels = [...currentState[track]];
  nextLevels[branchIndex] = currentLevel + 1;
  meta.mir4Training = {
    version: 1,
    constitution: track === 'constitution' ? nextLevels : [...currentState.constitution],
    innerForce: track === 'innerForce' ? nextLevels : [...currentState.innerForce],
    ...(currentState.solitude ? { solitude: currentState.solitude } : {}),
  };
  meta.mir4Currencies = {
    ...currencies,
    energy: currencies.energy - MIR4_TRAINING_UPGRADE_ENERGY_COST,
  };
  meta.mir4Materials = wallet;
  recalcMir4PlayerStats(
    entity,
    mir4RecalcClassOf(entity),
    entity.level,
    meta.mir4Equipment,
    meta.mir4EquipmentInstances,
    meta.mir4Spirits,
    meta.mir4Mounts,
    meta.mir4Codex,
    meta.mir4ArcRewards?.items,
    meta.mir4Training,
  );
  markMir4WireDirty(meta);
  return {
    ok: true,
    code: 'success',
    level: currentLevel + 1,
    energySpent: MIR4_TRAINING_UPGRADE_ENERGY_COST,
    materialsSpent: Object.fromEntries(
      requirements.map((requirement) => [requirement.key, requirement.count]),
    ),
  };
}

export function trainMir4Constitution(
  ctx: SimContext,
  pid: number,
  branchId: number,
  expectedCurrentLevel: number,
): Mir4TrainingResult {
  return train(ctx, pid, 'constitution', branchId, expectedCurrentLevel);
}

export function trainMir4InnerForce(
  ctx: SimContext,
  pid: number,
  branchId: number,
  expectedCurrentLevel: number,
): Mir4TrainingResult {
  return train(ctx, pid, 'innerForce', branchId, expectedCurrentLevel);
}
