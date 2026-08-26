import { MIR4_MAX_LEVEL, type Mir4ClassId } from '../content/mir4';
import { type GameProfile, MIR4_GAME_PROFILE } from '../game_profile';
import type { ResolvedAbility } from '../sim';
import type { SimContext } from '../sim_context';
import type { Entity, PlayableClass } from '../types';
import { refreshMir4KnownAbilities } from './action_abilities';
import { mir4GrantStarterEquipment } from './equipment';
import type { Mir4PersistedPlayerState, Mir4PersistenceMeta } from './persistence';
import { restoreMir4PlayerState, serializeMir4PlayerState } from './persistence';
import {
  initMir4Player,
  mir4ClassIdForPlayerClass,
  mir4ClassKeyArg,
  mir4RecalcClassOf,
  recalcMir4PlayerStats,
} from './stats';

type Mir4ProfileMeta = Mir4PersistenceMeta & { mir4SpiritSkillReadyAt?: number };

/** Rebuild a MIR4 player's profile-owned derived stats without touching classic gear math. */
export function recalcMir4ProfilePlayerStats(
  profile: GameProfile,
  entity: Entity,
  meta: Mir4PersistenceMeta,
): boolean {
  if (profile !== MIR4_GAME_PROFILE) return false;
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
  return true;
}

export function restoreMir4ProfilePlayer(
  profile: GameProfile,
  ctx: SimContext,
  meta: Mir4ProfileMeta & { known: ResolvedAbility[] },
  pid: number,
  state: unknown,
  cls: PlayableClass,
): void {
  if (profile !== MIR4_GAME_PROFILE) return;
  const restored = restoreMir4PlayerState(
    meta,
    state,
    mir4ClassIdForPlayerClass(cls) as Mir4ClassId,
  );
  initMir4Player(ctx, pid, state as { hp?: number; resource?: number }, mir4ClassKeyArg(cls));
  if (state === null || state === undefined) mir4GrantStarterEquipment(ctx, pid);
  const player = ctx.entities.get(pid);
  if (player) {
    player.mir4UltGauge = restored.mir4UltGauge ?? 0;
    refreshMir4KnownAbilities(player, meta);
  }
  meta.mir4SpiritSkillReadyAt = restored.mir4SpiritSkillCooldownRemaining
    ? ctx.time + restored.mir4SpiritSkillCooldownRemaining
    : undefined;
}

export function serializeMir4ProfilePlayer(
  profile: GameProfile,
  meta: Mir4ProfileMeta,
  entity: Entity,
  simTime: number,
): Mir4PersistedPlayerState {
  if (profile !== MIR4_GAME_PROFILE || !entity.mir4) return {};
  return serializeMir4PlayerState(
    {
      ...meta,
      mir4UltGauge: entity.mir4UltGauge ?? 0,
      mir4SpiritSkillCooldownRemaining: Math.max(0, (meta.mir4SpiritSkillReadyAt ?? 0) - simTime),
    },
    entity.mir4.classId as Mir4ClassId,
  );
}

export function setMir4ProfilePlayerLevel(
  profile: GameProfile,
  entity: Entity,
  meta: Mir4PersistenceMeta & { known: ResolvedAbility[] },
  level: number,
): boolean {
  if (profile !== MIR4_GAME_PROFILE) return false;
  entity.level = Math.max(1, Math.min(MIR4_MAX_LEVEL, level));
  recalcMir4ProfilePlayerStats(profile, entity, meta);
  entity.hp = entity.maxHp;
  entity.resource = entity.maxResource;
  refreshMir4KnownAbilities(entity, meta);
  return true;
}
