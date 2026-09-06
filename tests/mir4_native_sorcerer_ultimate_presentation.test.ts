import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeUltimatePresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';

describe('MIR4 Dragon Tornado native presentation', () => {
  it('pins the cooked Sorcerer Tornado package and its bound dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2403)).toEqual({
      skillId: 2403,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
        sha256: 'C56B42431B3424ECDFA05B0D359877253CCE79E693D5022B2B646AFE57CA5958',
        sizeBytes: 43_174,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_002',
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_01',
          '/Game/Effect/PC/Pcm/Tornado/P_PCM_Tornado_Gr_02',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_blue2',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcm_Voice/pcm_skill9_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Throw_1_Cue',
          '/Game/Sound/Sound_Skill/Magic_02_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
          '/Game/Sound/Sound_Skill/shot_weapon1_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_Fire_10_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcm_Btl_Skl_Tornado',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_05'],
      },
    });
  });

  it('admits the exact event and plays all ten contacts at the fixed anchor', () => {
    const event = mir4NativeUltimatePresentationEvent(7, 9, Math.PI / 4, 2, { x: 8, y: 1, z: 13 });
    if (!event) throw new Error('missing Dragon Tornado presentation');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    expect(painter.start(event)).toBe(true);
    painter.update(1.85, (_entityId, out) => {
      Object.assign(out, { x: 0, y: 0, z: 0, facing: 0 });
      return true;
    });
    expect(playContact).toHaveBeenCalledTimes(10);
    expect(playContact.mock.calls.every((call) =>
      call[2].shape === 'fixed-circle' && call[2].x === 8 && call[2].y === 1 && call[2].z === 13
    )).toBe(true);
    expect(playContact.mock.calls.map((call) => call[1].offsetMs)).toEqual([
      555, 700, 800, 950, 1050, 1150, 1250, 1450, 1650, 1850,
    ]);
    painter.update(4.25, () => true);
    expect(painter.activeCount()).toBe(0);
  });

  it('fails closed when the fixed origin is absent', () => {
    expect(mir4NativeUltimatePresentationEvent(7, 9, 0, 2)).toBeNull();
  });
});
