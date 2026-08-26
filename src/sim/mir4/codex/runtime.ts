import type { Mir4ClassId } from '../../content/mir4/classes';
import { resolveMir4CodexCollection } from '../../content/mir4/codex';
import type { SimContext } from '../../sim_context';
import { MIR4_EMPTY_MATERIALS } from '../equipment';
import { mir4RecalcClassOf, recalcMir4PlayerStats } from '../stats';
import { markMir4CodexWireDirty, markMir4WireDirty } from '../wire_revision';
import { type Mir4CodexRegisterResult, registerMir4CodexRequirement } from './commands';
import { emptyMir4CodexState, type Mir4CodexState } from './state';

function cloneState(state: Mir4CodexState | undefined): Mir4CodexState {
  if (!state) return emptyMir4CodexState();
  return {
    version: 1,
    registered: Object.fromEntries(
      Object.entries(state.registered).map(([collectionId, requirements]) => [
        collectionId,
        { ...requirements },
      ]),
    ),
  };
}

export function refreshMir4CodexDerivedStats(ctx: SimContext, pid: number): void {
  const resolved = ctx.resolve(pid);
  if (!resolved) return;
  const { e: entity, meta } = resolved;
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
}

export function registerMir4Codex(
  ctx: SimContext,
  pid: number,
  collectionId: string,
  requirementId: string,
  count: number,
  expectedRegistered: number,
): Mir4CodexRegisterResult {
  const resolved = ctx.resolve(pid);
  if (!resolved) return { ok: false, reason: 'locked' };
  const { e: entity, meta } = resolved;
  if (!entity.mir4) return { ok: false, reason: 'locked' };
  const classId = entity.mir4.classId as Mir4ClassId;
  const state = cloneState(meta.mir4Codex);
  const materials = { ...MIR4_EMPTY_MATERIALS, ...meta.mir4Materials };
  const result = registerMir4CodexRequirement({
    classId,
    level: entity.level,
    collectionId,
    requirementId,
    count,
    expectedRegistered,
    state,
    materials,
  });
  if (!result.ok) return result;
  meta.mir4Codex = state;
  meta.mir4Materials = materials;
  markMir4CodexWireDirty(meta);
  markMir4WireDirty(meta);
  refreshMir4CodexDerivedStats(ctx, pid);
  return result;
}

export function registerAllMir4Codex(
  ctx: SimContext,
  pid: number,
  collectionId: string,
): Mir4CodexRegisterResult {
  const resolved = ctx.resolve(pid);
  if (!resolved?.e.mir4) return { ok: false, reason: 'locked' };
  const classId = resolved.e.mir4.classId as Mir4ClassId;
  const collection = resolveMir4CodexCollection(collectionId, classId);
  const requirement = collection?.requirements.find((entry) => entry.kind === 'material');
  if (requirement?.kind !== 'material') {
    return { ok: false, reason: collection ? 'automatic-collection' : 'unknown-collection' };
  }
  const registered = resolved.meta.mir4Codex?.registered[collectionId]?.[requirement.id] ?? 0;
  return registerMir4Codex(
    ctx,
    pid,
    collectionId,
    requirement.id,
    requirement.requiredCount - registered,
    registered,
  );
}
