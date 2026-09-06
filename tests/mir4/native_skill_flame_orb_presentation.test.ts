import { describe, expect, it, vi } from 'vitest';
import {
  mir4NativeSkillContactVisual,
  mir4NativeSkillPresentationOwnsAbilityVfx,
  mir4NativeSkillSourceSocketHeightFraction,
} from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Flame Orb native presentation', () => {
  it('projects the reviewed left-hand launch and target impact timeline', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2101);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 2101,
      ability: 'mir4_skill_2101',
      profile: 'sorcerer-flame-orb',
      durationMs: 1267,
      endCutMs: 1100,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_FireBall',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_01',
        '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_02',
        '/Game/Effect/PC/Pcm/fire/FileBall01/P_pcm_fire_skl_01_03',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcm_Voice/pcm_atk14_rand_Cue',
        '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill6_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
        '/Game/Sound/Sound_DropnCloth/cra_cloth_03_Cue',
        '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
        '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall01',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake',
      ],
      projectiles: [
        {
          attackId: 210101,
          launchOffsetMs: 530,
          movement: 'target-homing',
          speedYardsPerSecond: 40,
          lifetimeMs: 2000,
          sourceSocketName: 'Hand_L',
          effectId: 2040003,
          effectScale: 1,
        },
      ],
      contacts: [
        {
          attackId: 210102,
          offsetMs: 780,
          shape: 'target-circle',
          radiusYards: 4.5,
          heightYards: 4,
          damageCoefficient: 18_700,
        },
      ],
    });
  });

  it('anchors the impact on the moving target and preserves the left-hand socket', () => {
    const visual = mir4NativeSkillContactVisual(
      {
        attackId: 210102,
        offsetMs: 780,
        shape: 'target-circle',
        radiusYards: 4.5,
        heightYards: 4,
        damageCoefficient: 18_700,
      },
      18_700,
      { x: 1, y: 2, z: 3, facing: 0 },
      { x: 10, y: 4, z: 20, facing: Math.PI },
    );

    expect(visual).toEqual({
      shape: 'target-circle',
      x: 10,
      y: 4,
      z: 20,
      radiusYards: 4.5,
      heightYards: 4,
      power: 1,
    });
    expect(mir4NativeSkillSourceSocketHeightFraction('Hand_L')).toBe(0.62);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2101')).toBe(true);
  });

  it('releases at 530 ms and paints impact only at 780 ms', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2101);
    if (!plan) throw new Error('Missing Flame Orb plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    if (!event) throw new Error('Missing Flame Orb presentation');
    const playProjectile = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter(
      { playProjectile, playContact },
      1,
    );
    const pose = (
      entityId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(
        out,
        entityId === 7
          ? { x: 1, y: 2, z: 3, facing: 0 }
          : { x: 10, y: 4, z: 20, facing: Math.PI },
      );
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.529, pose);
    expect(playProjectile).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playProjectile).toHaveBeenCalledTimes(1);
    painter.update(0.249, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0][2]).toMatchObject({
      shape: 'target-circle',
      x: 10,
      y: 4,
      z: 20,
    });
    painter.update(0.487, pose);
    expect(painter.activeCount()).toBe(0);
  });
});
