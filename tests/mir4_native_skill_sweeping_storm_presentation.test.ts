import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function sweepingStormEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5401);
  if (!plan) throw new Error('Missing Sweeping Storm runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Sweeping Storm presentation event');
  return event;
}

describe('MIR4 Sweeping Storm native presentation', () => {
  it('owns generic VFX and holds facing for the protected spin window', () => {
    const event = sweepingStormEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5401')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 10.98 });
  });

  it('releases the six actor-centred contacts only at their extracted moments', () => {
    const event = sweepingStormEvent();
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
      [0.22, 2],
      [0.16, 3],
      [0.11, 4],
      [0.15, 5],
      [0.18, 6],
    ] as const) {
      painter.update(deltaSeconds, pose);
      expect(playContact).toHaveBeenCalledTimes(expectedCount);
    }
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'circle',
      x: 6,
      y: 1,
      z: 4,
      radiusYards: 12,
      heightYards: 5,
    });
    expect(playContact.mock.calls.slice(1).every((call) => call[2].radiusYards === 5.5)).toBe(true);
  });

  it('renders the opening shockwave and five accelerating orange-gold spear rotations', () => {
    const event = sweepingStormEvent();
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
      if (contact.shape !== 'circle') throw new Error('Missing Sweeping Storm circle');
      playMir4NativeSkillContact(
        deps,
        event,
        contact,
        {
          shape: 'circle',
          x: 6,
          y: 1,
          z: 4,
          power: contact.damageCoefficient / 4_000,
          radiusYards: contact.radiusYards,
          heightYards: contact.heightYards,
        },
        index,
      );
    });

    expect(deps.slashStyled).toHaveBeenCalledTimes(6);
    expect(deps.slashStyled.mock.calls.map((call) => call.slice(1))).toEqual([
      [0xffa64d, 'horizontal', 4.8],
      [0xffbd61, 'crescent', 3.05],
      [0xffcf78, 'horizontal', 3.2],
      [0xffbd61, 'crescent', 3.35],
      [0xffcf78, 'horizontal', 3.5],
      [0xfff0b2, 'crescent', 4.1],
    ]);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(6);
    expect(deps.ringAt).toHaveBeenCalledTimes(6);
    expect(deps.burstAt).toHaveBeenLastCalledWith(6, 1.85, 4, 0xfff0b2, 42, 1.5, 'sparks');
    expect(deps.playImpactAudio.mock.calls.map((call) => call[1])).toEqual([
      1.05, 0.9, 0.96, 1.02, 1.08, 1.28,
    ]);
  });
});
