import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function taiChiEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(3201);
  if (!plan) throw new Error('Missing Tai Chi plan');
  const event = mir4NativeSkillPresentationEvent(11, 12, Math.PI / 4, plan);
  if (!event) throw new Error('Missing Tai Chi presentation');
  return event;
}

describe('MIR4 Taoist 3201 Tai Chi presentation', () => {
  it('pins the extracted Taegeuk animation and corroborated dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3201)).toEqual({
      skillId: 3201,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Taegeuk',
        sha256: 'C8462DC3941BFD27AC58F62F1F678C1F72CA73FCD69F850E04D7BBBCEBB5F955',
        sizeBytes: 71_673,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Taegeuk',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Atk_01',
          '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_01',
          '/Game/Effect/PC/Pct/Taegeuk/P_Pct_Taegeuk_Cast_02',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMT_V_gold_005'],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pct_Voice/pct_batk16_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/pct_skill_4_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Change_1_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue',
          '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
          '/Game/Sound/Sound_Skill/Magic_Ungi_2_Cue',
          '/Game/Sound/Sound_Skill/Rev_Whoosh_L_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_magic_7_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_13_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Taegeuk01',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('projects one source-centred cue per native row without duplicating hybrid channels', () => {
    const event = taiChiEvent();
    expect(event).toMatchObject({
      sourceId: 11,
      targetId: 12,
      sourceFacing: Math.PI / 4,
      skillId: 3201,
      ability: 'mir4_skill_3201',
      profile: 'taoist-tai-chi',
      durationMs: 2_067,
      endCutMs: 1_850,
    });
    expect(event.contacts).toEqual([
      [320101, 20, 15, 5_000],
      [320102, 490, 10, 5_000],
      [320103, 690, 10, 5_000],
      [320104, 850, 10, 5_000],
      [320105, 1_000, 10, 6_000],
      [320106, 1_340, 10, 6_000],
      [320107, 1_440, 10, 0],
    ].map(([attackId, offsetMs, radiusYards, damageCoefficient]) => ({
      attackId,
      offsetMs,
      shape: 'circle',
      centerOffsetYards: 0,
      radiusYards,
      heightYards: 4,
      damageCoefficient,
    })));
    expect(event.projectiles).toBeUndefined();
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_3201')).toBe(true);
  });

  it('schedules all seven alternating source pulses at the native timestamps', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 3, y: 1, z: 5, facing: 0 });
      return true;
    };
    expect(painter.start(taiChiEvent())).toBe(true);
    painter.update(1.44, pose);
    expect(playContact.mock.calls.map((call) => [call[1].attackId, call[1].offsetMs])).toEqual([
      [320101, 20], [320102, 490], [320103, 690], [320104, 850],
      [320105, 1_000], [320106, 1_340], [320107, 1_440],
    ]);
  });

  it('paints alternating gold and teal rotational waves with a distinct final recovery pulse', () => {
    const deps = {
      slashStyled: vi.fn(), burstAt: vi.fn(), ringAt: vi.fn(), decalXZ: vi.fn(),
      pathRibbon: vi.fn(), beamRibbon: vi.fn(), impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25), playImpactAudio: vi.fn(),
    };
    const event = taiChiEvent();
    playMir4NativeSkillContact(deps, event, event.contacts[0], {
      shape: 'circle', x: 3, y: 1, z: 5, radiusYards: 15, heightYards: 4, power: 1,
    }, 0);
    playMir4NativeSkillContact(deps, event, event.contacts[1], {
      shape: 'circle', x: 3, y: 1, z: 5, radiusYards: 10, heightYards: 4, power: 1,
    }, 1);
    playMir4NativeSkillContact(deps, event, event.contacts[6], {
      shape: 'circle', x: 3, y: 1, z: 5, radiusYards: 10, heightYards: 4, power: 0,
    }, 6);
    expect(deps.decalXZ).toHaveBeenCalledWith(3, 5, 10, 0xf1c45b, 'tai-chi', 0.82);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 0.35, 5, 10, 0.82, 0xf4d477, 2.4, false);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 1.75, 5, 6.5, 0.82, 0x73e0d1, 1.8, true);
    expect(deps.pathRibbon).toHaveBeenCalled();
    expect(deps.playImpactAudio).toHaveBeenLastCalledWith('holy', 1.05, 3, 1, 5);
  });
});
