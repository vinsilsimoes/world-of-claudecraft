import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function windWallEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5403);
  if (!plan) throw new Error('Missing Wind Wall runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Wind Wall presentation event');
  return event;
}

describe('MIR4 Wind Wall native presentation', () => {
  it('owns generic VFX and holds the cast facing through the native end-cut', () => {
    const event = windWallEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5403')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 10.72 });
  });

  it('releases the five ten-by-five-yard wind-wall contacts only at their native moments', () => {
    const event = windWallEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 6, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    for (const [deltaSeconds, expectedCount] of [
      [0.019, 0],
      [0.001, 1],
      [0.28, 2],
      [0.1, 3],
      [0.11, 4],
      [0.11, 5],
    ] as const) {
      painter.update(deltaSeconds, pose);
      expect(playContact).toHaveBeenCalledTimes(expectedCount);
    }
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'direct',
      x: 11,
      y: 1,
      z: 4,
      slashScale: 5 / 2.3,
    });
  });

  it('renders five strengthening cyan wind rotations across the forward wall', () => {
    const event = windWallEvent();
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
    event.contacts.forEach((contact, index) => {
      if (contact.shape !== 'direct') throw new Error('Missing Wind Wall forward box');
      playMir4NativeSkillContact(
        deps,
        event,
        contact,
        {
          shape: 'direct',
          x: 11,
          y: 1,
          z: 4,
          power: contact.damageCoefficient / 5_000,
          slashScale: contact.widthYards / 2.3,
        },
        index,
      );
    });

    expect(deps.slashStyled.mock.calls.map((call) => call.slice(1))).toEqual([
      [0x66dbe8, 'horizontal', 3.5],
      [0x72e6dd, 'crescent', 3.75],
      [0x8aefe0, 'horizontal', 4],
      [0xb5f7e8, 'crescent', 4.35],
      [0xe0fff4, 'horizontal', 4.8],
    ]);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(5);
    expect(deps.ringAt).toHaveBeenCalledTimes(5);
    expect(deps.burstAt).toHaveBeenLastCalledWith(11, 1.8, 4, 0xe0fff4, 40, 1.2, 'sparks');
    expect(deps.playImpactAudio.mock.calls.map((call) => call[1])).toEqual([
      0.88, 0.96, 1.04, 1.14, 1.28,
    ]);
  });
});
