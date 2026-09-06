import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeUltimatePresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';

function arrowRainEvent() {
  const event = mir4NativeUltimatePresentationEvent(41, 99, Math.PI / 2, 4);
  if (!event) throw new Error('Missing Arrow Rain presentation');
  return event;
}

describe('MIR4 Arbalist 4113 Arrow Rain presentation', () => {
  it('pins the exact extracted Special animation and its native dependency graph', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4113)).toEqual({
      skillId: 4113,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special',
        sha256: 'AF3742AE759F10D943998A39AD5E8239708E074C18D02E6CA84E36738A43AB30',
        sizeBytes: 123_937,
        numFrames: 89,
        sequenceLengthSeconds: 2.9333334,
        notifyCount: 61,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_01',
          '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_02',
          '/Game/Effect/PC/Pca/specail/P_Pca_specail_shoot_01_03',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue5',
          '/Game/Effect/curve/PC/CharMT_Float06',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_skillname_Manchun_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explo_10_Cue',
          '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
          '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_Special_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Special',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17'],
      },
    });
  });

  it('emits the five actor-centred expanding sectors at the exact native timings', () => {
    const event = arrowRainEvent();
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 41,
      targetId: 99,
      sourceFacing: Math.PI / 2,
      skillId: 4113,
      ability: 'mir4_ultimate_4',
      profile: 'arbalist-arrow-rain',
      durationMs: 2_933,
      endCutMs: 2_560,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Special',
      contacts: [
        {
          attackId: 411302,
          offsetMs: 539,
          shape: 'sector',
          radiusYards: 21,
          angleDegrees: 55,
          heightYards: 4,
          damageCoefficient: 13_000,
        },
        {
          attackId: 411303,
          offsetMs: 913,
          shape: 'sector',
          radiusYards: 22,
          angleDegrees: 65,
          heightYards: 4,
          damageCoefficient: 13_000,
        },
        {
          attackId: 411304,
          offsetMs: 1_283,
          shape: 'sector',
          radiusYards: 23,
          angleDegrees: 80,
          heightYards: 4,
          damageCoefficient: 13_000,
        },
        {
          attackId: 411305,
          offsetMs: 1_644,
          shape: 'sector',
          radiusYards: 24,
          angleDegrees: 100,
          heightYards: 4,
          damageCoefficient: 13_000,
        },
        {
          attackId: 411306,
          offsetMs: 2_010,
          shape: 'sector',
          radiusYards: 25,
          angleDegrees: 120,
          heightYards: 4,
          damageCoefficient: 13_000,
        },
      ],
    });
    expect(event.projectiles).toBeUndefined();
    expect(event.persistentArea).toBeUndefined();
    expect(mir4NativeSkillPresentationOwnsAbilityVfx(event.ability)).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 5)).toEqual({
      facing: Math.PI / 2,
      until: 7.5600000000000005,
    });
  });

  it('anchors each wave to the current receding actor pose while retaining cast direction', () => {
    const event = arrowRainEvent();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    let x = 10;
    const entityPose = (
      entityId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      if (entityId !== 41) return false;
      Object.assign(out, { x, y: 2, z: 30, facing: Math.PI / 2 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.539, entityPose);
    x = 9;
    painter.update(0.374, entityPose);

    expect(playContact).toHaveBeenCalledTimes(2);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'sector',
      x: 10,
      y: 2,
      z: 30,
      facing: Math.PI / 2,
      radiusYards: 21,
      angleDegrees: 55,
    });
    expect(playContact.mock.calls[1]?.[2]).toMatchObject({
      shape: 'sector',
      x: 9,
      y: 2,
      z: 30,
      facing: Math.PI / 2,
      radiusYards: 22,
      angleDegrees: 65,
    });
  });

  it('fails closed when any expanding-sector field drifts', () => {
    const event = arrowRainEvent();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact: vi.fn() }, 1);
    expect(
      painter.start({
        ...event,
        contacts: event.contacts.map((contact, index) =>
          index === 2 && contact.shape === 'sector'
            ? { ...contact, angleDegrees: contact.angleDegrees + 1 }
            : contact,
        ),
      }),
    ).toBe(false);
  });

  it('paints a deterministic widening arrow barrage instead of a generic circle burst', () => {
    const event = arrowRainEvent();
    const contact = event.contacts[4];
    if (contact?.shape !== 'sector') throw new Error('Missing final Arrow Rain sector');
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      decalXZ: vi.fn(),
      pathRibbon: vi.fn(
        (
          _: number,
          __: number,
          ___: number,
          fill: (points: Array<{ set(x: number, y: number, z: number): unknown }>) => number,
        ) => {
          const points = Array.from({ length: 25 }, () => ({ set: vi.fn() }));
          fill(points);
        },
      ),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };

    playMir4NativeSkillContact(
      deps,
      event,
      contact,
      {
        shape: 'sector',
        x: 5,
        y: 2,
        z: 7,
        facing: Math.PI / 2,
        radiusYards: 25,
        angleDegrees: 120,
        heightYards: 4,
        power: 1,
      },
      4,
    );

    expect(deps.pathRibbon).toHaveBeenCalledTimes(8);
    expect(deps.burstAt).toHaveBeenCalledTimes(7);
    expect(deps.decalXZ).not.toHaveBeenCalled();
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.15, 5, 2, 7);
  });
});
