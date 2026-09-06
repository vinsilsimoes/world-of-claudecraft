import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function greaterHealEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3504);
  if (!plan) throw new Error('Missing Greater Heal plan');
  const event = mir4NativeSkillPresentationEvent(27, 27, Math.PI / 4, plan);
  if (!event) throw new Error('Missing Greater Heal presentation');
  return event;
}

describe('MIR4 Taoist 3504 Greater Heal presentation', () => {
  it('pins the extracted Grand Heal animation and corroborated dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3504)).toEqual({
      skillId: 3504,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal',
        sha256: '86191D291CC5B8792B63C533CE891727046A52BF160E4C01571AFA5A55A0926B',
        sizeBytes: 50_097,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Cast_01_A',
          '/Game/Effect/PC/Pct/GrandHeal/P_Pct_GrandHeal_Shot_01_A',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMT_V_Orange2'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_breath6_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_22_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
          '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
          '/Game/Sound/Sound_Weapon/Stick_Swing_6_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_MagicBarrier01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
          '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03',
        ],
      },
    });
  });

  it('projects all four source-centred support cues at native timestamps', () => {
    const event = greaterHealEvent();
    expect(event).toMatchObject({
      sourceId: 27,
      targetId: 27,
      sourceFacing: Math.PI / 4,
      skillId: 3504,
      ability: 'mir4_skill_3504',
      profile: 'taoist-greater-heal',
      durationMs: 1_640,
      endCutMs: 1_500,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_GrandHeal',
    });
    expect(event.projectiles).toBeUndefined();
    expect(event.contacts).toEqual(
      [
        [350401, 20],
        [350402, 740],
        [350403, 900],
        [350404, 1_050],
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
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3504')).toBe(true);
  });

  it('schedules all four cues without a hostile target pose', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 27) return false;
      Object.assign(out, { x: 4, y: 2, z: 6, facing: 0 });
      return true;
    };

    expect(painter.start(greaterHealEvent())).toBe(true);
    painter.update(0.019, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    painter.update(0.72, pose);
    painter.update(0.16, pose);
    painter.update(0.15, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      350401, 350402, 350403, 350404,
    ]);
  });

  it('paints the healing release as a bright restorative bloom', () => {
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
    const event = greaterHealEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[1],
      {
        shape: 'circle',
        x: 4,
        y: 2,
        z: 6,
        radiusYards: 30,
        heightYards: 4,
        power: 1,
      },
      1,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.35, 6, 12, 0.92, 0xf4ffad, 3, false);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 3.5, 6, 0xf4ffad, 42, 1.25, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('holy', 1.2, 4, 2, 6);
  });
});
