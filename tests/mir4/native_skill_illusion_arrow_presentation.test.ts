import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Illusion Arrow native presentation', () => {
  it('pins the inspected Pca Skl03 package and its authored dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4102)).toEqual({
      skillId: 4102,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl03',
        sha256: '523A6F496E147D2FABD6B06FCDC21297209306DA6C8F34391A5463634C890A15',
        sizeBytes: 49_329,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl03',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_01',
          '/Game/Effect/PC/Pca/skl_03/P_Pca_skl_03_02',
          '/Game/Effect/PC/Pca/skl_03/P_pca_skl03_explostion_start',
          '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
        ],
        guideAssetPaths: [
          '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_20_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_3_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth8_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_throw_1_Cue',
          '/Game/Sound/Sound_Hit/hit_effect/hit_arrow_1_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl03',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('presents all five actor-centred impact waves on the authored timeline', () => {
    expect(mir4RuntimeSkillExecutionAuthority(4102)?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(4102);
    if (!plan) throw new Error('Missing Illusion Arrow plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan);

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      skillId: 4102,
      ability: 'mir4_skill_4102',
      profile: 'arbalist-illusion-arrow',
      durationMs: 1_467,
      endCutMs: 1_320,
    });
    expect(event?.contacts).toEqual([
      { attackId: 410201, offsetMs: 20, shape: 'circle', centerOffsetYards: 0, radiusYards: 10, heightYards: 4, damageCoefficient: 4_000 },
      { attackId: 410202, offsetMs: 400, shape: 'circle', centerOffsetYards: 0, radiusYards: 10, heightYards: 4, damageCoefficient: 5_000 },
      { attackId: 410203, offsetMs: 600, shape: 'circle', centerOffsetYards: 0, radiusYards: 10, heightYards: 4, damageCoefficient: 5_000 },
      { attackId: 410204, offsetMs: 800, shape: 'circle', centerOffsetYards: 0, radiusYards: 10, heightYards: 4, damageCoefficient: 5_000 },
      { attackId: 410205, offsetMs: 1_000, shape: 'circle', centerOffsetYards: 0, radiusYards: 10, heightYards: 4, damageCoefficient: 5_000 },
    ]);

    if (!event) throw new Error('Missing Illusion Arrow event');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0.75 });
      return true;
    };
    expect(painter.start(event)).toBe(true);
    painter.update(1.05, pose);
    expect(playContact).toHaveBeenCalledTimes(5);
  });

  it('renders repeated illusion rings and distinguishes the final wave', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4102);
    if (!plan) throw new Error('Missing Illusion Arrow plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    const contact = event?.contacts[4];
    if (!event || !contact) throw new Error('Missing Illusion Arrow contact');
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
    const visual = {
      shape: 'circle',
      x: 4,
      y: 1.5,
      z: 8,
      radiusYards: 10,
      heightYards: 4,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, contact, visual, 4);

    expect(deps.decalXZ).toHaveBeenCalledWith(4, 8, 10, 0x7496ff, 'illusion-arrow', 0.42);
    expect(deps.ringAt).toHaveBeenCalledTimes(2);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 2.55, 8, 0xffe6a1, 30, 1.2, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.1, 4, 1.5, 8);
  });
});
