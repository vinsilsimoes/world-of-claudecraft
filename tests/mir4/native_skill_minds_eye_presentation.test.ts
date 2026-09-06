import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function mindsEyeEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(4111);
  if (!plan) throw new Error("Missing Mind's Eye plan");
  const event = mir4NativeSkillPresentationEvent(41, 41, Math.PI / 3, plan);
  if (!event) throw new Error("Missing Mind's Eye presentation");
  return event;
}

describe("MIR4 Arbalist 4111 Mind's Eye presentation", () => {
  it('pins the extracted Skl11 animation and corroborated violet buff package', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4111)).toEqual({
      skillId: 4111,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl11',
        sha256: '04F449499CFB57AED48CF1E3435B2A21F4C0C4309FA764660E30EAD193FFE719',
        sizeBytes: 30_848,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl11',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: ['/Game/Effect/PC/Pca/Skl11/P_Pca_buff02'],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_violet1',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_batk_2_Cue',
          '/Game/Sound/Sound_Skill/Magic_02_Cue',
          '/Game/Sound/Sound_Skill/Rev_Whoosh_S_1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl11',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('projects one source-centred party pulse at the native buff timestamp', () => {
    expect(mindsEyeEvent()).toMatchObject({
      sourceId: 41,
      targetId: 41,
      sourceFacing: Math.PI / 3,
      skillId: 4111,
      ability: 'mir4_skill_4111',
      profile: 'arbalist-minds-eye',
      durationMs: 1_000,
      endCutMs: 850,
      contacts: [
        {
          attackId: 411101,
          offsetMs: 564,
          shape: 'circle',
          centerOffsetYards: 0,
          radiusYards: 15,
          heightYards: 4,
          damageCoefficient: 0,
        },
      ],
    });
    expect(mindsEyeEvent().projectiles).toBeUndefined();
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_4111')).toBe(true);
  });

  it('schedules the pulse only when the 564 ms notify is crossed', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 3, y: 1, z: 5, facing: 0 });
      return true;
    };
    expect(painter.start(mindsEyeEvent())).toBe(true);
    painter.update(0.563, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
  });

  it('paints a violet-gold awareness pulse around the party', () => {
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
    const event = mindsEyeEvent();
    playMir4NativeSkillContact(
      deps,
      event,
      event.contacts[0],
      { shape: 'circle', x: 3, y: 1, z: 5, radiusYards: 15, heightYards: 4, power: 1 },
      0,
    );
    expect(deps.decalXZ).toHaveBeenCalledWith(3, 5, 15, 0x6d4cc7, 'minds-eye', 0.8);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 0.35, 5, 15, 0.8, 0xb795ff, 2.2, false);
    expect(deps.ringAt).toHaveBeenCalledWith(3, 2.35, 5, 10.5, 0.8, 0xf2cf72, 1.6, true);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.playImpactAudio).toHaveBeenCalledWith('magic', 0.96, 3, 1, 5);
  });
});
