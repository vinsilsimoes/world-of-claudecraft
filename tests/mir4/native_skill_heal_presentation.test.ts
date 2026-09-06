import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function healEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3503);
  if (!plan) throw new Error('Missing Heal plan');
  const event = mir4NativeSkillPresentationEvent(7, 7, Math.PI / 3, plan);
  if (!event) throw new Error('Missing Heal presentation');
  return event;
}

describe('MIR4 Taoist 3503 Heal presentation', () => {
  it('pins the extracted Taoist animation and all corroborated dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3503)).toEqual({
      skillId: 3503,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal',
        sha256: '8853E657C5241759FC883E1E320E99889B57F359FB62137B02131DC63EA1887C',
        sizeBytes: 43_506,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_hand_01',
          '/Game/Effect/PC/Pct/Heal/P_PCT_Heal_outer_001',
          '/Game/Effect/Common/Projectile/Pc_Pct/P_Pct_Heal_Hit_01',
          '/Game/Effect/Common/Projectile/P_pct_V_Skl_magicBarrier04_prj',
          '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
          '/Game/Effect/Common/System/Buff/P_Buff_HealHP_02_Loop',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMT_V_Orange2'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_skill_1_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_Step_2_Cue',
          '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
          '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Heal',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('projects the three source-centred support cues at their native timestamps', () => {
    const event = healEvent();
    expect(event).toMatchObject({
      sourceId: 7,
      targetId: 7,
      sourceFacing: Math.PI / 3,
      skillId: 3503,
      ability: 'mir4_skill_3503',
      profile: 'taoist-heal',
      durationMs: 1_400,
      endCutMs: 1_350,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Heal',
    });
    expect(event.projectiles).toBeUndefined();
    expect(event.contacts).toEqual(
      [
        [350301, 20],
        [350302, 590],
        [350303, 840],
      ].map(([attackId, offsetMs]) => ({
        attackId,
        offsetMs,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 30,
        heightYards: 4,
        damageCoefficient: 0,
      })),
    );
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3503')).toBe(true);
  });

  it('schedules all three cues without requiring a hostile target pose', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 7) return false;
      Object.assign(out, { x: 3, y: 1, z: 5, facing: 0 });
      return true;
    };

    expect(painter.start(healEvent())).toBe(true);
    painter.update(0.019, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    painter.update(0.57, pose);
    painter.update(0.25, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      350301, 350302, 350303,
    ]);
  });

  it('paints the party release as a gold-green restorative wave', () => {
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
    const event = healEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[1],
      {
        shape: 'circle',
        x: 3,
        y: 1,
        z: 5,
        radiusYards: 30,
        heightYards: 4,
        power: 1,
      },
      1,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(3, 0.35, 5, 8, 0.72, 0xdfff76, 2.5, false);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.burstAt).toHaveBeenCalledWith(3, 2.2, 5, 0xdfff76, 30, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('holy', 1.05, 3, 1, 5);
  });
});
