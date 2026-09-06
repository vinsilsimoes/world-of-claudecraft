import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function crescentBladeEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5101);
  if (!plan) throw new Error('Missing Crescent Blade runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Crescent Blade presentation event');
  return event;
}

describe('MIR4 Crescent Blade native presentation', () => {
  it('owns the generic ability VFX and locks the cast facing through the end cut', () => {
    const event = crescentBladeEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5101')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({
      facing: Math.PI / 2,
      until: 11.56,
    });
  });

  it('plays the two offset sectors at the recovered native timestamps', () => {
    const event = crescentBladeEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.399, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.72, pose);
    expect(playContact.mock.calls.map((call) => [call[1].attackId, call[1].offsetMs])).toEqual([
      [510101, 400],
      [510102, 1_120],
    ]);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'sector',
      x: 1,
      z: 4,
      facing: Math.PI / 2,
      radiusYards: 7,
      angleDegrees: 160,
    });
  });

  it('renders the cross-through finisher as the brighter crescent and impact wave', () => {
    const event = crescentBladeEvent();
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
    const contact = event.contacts[1];
    if (contact?.shape !== 'sector') throw new Error('Missing Crescent Blade finisher');
    const visual = {
      shape: 'sector' as const,
      x: 1,
      y: 1,
      z: 4,
      power: 6_000 / 13_000,
      facing: Math.PI / 2,
      radiusYards: 7,
      angleDegrees: 160,
      heightYards: 5,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 1);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xe5f8ff, 'crescent', 3.35);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xe5f8ff, 0.2, 0.54, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(1, 0.33, 4, 4.2, 0.5, 0xe5f8ff, 2.55, false);
    expect(deps.burstAt).toHaveBeenCalledWith(1, 1.48, 4, 0xe5f8ff, 34, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.2, 1, 1, 4);
  });
});
