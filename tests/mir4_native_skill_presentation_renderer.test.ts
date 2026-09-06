import { describe, expect, it, vi } from 'vitest';
import type { Mir4NativeSkillFacingLock } from '../src/render/mir4_native_skill_presentation_core';
import { Renderer } from '../src/render/renderer';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';
import type { SimEvent } from '../src/sim/types';

interface PresentationRendererHarness {
  time: number;
  views: Map<number, { group: { rotation: { y: number } } }>;
  mir4NativeSkillFacingLocks: Map<number, Mir4NativeSkillFacingLock>;
  mir4NativeSkillPresentations: { start: ReturnType<typeof vi.fn> };
}

describe('MIR4 native skill renderer integration', () => {
  it('snaps the source body to the committed target-facing before starting Air Slash', () => {
    const plan = mir4RuntimeSkillExecutionPlan(1102);
    expect(plan).not.toBeNull();
    if (!plan) return;
    const event = mir4NativeSkillPresentationEvent(7, 9, 1.25, plan);
    expect(event).not.toBeNull();
    if (!event) return;

    const sourceView = { group: { rotation: { y: -2 } } };
    const start = vi.fn();
    const harness: PresentationRendererHarness = {
      time: 10,
      views: new Map([[7, sourceView]]),
      mir4NativeSkillFacingLocks: new Map(),
      mir4NativeSkillPresentations: { start },
    };
    const handleEvent = Renderer.prototype.handleEvent as unknown as (
      this: PresentationRendererHarness,
      event: SimEvent,
    ) => void;

    handleEvent.call(harness, event);

    expect(sourceView.group.rotation.y).toBe(1.25);
    expect(harness.mir4NativeSkillFacingLocks.get(7)).toEqual({ facing: 1.25, until: 11.3 });
    expect(start).toHaveBeenCalledWith(event);
  });

  it('does not add generic projectile VFX when native presentation owns the cue', () => {
    const handleSpellfx = vi.fn();
    const projectile = vi.fn();
    const harness = {
      sim: { entities: new Map() },
      abilityVfx: { handleSpellfx },
      vfx: { projectile },
    };
    const handleEvent = Renderer.prototype.handleEvent as unknown as (
      this: typeof harness,
      event: SimEvent,
    ) => void;

    handleEvent.call(harness, {
      type: 'spellfx',
      sourceId: 7,
      targetId: 9,
      school: 'frost',
      fx: 'projectile',
      ability: 'frostbolt',
      nativePresentationOwned: true,
    });

    expect(handleSpellfx).not.toHaveBeenCalled();
    expect(projectile).not.toHaveBeenCalled();
  });
});
