import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function blitzStrikeEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5202);
  if (!plan) throw new Error('Missing Blitz Strike runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Blitz Strike presentation event');
  return event;
}

describe('MIR4 Blitz Strike native presentation', () => {
  it('owns generic VFX without locking the pre-rush facing over the return strike', () => {
    const event = blitzStrikeEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5202')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toBeNull();
  });

  it('releases once at 600 ms from the live post-rush pose and facing', () => {
    const event = blitzStrikeEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 8, y: 1, z: 4, facing: -Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.599, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[1]).toMatchObject({
      attackId: 520202,
      offsetMs: 600,
      shape: 'direct',
      reachYards: 6.5,
      widthYards: 4,
    });
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'direct',
      x: 4.75,
      y: 1,
      z: 4,
      slashScale: 4 / 2.3,
    });
  });

  it('renders the red upturned spear strike back toward the crossed target', () => {
    const event = blitzStrikeEvent();
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
    if (contact?.shape !== 'direct') throw new Error('Missing Blitz Strike contact');
    const visual = {
      shape: 'direct' as const,
      x: 4.75,
      y: 1,
      z: 4,
      power: 1,
      slashScale: 4 / 2.3,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 0);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xff5d62, 'vertical', 3.9);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xff5d62, 0.22, 0.52, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(4.75, 0.33, 4, 3.6, 0.58, 0xffc16a, 2.8, false);
    expect(deps.burstAt).toHaveBeenCalledWith(4.75, 1.55, 4, 0xffc16a, 38, 1.15, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.25, 4.75, 1, 4);
  });
});
