// Authoritative Solitude Training attempt. Admission is revision-guarded and
// atomic, then exactly one shared RNG draw resolves success, neutral failure,
// or a one-level critical loss using the extracted MIR4 weights.

import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { MIR4_EMPTY_MATERIALS } from './equipment';
import {
  emptyMir4SolitudeTrainingState,
  MIR4_SOLITUDE_BRANCHES,
  MIR4_SOLITUDE_MAX_LEVEL,
  type Mir4SolitudeOutcome,
  mir4SolitudeAttempt,
  resolveMir4SolitudeOutcome,
} from './solitude_training';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from './stats';
import { emptyMir4TrainingState } from './training';
import { markMir4WireDirty } from './wire_revision';

export type Mir4SolitudeTrainingResultCode =
  | Mir4SolitudeOutcome
  | 'invalid-branch'
  | 'stale-level'
  | 'level-locked'
  | 'insufficient-darksteel'
  | 'insufficient-materials'
  | 'max-level'
  | 'unavailable';

export interface Mir4SolitudeTrainingResult {
  readonly ok: boolean;
  readonly code: Mir4SolitudeTrainingResultCode;
  readonly previousLevel: number;
  readonly level: number;
  readonly darksteelSpent: number;
}

function denied(code: Mir4SolitudeTrainingResultCode, level = 0): Mir4SolitudeTrainingResult {
  return { ok: false, code, previousLevel: level, level, darksteelSpent: 0 };
}

export function trainMir4Solitude(
  ctx: SimContext,
  pid: number,
  branchId: number,
  expectedCurrentLevel: number,
): Mir4SolitudeTrainingResult {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return denied('unavailable');
  const resolved = ctx.resolve(pid);
  if (!resolved) return denied('unavailable');
  const { meta, e: entity } = resolved;
  const branchIndex = Math.floor(branchId) - 1;
  const branch = MIR4_SOLITUDE_BRANCHES[branchIndex];
  if (!Number.isSafeInteger(branchId) || !branch) return denied('invalid-branch');

  const training = meta.mir4Training ?? emptyMir4TrainingState();
  const solitude = training.solitude ?? emptyMir4SolitudeTrainingState();
  const currentLevel = solitude.conceptionVessel[branchIndex] ?? 0;
  if (!Number.isSafeInteger(expectedCurrentLevel) || expectedCurrentLevel !== currentLevel) {
    return denied('stale-level', currentLevel);
  }
  if (entity.level < branch.unlockLevel) return denied('level-locked', currentLevel);
  if (currentLevel >= MIR4_SOLITUDE_MAX_LEVEL) return denied('max-level', currentLevel);

  const attempt = mir4SolitudeAttempt(branchId, currentLevel + 1);
  if (!attempt) return denied('invalid-branch', currentLevel);
  const currencies = meta.mir4Currencies ?? { darksteel: 0, energy: 0 };
  if (currencies.darksteel < attempt.darksteelCost) {
    return denied('insufficient-darksteel', currentLevel);
  }
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  if (attempt.requirements.some(({ key, count }) => wallet[key] < count)) {
    return denied('insufficient-materials', currentLevel);
  }

  const outcome = resolveMir4SolitudeOutcome(ctx.rng.next(), attempt);
  const nextLevel =
    outcome === 'success'
      ? currentLevel + 1
      : outcome === 'critical-failure'
        ? Math.max(0, currentLevel - 1)
        : currentLevel;
  for (const { key, count } of attempt.requirements) wallet[key] -= count;
  const nextLevels = [...solitude.conceptionVessel];
  nextLevels[branchIndex] = nextLevel;
  meta.mir4Training = {
    ...training,
    solitude: { conceptionVessel: nextLevels },
  };
  meta.mir4Currencies = {
    ...currencies,
    darksteel: currencies.darksteel - attempt.darksteelCost,
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
  ctx.emit({
    type: 'mir4SolitudeTrainingResult',
    pid,
    branchId,
    outcome,
    previousLevel: currentLevel,
    level: nextLevel,
    chanceBps: attempt.successBps,
  });
  return {
    ok: true,
    code: outcome,
    previousLevel: currentLevel,
    level: nextLevel,
    darksteelSpent: attempt.darksteelCost,
  };
}
