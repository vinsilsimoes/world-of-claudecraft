import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function guardianCircleEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3501);
  if (!plan) throw new Error('Missing Guardian Circle plan');
  const event = mir4NativeSkillPresentationEvent(11, 11, Math.PI / 4, plan);
  if (!event) throw new Error('Missing Guardian Circle presentation');
  return event;
}

describe('MIR4 Taoist 3501 Guardian Circle presentation', () => {
  it('pins the extracted MagicBarrier03 animation and corroborated dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3501)).toEqual({
      skillId: 3501,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MagicBarrier03',
        sha256: '59C0613E32A4CBA3E546EFA1DD8197EAC9C9254B188F502EB339D2587BA2C261',
        sizeBytes: 54_391,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MagicBarrier03',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/Common/System/Buff/P_Buff_CommonUp_01',
          '/Game/Effect/Common/System/Buff/P_Buff_Taegi',
        ],
        guideAssetPaths: [
          '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_atk27_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_batk2_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_Impact/Impact_Ground_4_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_10_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
          '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
        ],
        cameraCurveAssetPaths: ['/Game/Data/Curve/TargetCameraCurve/Target_01'],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03'],
      },
    });
  });

  it('projects setup, damage, and party barrier at their native timestamps', () => {
    const event = guardianCircleEvent();
    expect(event).toMatchObject({
      sourceId: 11,
      targetId: 11,
      sourceFacing: Math.PI / 4,
      skillId: 3501,
      ability: 'mir4_skill_3501',
      profile: 'taoist-guardian-circle',
      durationMs: 1_000,
      endCutMs: 950,
    });
    expect(event.projectiles).toBeUndefined();
    expect(event.contacts).toEqual([
      {
        attackId: 350101,
        offsetMs: 20,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 15,
        heightYards: 4,
        damageCoefficient: 0,
      },
      {
        attackId: 350102,
        offsetMs: 400,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 6_000,
      },
      {
        attackId: 350103,
        offsetMs: 550,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 15,
        heightYards: 4,
        damageCoefficient: 0,
      },
    ]);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3501')).toBe(true);
  });

  it('schedules the three source-centred cues without a hostile target pose', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 11) return false;
      Object.assign(out, { x: 3, y: 1, z: 5, facing: 0 });
      return true;
    };

    expect(painter.start(guardianCircleEvent())).toBe(true);
    painter.update(0.019, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    painter.update(0.38, pose);
    painter.update(0.15, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      350101, 350102, 350103,
    ]);
  });

  it('paints the party barrier as a layered cyan-blue protective circle', () => {
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
    const event = guardianCircleEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[2],
      {
        shape: 'circle',
        x: 3,
        y: 1,
        z: 5,
        radiusYards: 15,
        heightYards: 4,
        power: 1,
      },
      2,
    );

    expect(deps.decalXZ).toHaveBeenCalledWith(3, 5, 15, 0x3a9fd8, 'guardian-circle', 0.9);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 0.35, 5, 15, 0.9, 0x78dcff, 2.4, false);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 2.35, 5, 10.5, 0.9, 0xb8efff, 1.8, true);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.playImpactAudio).toHaveBeenCalledWith('magic', 1.05, 3, 1, 5);
  });
});
