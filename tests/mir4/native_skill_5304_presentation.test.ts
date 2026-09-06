import { describe, expect, it } from 'vitest';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5304 Absorption presentation', () => {
  it('projects the exact TurnSpear04 asset timeline and target-centered drain area', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5304);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5304,
      ability: 'mir4_skill_5304',
      profile: 'lancer-absorption',
      durationMs: 1_260,
      endCutMs: 1_100,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_TurnSpear04',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_01',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_TurnSpear04_02',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_28_Cue',
        '/Game/Sound/Sound_Skill/Magic_02_Cue',
        '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
        '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
        '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_TurnSpear04',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      contacts: [
        {
          attackId: 530401,
          offsetMs: 950,
          shape: 'target-circle',
          radiusYards: 8,
          heightYards: 5,
          damageCoefficient: 11_000,
        },
      ],
    });
  });
});
