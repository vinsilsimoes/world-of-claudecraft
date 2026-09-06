import { describe, expect, it } from 'vitest';
import {
  mir4NativeSkillPresentationEvent,
  mir4NativeUltimatePresentationEvent,
} from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 native skill presentation event', () => {
  it('projects Berserk as its exact two-pulse self-centred timeline', () => {
    const plan = mir4RuntimeSkillExecutionPlan(1101);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, -Math.PI / 5, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: -Math.PI / 5,
      skillId: 1101,
      ability: 'mir4_skill_1101',
      profile: 'warrior-overdrive',
      durationMs: 1367,
      endCutMs: 1220,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcw/P_pcw_OverDrive_001',
        '/Game/Effect/PC/Pcw/P_Pcw_Counter_Atk_01',
        '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/PcmJ_Voice/PcmJ_Attack_Rev_03_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Equip_1_Cue',
        '/Game/Sound/Sound_Impact/Impact_01_Cue',
        '/Game/Sound/Sound_Skill/Fly_Whoosh_3_Cue',
        '/Game/Sound/Sound_Skill/Magic_02_Cue',
        '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
        '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
        '/Game/Sound/Sound_Skill/Whoosh_Ice_1_Cue',
        '/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_OverDriver',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_12',
      ],
      contacts: [
        {
          attackId: 110100,
          offsetMs: 20,
          shape: 'circle',
          centerOffsetYards: 0,
          radiusYards: 5,
          heightYards: 4,
          damageCoefficient: 8000,
        },
        {
          attackId: 110101,
          offsetMs: 650,
          shape: 'circle',
          centerOffsetYards: 0,
          radiusYards: 5,
          heightYards: 4,
          damageCoefficient: 8000,
        },
      ],
    });
  });

  it('projects Air Slash as one exact three-contact native timeline', () => {
    const plan = mir4RuntimeSkillExecutionPlan(1102);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 1102,
      ability: 'mir4_skill_1102',
      profile: 'warrior-air-slash',
      durationMs: 1500,
      endCutMs: 1300,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_002',
        '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_003',
        '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_Atk_01',
      ],
      soundAssetPaths: ['/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue'],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_Banwol02',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake',
      ],
      contacts: [
        {
          attackId: 110202,
          offsetMs: 520,
          shape: 'direct',
          reachYards: 4.5,
          widthYards: 5,
          damageCoefficient: 8000,
        },
        {
          attackId: 110203,
          offsetMs: 699,
          shape: 'direct',
          reachYards: 6.5,
          widthYards: 5,
          damageCoefficient: 8000,
        },
        {
          attackId: 110204,
          offsetMs: 900,
          shape: 'direct',
          reachYards: 8.5,
          widthYards: 5,
          damageCoefficient: 9000,
        },
      ],
    });
  });

  it('projects Iron Shackle as its exact three-circle native timeline', () => {
    const plan = mir4RuntimeSkillExecutionPlan(1201);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 4, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 4,
      skillId: 1201,
      ability: 'mir4_skill_1201',
      profile: 'warrior-iron-shackle',
      durationMs: 2833,
      endCutMs: 2300,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_01',
        '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_02',
        '/Game/Effect/PC/Pcw/P_Pcw_IronChain_Atk_01',
      ],
      soundAssetPaths: ['/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue'],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_IronChain01',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
      ],
      contacts: [
        {
          attackId: 120101,
          offsetMs: 500,
          shape: 'circle',
          centerOffsetYards: 7,
          radiusYards: 11,
          heightYards: 4,
          damageCoefficient: 7000,
        },
        {
          attackId: 120102,
          offsetMs: 850,
          shape: 'circle',
          centerOffsetYards: 7,
          radiusYards: 11,
          heightYards: 4,
          damageCoefficient: 7000,
        },
        {
          attackId: 120103,
          offsetMs: 1500,
          shape: 'circle',
          centerOffsetYards: 3,
          radiusYards: 7,
          heightYards: 4,
          damageCoefficient: 8000,
        },
      ],
    });
  });

  it('projects Dragon Flame as its exact four-contact native ultimate timeline', () => {
    const event = mir4NativeUltimatePresentationEvent(7, 9, Math.PI / 6, 1);
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 6,
      skillId: 1403,
      ability: 'mir4_ultimate_1',
      profile: 'warrior-dragon-flame',
      durationMs: 3433,
      endCutMs: 2950,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Special',
      contacts: [
        {
          attackId: 140302,
          offsetMs: 780,
          shape: 'circle',
          centerOffsetYards: 5,
          radiusYards: 7,
          heightYards: 4,
          damageCoefficient: 15_000,
        },
        {
          attackId: 140303,
          offsetMs: 1500,
          shape: 'circle',
          centerOffsetYards: 5,
          radiusYards: 7,
          heightYards: 4,
          damageCoefficient: 15_500,
        },
        {
          attackId: 140303,
          offsetMs: 1720,
          shape: 'circle',
          centerOffsetYards: 5,
          radiusYards: 7,
          heightYards: 4,
          damageCoefficient: 15_500,
        },
        {
          attackId: 140304,
          offsetMs: 2560,
          shape: 'circle',
          centerOffsetYards: 5,
          radiusYards: 7,
          heightYards: 4,
          damageCoefficient: 20_000,
        },
      ],
    });
    expect(event?.vfxAssetPaths).toEqual([
      '/Game/Animation/AnimationSequence/PC/Effect/EFT_Dragon01/EFT_Dragon01_FireSword01',
      '/Game/Blueprint/Projectile/SkeletalEffect/SkeletalEffect04',
      '/Game/Effect/PC/Basic/P_Pct_Action01_03',
      '/Game/Effect/PC/Pcw/Special/p_pc_Special_001',
      '/Game/Effect/PC/Pcw/Special/p_pc_Special_002',
      '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
      '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
      '/Game/Effect/Common/System/Debuff/P_Buff_Fire_Bleeding_01',
    ]);
  });

  it('projects Chain Lightning through the acquired target sequence', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2303);
    expect(plan).not.toBeNull();
    if (!plan) return;

    const event = mir4NativeSkillPresentationEvent(
      7,
      9,
      Math.PI / 3,
      plan,
      undefined,
      [9, 11, 13],
    );
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      skillId: 2303,
      ability: 'mir4_skill_2303',
      profile: 'sorcerer-chain-lightning',
      durationMs: 2100,
      endCutMs: 1890,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ChainLightning',
      contacts: [
        {
          attackId: 230301,
          offsetMs: 979,
          shape: 'chain',
          fromEntityId: 7,
          toEntityId: 9,
          jumpRadiusYards: 11,
          heightYards: 8,
          damageCoefficient: 35_200,
        },
        {
          attackId: 230301,
          offsetMs: 1110,
          shape: 'chain',
          fromEntityId: 9,
          toEntityId: 11,
          damageCoefficient: 33_000,
        },
        {
          attackId: 230301,
          offsetMs: 1250,
          shape: 'chain',
          fromEntityId: 11,
          toEntityId: 13,
          damageCoefficient: 30_800,
        },
      ],
    });
    expect(event?.vfxAssetPaths).toEqual([
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_001',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_002',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_003',
      '/Game/Effect/PC/Pcm/ChainLightning/P_pcm_ChainLightning_004',
      '/Game/Effect/PC/Pcm/P_PCM_BeamTrail_thunder',
    ]);
  });
});
