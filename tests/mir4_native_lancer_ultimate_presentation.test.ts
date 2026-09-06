import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillContactVisual } from '../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeUltimatePresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';

function dragonSpearEvent() {
  const event = mir4NativeUltimatePresentationEvent(7, 9, Math.PI / 2, 5);
  if (!event) throw new Error('missing Dragon Spear presentation event');
  return event;
}

describe('MIR4 Lancer Dragon Spear painter', () => {
  it('accepts the exact native event and schedules its sole frontal impact', () => {
    const event = dragonSpearEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);

    expect(painter.start(event)).toBe(true);
    painter.update(1.319, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 7, facing: Math.PI / 2 });
      return true;
    });
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 7, facing: Math.PI / 2 });
      return true;
    });

    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[1]).toMatchObject({
      shape: 'direct',
      reachYards: 17,
      widthYards: 4.5,
    });
    const visual = playContact.mock.calls[0]?.[2];
    expect(visual?.shape).toBe('direct');
    expect(visual?.x).toBeCloseTo(11.5, 8);
    expect(visual?.y).toBe(1);
    expect(visual?.z).toBeCloseTo(7, 8);
  });

  it('renders the hybrid finishing thrust as a long red spear path and explosive impact', () => {
    const event = dragonSpearEvent();
    const contact = event.contacts[0];
    if (contact?.shape !== 'direct') throw new Error('Dragon Spear contact must be direct');
    const visual = mir4NativeSkillContactVisual(contact, contact.damageCoefficient, {
      x: 0,
      y: 1,
      z: 0,
      facing: 0,
    });
    if (visual.shape !== 'direct') throw new Error('Dragon Spear visual must be direct');
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

    playMir4NativeSkillContact(deps, event, contact, visual, 0);

    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xff4655, 'thrust', 5.2);
    expect(deps.ringAt).toHaveBeenCalledWith(0, 0.33, 8.5, 5.4, 0.72, 0xffc06a, 3.4, false);
    expect(deps.burstAt).toHaveBeenCalledWith(0, 1.75, 8.5, 0xffc06a, 58, 1.45, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.35, 0, 1, 8.5);
  });

  it('fails closed if the native strip dimensions drift', () => {
    const event = dragonSpearEvent();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact: vi.fn() }, 1);
    const contact = event.contacts[0];
    if (contact?.shape !== 'direct') throw new Error('Dragon Spear contact must be direct');
    expect(
      painter.start({
        ...event,
        contacts: [{ ...contact, widthYards: 4.6 }],
      }),
    ).toBe(false);
  });
});
