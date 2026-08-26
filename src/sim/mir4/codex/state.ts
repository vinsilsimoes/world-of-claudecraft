import type { Mir4ClassId } from '../../content/mir4/classes';
import {
  MIR4_CODEX_COLLECTIONS,
  type Mir4ResolvedCodexRequirement,
  mir4CodexCollection,
  resolveMir4CodexCollection,
} from '../../content/mir4/codex';
import { emptyMir4AlbumBonuses, type Mir4AlbumBonuses } from '../collection_album';
import type { Mir4EquipmentInstanceState, Mir4Materials } from '../equipment';
import type { Mir4MountState } from '../mounts';
import type { Mir4SpiritState } from '../spirits';

export const MIR4_CODEX_STATE_VERSION = 1;

export interface Mir4CodexState {
  readonly version: 1;
  registered: Record<string, Record<string, number>>;
}

export interface Mir4CodexSources {
  readonly classId: Mir4ClassId;
  readonly level?: number;
  readonly state?: Mir4CodexState;
  readonly materials?: Mir4Materials;
  readonly equipment?: { readonly [slot: number]: number | undefined };
  readonly equipmentInstances?: Record<
    number,
    Mir4EquipmentInstanceState | { destroyed?: boolean }
  >;
  readonly rewardItems?: Record<string, number>;
  readonly mounts?: Mir4MountState;
  readonly spirits?: Mir4SpiritState;
}

export interface Mir4CodexRequirementProgress {
  readonly requirement: Mir4ResolvedCodexRequirement;
  readonly current: number;
  readonly required: number;
  readonly complete: boolean;
}

export interface Mir4CodexProgress {
  readonly collectionId: string;
  readonly unlocked: boolean;
  readonly completed: boolean;
  readonly current: number;
  readonly required: number;
  readonly requirements: readonly Mir4CodexRequirementProgress[];
}

export function emptyMir4CodexState(): Mir4CodexState {
  return { version: MIR4_CODEX_STATE_VERSION, registered: {} };
}

function registeredCount(
  state: Mir4CodexState | undefined,
  collectionId: string,
  requirementId: string,
): number {
  return state?.registered[collectionId]?.[requirementId] ?? 0;
}

function ownsEquipment(
  requirement: Extract<Mir4ResolvedCodexRequirement, { kind: 'equipment' }>,
  sources: Mir4CodexSources,
): boolean {
  if (Object.values(sources.equipment ?? {}).includes(requirement.itemId)) return true;
  const instance = sources.equipmentInstances?.[requirement.itemId];
  if (instance && !instance.destroyed) return true;
  return (sources.rewardItems?.[String(requirement.itemId)] ?? 0) > 0;
}

function requirementCount(
  collectionId: string,
  requirement: Mir4ResolvedCodexRequirement,
  sources: Mir4CodexSources,
): number {
  if (requirement.kind === 'material') {
    return registeredCount(sources.state, collectionId, requirement.id);
  }
  if (requirement.kind === 'equipment') return ownsEquipment(requirement, sources) ? 1 : 0;
  if (requirement.kind === 'mount') {
    return sources.mounts?.discovered?.includes(requirement.mountId) ? 1 : 0;
  }
  return sources.spirits?.discovered?.includes(requirement.spiritId) ? 1 : 0;
}

export function mir4CodexProgress(
  collectionId: string,
  sources: Mir4CodexSources,
): Mir4CodexProgress {
  const collection = resolveMir4CodexCollection(collectionId, sources.classId);
  if (!collection) {
    return {
      collectionId,
      unlocked: false,
      completed: false,
      current: 0,
      required: 0,
      requirements: [],
    };
  }
  const requirements = collection.requirements.map((requirement) => {
    const required = requirement.requiredCount;
    const current = Math.min(required, requirementCount(collectionId, requirement, sources));
    return { requirement, current, required, complete: current >= required };
  });
  const unlocked = (sources.level ?? Number.MAX_SAFE_INTEGER) >= collection.requiredLevel;
  return {
    collectionId,
    unlocked,
    completed: unlocked && requirements.length > 0 && requirements.every((entry) => entry.complete),
    current: requirements.reduce((sum, entry) => sum + entry.current, 0),
    required: requirements.reduce((sum, entry) => sum + entry.required, 0),
    requirements,
  };
}

export function mir4CodexBonuses(sources: Mir4CodexSources): Mir4AlbumBonuses {
  const bonuses = emptyMir4AlbumBonuses();
  for (const collection of MIR4_CODEX_COLLECTIONS) {
    if (!mir4CodexProgress(collection.id, sources).completed) continue;
    for (const bonus of collection.bonuses) bonuses[bonus.stat] += bonus.amount;
  }
  return bonuses;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeMir4CodexState(value: unknown): Mir4CodexState | undefined {
  if (!isRecord(value) || value.version !== MIR4_CODEX_STATE_VERSION || !isRecord(value.registered))
    return undefined;
  const result = emptyMir4CodexState();
  for (const [collectionId, rawRequirements] of Object.entries(value.registered)) {
    const collection = mir4CodexCollection(collectionId);
    if (collection?.registration !== 'manual' || !isRecord(rawRequirements)) continue;
    const allowed = new Map(
      collection.requirements
        .filter((requirement) => requirement.kind === 'material')
        .map((requirement) => [requirement.id, requirement.requiredCount]),
    );
    const registered: Record<string, number> = {};
    for (const [requirementId, rawCount] of Object.entries(rawRequirements)) {
      const cap = allowed.get(requirementId);
      if (
        cap === undefined ||
        typeof rawCount !== 'number' ||
        !Number.isFinite(rawCount) ||
        rawCount <= 0
      )
        continue;
      registered[requirementId] = Math.min(cap, Math.floor(rawCount));
    }
    if (Object.keys(registered).length > 0) result.registered[collectionId] = registered;
  }
  return Object.keys(result.registered).length > 0 ? result : undefined;
}
