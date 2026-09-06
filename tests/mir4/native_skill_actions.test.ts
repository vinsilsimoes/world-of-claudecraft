import { describe, expect, it } from "vitest";
import {
  MIR4_NATIVE_SKILL_ACTIONS,
  mir4NativeSkillActionById,
} from "../../src/sim/content/mir4";
import {
  MIR4_NATIVE_SKILL_ACTIONS as DIRECT_NATIVE_SKILL_ACTIONS,
  mir4NativeSkillActionById as directNativeSkillActionById,
} from "../../src/sim/content/mir4/native_skill_actions";

const WARRIOR_ACTION_IDS = [
  1101, 1102, 1103, 1104, 1201, 1301, 1302, 1304, 1401, 1403, 1501, 1502, 1601,
];
const SORCERER_ACTION_IDS = [
  2101, 2111, 2501, 2301, 2503, 2203, 2303, 2201, 2502, 2103, 2204, 2202, 2403,
];
const TAOIST_ACTION_IDS = [
  3506, 3101, 3301, 3104, 3503, 3103, 3501, 3201, 3505, 3203, 3404, 3504, 3303,
];
const ARBALIST_REVIEWED_ACTION_IDS = [
  4101, 4102, 4103, 4104, 4105, 4107, 4108, 4109, 4110, 4111, 4113, 4106, 4112,
];
const LANCER_REVIEWED_ACTION_IDS = [
  5201, 5101, 5104, 5301, 5401, 5102, 5103, 5303, 5403, 5205, 5304, 5202, 5203,
];

