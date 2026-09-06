import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function dragonTailEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5102);
  if (!plan) throw new Error('Missing Dragon Tail runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Dragon Tail presentation event');
  return event;
}

describe('MIR4 Dragon Tail native presentation', () => {
  it('owns the generic ability VFX and locks facing through the native end cut', () => {
    const event = dragonTailEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5102')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({
      facing: Math.PI / 2,
      until: 11.6,
    });
  });

  it('plays all three rear-offset sectors at the native contact times', () => {
    const event = dragonTailEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 8, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.399, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.39, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    painter.update(0.1, pose);
    expect(playContact.mock.calls.map((call) => [call[1].attackId, call[1].offsetMs])).toEqual([
      [510202, 400],
      [510203, 790],
      [510204, 890],
    ]);
    expect(playContact.mock.calls.map((call) => call[2])).toMatchObject([
      { shape: 'sector', x: 7, z: 4, radiusYards: 7, angleDegrees: 160 },
      { shape: 'sector', x: 7, z: 4, radiusYards: 7, angleDegrees: 160 },
      { shape: 'sector', x: 7, z: 4, radiusYards: 12, angleDegrees: 160 },
    ]);
  });

  it('renders the last contact as the wider pale-blue Dragon Tail wave', () => {
    const event = dragonTailEvent();
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
    const contact = event.contacts[2];
    if (contact?.shape !== 'sector') throw new Error('Missing Dragon Tail finisher');
    const visual = {
      shape: 'sector' as const,
      x: 7,
      y: 1,
      z: 4,
      power: 0.25,
      facing: Math.PI / 2,
      radiusYards: 12,
      angleDegrees: 160,
      heightYards: 5,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 2);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xe9faff, 'crescent', 4.8);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xe9faff, 0.24, 0.58, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(7, 0.33, 4, 7.2, 0.58, 0xe9faff, 2.8, false);
    expect(deps.burstAt).toHaveBeenCalledWith(7, 1.55, 4, 0xe9faff, 40, 1.05, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.25, 7, 1, 4);
  });
});
