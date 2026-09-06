import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function expulsionCircleEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3404);
  if (!plan) throw new Error('Missing Expulsion Circle plan');
  const event = mir4NativeSkillPresentationEvent(17, 17, Math.PI / 3, plan);
  if (!event) throw new Error('Missing Expulsion Circle presentation');
  return event;
}

describe('MIR4 Taoist 3404 Expulsion Circle presentation', () => {
  it('pins the extracted Resist animation and its direct dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3404)).toEqual({
      skillId: 3404,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Resist',
        sha256: 'D72B7608EBBF8D0763CB073BB134495B3DF2250AD832D7D6986B122E8C9E6272',
        sizeBytes: 40_857,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Resist',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_01',
          '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Cast_02',
          '/Game/Effect/PC/Pct/Resist/P_Pct_Resist_Shot_01',
        ],
        guideAssetPaths: [
          '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
          '/Game/Effect/curve/PC/CharMT_V_Blue_003',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_batk12_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_Skill/Magic_02_Cue',
          '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
          '/Game/Sound/Sound_Skill/Whoosh_Ice_1_Cue',
          '/Game/Sound/Sound_Weapon/Stick_Swing_8_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Resist',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [],
      },
    });
  });

  it('projects the one source-centred party pulse at 564 ms', () => {
    const event = expulsionCircleEvent();
    expect(event).toMatchObject({
      sourceId: 17,
      targetId: 17,
      sourceFacing: Math.PI / 3,
      skillId: 3404,
      ability: 'mir4_skill_3404',
      profile: 'taoist-expulsion-circle',
      durationMs: 1_000,
      endCutMs: 950,
    });
    expect(event.projectiles).toBeUndefined();
    expect(event.contacts).toEqual([
      {
        attackId: 340401,
        offsetMs: 564,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 15,
        heightYards: 4,
        damageCoefficient: 0,
      },
    ]);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3404')).toBe(true);
  });

  it('schedules and paints a blue-violet cleansing barrier pulse', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      if (entityId !== 17) return false;
      Object.assign(out, { x: 4, y: 1, z: 6, facing: 0 });
      return true;
    };
    const event = expulsionCircleEvent();
    expect(painter.start(event)).toBe(true);
    painter.update(0.563, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);

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
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[0],
      { shape: 'circle', x: 4, y: 1, z: 6, radiusYards: 15, heightYards: 4, power: 1 },
      0,
    );
    expect(deps.decalXZ).toHaveBeenCalledWith(4, 6, 15, 0x535bd6, 'expulsion-circle', 0.85);
    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.35, 6, 15, 0.85, 0x8798ff, 2.5, false);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.playImpactAudio).toHaveBeenCalledWith('magic', 1.02, 4, 1, 6);
  });
});
