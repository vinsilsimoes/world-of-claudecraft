// Collection-ticket dispatch. Spirits and logical MIR4 Mounts share the
// campaign ticket wallet; Mount appearance still delegates to native WoC reins.

import type { SimContext } from '../sim_context';
import { type Mir4MountCommandResult, redeemMir4MountTicket } from './mount_commands';
import type { Mir4MountTicketId } from './mounts';
import { type Mir4SpiritCommandResult, summonMir4Spirit } from './spirit_commands';
import { isMir4SpiritTicketId } from './spirits';

export { combineMir4Mounts, confirmMir4Mount, equipMir4Mount } from './mount_commands';
export type { Mir4MountTicketId } from './mounts';
export { combineMir4Spirits, confirmMir4Spirit, equipMir4Spirit } from './spirit_commands';

export const MIR4_MOUNT_TICKET_VISUAL_ITEMS: Readonly<Record<Mir4MountTicketId, string>> = {
  'mount-ticket-dawn': 'reins_valorsteed',
  'mount-ticket-twilight': 'reins_aether_hover_cycle',
};

export type Mir4TicketRedeemResult =
  | Mir4MountCommandResult
  | Mir4SpiritCommandResult
  | { ok: false; reason: 'wrong-profile' | 'unavailable' | 'locked' | 'bags-full' };

export function isMir4MountTicketId(value: string): value is Mir4MountTicketId {
  return value === 'mount-ticket-dawn' || value === 'mount-ticket-twilight';
}

export function redeemMir4CollectionTicket(
  ctx: SimContext,
  pid: number,
  ticketId: Mir4MountTicketId,
): Mir4MountCommandResult;
export function redeemMir4CollectionTicket(
  ctx: SimContext,
  pid: number,
  ticketId: string,
): Mir4TicketRedeemResult;
export function redeemMir4CollectionTicket(
  ctx: SimContext,
  pid: number,
  ticketId: string,
): Mir4TicketRedeemResult {
  if (isMir4SpiritTicketId(ticketId)) return summonMir4Spirit(ctx, pid, ticketId);
  return isMir4MountTicketId(ticketId)
    ? redeemMir4MountTicket(ctx, pid, ticketId)
    : { ok: false, reason: 'unavailable' };
}
