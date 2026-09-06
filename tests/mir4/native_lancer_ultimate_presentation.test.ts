import { describe, expect, it } from 'vitest';
import {
  mir4NativeSkillFacingLock,
  mir4NativeSkillPresentationOwnsAbilityVfx,
} from '../../src/render/mir4_native_skill_presentation_core';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { Sim } from '../../src/sim/sim';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

describe('MIR4 Lancer 5203 Dragon Spear presentation', () => {
  it('pins the exact extracted DashSpear03 animation and its native dependency graph', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(5203)).toEqual({
      skillId: 5203,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03',
        sha256: '07FEB1C18717FB1C6A23F622176921B6C34864BA690149CE76371C9AB64B2F0E',
        sizeBytes: 61_341,
        numFrames: 73,
        sequenceLengthSeconds: 2.4,
        notifyCount: 8,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03',
        animationBindingConfidence: 'exact-blueprint-state',
        vfxAssetPaths: [
          '/Game/Effect/PC/Basic/P_Pct_Action01_03',
          '/Game/Effect/PC/Pcz/DashSpear/Pcz_Btl_Skl_DashSpear03_in_glow',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_02',
          '/Game/Effect/PC/Pcz/Pcz_Btl_Skl_Dashspear02_Ready',
        ],
        guideAssetPaths: [
          '/Game/Effect/curve/PC/CharMt_V_Red',
          '/Game/Effect/curve/PC/Light_HitPoint_0500',
          '/Game/Effect/curve/PC/PP_Curve01_01',
          '/Game/Effect/curve/PC/RadiusCurve',
          '/Game/Effect/curve/PC/RadiusCurve_00001',
        ],
        soundAssetPaths: [
          '/Game/Sound/Sound_Character/Pcmz_Voice/Pcmz_skill_speacial_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_12_Cue',
          '/Game/Sound/Sound_DropnCloth/Cloth_B_34_Cue',
          '/Game/Sound/Sound_Skill/shot_30_Cue',
          '/Game/Sound/Sound_Skill/Skill_Rev_11_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_11_Cue',
          '/Game/Sound/Sound_Skill/skill_sword_2_Cue',
          '/Game/Sound/Sound_Weapon/Weapon_Sword_05_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pcz_Btl_Skl_DashSpear05',
          '/Game/Data/Curve/TargetCameraCurve/Target_Pcz_Btl_Skl_DashSpear05',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake',
          '/Game/Blueprint/BPCameraShake/BP_Shake06_02',
          '/Game/Blueprint/BPCameraShake/BP_Shake18_01',
        ],
      },
    });
  });

  it('emits one hybrid frontal contact at the exact native timing and locks the cast facing', () => {
    const sim = new Sim({
      seed: 52_035,
      playerClass: 'warrior',
      playerClassMir4: 'lancer',
      playerName: 'Dragon Spear Presentation QA',
      gameProfile: 'mir4-gameplay-port',
      world: EMPTY_TEST_WORLD,
    });
    placePlayerInOpenField(sim);
    sim.setPlayerLevel(120);
    sim.player.mir4UltGauge = 100;
    sim.player.maxResource = 100_000;
    sim.player.resource = sim.player.maxResource;
    if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
    sim.player.mir4.manaCostStat = 100;
    const target = createMob(
      sim.nextId++,
      { ...MIR4_MOBS.mir4_forest_wolf, id: 'dragon_spear_presentation_target' },
      1,
      sim.groundPos(sim.player.pos.x + 4, sim.player.pos.z),
    );
    sim.addEntity(target);
    sim.drainEvents();

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    const event = sim
      .drainEvents()
      .find(
        (candidate) => candidate.type === 'mir4SkillPresentation' && candidate.skillId === 5203,
      );
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: sim.player.id,
      targetId: target.id,
      skillId: 5203,
      ability: 'mir4_ultimate_5',
      profile: 'lancer-dragon-spear',
      durationMs: 2405,
      endCutMs: 1910,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcz/Pcz_Btl_Skl_DashSpear03',
      contacts: [
        {
          attackId: 520302,
          offsetMs: 1320,
          shape: 'direct',
          reachYards: 17,
          widthYards: 4.5,
          damageCoefficient: 70_000,
        },
      ],
    });
    if (event?.type !== 'mir4SkillPresentation') return;
    expect(event.projectiles).toBeUndefined();
    expect(event.persistentArea).toBeUndefined();
    expect(mir4NativeSkillPresentationOwnsAbilityVfx(event.ability)).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 5)).toEqual({
      facing: event.sourceFacing,
      until: 6.91,
    });
  });
});
