// Pure view models for the two MIR4 growth tracks grouped under Training.
// Commands and levels stay independent while the shared projection exposes
// their physical gathering, hunting and crafting requirements.

import type { Mir4ClassId } from '../sim/content/mir4/classes';
import type { Mir4Materials } from '../sim/mir4/equipment';
import { MIR4_EMPTY_MATERIALS } from '../sim/mir4/equipment';
import {
  emptyMir4SolitudeTrainingState,
  MIR4_SOLITUDE_BRANCHES,
  MIR4_SOLITUDE_MATERIALS,
  MIR4_SOLITUDE_MAX_LEVEL,
  MIR4_SOLITUDE_VESSEL_NAME,
  mir4SolitudeAttempt,
  mir4SolitudeStatusBonuses,
} from '../sim/mir4/solitude_training';
import {
  emptyMir4TrainingState,
  MIR4_CONSTITUTION_BRANCHES,
  MIR4_INNER_FORCE_BRANCHES,
  MIR4_INNER_FORCE_MANUAL_NAME,
  MIR4_TRAINING_FIRST_TIER_MAX_LEVEL,
  MIR4_TRAINING_MATERIALS,
  MIR4_TRAINING_UPGRADE_ENERGY_COST,
  type Mir4TrainingBranchDef,
  type Mir4TrainingState,
  type Mir4TrainingTrack,
  mir4TrainingRequirements,
  mir4TrainingStatusBonuses,
} from '../sim/mir4/training';
import {
  mir4HerbalismZonesForMaterial,
  mir4SolitudeHerbalismZonesForFamily,
} from '../sim/mir4/training_resources';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';

export interface Mir4GrowthBonusView {
  readonly statusId: number;
  readonly current: number;
  readonly next: number;
}

export interface Mir4GrowthBranchView {
  readonly id: number;
  readonly name: string;
  readonly level: number;
  readonly nextLevel: number | null;
  readonly cost: number;
  readonly canUpgrade: boolean;
  readonly unlockLevel?: number;
  readonly locked?: boolean;
  readonly successBps?: number;
  readonly criticalFailBps?: number;
  readonly bonuses: readonly Mir4GrowthBonusView[];
  readonly materials: readonly Mir4GrowthMaterialView[];
}

export interface Mir4GrowthMaterialView {
  readonly key: keyof Mir4Materials;
  readonly name: string;
  readonly rarity: string;
  readonly source: string;
  readonly zoneIds: readonly string[];
  readonly owned: number;
  readonly required: number;
  readonly enough: boolean;
}

export interface Mir4GrowthSystemView {
  readonly system: Mir4GrowthSystem;
  readonly manualName?: string;
  readonly energy: number;
  readonly darksteel: number;
  readonly tier: number;
  readonly maxLevel: number;
  readonly branches: readonly Mir4GrowthBranchView[];
}

export type Mir4GrowthSystem = Mir4TrainingTrack | 'solitude';

function withBranchLevel(
  state: Mir4TrainingState,
  track: Mir4TrainingTrack,
  index: number,
  level: number,
): Mir4TrainingState {
  const levels = [...state[track]];
  levels[index] = level;
  return {
    version: 1,
    constitution: track === 'constitution' ? levels : [...state.constitution],
    innerForce: track === 'innerForce' ? levels : [...state.innerForce],
    ...(state.solitude ? { solitude: state.solitude } : {}),
  };
}

function branchBonuses(
  classId: Mir4ClassId,
  state: Mir4TrainingState,
  track: Mir4TrainingTrack,
  index: number,
  level: number,
): readonly Mir4GrowthBonusView[] {
  const zeroState = withBranchLevel(state, track, index, 0);
  const currentState = withBranchLevel(state, track, index, level);
  const nextState = withBranchLevel(
    state,
    track,
    index,
    Math.min(MIR4_TRAINING_FIRST_TIER_MAX_LEVEL, level + 1),
  );
  const zero = mir4TrainingStatusBonuses(classId, zeroState);
  const current = mir4TrainingStatusBonuses(classId, currentState);
  const next = mir4TrainingStatusBonuses(classId, nextState);
  return [...new Set([...current.keys(), ...next.keys()])]
    .map((statusId) => ({
      statusId,
      current: (current.get(statusId) ?? 0) - (zero.get(statusId) ?? 0),
      next: (next.get(statusId) ?? 0) - (zero.get(statusId) ?? 0),
    }))
    .filter((bonus) => bonus.current > 0 || bonus.next > 0);
}

