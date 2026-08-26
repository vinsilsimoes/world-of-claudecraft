// Minimal authoritative MIR4 Energy loop. Energy remains a currency, while
// one curated physical site on the original WoC map reuses the native gather
// cast and quest-crystal presentation. Source pins from the extracted client:
// LEVEL.MeditationMaxSpirit = 5,000,000, solo MEDITATION_REWARD.GetSpirit = 1,
// status 86 boosts Energy gained and status 92 boosts Energy gathering speed.

import { mir4ArcRegionLayout } from '../content/mir4/arc_world_layout';
import { MIR4_GAME_PROFILE } from '../game_profile';
import type { SimContext } from '../sim_context';
import { dist2d, type Entity, type GroundObjectDef, type Mir4ArcMapProjection } from '../types';
import {
  MIR4_ENERGY_CAST_NODE_PREFIX,
  mir4EnergySiteEntityIdFromCast,
  startMir4FragileGatherCast,
} from './quest_objective_cast';
import { mir4ModifiedGatherDurationSeconds, mir4ModifiedProgressionReward } from './status_effects';
import { markMir4WireDirty } from './wire_revision';

export const MIR4_ENERGY_CAP = 5_000_000;
export const MIR4_ENERGY_BASE_REWARD = 1;
export const MIR4_ENERGY_CAST_SECONDS = 5;
export const MIR4_ENERGY_SITE_ITEM_ID = 'mir4_object_energy_crystal';
export const MIR4_ENERGY_SITE_NAME = 'Energy Gathering Site';
export const MIR4_ENERGY_INTERACT_RADIUS = 6;

export function mir4EnergyGroundObjects(
  projections: readonly Mir4ArcMapProjection[],
): GroundObjectDef[] {
  const m01 = mir4ArcRegionLayout('m01-vila-do-vau', projections);
  const site = m01?.sites.find((candidate) => candidate.id === 'moss-cemetery');
  if (!site) return [];
  return [
    {
      itemId: MIR4_ENERGY_SITE_ITEM_ID,
      name: MIR4_ENERGY_SITE_NAME,
      positions: [{ ...site.pos }],
    },
  ];
}

export function mir4IsEnergySiteEntity(entity: Entity | undefined): boolean {
  return (
    entity?.kind === 'object' && entity.lootable && entity.objectItemId === MIR4_ENERGY_SITE_ITEM_ID
  );
}

export function mir4HandleEnergySiteInteract(
  ctx: SimContext,
  pid: number,
  siteId?: number,
): boolean {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return false;
  const meta = ctx.players.get(pid);
  const player = ctx.entities.get(pid);
  if (!meta || !player || player.dead || player.castingAbility) return false;
  const candidates =
    siteId === undefined
      ? [...ctx.entities.values()]
      : [ctx.entities.get(siteId)].filter((entity): entity is Entity => entity !== undefined);
  const site = candidates.find(
    (candidate) =>
      mir4IsEnergySiteEntity(candidate) &&
      dist2d(player.pos, candidate.pos) <= MIR4_ENERGY_INTERACT_RADIUS,
  );
  if (!site) {
    if (siteId !== undefined) ctx.error(pid, 'Too far away.');
    return false;
  }
  const castSeconds = mir4ModifiedGatherDurationSeconds(
    MIR4_ENERGY_CAST_SECONDS,
    'energy',
    player.mir4?.statusValues,
  );
  startMir4FragileGatherCast(ctx, player, castSeconds, `${MIR4_ENERGY_CAST_NODE_PREFIX}${site.id}`);
  return true;
}

/** Returns false only when the completed cast belongs to another gather lane. */
export function completeMir4EnergyCast(ctx: SimContext, player: Entity): boolean {
  const siteId = mir4EnergySiteEntityIdFromCast(player.gatherCastNodeId);
  if (siteId === null) return false;
  player.gatherCastNodeId = '';
  player.gatherCastToolRarity = '';
  player.gatherCastEffectConfirmed = false;
  const meta = ctx.players.get(player.id);
  const site = ctx.entities.get(siteId);
  if (
    !meta ||
    !site ||
    !mir4IsEnergySiteEntity(site) ||
    dist2d(player.pos, site.pos) > MIR4_ENERGY_INTERACT_RADIUS
  ) {
    return true;
  }
  const reward = mir4ModifiedProgressionReward(
    MIR4_ENERGY_BASE_REWARD,
    'energy',
    player.mir4?.statusValues,
  );
  const currencies = meta.mir4Currencies ?? { darksteel: 0, energy: 0 };
  meta.mir4Currencies = {
    ...currencies,
    energy: Math.min(MIR4_ENERGY_CAP, currencies.energy + reward),
  };
  markMir4WireDirty(meta);
  return true;
}
