import type { Mir4ClassId } from '../../content/mir4/classes';
import { mir4CodexCollection, resolveMir4CodexCollection } from '../../content/mir4/codex';
import type { Mir4Materials } from '../equipment';
import { emptyMir4CodexState, type Mir4CodexState, mir4CodexProgress } from './state';

export type Mir4CodexRegisterResult =
  | { readonly ok: true; readonly registered: number; readonly completed: boolean }
  | {
      readonly ok: false;
      readonly reason:
        | 'locked'
        | 'unknown-collection'
        | 'automatic-collection'
        | 'unknown-requirement'
        | 'invalid-count'
        | 'stale-progress'
        | 'already-complete'
        | 'insufficient-items';
    };

export interface Mir4CodexRegistrationInput {
  readonly classId: Mir4ClassId;
  readonly level: number;
  readonly collectionId: string;
  readonly requirementId: string;
  readonly count: number;
  readonly expectedRegistered: number;
  readonly state?: Mir4CodexState;
  readonly materials: Mir4Materials;
}

export function registerMir4CodexRequirement(
  input: Mir4CodexRegistrationInput,
): Mir4CodexRegisterResult {
  const collection = mir4CodexCollection(input.collectionId);
  if (!collection) return { ok: false, reason: 'unknown-collection' };
  if (input.level < collection.requiredLevel) return { ok: false, reason: 'locked' };
  if (collection.registration !== 'manual') return { ok: false, reason: 'automatic-collection' };
  const resolved = resolveMir4CodexCollection(collection.id, input.classId);
  const requirement = resolved?.requirements.find(
    (candidate) => candidate.id === input.requirementId && candidate.kind === 'material',
  );
  if (requirement?.kind !== 'material') {
    return { ok: false, reason: 'unknown-requirement' };
  }
  if (!Number.isSafeInteger(input.count) || input.count <= 0) {
    return { ok: false, reason: 'invalid-count' };
  }
  const state = input.state ?? emptyMir4CodexState();
  const registered = state.registered[collection.id]?.[requirement.id] ?? 0;
  if (registered !== input.expectedRegistered) return { ok: false, reason: 'stale-progress' };
  const remaining = requirement.requiredCount - registered;
  if (remaining <= 0) return { ok: false, reason: 'already-complete' };
  const amount = Math.min(input.count, remaining);
  if (input.materials[requirement.materialKey] < amount) {
    return { ok: false, reason: 'insufficient-items' };
  }
  input.materials[requirement.materialKey] -= amount;
  let registrations = state.registered[collection.id];
  if (!registrations) {
    registrations = {};
    state.registered[collection.id] = registrations;
  }
  registrations[requirement.id] = registered + amount;
  const completed = mir4CodexProgress(collection.id, {
    classId: input.classId,
    level: input.level,
    state,
  }).completed;
  return { ok: true, registered: registered + amount, completed };
}
