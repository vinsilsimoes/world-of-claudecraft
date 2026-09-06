import { describe, expect, it, vi } from 'vitest';
import { mir4DownReactionLiftY } from '../../src/render/mir4_down_reaction_core';
import { playMir4HitReaction } from '../../src/render/mir4_hit_reaction_presentation';
import { Renderer } from '../../src/render/renderer';
import type { SimEvent } from '../../src/sim/types';

const event: Extract<SimEvent, { type: 'mir4HitReaction' }> = {
  type: 'mir4HitReaction',
  sourceId: 7,
  targetId: 9,
  skillId: 1102,
  attackId: 110203,
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

const down03Event: Extract<SimEvent, { type: 'mir4HitReaction'; stance: 'down-03' }> = {
  ...downEvent,
  skillId: 1401,
  attackId: 140102,
  durationMs: 2_490,
  stance: 'down-03',
  moveDurationMs: 490,
  heightYards: 0,
};

describe('MIR4 native hit-reaction presentation', () => {
  it('forwards the exact native stance and duration to the character visual', () => {
    const visual = { playMir4HitReaction: vi.fn() };

    expect(playMir4HitReaction(visual as never, event)).toBe(true);
    expect(visual.playMir4HitReaction).toHaveBeenCalledOnce();
    expect(visual.playMir4HitReaction).toHaveBeenCalledWith('hit-01', 200);
  });

  it('routes each authoritative reaction event through the renderer', () => {
    const renderer = Object.create(Renderer.prototype) as unknown as {
      views: Map<number, object>;
      activeVisual(view: object): { playMir4HitReaction: ReturnType<typeof vi.fn> };
    };
    const visual = { playMir4HitReaction: vi.fn() };
    renderer.views = new Map([[event.targetId, {}]]);
    renderer.activeVisual = () => visual;

    Renderer.prototype.handleEvent.call(renderer, event);

    expect(visual.playMir4HitReaction).toHaveBeenCalledWith('hit-01', 200);
  });

  it('forwards the admitted Down02 movement and height tuple without normalizing it', () => {
    const visual = { playMir4HitReaction: vi.fn() };

    expect(playMir4HitReaction(visual as never, downEvent)).toBe(true);
    expect(visual.playMir4HitReaction).toHaveBeenCalledWith('down-02', 3_000, 900, 2);
  });

  it('forwards the admitted Down03 tuple without collapsing it into Down02', () => {
    const visual = { playMir4HitReaction: vi.fn() };

    expect(playMir4HitReaction(visual as never, down03Event)).toBe(true);
    expect(visual.playMir4HitReaction).toHaveBeenCalledWith('down-03', 2_490, 490, 0);
  });

  it('uses the native 900ms and two-yard tuple for a bounded ballistic lift', () => {
    expect(mir4DownReactionLiftY(0, 0.9, 2)).toBe(0);
    expect(mir4DownReactionLiftY(0.45, 0.9, 2)).toBe(2);
    expect(mir4DownReactionLiftY(0.9, 0.9, 2)).toBe(0);
    expect(mir4DownReactionLiftY(3, 0.9, 2)).toBe(0);
  });
});
