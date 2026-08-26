import { describe, expect, it, vi } from 'vitest';
import {
  mir4ActionDurationSeconds,
  mir4ActionTimeScale,
} from '../../src/render/characters/attack_timing_core';
import { playMir4AttackStart } from '../../src/render/mir4_attack_presentation';
import { Renderer } from '../../src/render/renderer';
import type { SimEvent } from '../../src/sim/types';

interface AttackEventHarness {
  handleEvent(event: SimEvent): void;
  views: Map<number, object>;
  attackTriggerCount: number;
  activeVisual(view: object): TriggerHarness['visual'];
}

interface TriggerHarness {
  visual: {
    playAttack: ReturnType<typeof vi.fn>;
    playCastAction: ReturnType<typeof vi.fn>;
    playWhirl: ReturnType<typeof vi.fn>;
  };
}

describe('MIR4 renderer-owned action timing', () => {
  it('fits the selected native clip exactly inside the authoritative action window', () => {
    expect(mir4ActionTimeScale(1.8, 1_200, 1.3)).toBeCloseTo(1.5);
    expect(mir4ActionTimeScale(0.9, 450, 1.3)).toBeCloseTo(2);
    expect(mir4ActionTimeScale(1.8, undefined, 1.3)).toBe(1.3);
  });

  it('keeps a whirl rotating for the whole authoritative multi-contact window', () => {
    expect(mir4ActionDurationSeconds(2_050, 0.55)).toBeCloseTo(2.05);
    expect(mir4ActionDurationSeconds(undefined, 0.55)).toBe(0.55);
  });

  it.each([['basic', 'cast', 448] as const, ['ultimate', 'weapon', 1_275] as const])(
    'forwards %s pose and duration once without replaying from damage',
    (action, pose, durationMs) => {
      const renderer = Object.create(Renderer.prototype) as AttackEventHarness;
      const visual: TriggerHarness['visual'] = {
        playAttack: vi.fn(),
        playCastAction: vi.fn(),
        playWhirl: vi.fn(),
      };
      renderer.views = new Map([[7, {}]]);
      renderer.attackTriggerCount = 0;
      renderer.activeVisual = () => visual;
      const event: SimEvent = {
        type: 'mir4AttackStart',
        sourceId: 7,
        targetId: 9,
        ability: 'storm_bolt',
        action,
        pose,
        durationMs,
      };

      renderer.handleEvent(event);

      const expected = pose === 'cast' ? visual.playCastAction : visual.playAttack;
      expect(expected).toHaveBeenCalledOnce();
      expect(expected).toHaveBeenCalledWith('storm_bolt', durationMs);
      expect(renderer.attackTriggerCount).toBe(1);
    },
  );

  it('dispatches authoritative actions to the live attack, cast, and whirl paths', () => {
    const visual = {
      playAttack: vi.fn(),
      playCastAction: vi.fn(),
      playWhirl: vi.fn(),
    };
    playMir4AttackStart(visual as never, {
      type: 'mir4AttackStart',
      sourceId: 7,
      targetId: 9,
      ability: 'storm_bolt',
      action: 'basic',
      pose: 'cast',
      durationMs: 800,
    });
    playMir4AttackStart(visual as never, {
      type: 'mir4AttackStart',
      sourceId: 7,
      targetId: 9,
      ability: 'whirlwind',
      action: 'basic',
      pose: 'weapon',
      durationMs: 2_050,
    });
    playMir4AttackStart(visual as never, {
      type: 'mir4AttackStart',
      sourceId: 7,
      targetId: 9,
      ability: 'mortal_strike',
      action: 'basic',
      pose: 'weapon',
      durationMs: 500,
    });

    expect(visual.playCastAction).toHaveBeenCalledWith('storm_bolt', 800);
    expect(visual.playWhirl).toHaveBeenCalledWith(2_050);
    expect(visual.playAttack).toHaveBeenCalledWith('mortal_strike', 500);
  });
});
