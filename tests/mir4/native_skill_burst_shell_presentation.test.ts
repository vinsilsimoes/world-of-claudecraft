import { describe, expect, it, vi } from 'vitest';
import {
  playMir4NativePersistentSkillArea,
  playMir4NativeSkillContact,
} from '../../src/render/mir4_native_skill_contact_painter';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Burst Shell native presentation', () => {
  it('pins the inspected Skl04 animation and authored effect, sound, camera dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4103)).toEqual({
      skillId: 4103,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl04',
        sha256: '0A21839810A59D452B99887E108BF61906ABEE81E4D2452F0E43D422246B473E',
        sizeBytes: 39_251,
        numFrames: null,
        sequenceLengthSeconds: null,
        notifyCount: null,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl04',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pca/Skl04/P_Pca_arrow_shoot_Skl04',
          '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_01',
          '/Game/Effect/PC/Pca/Skl04/P_PCA_Btl_Skl04_02',
          '/Game/Effect/PC/Pca/skl_03/P_pca_skl_03_explosion',
          '/Game/Effect/Hit/PC_Pca/P_Pca_Hit_01',
        ],
        guideAssetPaths: [
          '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_atk_27_Cue',
          '/Game/Sound/Sound_Character/Pca_Voice/Pca_skill_4_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Equip_1_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_Umbrilla_1_Cue',
          '/Game/Sound/Sound_Skill/Fly_Whoosh_4_Cue',
          '/Game/Sound/Sound_Skill/skill_bomb_1_Cue',
          '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_5_Cue',
          '/Game/Sound/Sound_Weapon/Bow/Bow_Shot_arrow_2_Cue',
          '/Game/Sound/Sound_Impact/Impact_Explos_1_Cue_Big',
          '/Game/Sound/Sound_Impact/Impact_Ground_1_Big_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pca_Btl_Skl04',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
      },
    });
  });

  it('keeps the three-second shell at its cast anchor and presents all five explosions', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4103);
    if (!plan) throw new Error('Missing Burst Shell plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0.75, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      skillId: 4103,
      ability: 'mir4_skill_4103',
      profile: 'arbalist-burst-shell',
      durationMs: 3_600,
      endCutMs: 880,
      persistentArea: {
        spawnOffsetMs: 600,
        expiresOffsetMs: 3_600,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 8,
        heightYards: 4,
      },
    });
    expect(event?.contacts).toEqual(
      [
        [410311, 1_450, 4_500],
        [410311, 1_500, 4_500],
        [410312, 1_600, 5_500],
        [410313, 1_700, 4_500],
        [410313, 1_750, 4_500],
      ].map(([attackId, offsetMs, damageCoefficient]) => ({
        attackId,
        offsetMs,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 8,
        heightYards: 4,
        damageCoefficient,
      })),
    );
    if (!event) throw new Error('Missing Burst Shell event');

    const playPersistentArea = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter(
      { playPersistentArea, playContact },
      1,
    );
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 30, y: 1, z: 35, facing: Math.PI });
      return true;
    };
    expect(painter.start(event)).toBe(true);
    painter.update(0.6, pose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject({ x: 12, z: 18 });
    painter.update(1.2, pose);
    expect(playContact).toHaveBeenCalledTimes(5);
    expect(playContact.mock.calls.every((call) => call[2].x === 12 && call[2].z === 18)).toBe(true);
  });

  it('fails closed without the fixed target anchor required by the device', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4103);
    if (!plan) throw new Error('Missing Burst Shell plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });

  it('renders a persistent cyan-gold device and a stronger final explosion', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4103);
    if (!plan) throw new Error('Missing Burst Shell plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, { x: 12, y: 1.5, z: 18 });
    const area = event?.persistentArea;
    const contact = event?.contacts[4];
    if (!event || !area || !contact) throw new Error('Missing Burst Shell presentation');
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
    expect(deps.decalXZ).toHaveBeenCalledWith(12, 18, 8, 0x26d8d4, 'burst-shell', 3);
    expect(deps.ringAt).toHaveBeenCalledTimes(2);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);

    const visual = {
      shape: 'fixed-circle',
      x: 12,
      y: 1.5,
      z: 18,
      radiusYards: 8,
      heightYards: 4,
      power: 1,
    } as Mir4NativePresentationContactVisual;
    playMir4NativeSkillContact(deps, event, contact, visual, 4);
    expect(deps.decalXZ).toHaveBeenLastCalledWith(12, 18, 8, 0xffe19a, 'burst-shell-impact', 0.5);
    expect(deps.burstAt).toHaveBeenLastCalledWith(12, 2.55, 18, 0xffe19a, 34, 1.3, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenLastCalledWith('physical', 1.15, 12, 1.5, 18);
  });
});
