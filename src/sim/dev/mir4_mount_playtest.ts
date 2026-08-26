// Development-only MIR4 Mount fixture. It provisions the real campaign
// wallet and logical collection while presentation remains native WoC mounts.

import { MIR4_GAME_PROFILE } from '../game_profile';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';

export const MIR4_MOUNT_PLAYTEST_TICKET_COUNT = 100_000;
export const MIR4_MOUNT_PLAYTEST_FUSION_ID = 'meadow-courser';
export const MIR4_MOUNT_PLAYTEST_FUSION_COUNT = 4;

export interface Mir4MountPlaytestGrant {
  dawnTickets: number;
  twilightTickets: number;
  fusionCopies: number;
}

function topUp(value: number | undefined, floor: number): number {
  return Number.isFinite(value) ? Math.max(floor, Math.floor(value ?? 0)) : floor;
}

export function grantMir4MountPlaytestKit(
  ctx: SimContext,
  pid: number,
): Mir4MountPlaytestGrant | null {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return null;
  const meta = ctx.players.get(pid);
  if (!meta) return null;

  meta.mir4ArcRewards ??= {};
  const rewards = meta.mir4ArcRewards;
  rewards.systems = [...new Set([...(rewards.systems ?? []), 'mount-summon'])].sort();
  rewards.tickets ??= {};
  rewards.tickets['mount-ticket-dawn'] = topUp(
    rewards.tickets['mount-ticket-dawn'],
    MIR4_MOUNT_PLAYTEST_TICKET_COUNT,
  );
  rewards.tickets['mount-ticket-twilight'] = topUp(
    rewards.tickets['mount-ticket-twilight'],
    MIR4_MOUNT_PLAYTEST_TICKET_COUNT,
  );

  meta.mir4Mounts ??= {};
  const mounts = meta.mir4Mounts;
  mounts.owned ??= {};
  mounts.owned[MIR4_MOUNT_PLAYTEST_FUSION_ID] = topUp(
    mounts.owned[MIR4_MOUNT_PLAYTEST_FUSION_ID],
    MIR4_MOUNT_PLAYTEST_FUSION_COUNT,
  );
  mounts.discovered = [...new Set([...(mounts.discovered ?? []), MIR4_MOUNT_PLAYTEST_FUSION_ID])];

  markMir4WireDirty(meta);
  return {
    dawnTickets: rewards.tickets['mount-ticket-dawn'],
    twilightTickets: rewards.tickets['mount-ticket-twilight'],
    fusionCopies: mounts.owned[MIR4_MOUNT_PLAYTEST_FUSION_ID],
  };
}
