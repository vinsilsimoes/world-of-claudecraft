import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function doubleStrikeEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5301);
  if (!plan) throw new Error('Missing Double Strike runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Double Strike presentation event');
  return event;
}

describe('MIR4 Double Strike native presentation', () => {
  it('owns generic VFX and holds the committed cast facing through the native end-cut', () => {
    const event = doubleStrikeEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5301')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 11.7 });
  });

  it('releases the three 7-by-5-yard strikes only at 400, 1040 and 1200 ms', () => {
    const event = doubleStrikeEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 6, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.399, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.639, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    painter.update(0.16, pose);
    expect(playContact).toHaveBeenCalledTimes(3);
    expect(playContact.mock.calls.map((call) => call[2])).toEqual(
      Array.from({ length: 3 }, () => ({
        shape: 'direct',
        x: 9.5,
        y: 1,
        z: 4,
        power: expect.any(Number),
        slashScale: 5 / 2.3,
      })),
    );
  });

  it('renders two green cross-through cuts and a heavier pale-green return strike', () => {
    const event = doubleStrikeEvent();
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
    const contacts = event.contacts;
    const visual = {
      shape: 'direct' as const,
      x: 9.5,
      y: 1,
      z: 4,
      power: 1,
      slashScale: 5 / 2.3,
    };

    contacts.forEach((contact, index) => {
      playMir4NativeSkillContact(deps, event, contact, visual, index);
    });

    expect(deps.slashStyled.mock.calls).toEqual([
      [visual, 0x62e2a4, 'thrust', 3.1],
      [visual, 0x8df0bd, 'horizontal', 3.45],
      [visual, 0xe5ffe9, 'vertical', 4.05],
    ]);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(3);
    expect(deps.ringAt).toHaveBeenLastCalledWith(9.5, 0.33, 4, 4.4, 0.52, 0xe5ffe9, 2.7, false);
    expect(deps.burstAt).toHaveBeenLastCalledWith(9.5, 1.65, 4, 0xe5ffe9, 38, 1.05, 'sparks');
    expect(deps.playImpactAudio.mock.calls.map((call) => call[1])).toEqual([0.9, 1.02, 1.25]);
  });
});
