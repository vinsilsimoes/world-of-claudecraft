import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function blastingCharmEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3505);
  if (!plan) throw new Error('missing Blasting Charm plan');
  const event = mir4NativeSkillPresentationEvent(11, 22, Math.PI / 4, plan, {
    x: 7,
    y: 1,
    z: 9,
  });
  if (!event) throw new Error('missing Blasting Charm presentation');
  return event;
}

describe('MIR4 Taoist 3505 Blasting Charm presentation', () => {
  it('pins the extracted DarkBurst animation and corroborated dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3505)).toEqual({
      skillId: 3505,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_DarkBurst',
        sha256: '133FA71E54897CB3A806313913F5EE2F01AB8BBF3F269CF59901F88731F7D461',
        sizeBytes: 44_725,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_DarkBurst',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Cast_01',
          '/Game/Effect/PC/Pct/DarkBurst/P_Pct_DarkBurst_Shot_01',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Pink1'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_atk23_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_atk2_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth6_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_05_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Leather_01_Cue',
          '/Game/Sound/Sound_Hit/Hit_Kick_1_Cue',
          '/Game/Sound/Sound_Skill/Magic_01_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
          '/Game/Sound/Sound_Skill/Whoosh_Wind_1_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_DarkBurst',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('projects the native homing release and six-yard explosion timestamps', () => {
    const event = blastingCharmEvent();
    expect(event).toMatchObject({
      sourceId: 11,
      targetId: 22,
      sourceFacing: Math.PI / 4,
      skillId: 3505,
      ability: 'mir4_skill_3505',
      profile: 'taoist-blasting-charm',
      durationMs: 1_533,
      endCutMs: 1_350,
    });
    expect(event.projectiles).toEqual([
      {
        attackId: 350501,
        launchOffsetMs: 830,
        movement: 'target-homing',
        speedYardsPerSecond: 40,
        lifetimeMs: 2_000,
        sourceSocketName: 'Hand_L',
        effectId: 2_040_034,
        effectScale: 1,
      },
    ]);
    expect(event.contacts).toEqual([
      {
        attackId: 350502,
        offsetMs: 1_080,
        shape: 'target-circle',
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 24_000,
      },
    ]);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3505')).toBe(true);
  });

  it('schedules the projectile before the explosion contact', () => {
    const playProjectile = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter(
      { playProjectile, playContact },
      1,
    );
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 11 && entityId !== 22) return false;
      Object.assign(out, entityId === 11
        ? { x: 3, y: 1, z: 5, facing: 0 }
        : { x: 7, y: 1, z: 9, facing: 0 });
      return true;
    };

    expect(painter.start(blastingCharmEvent())).toBe(true);
    painter.update(0.829, pose);
    expect(playProjectile).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playProjectile).toHaveBeenCalledTimes(1);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.25, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
  });

  it('paints a distinct magenta talisman explosion around the target', () => {
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
    const event = blastingCharmEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[0],
      {
        shape: 'target-circle',
        x: 7,
        y: 1,
        z: 9,
        radiusYards: 6,
        heightYards: 4,
        power: 1,
      },
      0,
    );

    expect(deps.decalXZ).toHaveBeenCalledWith(7, 9, 6, 0x8d285f, 'blasting-charm', 0.72);
    expect(deps.ringAt).toHaveBeenCalledTimes(2);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.impactRing).toHaveBeenCalledWith(22, 0xf584c5, true);
    expect(deps.playImpactAudio).toHaveBeenCalledWith('shadow', 1.1, 7, 1, 9);
  });
});
