import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function ravagingBlowEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5201);
  if (!plan) throw new Error('Missing Ravaging Blow runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Ravaging Blow presentation event');
  return event;
}

describe('MIR4 Ravaging Blow native presentation', () => {
  it('owns the generic ability VFX and locks the cast facing through the end cut', () => {
    const event = ravagingBlowEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5201')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({
      facing: Math.PI / 2,
      until: 11.74,
    });
  });

  it('plays all six spear contacts at the recovered native timestamps', () => {
    const event = ravagingBlowEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.479, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.211, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    painter.update(0.61, pose);
    expect(playContact.mock.calls.map((call) => [call[1].attackId, call[1].offsetMs])).toEqual([
      [520101, 480],
      [520101, 690],
      [520101, 880],
      [520102, 1_000],
      [520102, 1_150],
      [520103, 1_300],
    ]);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'direct',
      x: 5.5,
      z: 4,
      slashScale: 5 / 2.3,
    });
    expect(playContact.mock.calls[5]?.[2]).toMatchObject({
      shape: 'direct',
      x: 5.75,
      z: 4,
      slashScale: 5 / 2.3,
    });
  });

  it('renders the finishing spear sweep as the brightest and longest contact', () => {
    const event = ravagingBlowEvent();
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const contact = event.contacts[5];
    if (contact?.shape !== 'direct') throw new Error('Missing Ravaging Blow finisher');
    const visual = {
      shape: 'direct' as const,
      x: 5.75,
      y: 1,
      z: 4,
      power: 0.9,
      slashScale: 5 / 2.3,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 5);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xe7f8ff, 'crescent', (5 / 2.3) * 1.3);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xe7f8ff, 0.18, 0.52, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(5.75, 0.33, 4, 3.2, 0.52, 0xe7f8ff, 2.5, false);
    expect(deps.burstAt).toHaveBeenCalledWith(5.75, 1.45, 4, 0xe7f8ff, 32, 0.9, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.2, 5.75, 1, 4);
  });
});