describe("MIR4 native skill action evidence", () => {
  it("covers each fully reviewed class action exactly once", () => {
    expect(MIR4_NATIVE_SKILL_ACTIONS.map((action) => action.skillId)).toEqual([
      ...WARRIOR_ACTION_IDS,
      ...SORCERER_ACTION_IDS,
      ...TAOIST_ACTION_IDS,
      ...ARBALIST_REVIEWED_ACTION_IDS,
      ...LANCER_REVIEWED_ACTION_IDS,
    ]);
    expect(
      new Set(MIR4_NATIVE_SKILL_ACTIONS.map((action) => action.skillId)).size,
    ).toBe(MIR4_NATIVE_SKILL_ACTIONS.length);
    for (const action of MIR4_NATIVE_SKILL_ACTIONS) {
      expect(mir4NativeSkillActionById(action.skillId)).toBe(action);
    }
  });

  it("keeps the direct module and barrel public API on the same catalog and lookup", () => {
    expect(DIRECT_NATIVE_SKILL_ACTIONS).toBe(MIR4_NATIVE_SKILL_ACTIONS);
    expect(directNativeSkillActionById).toBe(mir4NativeSkillActionById);
  });

  it("pins both Berserk damage rows and the duration-matched OverDrive presentation", () => {
    expect(mir4NativeSkillActionById(1101)).toMatchObject({
      skillId: 1101,
      cooldownMs: 48_000,
      skillCostType: 2,
      skillCost: 5000,
      attackAnimationMs: 1367,
      endCutAnimationMs: 1220,
      hitCount: 1,
      requiredClassLevel: 40,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 0,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 0,
        nativeWidth: 0,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive",
        animationBindingConfidence: "corroborated-asset",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/P_pcw_OverDrive_001",
          "/Game/Effect/PC/Pcw/P_Pcw_Counter_Atk_01",
          "/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01",
        ],
        guideAssetPaths: [],
        soundAssetPaths: [
          "/Game/Sound/Sound_Character/PcmJ_Voice/PcmJ_Attack_Rev_03_Cue",
          "/Game/Sound/Sound_DropnCloth/cloth13_Cue",
          "/Game/Sound/Sound_DropnCloth/Cloth_Equip_1_Cue",
          "/Game/Sound/Sound_Impact/Impact_01_Cue",
          "/Game/Sound/Sound_Skill/Fly_Whoosh_3_Cue",
          "/Game/Sound/Sound_Skill/Magic_02_Cue",
          "/Game/Sound/Sound_Skill/Skill_Rev_10_Cue",
          "/Game/Sound/Sound_Skill/Skill_Shot_11_Cue",
          "/Game/Sound/Sound_Skill/Whoosh_Ice_1_Cue",
          "/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_OverDriver",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_12",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 110100,
          mainAttack: 1,
          nextAttackId: 110101,
          impactStartMs: 0,
          impactOffsetsMs: [20],
          targetDistance: { nativeMin: 0, nativeMax: 450 },
          authorialTargetValue: 10,
          impactType: 2,
          geometry: {
            angleDegrees: 360,
            nativeDistanceMin: 0,
            nativeDistanceMax: 500,
            nativeWidth: 0,
            nativeHeight: 400,
            nativeOffset: { x: 0, y: 0, z: 0 },
            rotationDegrees: 0,
          },
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 200,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit", durationMs: 200 }),
          guideEffectId: 0,
        }),
        expect.objectContaining({
          attackId: 110101,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 550,
          impactOffsetsMs: [650],
          targetDistance: { nativeMin: 0, nativeMax: 450 },
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 200,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit", durationMs: 200 }),
        }),
      ],
    });
  });

  it("pins the complete Void Slash action chain without promoting Hit to Stun", () => {
    expect(mir4NativeSkillActionById(1102)).toMatchObject({
      skillId: 1102,
      cooldownMs: 25_000,
      skillCostType: 2,
      skillCost: 1800,
      attackAnimationMs: 1500,
      endCutAnimationMs: 1300,
      hitCount: 3,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 103,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 850,
        nativeWidth: 500,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_002",
          "/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_003",
          "/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_Atk_01",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_Banwol02",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 110201,
          mainAttack: 1,
          movement: {
            kind: "forward",
            nativeRange: 250,
            delayMs: 0,
            durationMs: 250,
          },
          impactOffsetsMs: [250],
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
        }),
        expect.objectContaining({
          attackId: 110202,
          mainAttack: 2,
          impactStartMs: 420,
          impactOffsetsMs: [520],
          geometry: expect.objectContaining({
            nativeDistanceMax: 450,
            nativeWidth: 500,
          }),
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 160,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 200,
          }),
        }),
        expect.objectContaining({
          attackId: 110203,
          impactOffsetsMs: [699],
          geometry: expect.objectContaining({ nativeDistanceMax: 650 }),
          reaction: expect.objectContaining({ kind: "hit" }),
        }),
        expect.objectContaining({
          attackId: 110204,
          impactOffsetsMs: [900],
          geometry: expect.objectContaining({ nativeDistanceMax: 850 }),
          damage: {
            type: 1,
            coefficient: 9000,
            levelUpCoefficient: 180,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit" }),
        }),
      ],
    });
  });

  it("pins Barbaric Charge movement, pull and knock-down rows without normalizing native range", () => {
    expect(mir4NativeSkillActionById(1103)).toMatchObject({
      skillId: 1103,
      cooldownMs: 33_000,
      skillCostType: 2,
      skillCost: 1700,
      attackAnimationMs: 1667,
      endCutAnimationMs: 1500,
      hitCount: 4,
      requiredClassLevel: 48,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 103,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 1200,
        nativeWidth: 500,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath: null,
        animationBindingConfidence: "unresolved",
        vfxAssetPaths: ["/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01"],
        guideAssetPaths: [],
        soundAssetPaths: ["/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue"],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
      },
      rows: [
        expect.objectContaining({
          attackId: 110105,
          mainAttack: 1,
          nextAttackId: 110106,
          impactOffsetsMs: [450],
          movement: {
            kind: "target",
            nativeRange: -150,
            delayMs: 0,
            durationMs: 400,
          },
          targetDistance: { nativeMin: 0, nativeMax: 1200 },
          authorialTargetValue: 10,
          geometry: expect.objectContaining({
            angleDegrees: 0,
            nativeDistanceMax: 1000,
            nativeWidth: 900,
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "none",
            probabilityPercent: 100,
          }),
          guideEffectId: 0,
        }),
        expect.objectContaining({
          attackId: 110106,
          mainAttack: 2,
          nextAttackId: 110107,
          impactStartMs: 510,
          impactOffsetsMs: [550],
          targetDistance: { nativeMin: 0, nativeMax: 600 },
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 600,
            nativeWidth: 0,
          }),
          damage: {
            type: 1,
            coefficient: 10_000,
            levelUpCoefficient: 220,
            attribute: 0,
          },
          reaction: {
            kind: "push-to-point",
            stance: "hit-01",
            value: 100,
            nativeHeight: 0,
            valueEx: 0.1,
            durationMs: 100,
            probabilityPercent: 100,
            direction: 0,
          },
        }),
        expect.objectContaining({
          attackId: 110107,
          mainAttack: 3,
          nextAttackId: 0,
          impactStartMs: 1060,
          impactOffsetsMs: [1100],
          damage: {
            type: 1,
            coefficient: 11_000,
            levelUpCoefficient: 230,
            attribute: 0,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-02",
            value: 300,
            nativeHeight: 100,
            valueEx: 0.9,
            durationMs: 2100,
            probabilityPercent: 0,
            direction: 0,
          },
        }),
      ],
    });
  });

  it("pins Iron Shackle as knock-back, push-to-point, then ordinary Hit", () => {
    expect(mir4NativeSkillActionById(1201)).toMatchObject({
      skillId: 1201,
      cooldownMs: 40_000,
      skillCostType: 2,
      skillCost: 1920,
      attackAnimationMs: 2833,
      endCutAnimationMs: 2300,
      hitCount: 3,
      requiredClassLevel: 24,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 102,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 1100,
        nativeWidth: 0,
        nativeOffset: 500,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_01",
          "/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_02",
          "/Game/Effect/PC/Pcw/P_Pcw_IronChain_Atk_01",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_IronChain01",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 120101,
          mainAttack: 1,
          nextAttackId: 120102,
          impactOffsetsMs: [500],
          targetDistance: { nativeMin: 0, nativeMax: 1600 },
          authorialTargetValue: 5,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 1100,
            nativeOffset: { x: 700, y: 0, z: 0 },
          }),
          damage: {
            type: 1,
            coefficient: 7000,
            levelUpCoefficient: 130,
            attribute: 0,
          },
          reaction: {
            kind: "knock-back",
            stance: "hit-01",
            value: 10,
            nativeHeight: 0,
            valueEx: 0.1,
            durationMs: 150,
            probabilityPercent: 100,
            direction: 0,
          },
        }),
        expect.objectContaining({
          attackId: 120102,
          mainAttack: 2,
          nextAttackId: 120103,
          impactStartMs: 800,
          impactOffsetsMs: [850],
          reaction: {
            kind: "push-to-point",
            stance: "stun-01",
            value: 200,
            nativeHeight: 0,
            valueEx: 0.3,
            durationMs: 300,
            probabilityPercent: 100,
            direction: 0,
          },
        }),
        expect.objectContaining({
          attackId: 120103,
          mainAttack: 3,
          nextAttackId: 0,
          impactStartMs: 1400,
          impactOffsetsMs: [1500],
          targetDistance: { nativeMin: 0, nativeMax: 500 },
          geometry: expect.objectContaining({
            nativeDistanceMax: 700,
            nativeOffset: { x: 300, y: 0, z: 0 },
          }),
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 140,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 200,
          }),
        }),
      ],
    });
  });

  it("pins Splitting Slash with its exact native animation-blueprint state binding", () => {
    expect(mir4NativeSkillActionById(1104)).toMatchObject({
      skillId: 1104,
      cooldownMs: 16_000,
      skillCostType: 2,
      skillCost: 2400,
      attackAnimationMs: 1539,
      endCutAnimationMs: 1190,
      hitCount: 1,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 103,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 700,
        nativeWidth: 550,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Cutter",
        animationBindingConfidence: "exact-blueprint-state",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/Cutter/P_Pcw_Cutter_Cast_01",
          "/Game/Effect/PC/Pcw/Cutter/P_Pcw_Cutter_02_01",
          "/Game/Effect/PC/Pcw/Cutter/P_Pcw_Cutter_02",
          "/Game/Effect/PC/Pcw/Cutter/P_Pcw_Cutter_03",
          "/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01",
        ],
        guideAssetPaths: [
          "/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01",
        ],
        soundAssetPaths: [
          "/Game/Sound/Sound_DropnCloth/cloth13_Cue",
          "/Game/Sound/Sound_Character/PcmJ_Voice/PcmJ_Attack_Strong_12_Cue",
          "/Game/Sound/Sound_Weapon/Weapon_Sword_10_Cue",
          "/Game/Sound/Sound_Skill/Skill_Shot_Shape_1_Cue",
          "/Game/Sound/Sound_Skill/Whoosh_Fire_2_Cue",
          "/Game/Sound/Sound_Impact/Impact_Ground_4_Cue",
          "/Game/Sound/Sound_Skill/shot_30_Cue",
          "/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_Banwol04",
          "/Game/Data/Curve/TargetCameraCurve/Target_Pcw_Btl_Skl_Banwol01",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_12",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 110401,
          mainAttack: 1,
          nextAttackId: 110402,
          impactOffsetsMs: [390],
          movement: {
            kind: "forward",
            nativeRange: 300,
            delayMs: 0,
            durationMs: 500,
          },
          targetDistance: { nativeMin: 0, nativeMax: 550 },
          authorialTargetValue: 8,
          geometry: expect.objectContaining({
            nativeDistanceMax: 700,
            nativeWidth: 550,
            nativeHeight: 400,
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 103,
        }),
        expect.objectContaining({
          attackId: 110402,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 450,
          impactOffsetsMs: [490],
          targetDistance: { nativeMin: 0, nativeMax: 350 },
          geometry: expect.objectContaining({
            nativeDistanceMax: 700,
            nativeWidth: 550,
            nativeHeight: 400,
          }),
          damage: {
            type: 1,
            coefficient: 21_000,
            levelUpCoefficient: 400,
            attribute: 0,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-02",
            value: 150,
            nativeHeight: 200,
            valueEx: 0.9,
            durationMs: 2100,
            probabilityPercent: 100,
            direction: 1,
          },
        }),
      ],
    });
  });

  it("pins Body Check movement and knock-down while leaving its clip unresolved", () => {
    expect(mir4NativeSkillActionById(1304)).toMatchObject({
      skillId: 1304,
      cooldownMs: 23_000,
      skillCostType: 2,
      skillCost: 4200,
      attackAnimationMs: 1200,
      endCutAnimationMs: 1000,
      hitCount: 1,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 103,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 600,
        nativeWidth: 500,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath: null,
        vfxAssetPaths: ["/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01"],
        guideAssetPaths: [
          "/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01",
        ],
        soundAssetPaths: ["/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue"],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
      },
      rows: [
        expect.objectContaining({
          attackId: 130401,
          mainAttack: 1,
          nextAttackId: 130402,
          impactOffsetsMs: [300],
          targetDistance: { nativeMin: 0, nativeMax: 550 },
          geometry: expect.objectContaining({
            nativeDistanceMax: 800,
            nativeWidth: 500,
            nativeOffset: { x: -200, y: 0, z: 0 },
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 103,
        }),
        expect.objectContaining({
          attackId: 130402,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 480,
          impactOffsetsMs: [520],
          movement: {
            kind: "target",
            nativeRange: 10,
            delayMs: 0,
            durationMs: 370,
          },
          damage: {
            type: 1,
            coefficient: 22_000,
            levelUpCoefficient: 400,
            attribute: 0,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-02",
            value: 400,
            nativeHeight: 100,
            valueEx: 0.9,
            durationMs: 2100,
            probabilityPercent: 100,
            direction: 1,
          },
        }),
      ],
    });
  });

  it("pins Lion's Roar setup plus both native damage contacts", () => {
    expect(mir4NativeSkillActionById(1302)).toMatchObject({
      skillId: 1302,
      cooldownMs: 39_000,
      skillCostType: 2,
      skillCost: 2640,
      attackAnimationMs: 1300,
      endCutAnimationMs: 970,
      hitCount: 1,
      requiredClassLevel: 8,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 102,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 400,
        nativeWidth: 0,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      rows: [
        expect.objectContaining({
          attackId: 130201,
          mainAttack: 1,
          nextAttackId: 130202,
          impactOffsetsMs: [400],
          targetDistance: { nativeMin: 0, nativeMax: 450 },
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 600,
            nativeWidth: 0,
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 102,
        }),
        expect.objectContaining({
          attackId: 130202,
          mainAttack: 2,
          nextAttackId: 130203,
          impactStartMs: 460,
          impactOffsetsMs: [500],
          damage: {
            type: 1,
            coefficient: 11_000,
            levelUpCoefficient: 270,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 100,
          }),
        }),
        expect.objectContaining({
          attackId: 130203,
          mainAttack: 3,
          nextAttackId: 0,
          impactStartMs: 560,
          impactOffsetsMs: [600],
          geometry: expect.objectContaining({ nativeDistanceMax: 1200 }),
          damage: {
            type: 1,
            coefficient: 2000,
            levelUpCoefficient: 30,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 100,
          }),
        }),
      ],
    });
  });

  it("pins Riposte as a 360-degree setup and knock-down action", () => {
    expect(mir4NativeSkillActionById(1301)).toMatchObject({
      skillId: 1301,
      cooldownMs: 25_000,
      skillCostType: 2,
      skillCost: 3840,
      attackAnimationMs: 2150,
      endCutAnimationMs: 1900,
      hitCount: 1,
      requiredClassLevel: 16,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 102,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 450,
        nativeWidth: 0,
        nativeOffset: 250,
        nativeHeight: 400,
      },
      rows: [
        expect.objectContaining({
          attackId: 130101,
          mainAttack: 1,
          nextAttackId: 130102,
          impactOffsetsMs: [20],
          targetDistance: { nativeMin: 0, nativeMax: 1100 },
          authorialTargetValue: 8,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 1200,
            nativeOffset: { x: 150, y: 0, z: 0 },
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 102,
        }),
        expect.objectContaining({
          attackId: 130102,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 1200,
          impactOffsetsMs: [1240],
          targetDistance: { nativeMin: 0, nativeMax: 550 },
          authorialTargetValue: 10,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 450,
            nativeOffset: { x: 250, y: 0, z: 0 },
          }),
          damage: {
            type: 1,
            coefficient: 25_200,
            levelUpCoefficient: 500,
            attribute: 0,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-02",
            value: 250,
            nativeHeight: 300,
            valueEx: 0.9,
            durationMs: 2100,
            probabilityPercent: 100,
            direction: 0,
          },
        }),
      ],
    });
  });

  it("pins Ground Smash movement, impact geometry and knock-down tuple", () => {
    expect(mir4NativeSkillActionById(1401)).toMatchObject({
      skillId: 1401,
      cooldownMs: 18_000,
      skillCostType: 2,
      skillCost: 3000,
      attackAnimationMs: 1933,
      endCutAnimationMs: 1300,
      hitCount: 1,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 102,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 500,
        nativeWidth: 0,
        nativeOffset: 600,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_EarthBlast",
        animationBindingConfidence: "corroborated-asset",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/EarthBlast/P_pcw_EarthBlast_01",
          "/Game/Effect/PC/Pcw/EarthBlast/P_pcw_EarthBlast_02",
          "/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01",
        ],
        guideAssetPaths: [],
        soundAssetPaths: ["/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue"],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_03",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 140101,
          mainAttack: 1,
          nextAttackId: 140102,
          impactOffsetsMs: [500],
          movement: {
            kind: "target",
            nativeRange: 80,
            delayMs: 100,
            durationMs: 490,
          },
          targetDistance: { nativeMin: 0, nativeMax: 650 },
          authorialTargetValue: 8,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 500,
            nativeOffset: { x: 150, y: 0, z: 0 },
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
        }),
        expect.objectContaining({
          attackId: 140102,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 570,
          impactOffsetsMs: [610],
          targetDistance: { nativeMin: 0, nativeMax: 600 },
          damage: {
            type: 1,
            coefficient: 25_000,
            levelUpCoefficient: 500,
            attribute: 1,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-03",
            value: 150,
            nativeHeight: 0,
            valueEx: 0.49,
            durationMs: 2000,
            probabilityPercent: 100,
            direction: 1,
          },
        }),
      ],
    });
  });

  it("pins Dragon Flame as the native four-contact Warrior ultimate", () => {
    expect(mir4NativeSkillActionById(1403)).toMatchObject({
      skillId: 1403,
      cooldownMs: 10_000,
      skillCostType: 2,
      skillCost: 7000,
      attackAnimationMs: 3433,
      endCutAnimationMs: 2950,
      hitCount: 4,
      requiredClassLevel: 1,
      targeting: true,
      blockingCheck: 0,
      indicator: {
        type: 0,
        index: 2,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 700,
        nativeWidth: 0,
        nativeOffset: 500,
        nativeHeight: 800,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Special",
        animationBindingConfidence: "corroborated-asset",
        vfxAssetPaths: expect.arrayContaining([
          "/Game/Effect/PC/Pcw/Special/p_pc_Special_001",
          "/Game/Effect/PC/Pcw/Special/p_pc_Special_002",
          "/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01",
          "/Game/Effect/Common/System/Debuff/P_Buff_Fire_Bleeding_01",
        ]),
        guideAssetPaths: [
          "/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_FireSword03",
          "/Game/Data/Curve/TargetCameraCurve/Target_Pcw_Btl_Skl_FireSword03",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Shake06_01",
          "/Game/Blueprint/BPCameraShake/BP_Shake25_01",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 140301,
          mainAttack: 1,
          nextAttackId: 140302,
          impactOffsetsMs: [20],
          targetDistance: { nativeMin: 0, nativeMax: 700 },
          authorialTargetValue: 10,
          impactType: 2,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 700,
            nativeOffset: { x: 500, y: 0, z: 0 },
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 1,
          },
          reaction: expect.objectContaining({
            kind: "none",
            probabilityPercent: 100,
          }),
        }),
        expect.objectContaining({
          attackId: 140302,
          mainAttack: 2,
          nextAttackId: 140303,
          impactStartMs: 740,
          impactOffsetsMs: [780],
          damage: {
            type: 1,
            coefficient: 15_000,
            levelUpCoefficient: 320,
            attribute: 1,
          },
          reaction: expect.objectContaining({
            kind: "push-to-point",
            value: 500,
            valueEx: 0.2,
            durationMs: 500,
          }),
          guideEffectId: 2,
        }),
        expect.objectContaining({
          attackId: 140303,
          mainAttack: 2,
          nextAttackId: 140304,
          impactStartMs: 1450,
          impactOffsetsMs: [1500, 1720],
          damage: {
            type: 1,
            coefficient: 31_000,
            levelUpCoefficient: 580,
            attribute: 1,
          },
          reaction: expect.objectContaining({
            kind: "knock-back",
            value: 60,
            valueEx: 0.1,
            durationMs: 400,
          }),
        }),
        expect.objectContaining({
          attackId: 140304,
          mainAttack: 3,
          nextAttackId: 0,
          impactStartMs: 2520,
          impactOffsetsMs: [2560],
          damage: {
            type: 1,
            coefficient: 20_000,
            levelUpCoefficient: 400,
            attribute: 1,
          },
          reaction: {
            kind: "knock-down",
            stance: "down-02",
            value: 500,
            nativeHeight: 300,
            valueEx: 0.9,
            durationMs: 2100,
            probabilityPercent: 100,
            direction: 0,
          },
        }),
      ],
    });
  });

  it("pins Gale Slash as nine contacts with forward movement and two knock-backs", () => {
    expect(mir4NativeSkillActionById(1501)).toMatchObject({
      skillId: 1501,
      cooldownMs: 44_000,
      skillCostType: 2,
      skillCost: 3400,
      attackAnimationMs: 2050,
      endCutAnimationMs: 1725,
      hitCount: 9,
      requiredClassLevel: 5,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 102,
        angleDegrees: 360,
        nativeMin: 0,
        nativeMax: 700,
        nativeWidth: 0,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath: null,
        vfxAssetPaths: ["/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01"],
        guideAssetPaths: [
          "/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst",
        ],
        soundAssetPaths: ["/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue"],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
      },
      rows: [
        expect.objectContaining({
          attackId: 150101,
          mainAttack: 1,
          nextAttackId: 150102,
          impactOffsetsMs: [20, 225, 375],
          movement: {
            kind: "forward",
            nativeRange: 400,
            delayMs: 0,
            durationMs: 200,
          },
          targetDistance: { nativeMin: 0, nativeMax: 700 },
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 700,
          }),
          damage: {
            type: 1,
            coefficient: 9000,
            levelUpCoefficient: 180,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit", durationMs: 100 }),
          guideEffectId: 102,
        }),
        expect.objectContaining({
          attackId: 150102,
          mainAttack: 2,
          nextAttackId: 150103,
          impactStartMs: 440,
          impactOffsetsMs: [540, 640],
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 160,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "knock-back",
            value: 40,
            valueEx: 0.1,
            durationMs: 100,
          }),
        }),
        expect.objectContaining({
          attackId: 150103,
          impactStartMs: 740,
          impactOffsetsMs: [840, 900],
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 160,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit", durationMs: 100 }),
        }),
        expect.objectContaining({
          attackId: 150104,
          impactStartMs: 950,
          impactOffsetsMs: [1050],
          damage: {
            type: 1,
            coefficient: 6000,
            levelUpCoefficient: 150,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "knock-back",
            value: 20,
            valueEx: 0.1,
            durationMs: 100,
          }),
        }),
        expect.objectContaining({
          attackId: 150105,
          mainAttack: 5,
          nextAttackId: 0,
          impactStartMs: 1175,
          impactOffsetsMs: [1275],
          geometry: expect.objectContaining({ nativeDistanceMax: 750 }),
          damage: {
            type: 1,
            coefficient: 7000,
            levelUpCoefficient: 150,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "hit", durationMs: 100 }),
        }),
      ],
    });
  });

  it("pins Unbreakable Stance as targetless with a setup phase before its radial hit", () => {
    expect(mir4NativeSkillActionById(1502)).toMatchObject({
      skillId: 1502,
      cooldownMs: 52_000,
      skillCostType: 2,
      skillCost: 6400,
      attackAnimationMs: 1167,
      endCutAnimationMs: 960,
      hitCount: 1,
      requiredClassLevel: 56,
      targeting: false,
      blockingCheck: 0,
      indicator: {
        type: 0,
        index: 0,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 0,
        nativeWidth: 0,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath: null,
        vfxAssetPaths: [
          "/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01",
          "/Game/Effect/Common/System/Buff/P_Buff_CommonUp_01",
        ],
        guideAssetPaths: [
          "/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst",
        ],
        soundAssetPaths: ["/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue"],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
      },
      rows: [
        expect.objectContaining({
          attackId: 150201,
          mainAttack: 1,
          nextAttackId: 150202,
          impactOffsetsMs: [20],
          targetType: 2,
          authorialTargetValue: 8,
          geometry: expect.objectContaining({
            angleDegrees: 360,
            nativeDistanceMax: 700,
            nativeHeight: 400,
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 102,
        }),
        expect.objectContaining({
          attackId: 150202,
          mainAttack: 2,
          nextAttackId: 0,
          impactStartMs: 140,
          impactOffsetsMs: [240],
          targetType: 1,
          damage: {
            type: 1,
            coefficient: 8000,
            levelUpCoefficient: 200,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 200,
          }),
        }),
      ],
    });
  });

  it("pins the target movement inside Crescent Strike before its damaging contact", () => {
    expect(mir4NativeSkillActionById(1601)).toMatchObject({
      skillId: 1601,
      cooldownMs: 19_000,
      skillCostType: 2,
      skillCost: 1900,
      attackAnimationMs: 1533,
      endCutAnimationMs: 1200,
      hitCount: 1,
      requiredClassLevel: 32,
      targeting: true,
      blockingCheck: 1,
      indicator: {
        type: 0,
        index: 103,
        angleDegrees: 0,
        nativeMin: 0,
        nativeMax: 900,
        nativeWidth: 500,
        nativeOffset: 0,
        nativeHeight: 400,
      },
      presentation: {
        animationAssetPath:
          "/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_HalfMoon",
        vfxAssetPaths: [
          "/Game/Effect/PC/Pcw/HalfMoon/P_Pcw_HalfMoon_Atk_01",
          "/Game/Effect/PC/Pcw/HalfMoon/P_Pcw_HalfMoon_Atk_02",
          "/Game/Effect/PC/Pcw/HalfMoon/P_Pcw_HalfMoon_Cast_01",
          "/Game/Effect/PC/Pcw/HalfMoon/P_Pcw_HalfMoon_Cast_03",
          "/Game/Effect/PC/Pcw/HalfMoon/P_Pcw_HalfMoon_Cast_04",
          "/Game/Effect/PC/Pcw/MadWind/P_pcw_MadWind_01_02",
        ],
        cameraCurveAssetPaths: [
          "/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_Banwol01",
        ],
        cameraShakeAssetPaths: [
          "/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake_06",
        ],
      },
      rows: [
        expect.objectContaining({
          attackId: 160101,
          mainAttack: 1,
          impactOffsetsMs: [474],
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
          guideEffectId: 103,
        }),
        expect.objectContaining({
          attackId: 160102,
          mainAttack: 2,
          impactStartMs: 550,
          movement: {
            kind: "target",
            nativeRange: 100,
            delayMs: 0,
            durationMs: 330,
          },
          impactOffsetsMs: [650],
          geometry: expect.objectContaining({
            nativeDistanceMax: 1150,
            nativeWidth: 500,
            nativeOffset: { x: -150, y: 0, z: 0 },
          }),
          damage: {
            type: 0,
            coefficient: 0,
            levelUpCoefficient: 0,
            attribute: 0,
          },
          reaction: expect.objectContaining({ kind: "none" }),
        }),
        expect.objectContaining({
          attackId: 160103,
          mainAttack: 3,
          impactStartMs: 700,
          impactOffsetsMs: [750],
          geometry: expect.objectContaining({
            nativeDistanceMax: 1150,
            nativeWidth: 500,
            nativeOffset: { x: -450, y: 0, z: 0 },
          }),
          damage: {
            type: 1,
            coefficient: 18_000,
            levelUpCoefficient: 400,
            attribute: 0,
          },
          reaction: expect.objectContaining({
            kind: "hit",
            stance: "hit-01",
            durationMs: 200,
          }),
        }),
      ],
    });
  });

  it("does not expose mutable evidence rows", () => {
    for (const skillId of [
      1101, 1102, 1103, 1104, 1201, 1301, 1302, 1304, 1401, 1403, 1501, 1502,
      1601,
    ]) {
      const action = mir4NativeSkillActionById(skillId);
      expect(Object.isFrozen(action)).toBe(true);
      expect(Object.isFrozen(action?.indicator)).toBe(true);
      expect(Object.isFrozen(action?.presentation)).toBe(true);
      expect(Object.isFrozen(action?.presentation.vfxAssetPaths)).toBe(true);
      expect(Object.isFrozen(action?.presentation.guideAssetPaths)).toBe(true);
      expect(Object.isFrozen(action?.presentation.soundAssetPaths)).toBe(true);
      expect(Object.isFrozen(action?.presentation.cameraCurveAssetPaths)).toBe(
        true,
      );
      expect(Object.isFrozen(action?.presentation.cameraShakeAssetPaths)).toBe(
        true,
      );
      expect(Object.isFrozen(action?.rows)).toBe(true);
      expect(action?.rows.every((row) => Object.isFrozen(row))).toBe(true);
      expect(action?.rows.every((row) => Object.isFrozen(row.movement))).toBe(
        true,
      );
      expect(action?.rows.every((row) => Object.isFrozen(row.geometry))).toBe(
        true,
      );
      expect(
        action?.rows.every((row) => Object.isFrozen(row.geometry.nativeOffset)),
      ).toBe(true);
      expect(action?.rows.every((row) => Object.isFrozen(row.damage))).toBe(
        true,
      );
      expect(action?.rows.every((row) => Object.isFrozen(row.reaction))).toBe(
        true,
      );
    }
  });
});
