// Development-only MIR4 Spirit fixture. It provisions the real campaign
// ledger and collection state so manual QA exercises the shipping summon and
// fusion commands instead of a presentation-only shortcut.

import { MIR4_GAME_PROFILE } from '../game_profile';
import { markMir4WireDirty } from '../mir4/wire_revision';
import type { SimContext } from '../sim_context';

export const MIR4_SPIRIT_PLAYTEST_TICKET_COUNT = 100_000;
export const MIR4_SPIRIT_PLAYTEST_FUSION_ID = 'spirit-common-01';
export const MIR4_SPIRIT_PLAYTEST_FUSION_COUNT = 4;

export interface Mir4SpiritPlaytestGrant {
  dawnTickets: number;
  sunsetTickets: number;
  fusionCopies: number;
}

function topUp(value: number | undefined, floor: number): number {
  return Number.isFinite(value) ? Math.max(floor, Math.floor(value ?? 0)) : floor;
}

export function grantMir4SpiritPlaytestKit(
  ctx: SimContext,
  pid: number,
): Mir4SpiritPlaytestGrant | null {
  if (ctx.gameProfile !== MIR4_GAME_PROFILE) return null;
  const meta = ctx.players.get(pid);
  if (!meta) return null;

  meta.mir4ArcRewards ??= {};
  const rewards = meta.mir4ArcRewards;
  rewards.systems = [...new Set([...(rewards.systems ?? []), 'spirit-summon'])].sort();
  rewards.tickets ??= {};
  rewards.tickets['spirit-ticket-dawn'] = topUp(
    rewards.tickets['spirit-ticket-dawn'],
    MIR4_SPIRIT_PLAYTEST_TICKET_COUNT,
  );
  rewards.tickets['spirit-ticket-sunset'] = topUp(
    rewards.tickets['spirit-ticket-sunset'],
    MIR4_SPIRIT_PLAYTEST_TICKET_COUNT,
  );

  meta.mir4Spirits ??= {};
  const spirits = meta.mir4Spirits;
  spirits.owned ??= {};
  spirits.owned[MIR4_SPIRIT_PLAYTEST_FUSION_ID] = topUp(
    spirits.owned[MIR4_SPIRIT_PLAYTEST_FUSION_ID],
    MIR4_SPIRIT_PLAYTEST_FUSION_COUNT,
  );
  spirits.discovered = [
    ...new Set([...(spirits.discovered ?? []), MIR4_SPIRIT_PLAYTEST_FUSION_ID]),
  ];

  markMir4WireDirty(meta);
  return {
    dawnTickets: rewards.tickets['spirit-ticket-dawn'],
    sunsetTickets: rewards.tickets['spirit-ticket-sunset'],
    fusionCopies: spirits.owned[MIR4_SPIRIT_PLAYTEST_FUSION_ID],
  };
}
