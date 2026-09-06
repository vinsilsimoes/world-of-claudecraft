import { describe, expect, it } from 'vitest';
import type { SimContext } from '../../src/sim/sim_context';
import type { Entity } from '../../src/sim/types';
import {
  applyMir4NativeArbalistFocus,
  mir4NativeArbalistFocusCriticalBonus,
  updateMir4NativeArbalistFocus,
} from '../../src/sim/mir4/native_skill_quick_shot';

function entity(): Entity {
  return {
    id: 1,
    kind: 'player',
    dead: false,
    inCombat: true,
    auras: [],
    mir4Effects: { active: [], controlImmuneUntil: 0 },
  } as unknown as Entity;
}

function context(player: Entity): SimContext {
  return {
    time: 10,
    entities: new Map([[player.id, player]]),
  } as unknown as SimContext;
}

describe('MIR4 Arbalist Focus', () => {
  it('stacks to ten, refreshes 30 sec and grants CRIT at 3/6/9 stacks', () => {
    const player = entity();
    const ctx = context(player);

    for (let stack = 1; stack <= 12; stack += 1) {
      applyMir4NativeArbalistFocus(ctx, player);
      const focus = player.mir4Effects?.active.find(
        (effect) => effect.effectId === 'mir4_native_buff_41010',
      );
      expect(focus?.nativeStacks).toBe(Math.min(10, stack));
      expect(focus?.remaining).toBe(30);
    }
    expect(mir4NativeArbalistFocusCriticalBonus(player)).toBe(150);
  });

  it('removes Focus on leaving combat or receiving Stun, Knockdown, or Blind', () => {
    for (const cause of ['out-of-combat', 'stun', 'knockdown', 'blind'] as const) {
      const player = entity();
      const ctx = context(player);
      applyMir4NativeArbalistFocus(ctx, player);
      if (cause === 'out-of-combat') player.inCombat = false;
      else {
        player.mir4Effects?.active.push({
          effectId: `test_${cause}`,
          kind: cause,
          remaining: 2,
          duration: 2,
          magnitude: 0,
          sourceId: 2,
        });
      }

      updateMir4NativeArbalistFocus(ctx);
      expect(
        player.mir4Effects?.active.some(
          (effect) => effect.effectId === 'mir4_native_buff_41010',
        ) ?? false,
      ).toBe(false);
    }
  });
});
