import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import {
  mir4NativeSkillPresentationOwnsAbilityVfx,
  mir4NativeSkillSourceSocketHeightFraction,
} from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Seeking Bolt native presentation', () => {
  it('pins the inspected Skl10 animation and its cooked dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4110)).toEqual({
      skillId: 4110,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl10',
        sha256: 'A602DFAE85E437DDCDC0FAFF4F8579DE08A2A5D5388D58D476FA30B1C143C3D9',
        sizeBytes: 55_864,
        numFrames: 58,
        sequenceLengthSeconds: 1.9,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl10',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_03',
          '/Game/Effect/PC/Pca/Skl10/P_Pca_Skl09_04',
          '/Game/Effect/PC/Pca/Skl10/P_PCA_Skl13',
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_batk_10_Cue',
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_3_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/skill_rev_fire_3_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_Bow_1_Cue',
          '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl10',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17'],
      },
    });
  });

  it('emits the native release and target impact timeline without generic ability VFX', () => {
    expect(mir4RuntimeSkillExecutionAuthority(4110)?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(4110);
    if (!plan) throw new Error('Missing Seeking Bolt plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan);

    expect(event).toMatchObject({
      skillId: 4110,
      ability: 'mir4_skill_4110',
      profile: 'arbalist-seeking-bolt',
      durationMs: 1_900,
      endCutMs: 1_710,
      projectiles: [
        {
          attackId: 411001,
          launchOffsetMs: 1_000,
          movement: 'target-homing',
          speedYardsPerSecond: 48,
          lifetimeMs: 2_000,
          sourceSocketName: 'Hand_R',
          effectId: 2_040_070,
          effectScale: 1,
        },
      ],
      contacts: [
        {
          attackId: 411002,
          offsetMs: 1_250,
          shape: 'target-circle',
          radiusYards: 0,
          heightYards: 8,
          damageCoefficient: 42_000,
        },
      ],
    });
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_4110')).toBe(true);
    expect(mir4NativeSkillSourceSocketHeightFraction('Hand_R')).toBe(0.62);
  });

  it('schedules one homing bolt followed by one target impact', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4110);
    if (!plan) throw new Error('Missing Seeking Bolt plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan);
    if (!event) throw new Error('Missing Seeking Bolt presentation event');

    const playProjectile = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playProjectile, playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0.75 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.999, pose);
    expect(playProjectile).not.toHaveBeenCalled();
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playProjectile).toHaveBeenCalledOnce();
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.25, pose);
    expect(playContact).toHaveBeenCalledOnce();
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'target-circle',
      x: 2,
      y: 1,
      z: 3,
    });
  });

  it('paints a compact physical impact instead of the generic white beam', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4110);
    if (!plan) throw new Error('Missing Seeking Bolt plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan);
    const contact = event?.contacts[0];
    if (!event || !contact || contact.shape !== 'target-circle') {
      throw new Error('Missing Seeking Bolt target contact');
    }
    const ringAt = vi.fn();
    const impactRing = vi.fn();
    const burstAt = vi.fn();
    const playImpactAudio = vi.fn();

    playMir4NativeSkillContact(
      {
        slashStyled: vi.fn(),
        burstAt,
        ringAt,
        pathRibbon: vi.fn(),
        beamRibbon: vi.fn(),
        impactRing,
        groundYAt: () => 0,
        playImpactAudio,
      },
      event,
      contact,
      {
        shape: 'target-circle',
        x: 10,
        y: 1,
        z: 12,
        power: 1,
        radiusYards: 0,
        heightYards: 8,
      },
      0,
    );

    expect(ringAt.mock.calls.map((call) => call[3])).toEqual([1.8, 1.1]);
    expect(impactRing).toHaveBeenCalledWith(9, 0xfff1bd, true);
    expect(burstAt).toHaveBeenCalledWith(10, 1.65, 12, 0xfff1bd, 28, 1, 'sparks');
    expect(playImpactAudio).toHaveBeenCalledWith('physical', 1, 10, 1, 12);
  });
});
