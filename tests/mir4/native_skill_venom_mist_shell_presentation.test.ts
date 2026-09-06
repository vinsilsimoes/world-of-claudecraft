import { describe, expect, it, vi } from 'vitest';
import {
  playMir4NativePersistentSkillArea,
  playMir4NativeSkillContact,
} from '../../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Venom Mist Shell native presentation', () => {
  it('pins the inspected Skl06 animation and extracted dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4104)).toEqual({
      skillId: 4104,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl06',
        sha256: 'C6F1A835117BE9FDB9C259A41FD4CFD6EF0AA19FBA99A166EA74CF2441D580CA',
        sizeBytes: 44_222,
        numFrames: 33,
        sequenceLengthSeconds: 1.0666667,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl06',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_01',
          '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_03',
          '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail',
          '/Game/Effect/PC/Pca/Skl06/P_PCA_Btl_Skl06_Trail_02',
          '/Game/Effect/PC/Pca/Skl06/P_Pca_Smoke_skl06',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMT_F_04',
          '/Game/Effect/curve/PC/CharMT_F_Purple_03',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_27_Cue',
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_44_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth10_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth4_Cue',
          '/Game/Sound/Sound_DropnCloth/Drop_Step_1_Cue',
          '/Game/Sound/Sound_Hit/Hit_Kick_1_Cue',
          '/Game/Sound/Sound_Skill/Shoot_Jangpung_Fire_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl06',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('presents the curved shell, direct blast, and eight fixed poison-field contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4104);
    if (!plan) throw new Error('Missing Venom Mist Shell plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });

    expect(event).toMatchObject({
      skillId: 4104,
      ability: 'mir4_skill_4104',
      profile: 'arbalist-venom-mist-shell',
      durationMs: 6_390,
      endCutMs: 1_140,
      persistentArea: {
        spawnOffsetMs: 390,
        expiresOffsetMs: 6_390,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 4.5,
        heightYards: 3,
      },
      projectiles: [
        {
          attackId: 410401,
          launchOffsetMs: 220,
          movement: 'target-curve',
          speedYardsPerSecond: 12,
          lifetimeMs: 700,
          sourceSocketName: 'Hand_L',
          effectId: 2_040_069,
        },
      ],
    });
    expect(
      event?.contacts.map((contact) => [
        contact.attackId,
        contact.offsetMs,
        contact.shape,
        contact.damageCoefficient,
      ]),
    ).toEqual([
      [410403, 750, 'target-circle', 5_500],
      [410411, 890, 'fixed-circle', 2_750],
      [410411, 1_290, 'fixed-circle', 2_750],
      [410412, 1_490, 'fixed-circle', 2_750],
      [410412, 1_690, 'fixed-circle', 2_750],
      [410413, 1_890, 'fixed-circle', 2_750],
      [410413, 2_090, 'fixed-circle', 2_750],
      [410414, 2_290, 'fixed-circle', 2_750],
      [410414, 2_490, 'fixed-circle', 2_750],
    ]);
    if (!event) throw new Error('Missing Venom Mist Shell event');
    expect(new Mir4NativeSkillPresentationPainter({ playContact() {} }, 1).start(event)).toBe(true);
  });

  it('fails closed without the selected-target field anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4104);
    if (!plan) throw new Error('Missing Venom Mist Shell plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });

  it('renders a restrained poison mist field and distinct direct and pulse contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4104);
    if (!plan) throw new Error('Missing Venom Mist Shell plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    const area = event?.persistentArea;
    const direct = event?.contacts[0];
    const pulse = event?.contacts[1];
    if (!event || !area || !direct || !pulse) {
      throw new Error('Missing Venom Mist Shell presentation');
    }
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
    expect(deps.decalXZ).toHaveBeenCalledWith(12, 18, 4.5, 0x4f9a5c, 'venom-mist', 6);
    expect(deps.ringAt).toHaveBeenCalledTimes(2);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);

    playMir4NativeSkillContact(
      deps,
      event,
      direct,
      {
        shape: 'target-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 6,
        heightYards: 4,
        power: 2,
      } satisfies Mir4NativePresentationContactVisual,
      0,
    );
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0xa7e36b, true);
    expect(deps.burstAt).toHaveBeenLastCalledWith(12, 2.25, 18, 0xb6ed7c, 26, 1.1, 'sparks');

    playMir4NativeSkillContact(
      deps,
      event,
      pulse,
      {
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 4.5,
        heightYards: 3,
        power: 1,
      } satisfies Mir4NativePresentationContactVisual,
      1,
    );
    expect(deps.burstAt).toHaveBeenLastCalledWith(12, 1.95, 18, 0x72c66b, 14, 0.72, 'sparks');
  });
});
