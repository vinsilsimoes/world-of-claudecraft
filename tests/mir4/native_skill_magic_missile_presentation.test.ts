import { describe, expect, it, vi } from 'vitest';
import {
  mir4NativeSkillContactVisual,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Frost Orb native presentation', () => {
  it('projects the reviewed homing launch and target impact timeline', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2111);
    expect(plan).not.toBeNull();
    if (!plan) return;

    expect(mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan)).toEqual({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 2111,
      ability: 'mir4_skill_2111',
      profile: 'sorcerer-frost-orb',
      durationMs: 1330,
      endCutMs: 1100,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_IceBall',
      vfxAssetPaths: [
        '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_001',
        '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_002',
        '/Game/Effect/PC/Pcm/ice_ball/ice_ball11/p_pcm_hanbing_003',
      ],
      soundAssetPaths: [
        '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill12_Cue',
        '/Game/Sound/Sound_DropnCloth/cloth13_Cue',
        '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
        '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
        '/Game/Sound/Sound_Skill/Skill_shot_ice_2_Cue',
        '/Game/Sound/Sound_Skill/Whoosh_Fire_6_Cue2',
      ],
      cameraCurveAssetPaths: [
        '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_FireBall11',
        '/Game/Data/Curve/TargetCameraCurve/Target_Base',
      ],
      cameraShakeAssetPaths: [
        '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_16',
      ],
      projectiles: [
        {
          attackId: 211101,
          launchOffsetMs: 574,
          movement: 'target-homing',
          speedYardsPerSecond: 40,
          lifetimeMs: 2000,
          sourceSocketName: 'head',
          effectId: 2040032,
          effectScale: 1,
        },
      ],
      contacts: [
        {
          attackId: 211102,
          offsetMs: 824,
          shape: 'target-circle',
          radiusYards: 4.5,
          heightYards: 4,
          damageCoefficient: 17_800,
        },
      ],
    });
  });

  it('anchors the impact footprint on the moving target rather than the caster', () => {
    const visual = mir4NativeSkillContactVisual(
      {
        attackId: 211102,
        offsetMs: 824,
        shape: 'target-circle',
        radiusYards: 4.5,
        heightYards: 4,
        damageCoefficient: 17_800,
      },
      17_800,
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
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2111')).toBe(
      true,
    );
  });

  it('releases at 574 ms and paints impact only at 824 ms', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2111);
    if (!plan) throw new Error('Missing Frost Orb plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    if (!event) throw new Error('Missing Frost Orb presentation');
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
    expect(playProjectile).not.toHaveBeenCalled();
    painter.update(0.573, pose);
    expect(playProjectile).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playProjectile).toHaveBeenCalledTimes(1);
    expect(playProjectile).toHaveBeenCalledWith(event, event.projectiles?.[0], 0);
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
    painter.update(0.506, pose);
    expect(painter.activeCount()).toBe(0);
  });
});
