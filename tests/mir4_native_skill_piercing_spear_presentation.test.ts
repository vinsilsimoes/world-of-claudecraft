import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';

function piercingSpearEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(5205);
  if (!plan) throw new Error('Missing Piercing Spear runtime plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan);
  if (!event) throw new Error('Missing Piercing Spear presentation event');
  return event;
}

describe('MIR4 Piercing Spear native presentation', () => {
  it('releases the full lane at 380ms and the far-only bonus lane at 400ms', () => {
    const event = piercingSpearEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 4, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.379, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[1]).toMatchObject({
      attackId: 520502,
      offsetMs: 380,
      reachYards: 20,
    });
    painter.update(0.02, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    expect(playContact.mock.calls[1]?.[1]).toMatchObject({
      attackId: 520503,
      offsetMs: 400,
      minReachYards: 15,
      reachYards: 20,
    });
    expect(playContact.mock.calls[0]?.[2].x).toBeCloseTo(12);
    expect(playContact.mock.calls[0]?.[2].z).toBeCloseTo(4);
    expect(playContact.mock.calls[1]?.[2].x).toBeCloseTo(19.5);
    expect(playContact.mock.calls[1]?.[2].z).toBeCloseTo(4);
  });

  it('paints the second contact as a distinct crescent at the maximum-range band', () => {
    const event = piercingSpearEvent();
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
    if (contact?.shape !== 'direct') throw new Error('Missing far-band contact');
    const visual = {
      shape: 'direct' as const,
      x: 19.5,
      y: 1,
      z: 4,
      power: 1,
      slashScale: 4 / 2.3,
    };

    playMir4NativeSkillContact(deps, event, contact, visual, 1);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xf3efff, 'crescent', 4 / 2.3);
    expect(deps.pathRibbon).toHaveBeenCalledWith(0xf3efff, 0.18, 0.48, expect.any(Function));
    expect(deps.ringAt).toHaveBeenCalledWith(19.5, 0.33, 4, 2.5, 0.5, 0xf3efff, 2.4, false);
    expect(deps.burstAt).toHaveBeenCalledWith(19.5, 1.35, 4, 0xf3efff, 30, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.2, 19.5, 1, 4);
  });
});
