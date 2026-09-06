import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillContactVisual } from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeUltimatePresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';

function lightRayEvent() {
  const event = mir4NativeUltimatePresentationEvent(7, 9, 0, 3);
  if (!event) throw new Error('missing Light Ray presentation event');
  return event;
}

describe('MIR4 Taoist Light Ray painter', () => {
  it('accepts the exact native contract and paints all seven contacts on their frontal path', () => {
    const event = lightRayEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);

    expect(painter.start(event)).toBe(true);
    painter.update(2.8, (_entityId, out) => {
      Object.assign(out, { x: 0, y: 1, z: 0, facing: 0 });
      return true;
    });

    expect(playContact).toHaveBeenCalledTimes(7);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      330303, 330303, 330305, 330305, 330306, 330309, 330310,
    ]);
    expect(playContact.mock.calls[0][2]).toMatchObject({
      shape: 'direct',
      x: 0,
      y: 1,
      z: 6.5,
    });
    expect(playContact.mock.calls[6][2]).toMatchObject({
      shape: 'direct',
      x: 0,
      y: 1,
      z: 8,
    });
  });

  it('renders the finishing ray as a long gold ribbon, slash, impact ring, burst, and sound', () => {
    const event = lightRayEvent();
    const contact = event.contacts[6];
    if (contact.shape !== 'direct') throw new Error('Light Ray final contact must be direct');
    const visual = mir4NativeSkillContactVisual(contact, event.contacts[0].damageCoefficient, {
      x: 0,
      y: 1,
      z: 0,
      facing: 0,
    });
    if (visual.shape !== 'direct') throw new Error('Light Ray final visual must be direct');
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

    playMir4NativeSkillContact(deps, event, contact, visual, 6);

    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xf7f0a2, 'vertical', visual.slashScale);
    expect(deps.ringAt).toHaveBeenCalledWith(0, 0.37, 16, 2.1, 0.55, 0xf7f0a2, 2.4, false);
    expect(deps.burstAt).toHaveBeenCalledWith(0, 2.1, 16, 0xf7f0a2, 30, 2.4, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('holy', 1.1, 0, 1, 16);
  });
});
