import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function magicShieldEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(2503);
  if (!plan) throw new Error('Missing Magic Shield plan');
  const event = mir4NativeSkillPresentationEvent(7, 7, Math.PI / 3, plan);
  if (!event) throw new Error('Missing Magic Shield presentation');
  return event;
}

describe('MIR4 Magic Shield native presentation', () => {
  it('projects the exact source-centred expanding waves and extracted assets', () => {
    const event = magicShieldEvent();

    expect(event).toMatchObject({
      sourceId: 7,
      targetId: 7,
      sourceFacing: Math.PI / 3,
      skillId: 2503,
      ability: 'mir4_skill_2503',
      profile: 'sorcerer-magic-shield',
      durationMs: 1_267,
      endCutMs: 1_010,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_01',
        '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_04',
      ],
    });
    expect(event.contacts).toEqual([
      {
        attackId: 250301,
        offsetMs: 450,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 4.5,
        heightYards: 4,
        damageCoefficient: 3_000,
      },
      {
        attackId: 250302,
        offsetMs: 850,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 5.5,
        heightYards: 4,
        damageCoefficient: 4_000,
      },
      {
        attackId: 250303,
        offsetMs: 1_050,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 6.5,
        heightYards: 4,
        damageCoefficient: 4_000,
      },
    ]);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2503')).toBe(true);
  });

  it('plays all three waves at their native timestamps without resolving a target pose', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 7) return false;
      Object.assign(out, { x: 3, y: 1, z: 5, facing: 0 });
      return true;
    };

    expect(painter.start(magicShieldEvent())).toBe(true);
    painter.update(0.449, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    painter.update(0.4, pose);
    painter.update(0.2, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      250301, 250302, 250303,
    ]);
    expect(playContact.mock.calls.map((call) => call[2].radiusYards)).toEqual([4.5, 5.5, 6.5]);
  });

  it('paints the final wave as the strongest blue-white shield pulse', () => {
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
    const event = magicShieldEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[2],
      {
        shape: 'circle',
        x: 3,
        y: 1,
        z: 5,
        radiusYards: 6.5,
        heightYards: 4,
        power: 4 / 3,
      },
      2,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(3, 0.35, 5, 6.5, 0.7, 0xd8fbff, 2.5, false);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.burstAt).toHaveBeenCalledWith(3, 1, 5, 0xd8fbff, 28, 4 / 3, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('frost', 1.15, 3, 1, 5);
  });
});
