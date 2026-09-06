import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function nirvanaKickEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5104);
  if (!plan) throw new Error('Missing Nirvana Kick runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Nirvana Kick presentation event');
  return event;
}

describe('MIR4 Nirvana Kick native presentation', () => {
  it('owns generic VFX and locks the post-dash target-facing strike', () => {
    const event = nirvanaKickEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5104')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 11 });
  });

  it('releases the 4.5-by-5-yard strike only at 600 ms', () => {
    const event = nirvanaKickEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 6, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.599, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'direct',
      x: 8.25,
      z: 4,
      slashScale: 5 / 2.3,
    });
  });

  it('renders the kick as an orange-gold vertical impact with a heavy ground pulse', () => {
    const event = nirvanaKickEvent();
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
    const contact = event.contacts[0];
    if (contact?.shape !== 'direct') throw new Error('Missing Nirvana Kick strike');
    const visual = { shape: 'direct' as const, x: 8.25, y: 1, z: 4, power: 1, slashScale: 5 / 2.3 };

    playMir4NativeSkillContact(deps, event, contact, visual, 0);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xffba55, 'vertical', 3.7);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xffba55, 0.2, 0.48, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(8.25, 0.33, 4, 3.4, 0.52, 0xffd391, 2.65, false);
    expect(deps.burstAt).toHaveBeenCalledWith(8.25, 1.6, 4, 0xffba55, 36, 1.05, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.25, 8.25, 1, 4);
  });
});
