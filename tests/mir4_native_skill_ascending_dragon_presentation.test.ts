import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function ascendingDragonEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5103);
  if (!plan) throw new Error('Missing Ascending Dragon runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
  if (!event) throw new Error('Missing Ascending Dragon presentation event');
  return event;
}

describe('MIR4 Ascending Dragon native presentation', () => {
  it('owns generic VFX and locks the target-facing cast through its end cut', () => {
    const event = ascendingDragonEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5103')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: 0, until: 11.8 });
  });

  it('plays the three six-yard circles four yards ahead at native times', () => {
    const event = ascendingDragonEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.579, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.38, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    painter.update(0.28, pose);
    expect(playContact.mock.calls.map((call) => [call[1].attackId, call[1].offsetMs])).toEqual([
      [510302, 580],
      [510303, 960],
      [510304, 1_240],
    ]);
    expect(playContact.mock.calls.map((call) => call[2])).toMatchObject([
      { shape: 'circle', x: 2, z: 7, radiusYards: 6, heightYards: 5 },
      { shape: 'circle', x: 2, z: 7, radiusYards: 6, heightYards: 5 },
      { shape: 'circle', x: 2, z: 7, radiusYards: 6, heightYards: 5 },
    ]);
  });

  it('renders the final contact as the brightest ascending spiral and impact crown', () => {
    const event = ascendingDragonEvent();
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
    if (contact?.shape !== 'circle') throw new Error('Missing Ascending Dragon finisher');
    const visual = {
      shape: 'circle' as const,
      x: 2,
      y: 1,
      z: 7,
      power: 1,
      radiusYards: 6,
      heightYards: 5,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 2);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xeafcff, 'vertical', 4.1);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xeafcff, 0.21, 0.62, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(2, 0.33, 7, 6, 0.58, 0xeafcff, 2.8, false);
    expect(deps.burstAt).toHaveBeenCalledWith(2, 3.4, 7, 0xeafcff, 38, 1.05, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.25, 2, 1, 7);
  });
});
