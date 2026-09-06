import { describe, expect, it } from 'vitest';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const DASH_SPEAR_ANIMATION = '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear02';

describe('MIR4 Lancer 5202 Blitz Strike presentation', () => {
  it('pins the exact DashSpear02 cooked asset and its native dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5202)).toEqual({
      skillId: 5202,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: DASH_SPEAR_ANIMATION,
        sha256: 'A0660ADFC16B760BB97414C2F4DEDDA84EA9371E95F9683A1003E12FF52C5DDA',
        sizeBytes: 44_955,
        numFrames: 37,
        sequenceLengthSeconds: 1.2,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: DASH_SPEAR_ANIMATION,
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: [
          '/Game/Effect/PC/Basic/P_Pct_Action01_02',
          '/Game/Effect/PC/Basic/P_Upturned01_03',
          '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_02',
          '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_Dashspear02_03',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_01',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Red'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_15_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
          '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explo_9_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_Small_3_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear02',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      },
    });
  });

  it('projects the post-rush turn as one native frontal spear strip', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5202);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 2, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 2,
      skillId: 5202,
      ability: 'mir4_skill_5202',
      profile: 'lancer-blitz-strike',
      durationMs: 1_200,
      endCutMs: 1_080,
      animationAssetPath: DASH_SPEAR_ANIMATION,
      vfxAssetPaths: [
        '/Game/Effect/PC/Basic/P_Pct_Action01_02',
        '/Game/Effect/PC/Basic/P_Upturned01_03',
        '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_DashSpear_02_02',
        '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_Dashspear02_03',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_01',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_15_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
        '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
        '/Game/Sound/Sound_Impact/Impact_Explo_9_Cue',
        '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
        '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_Sword_Small_3_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear02',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      contacts: [
        {
          attackId: 520202,
          offsetMs: 600,
          shape: 'direct',
          reachYards: 6.5,
          widthYards: 4,
          damageCoefficient: 28_000,
        },
      ],
    });
  });
});
