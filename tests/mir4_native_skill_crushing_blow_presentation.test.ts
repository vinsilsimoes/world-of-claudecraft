import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function crushingBlowEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5303);
  if (!plan) throw new Error('Missing Crushing Blow runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Crushing Blow presentation event');
  return event;
}

describe('MIR4 Crushing Blow native presentation', () => {
  it('owns generic VFX and holds facing through both target-crossing motions', () => {
    const event = crushingBlowEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5303')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 11.6 });
  });

  it('releases the four five-yard contacts only at 400, 550, 700 and 890 ms', () => {
    const event = crushingBlowEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 6, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    for (const [deltaSeconds, expectedCount] of [
      [0.399, 0],
      [0.001, 1],
      [0.15, 2],
      [0.15, 3],
      [0.19, 4],
    ] as const) {
      painter.update(deltaSeconds, pose);
      expect(playContact).toHaveBeenCalledTimes(expectedCount);
    }
    expect(playContact.mock.calls.every((call) => call[2].radiusYards === 5)).toBe(true);
  });

  it('renders three green rush bursts and a brighter rising ground-slam finisher', () => {
    const event = crushingBlowEvent();
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
      if (contact.shape !== 'circle') throw new Error('Missing Crushing Blow circle');
      playMir4NativeSkillContact(
        deps,
        event,
        contact,
        {
          shape: 'circle',
          x: 6,
          y: 1,
          z: 4,
          power: 1,
          radiusYards: 5,
          heightYards: 5,
        },
        index,
      );
    });

    expect(deps.slashStyled.mock.calls.map((call) => call.slice(1))).toEqual([
      [0x55e89a, 'thrust', 3.1],
      [0x78efad, 'horizontal', 3.35],
      [0x9ff5c1, 'crescent', 3.6],
      [0xe8ffde, 'vertical', 4.25],
    ]);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(4);
    expect(deps.ringAt).toHaveBeenLastCalledWith(6, 0.33, 4, 5, 0.58, 0xe8ffde, 2.85, false);
    expect(deps.burstAt).toHaveBeenLastCalledWith(6, 2.05, 4, 0xe8ffde, 44, 1.15, 'sparks');
    expect(deps.playImpactAudio.mock.calls.map((call) => call[1])).toEqual([0.9, 0.98, 1.06, 1.3]);
  });
});
