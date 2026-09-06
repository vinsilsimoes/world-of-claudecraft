import { describe, expect, it } from 'vitest';
import { mir4NativeSkillActionById, mir4SkillById } from '../../src/sim/content/mir4';
import {
  mir4NativeMagicShieldBuffMatchesRow,
  mir4NativeRuntimeMagicShieldPolicy,
} from '../../src/sim/mir4/native_skill_magic_shield';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { compileMir4SkillExecutionPlan } from '../../src/sim/mir4/skill_execution_plan';

describe('MIR4 Magic Shield native contract', () => {
  it('compiles the exact rank-scaled base shield at ranks 1, 10 and 15', () => {
    expect(mir4NativeRuntimeMagicShieldPolicy(1)).toEqual({
      skillId: 2503,
      skillLevel: 1,
      sourceAttackId: 250301,
      applyAtMs: 450,
      buffId: 24012,
      durationMs: 25_000,
      damageReductionBasisPoints: 2_400,
      absorptionLimit: 2_000,
      hitLimit: 20,
      bashDamageReductionBasisPoints: 1_500,
    });
    expect(mir4NativeRuntimeMagicShieldPolicy(10)).toMatchObject({
      skillLevel: 10,
      damageReductionBasisPoints: 6_000,
      absorptionLimit: 65_000,
      bashDamageReductionBasisPoints: 4_200,
    });
    expect(mir4NativeRuntimeMagicShieldPolicy(15)).toMatchObject({
      skillLevel: 15,
      damageReductionBasisPoints: 8_000,
      absorptionLimit: 100_000,
      bashDamageReductionBasisPoints: 5_700,
    });
  });

  it('admits BUFF 24012 only on the exact first contact row', () => {
    const action = mir4NativeSkillActionById(2503);
    expect(action?.rows.map(mir4NativeMagicShieldBuffMatchesRow)).toEqual([true, false, false]);
  });

  it('compiles all three expanding damage contacts without a target', () => {
    const action = mir4NativeSkillActionById(2503);
    const skill = mir4SkillById(2503);
    if (!action || !skill) throw new Error('Missing Magic Shield source data');
    const result = compileMir4SkillExecutionPlan({ source: 'runtime-approved', action, skill });
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.ok).toBe(true);
    expect(result.plan.requiresTarget).toBe(false);
    expect(
      result.plan.rows.map((row) => [
        row.attackId,
        row.target.impactType,
        row.geometry.nativeDistanceMax,
        row.target.authorialTargetValue,
        row.contacts.map((contact) => contact.offsetMs),
      ]),
    ).toEqual([
      [250301, 2, 450, 8, [450]],
      [250302, 2, 550, 8, [850]],
      [250303, 2, 650, 8, [1050]],
    ]);
  });

  it('pins the exact extracted animation and its bound presentation assets', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2503)).toEqual({
      skillId: 2503,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield',
        sha256: '5B0D50BD0DDF8D355E4EB55C035645B9896F1C5552A0DB029429028B45944E73',
        sizeBytes: 34_675,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_ManaShield',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_01',
          '/Game/Effect/PC/Pcm/ManaShield/P_Pcm_ManaShield01_04',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk2_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_1_Cue',
          '/Game/Sound/Sound_Skill/Ice_Freeze_3_Cue',
          '/Game/Sound/Sound_Skill/Magic_01_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_ManaShield',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [],
      },
    });
  });
});
