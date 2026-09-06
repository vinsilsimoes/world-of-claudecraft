import { describe, expect, it, vi } from 'vitest';
import {
  playMir4NativePersistentSkillArea,
  playMir4NativeSkillContact,
} from '../../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import {
  mir4NativeSkillAssetPresentationEvidence,
  mir4NativeSkillSupplementalAnimationEvidence,
} from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

const CAST_ANCHOR = Object.freeze({ x: 12, y: 1.5, z: 18 });

function cloakingEvent() {
  const plan = mir4RuntimeSkillExecutionPlan(4112);
  if (!plan) throw new Error('Missing Cloaking plan');
  const event = mir4NativeSkillPresentationEvent(
    41,
    41,
    Math.PI / 3,
    plan,
    undefined,
    undefined,
    CAST_ANCHOR,
  );
  if (!event) throw new Error('Missing Cloaking presentation');
  return event;
}

describe('MIR4 Arbalist 4112 Cloaking presentation', () => {
  it('pins the exact extracted cast and recovery animation sources', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4112)).toEqual({
      skillId: 4112,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12',
        sha256: '5F73EFD0B59297A94398E90FFF52A452F2B63C1DC3B4F7F56488D6CCBFB445F6',
        sizeBytes: 26_765,
        numFrames: 19,
        sequenceLengthSeconds: 0.6,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: ['/Game/Effect/PC/Pca/Skl12/P_pca_Smoke'],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_0015',
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_Purple_02',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_breath_3_rand_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_small_1_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl12',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_17'],
      },
    });
    expect(mir4NativeSkillSupplementalAnimationEvidence(4112)).toEqual([
      {
        skillId: 4112,
        role: 'recovery',
        source: {
          kind: 'extracted-cooked-uasset',
          packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl12_1',
          sha256: 'C5DFE43D85DCB44B70F5CF10F956D190E4A0519C7EA36421853C7DE15E4F1F39',
          sizeBytes: 17_604,
          numFrames: null,
          sequenceLengthSeconds: 1,
          notifyCount: 0,
        },
      },
    ]);
  });

  it('keeps the one-second decoy at the cast origin while the player advances', () => {
    const event = cloakingEvent();
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 41,
      targetId: 41,
      sourceFacing: Math.PI / 3,
      skillId: 4112,
      ability: 'mir4_skill_4112',
      profile: 'arbalist-cloaking',
      durationMs: 1_020,
      endCutMs: 560,
      persistentArea: {
        spawnOffsetMs: 20,
        expiresOffsetMs: 1_020,
        shape: 'fixed-circle',
        ...CAST_ANCHOR,
        radiusYards: 3.5,
        heightYards: 5,
      },
      contacts: [
        {
          attackId: 411211,
          offsetMs: 720,
          shape: 'fixed-circle',
          ...CAST_ANCHOR,
          radiusYards: 3.5,
          heightYards: 5,
          damageCoefficient: 9_000,
        },
      ],
    });
    expect(event.projectiles).toBeUndefined();
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_4112')).toBe(true);

    const playPersistentArea = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playPersistentArea, playContact }, 1);
    const movingPose = (
      _entityId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(out, { x: 38, y: 2, z: 42, facing: Math.PI });
      return true;
    };
    expect(painter.start(event)).toBe(true);
    painter.update(0.02, movingPose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject(CAST_ANCHOR);
    painter.update(0.7, movingPose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject(CAST_ANCHOR);
  });

  it('fails closed without a finite frozen source anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4112);
    if (!plan) throw new Error('Missing Cloaking plan');
    expect(mir4NativeSkillPresentationEvent(41, 41, 0, plan)).toBeNull();
    expect(
      mir4NativeSkillPresentationEvent(41, 41, 0, plan, undefined, undefined, {
        x: Number.NaN,
        y: 0,
        z: 0,
      }),
    ).toBeNull();
  });

  it('paints the smoke decoy and its delayed physical burst separately', () => {
    const event = cloakingEvent();
    const area = event.persistentArea;
    const contact = event.contacts[0];
    if (!area || !contact) throw new Error('Missing Cloaking area/contact');
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

    playMir4NativePersistentSkillArea(deps, event, area);
    expect(deps.decalXZ).toHaveBeenCalledWith(12, 18, 3.5, 0x665878, 'cloaking-decoy', 1);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);

    const visual = {
      shape: 'fixed-circle',
      ...CAST_ANCHOR,
      radiusYards: 3.5,
      heightYards: 5,
      power: 1,
    } as Mir4NativePresentationContactVisual;
    playMir4NativeSkillContact(deps, event, contact, visual, 0);
    expect(deps.decalXZ).toHaveBeenLastCalledWith(12, 18, 3.5, 0xb8a2d9, 'cloaking-impact', 0.5);
    expect(deps.burstAt).toHaveBeenLastCalledWith(12, 2.25, 18, 0xd9cced, 28, 1.05, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenLastCalledWith('physical', 0.92, 12, 1.5, 18);
  });
});
