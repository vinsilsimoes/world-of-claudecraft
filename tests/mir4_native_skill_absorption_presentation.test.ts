import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function absorptionEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5304);
  if (!plan) throw new Error('Missing Absorption runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Absorption presentation event');
  return event;
}

describe('MIR4 Absorption native presentation', () => {
  it('owns generic VFX and holds the target-facing cast through the native end-cut', () => {
    const event = absorptionEvent();

    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5304')).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 10)).toEqual({ facing: Math.PI / 2, until: 11.1 });
  });

  it('releases the eight-yard target-centred drain only at 950 ms', () => {
    const event = absorptionEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(
        out,
        entityId === 9
          ? { x: 12, y: 1, z: 4, facing: Math.PI }
          : { x: 6, y: 1, z: 4, facing: Math.PI / 2 },
      );
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.949, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'target-circle',
      x: 12,
      y: 1,
      z: 4,
      radiusYards: 8,
      heightYards: 5,
    });
  });

  it('renders the red-violet target pulse and pulls its energy back to the Lancer', () => {
    const event = absorptionEvent();
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      decalXZ: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const contact = event.contacts[0];
    if (contact?.shape !== 'target-circle') throw new Error('Missing Absorption target circle');
    const visual = {
      shape: 'target-circle' as const,
      x: 12,
      y: 1,
      z: 4,
      power: 1,
      radiusYards: 8,
      heightYards: 5,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 0);

    expect(deps.decalXZ).toHaveBeenCalledWith(12, 4, 8, 0x8e4de8, 'absorption', 0.65);
    expect(deps.ringAt).toHaveBeenCalledTimes(2);
    expect(deps.beamRibbon).toHaveBeenCalledWith(9, 7, 0xff3f68, 0.16, 0.55);
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0x8e4de8, true);
    expect(deps.burstAt).toHaveBeenCalledWith(12, 1.8, 4, 0xff3f68, 32, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('shadow', 1.15, 12, 1, 4);
  });
});
