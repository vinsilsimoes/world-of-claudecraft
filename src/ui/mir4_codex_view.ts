import type { Mir4ClassId } from '../sim/content/mir4/classes';
import { MIR4_CODEX_COLLECTIONS, MIR4_CODEX_UNLOCK_LEVEL } from '../sim/content/mir4/codex';
import { mir4CodexProgress } from '../sim/mir4/codex';
import type { Mir4AlbumStatKey } from '../sim/mir4/collection_album';
import type { Mir4Materials } from '../sim/mir4/equipment';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';

export type Mir4CodexFilter = 'all' | 'manual' | 'automatic' | 'completed';

export type Mir4CodexRequirementView =
  | {
      readonly kind: 'material';
      readonly id: string;
      readonly materialKey: keyof Mir4Materials;
      readonly current: number;
      readonly required: number;
      readonly owned: number;
      readonly complete: boolean;
      readonly canRegister: boolean;
    }
  | {
      readonly kind: 'equipment';
      readonly id: string;
      readonly itemId: number;
      readonly classId: Mir4ClassId;
      readonly equipSlot: number;
      readonly current: number;
      readonly required: number;
      readonly owned: number;
      readonly complete: boolean;
      readonly canRegister: false;
    }
  | {
      readonly kind: 'mount' | 'spirit';
      readonly id: string;
      readonly current: number;
      readonly required: number;
      readonly owned: number;
      readonly complete: boolean;
      readonly canRegister: false;
    };

export interface Mir4CodexCollectionView {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly registration: 'manual' | 'automatic';
  readonly requiredLevel: number;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly current: number;
  readonly required: number;
  readonly requirements: readonly Mir4CodexRequirementView[];
  readonly bonuses: readonly { stat: Mir4AlbumStatKey; amount: number }[];
  readonly canRegisterAll: boolean;
}

export interface Mir4CodexView {
  readonly unlocked: boolean;
  readonly unlockLevel: number;
  readonly classId: Mir4ClassId;
  readonly completed: number;
  readonly total: number;
  readonly collections: readonly Mir4CodexCollectionView[];
}

export function buildMir4CodexView(state: Readonly<Mir4PlayerUiState>): Mir4CodexView {
  const level = state.playerLevel ?? 1;
  const sources = {
    classId: state.classId,
    level,
    state: state.mir4Codex,
    materials: state.mir4Materials,
    equipment: state.mir4Equipment,
    equipmentInstances: state.mir4EquipmentInstances,
    rewardItems: state.mir4ArcRewards?.items,
    mounts: state.mir4Mounts,
    spirits: state.mir4Spirits,
  };
  const collections = MIR4_CODEX_COLLECTIONS.map((definition): Mir4CodexCollectionView => {
    const progress = mir4CodexProgress(definition.id, sources);
    const requirements = progress.requirements.map((entry): Mir4CodexRequirementView => {
      const requirement = entry.requirement;
      if (requirement.kind === 'material') {
        const owned = state.mir4Materials?.[requirement.materialKey] ?? 0;
        return {
          kind: 'material',
          id: requirement.id,
          materialKey: requirement.materialKey,
          current: entry.current,
          required: entry.required,
          owned,
          complete: entry.complete,
          canRegister: progress.unlocked && !entry.complete && owned > 0,
        };
      }
      if (requirement.kind === 'equipment') {
        return {
          kind: 'equipment',
          id: requirement.id,
          itemId: requirement.itemId,
          classId: requirement.classId,
          equipSlot: requirement.equipSlot,
          current: entry.current,
          required: entry.required,
          owned: entry.current,
          complete: entry.complete,
          canRegister: false,
        };
      }
      return {
        kind: requirement.kind,
        id: requirement.id,
        current: entry.current,
        required: entry.required,
        owned: entry.current,
        complete: entry.complete,
        canRegister: false,
      };
    });
    const canRegisterAll =
      definition.registration === 'manual' &&
      progress.unlocked &&
      !progress.completed &&
      requirements.every(
        (requirement) =>
          requirement.kind === 'material' &&
          requirement.owned >= requirement.required - requirement.current,
      );
    return {
      id: definition.id,
      titleKey: definition.titleKey,
      descriptionKey: definition.descriptionKey,
      registration: definition.registration,
      requiredLevel: definition.requiredLevel,
      unlocked: progress.unlocked,
      completed: progress.completed,
      current: progress.current,
      required: progress.required,
      requirements,
      bonuses: definition.bonuses,
      canRegisterAll,
    };
  });
  return {
    unlocked: level >= MIR4_CODEX_UNLOCK_LEVEL,
    unlockLevel: MIR4_CODEX_UNLOCK_LEVEL,
    classId: state.classId,
    completed: collections.filter((collection) => collection.completed).length,
    total: collections.length,
    collections,
  };
}

export function filterMir4CodexCollections(
  collections: readonly Mir4CodexCollectionView[],
  filter: Mir4CodexFilter,
): readonly Mir4CodexCollectionView[] {
  if (filter === 'all') return collections;
  if (filter === 'completed') return collections.filter((collection) => collection.completed);
  return collections.filter((collection) => collection.registration === filter);
}
