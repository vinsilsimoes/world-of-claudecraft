import { describe, expect, it } from 'vitest';
import {
  mir4AutomationActionBlocked,
  mir4AutomationRunSpeed,
} from '../../src/sim/auto_battle/admission';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';

function controlledPlayer(kind: 'root' | 'stun'): Entity {
  return {
    mir4Effects: {
      active: [
        {
          effectId: `test_${kind}`,
          kind,
          remaining: 1,
          duration: 1,
          magnitude: 0,
          sourceId: 2,
        },
      ],
      controlImmuneUntil: 0,
    },
    auras: [],
  } as unknown as Entity;
}

describe('MIR4 automation control admission', () => {
  it('lets a rooted player act while keeping movement at zero', () => {
    const player = controlledPlayer('root');
    const ctx = {
      isRooted: () => true,
      isStunned: () => false,
      moveSpeedMult: () => 1,
    } as unknown as SimContext;

    expect(mir4AutomationActionBlocked(ctx, player)).toBe(false);
    expect(mir4AutomationRunSpeed(ctx, player)).toBe(0);
  });

  it('blocks both actions and movement during hard control', () => {
    const player = controlledPlayer('stun');
    const ctx = {
      isRooted: () => false,
      isStunned: () => false,
      moveSpeedMult: () => 1,
    } as unknown as SimContext;

    expect(mir4AutomationActionBlocked(ctx, player)).toBe(true);
    expect(mir4AutomationRunSpeed(ctx, player)).toBe(0);
  });
});