function buildGrowthView(
  state: Readonly<Mir4PlayerUiState>,
  track: Mir4TrainingTrack,
  definitions: readonly Mir4TrainingBranchDef[],
): Mir4GrowthSystemView {
  const training = state.mir4Training ?? emptyMir4TrainingState();
  const energy = state.mir4Currencies?.energy ?? 0;
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...state.mir4Materials };
  const branches = definitions.map((definition, index): Mir4GrowthBranchView => {
    const level = training[track][index] ?? 0;
    const requirements =
      level >= MIR4_TRAINING_FIRST_TIER_MAX_LEVEL
        ? []
        : mir4TrainingRequirements(track, definition.id, level + 1);
    const materials = requirements.flatMap((requirement): Mir4GrowthMaterialView[] => {
      const material = MIR4_TRAINING_MATERIALS[requirement.key];
      if (!material) return [];
      const owned = wallet[requirement.key];
      return [
        {
          key: requirement.key,
          name: material.name,
          rarity: material.rarity,
          source: material.source,
          zoneIds:
            material.source === 'herbalism' ? mir4HerbalismZonesForMaterial(requirement.key) : [],
          owned,
          required: requirement.count,
          enough: owned >= requirement.count,
        },
      ];
    });
    return {
      id: definition.id,
      name: definition.name,
      level,
      nextLevel: level >= MIR4_TRAINING_FIRST_TIER_MAX_LEVEL ? null : level + 1,
      cost: MIR4_TRAINING_UPGRADE_ENERGY_COST,
      canUpgrade:
        level < MIR4_TRAINING_FIRST_TIER_MAX_LEVEL &&
        energy >= MIR4_TRAINING_UPGRADE_ENERGY_COST &&
        materials.every((material) => material.enough),
      bonuses: branchBonuses(state.classId, training, track, index, level),
      materials,
    };
  });
  return {
    system: track,
    ...(track === 'innerForce' ? { manualName: MIR4_INNER_FORCE_MANUAL_NAME } : {}),
    energy,
    darksteel: state.mir4Currencies?.darksteel ?? 0,
    tier: 1,
    maxLevel: MIR4_TRAINING_FIRST_TIER_MAX_LEVEL,
    branches,
  };
}

export function buildMir4ConstitutionView(
  state: Readonly<Mir4PlayerUiState>,
): Mir4GrowthSystemView {
  return buildGrowthView(state, 'constitution', MIR4_CONSTITUTION_BRANCHES);
}

export function buildMir4InnerForceView(state: Readonly<Mir4PlayerUiState>): Mir4GrowthSystemView {
  return buildGrowthView(state, 'innerForce', MIR4_INNER_FORCE_BRANCHES);
}

export function buildMir4SolitudeView(state: Readonly<Mir4PlayerUiState>): Mir4GrowthSystemView {
  const training = state.mir4Training ?? emptyMir4TrainingState();
  const solitude = training.solitude ?? emptyMir4SolitudeTrainingState();
  const wallet = { ...MIR4_EMPTY_MATERIALS, ...state.mir4Materials };
  const darksteel = state.mir4Currencies?.darksteel ?? 0;
  const playerLevel = state.playerLevel ?? 1;
  return {
    system: 'solitude',
    manualName: MIR4_SOLITUDE_VESSEL_NAME,
    energy: state.mir4Currencies?.energy ?? 0,
    darksteel,
    tier: 1,
    maxLevel: MIR4_SOLITUDE_MAX_LEVEL,
    branches: MIR4_SOLITUDE_BRANCHES.map((branch, index): Mir4GrowthBranchView => {
      const level = solitude.conceptionVessel[index] ?? 0;
      const attempt = mir4SolitudeAttempt(branch.id, level + 1);
      const current = mir4SolitudeStatusBonuses({
        conceptionVessel: solitude.conceptionVessel.map((value, slot) =>
          slot === index ? level : value,
        ),
      });
      const next = mir4SolitudeStatusBonuses({
        conceptionVessel: solitude.conceptionVessel.map((value, slot) =>
          slot === index ? Math.min(MIR4_SOLITUDE_MAX_LEVEL, level + 1) : value,
        ),
      });
      const materials =
        attempt?.requirements.map((requirement): Mir4GrowthMaterialView => {
          const material = MIR4_SOLITUDE_MATERIALS[requirement.key];
          const owned = wallet[requirement.key];
          return {
            key: requirement.key,
            name: requirement.key,
            rarity: material.rarity,
            source: material.source,
            zoneIds:
              material.source === 'herbalism'
                ? mir4SolitudeHerbalismZonesForFamily(material.family)
                : [],
            owned,
            required: requirement.count,
            enough: owned >= requirement.count,
          };
        }) ?? [];
      const locked = playerLevel < branch.unlockLevel;
      return {
        id: branch.id,
        name: '',
        level,
        nextLevel: level >= MIR4_SOLITUDE_MAX_LEVEL ? null : level + 1,
        cost: attempt?.darksteelCost ?? 0,
        canUpgrade:
          !locked &&
          level < MIR4_SOLITUDE_MAX_LEVEL &&
          Boolean(attempt) &&
          darksteel >= (attempt?.darksteelCost ?? 0) &&
          materials.every((material) => material.enough),
        unlockLevel: branch.unlockLevel,
        locked,
        successBps: attempt?.successBps,
        criticalFailBps: attempt?.criticalFailBps,
        bonuses: [
          {
            statusId: branch.statusId,
            current: current.get(branch.statusId) ?? 0,
            next: next.get(branch.statusId) ?? 0,
          },
        ],
        materials,
      };
    }),
  };
}
