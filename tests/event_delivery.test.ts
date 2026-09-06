import { describe, expect, it } from 'vitest';
import { shouldDeliverCombatEventToViewer } from '../server/event_delivery';
import type { SimEvent } from '../src/sim/types';

const guardianHit: SimEvent = {
  type: 'damage',
  sourceId: 90,
  sourceOwnerId: 10,
  targetId: 200,
  amount: 36,
  crit: false,
  school: 'fire',
  ability: 'Pyre Aura',
  kind: 'hit',
};

const nativeHitReaction: SimEvent = {
  type: 'mir4HitReaction',
  sourceId: 90,
  targetId: 200,
  skillId: 1102,
  attackId: 110203,
  durationMs: 200,
  stance: 'hit-01',
};

// Ownership now resolves through the delivery-time lookup (the live entity
// map on the server), not the event's sourceOwnerId field: the guardian
// entity 90 belongs to player 10.
const ownerOf = (entityId: number): number | null => (entityId === 90 ? 10 : null);

describe('combat event delivery', () => {
  it('delivers guardian damage to its owner and the owner party', () => {
    expect(shouldDeliverCombatEventToViewer(guardianHit, 10, null, ownerOf)).toBe(true);
    expect(shouldDeliverCombatEventToViewer(guardianHit, 11, { members: [10, 11] }, ownerOf)).toBe(
      true,
    );
  });

  it('does not expose guardian damage to unrelated viewers', () => {
    expect(shouldDeliverCombatEventToViewer(guardianHit, 12, { members: [12] }, ownerOf)).toBe(
      false,
    );
  });

  it('delivers native hit reactions only to combat participants and their parties', () => {
    expect(shouldDeliverCombatEventToViewer(nativeHitReaction, 10, null, ownerOf)).toBe(true);
    expect(
      shouldDeliverCombatEventToViewer(nativeHitReaction, 11, { members: [10, 11] }, ownerOf),
    ).toBe(true);
    expect(
      shouldDeliverCombatEventToViewer(nativeHitReaction, 12, { members: [12] }, ownerOf),
    ).toBe(false);
  });
});
