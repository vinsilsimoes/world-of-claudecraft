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

describe('MIR4 Taoist Light Ray presentation', () => {
  it('pins the extracted four-second Special animation and its native dependency graph', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(3303)).toEqual({
      skillId: 3303,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special',
        sha256: 'C53986B5A683ABFE14307EB94D06DD72EDA064391547BE1BCA227565A86BF171',
        sizeBytes: 76_927,
        numFrames: 121,
        sequenceLengthSeconds: 4,
        notifyCount: 19,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special',
        animationBindingConfidence: 'corroborated-asset',
        vfxAssetPaths: [
          '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_01',
          '/Game/Effect/PC/Pct/Special/P_Pct_Special_Cast_02',
          '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_03',
          '/Game/Effect/PC/Pct/Special/P_Pct_Special_Shot_04',
        ],
        guideAssetPaths: ['/Game/Effect/curve/PC/CharMt_V_Green'],
        soundAssetPaths: [
          '/Game/Sound/Sound_DropnCloth/Cloth_B_5_Cue',
          '/Game/Sound/Sound_Skill/Skill_Shot_Long_1_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/pct_breath16_Cue',
          '/Game/Sound/Sound_Character/Pct_Voice/Pct_skill_ilyangji_Cue',
          '/Game/Sound/Sound_Skill/Shot_ice_Explo_1_Cue',
          '/Game/Sound/Sound_Skill/Rev_Whoosh_L_1_Cue',
          '/Game/Sound/Sound_Impact/Impact_M_5_Cue',
          '/Game/Sound/Sound_DropnCloth/cloth12_Cue',
        ],
        cameraCurveAssetPaths: [
          '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_Special',
          '/Game/Data/Curve/TargetCameraCurve/Target_Base',
        ],
        cameraShakeAssetPaths: [
          '/Game/Blueprint/BPCameraShake/BP_Shake10_01/BP_Shake10_01_C',
          '/Game/Blueprint/BPCameraShake/BP_Shake18_01/BP_Shake18_01_C',
          '/Game/Blueprint/BPCameraShake/BP_Shake20_01/BP_Shake20_01_C',
        ],
      },
    });
  });

  it('emits the seven native damage contacts as the forward Light Ray sequence', () => {
    const sim = new Sim({
      seed: 33_035,
      playerClass: 'shaman',
      playerClassMir4: 'taoist',
      playerName: 'Light Ray Presentation QA',
      gameProfile: 'mir4-gameplay-port',
      world: EMPTY_TEST_WORLD,
    });
    placePlayerInOpenField(sim);
    sim.setPlayerLevel(120);
    sim.player.mir4UltGauge = 100;
    sim.player.resource = 100_000;
    if (!sim.player.mir4) throw new Error('missing MIR4 combat state');
    sim.player.mir4.manaCostStat = 100;
    const target = createMob(
      sim.nextId++,
      { ...MIR4_MOBS.mir4_forest_wolf, id: 'light_ray_presentation_target' },
      1,
      sim.groundPos(sim.player.pos.x + 4, sim.player.pos.z),
    );
    sim.addEntity(target);
    sim.drainEvents();

    expect(sim.mir4UltimateCast(target.id)).toEqual({ ok: true });
    const event = sim
      .drainEvents()
      .find(
        (candidate) => candidate.type === 'mir4SkillPresentation' && candidate.skillId === 3303,
      );
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: sim.player.id,
      targetId: target.id,
      skillId: 3303,
      ability: 'mir4_ultimate_3',
      profile: 'taoist-light-ray',
      durationMs: 4000,
      endCutMs: 3100,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_Special',
      contacts: [
        {
          attackId: 330303,
          offsetMs: 1060,
          shape: 'direct',
          reachYards: 13,
          widthYards: 3.5,
          damageCoefficient: 5000,
        },
        {
          attackId: 330303,
          offsetMs: 1260,
          shape: 'direct',
          reachYards: 13,
          widthYards: 3.5,
          damageCoefficient: 5000,
        },
        {
          attackId: 330305,
          offsetMs: 1660,
          shape: 'direct',
          reachYards: 13,
          widthYards: 3.5,
          damageCoefficient: 5000,
        },
        {
          attackId: 330305,
          offsetMs: 1860,
          shape: 'direct',
          reachYards: 13,
          widthYards: 3.5,
          damageCoefficient: 5000,
        },
        {
          attackId: 330306,
          offsetMs: 2200,
          shape: 'direct',
          reachYards: 13,
          widthYards: 3.5,
          damageCoefficient: 11000,
        },
        {
          attackId: 330309,
          offsetMs: 2600,
          shape: 'direct',
          reachYards: 16,
          widthYards: 4,
          damageCoefficient: 13000,
        },
        {
          attackId: 330310,
          offsetMs: 2800,
          shape: 'direct',
          reachYards: 16,
          widthYards: 4,
          damageCoefficient: 12000,
        },
      ],
    });
    if (event?.type !== 'mir4SkillPresentation') return;
    expect(mir4NativeSkillPresentationOwnsAbilityVfx(event.ability)).toBe(true);
    expect(mir4NativeSkillFacingLock(event, 5)).toEqual({ facing: event.sourceFacing, until: 8.1 });
  });
});
