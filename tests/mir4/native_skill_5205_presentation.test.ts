import { describe, expect, it } from 'vitest';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Lancer 5205 Piercing Spear presentation', () => {
  it('projects the exact CircleMoon05 timeline and keeps the bonus hit in the far band', () => {
    const plan = mir4RuntimeSkillExecutionPlan(5205);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 5205,
      ability: 'mir4_skill_5205',
      profile: 'lancer-piercing-spear',
      durationMs: 1_440,
      endCutMs: 1_400,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_CircleMoon05',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_03_03',
        '/Game/Effect/PC/Pcz/CircleMoon/Pcz_Btl_Skl_CircleMoon_05_03',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_01',
        '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_CircleMoon05_02',
        '/Game/Effect/Hit/PC_Pcz/PC_Pcz_atk_01',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_breath2_Cue',
        '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_22_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Grab_1_Cue',
        '/Game/Sound/Sound_DropnCloth/Drop_dwn_04_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
        '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
        '/Game/Sound/Sound_Weapon/Weapon_Sword_Small_3_Cue',
        '/Game/Sound/Sound_Weapon/weapon_whoosh_4_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_CircleMoon03',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16'],
      contacts: [
        {
          attackId: 520502,
          offsetMs: 380,
          shape: 'direct',
          reachYards: 20,
          widthYards: 4,
          damageCoefficient: 21_000,
        },
        {
          attackId: 520503,
          offsetMs: 400,
          shape: 'direct',
          minReachYards: 15,
          reachYards: 20,
          widthYards: 4,
          damageCoefficient: 21_000,
        },
      ],
    });
  });
});
