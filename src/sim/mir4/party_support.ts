// Deterministic friendly targeting for MIR4-style support pulses. This leaf
// keeps party and raid-subgroup selection out of the combat coordinator so
// manual casts, Auto Battle and tests share one admission rule.

import type { SimContext } from '../sim_context';
import type { Entity } from '../types';
import { dist2d } from '../types';

export interface Mir4PartyPulseSpec {
  readonly radiusYards: number;
  readonly maxTargets: number;
}

/**
 * Returns the caster followed by living party members in stable roster order.
 * Raid support stays inside the caster's five-player subgroup, matching the
 * ordinary MIR4 party envelope instead of turning one Taoist into a raid-wide
 * healer.
 */
export function mir4PartyPulseTargets(
  ctx: Pick<SimContext, 'entities' | 'hasLineOfSight' | 'partyOf'>,
  source: Entity,
  spec: Mir4PartyPulseSpec,
): Entity[] {
  const party = ctx.partyOf(source.id);
  const sourceGroup = party?.raid ? (party.raidGroups.get(source.id) ?? 1) : null;
  const memberIds = party
    ? party.members.filter(
        (pid) => sourceGroup === null || (party.raidGroups.get(pid) ?? 1) === sourceGroup,
      )
    : [source.id];
  const orderedIds = [source.id, ...memberIds.filter((pid) => pid !== source.id)];
  const targets: Entity[] = [];
  for (const pid of orderedIds) {
    const target = ctx.entities.get(pid);
    if (!target || target.dead || target.kind !== 'player') continue;
    if (dist2d(source.pos, target.pos) > spec.radiusYards) continue;
    if (target.id !== source.id && !ctx.hasLineOfSight(source, target)) continue;
    targets.push(target);
    if (targets.length >= Math.max(1, Math.floor(spec.maxTargets))) break;
  }
  return targets;
}

export function mir4LowestPartyHealthPercent(
  ctx: Pick<SimContext, 'entities' | 'hasLineOfSight' | 'partyOf'>,
  source: Entity,
  spec: Mir4PartyPulseSpec,
): number {
  const targets = mir4PartyPulseTargets(ctx, source, spec);
  if (targets.length === 0) return 100;
  return Math.min(...targets.map((target) => (target.hp / Math.max(1, target.maxHp)) * 100));
}

export function mir4PartyNeedsHealing(
  ctx: Pick<SimContext, 'entities' | 'hasLineOfSight' | 'partyOf'>,
  source: Entity,
  spec: Mir4PartyPulseSpec,
): boolean {
  return mir4PartyPulseTargets(ctx, source, spec).some((target) => target.hp < target.maxHp);
}
