import { describe, expect, it } from 'vitest';
import {
  decayMir4NativeHitReactionState,
  mir4HitReacting,
  mirrorMir4NativeHitReactionEvent,
} from '../../src/sim/mir4/native_skill_hit_reaction';
import type { Entity, SimEvent } from '../../src/sim/types';

function entity(): Entity {
  return {
    id: 9,
    dead: false,
    ccImmune: false,
  } as Entity;
}

const event: Extract<SimEvent, { type: 'mir4HitReaction' }> = {
  type: 'mir4HitReaction',
  sourceId: 7,
  targetId: 9,
  skillId: 1102,
  attackId: 110202,
  durationMs: 200,
  stance: 'hit-01',
};

const downEvent: Extract<SimEvent, { type: 'mir4HitReaction'; stance: 'down-02' }> = {
  type: 'mir4HitReaction',
  sourceId: 7,
  targetId: 9,
  skillId: 1104,
  attackId: 110402,
  durationMs: 3_000,
  stance: 'down-02',
  moveDurationMs: 900,
  heightYards: 2,
};

describe('MIR4 native hit-reaction client mirror', () => {
  it('mirrors and refreshes the server event without creating hard-control state', () => {
    const target = entity();

    expect(mirrorMir4NativeHitReactionEvent(target, event)).toBe(true);
    expect(mir4HitReacting(target)).toBe(true);
    expect(target.mir4Effects?.active).toHaveLength(1);
    expect(target.mir4Effects?.controlImmuneUntil).toBe(0);

    decayMir4NativeHitReactionState(target, 0.15);
    expect(target.mir4Effects?.active[0]?.remaining).toBeCloseTo(0.05);
    expect(mirrorMir4NativeHitReactionEvent(target, { ...event, attackId: 110203 })).toBe(true);
    expect(target.mir4Effects?.active[0]?.remaining).toBeCloseTo(0.2);
  });

  it('expires only the mirrored hit reaction at its authoritative deadline', () => {
    const target = entity();
    target.mir4Effects = {
      active: [
        {
          effectId: 'other_effect',
          kind: 'slow',
          remaining: 2,
          duration: 2,
          magnitude: 0.2,
          sourceId: 3,
        },
      ],
      controlImmuneUntil: 0,
    };
    mirrorMir4NativeHitReactionEvent(target, event);

    decayMir4NativeHitReactionState(target, 0.2);

    expect(mir4HitReacting(target)).toBe(false);
    expect(target.mir4Effects?.active.map((effect) => effect.effectId)).toEqual(['other_effect']);
  });

  it('does not duplicate authoritative hard-control state for a Down02 event', () => {
    const target = entity();

    expect(mirrorMir4NativeHitReactionEvent(target, downEvent)).toBe(false);
    expect(target.mir4Effects).toBeUndefined();
  });
});
