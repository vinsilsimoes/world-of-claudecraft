import { mir4NativeSkillActionById } from '../content/mir4';
import { mir4NativeDirectRawEvidenceBySkillId } from '../content/mir4/native_skill_direct_raw_evidence';
import { mir4NativeSkillAssetPresentationEvidence } from './native_skill_asset_presentation';

export type Mir4NativeGuideColor = readonly [number, number, number];

interface Mir4NativeRuntimeGuidePolicyBase {
  readonly skillId: number;
  readonly attackId: number;
  readonly nativeApplyType: 0;
  readonly applyTo: 'self';
  readonly guideEffectId: number;
  readonly materialPathId: number;
  readonly materialAssetPath: string;
  readonly aliveMs: number;
  readonly scalingMs: number;
  readonly materialScalarCurve: 'inside-linear-grow-then-hold';
  readonly indicatorIndex: number;
  readonly colors: {
    readonly primary: Mir4NativeGuideColor;
    readonly secondary: Mir4NativeGuideColor;
    readonly emissive: Mir4NativeGuideColor;
  };
}

export type Mir4NativeRuntimeGuidePolicy = Mir4NativeRuntimeGuidePolicyBase &
  (
    | {
        readonly guideEffectType: 3;
        readonly guideShape: 'direct';
        readonly indicatorNativeLength: number;
        readonly indicatorNativeWidth: number;
        readonly indicatorNativeHeight?: number;
      }
    | {
        readonly guideEffectType: 2;
        readonly guideShape: 'circle';
        readonly indicatorNativeRadius: number;
      }
    | {
        readonly guideEffectType: 1;
        readonly guideShape: 'sector';
        readonly indicatorNativeAngle: number;
        readonly indicatorNativeRadius: number;
        readonly indicatorNativeOffset: number;
      }
  );

const DIRECT_GUIDE_MATERIAL =
  '/Game/Effect/S_Mat_Master/21_PMT_Sys_GuideLine/Mat_DecalActor_02_Inst01';
const DIRECT_GUIDE_COLORS = Object.freeze({
  primary: Object.freeze([0.091146, 0.217937, 0.729167]) as Mir4NativeGuideColor,
  secondary: Object.freeze([0.358803, 0.40595, 0.828125]) as Mir4NativeGuideColor,
  emissive: Object.freeze([0, 5.375199, 10]) as Mir4NativeGuideColor,
});
const CIRCLE_GUIDE_MATERIAL = '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal02_Inst';
const SECTOR_GUIDE_MATERIAL =
  '/Game/Effect/S_Mat_Master/20_PMT_Sys_GuideCirCle/Mat_DDecal01_Inst_3';

function directGuide(
  skillId: number,
  attackId: number,
  aliveMs: number,
  scalingMs: number,
  indicatorNativeLength: number,
  indicatorNativeWidth: number,
  indicatorIndex: number = 103,
  indicatorNativeHeight: number = indicatorNativeWidth,
): Mir4NativeRuntimeGuidePolicy {
  return Object.freeze({
    skillId,
    attackId,
    nativeApplyType: 0,
    applyTo: 'self',
    guideEffectId: 103,
    guideEffectType: 3,
    guideShape: 'direct',
    materialPathId: 100013,
    materialAssetPath: DIRECT_GUIDE_MATERIAL,
    aliveMs,
    scalingMs,
    materialScalarCurve: 'inside-linear-grow-then-hold',
    indicatorIndex,
    indicatorNativeLength,
    indicatorNativeWidth,
    ...(indicatorNativeHeight === indicatorNativeWidth ? {} : { indicatorNativeHeight }),
    colors: DIRECT_GUIDE_COLORS,
  });
}

const DIRECT_GUIDES = Object.freeze([
  directGuide(1102, 110201, 450, 250, 850, 500),
  directGuide(1104, 110401, 850, 650, 700, 550),
  directGuide(1304, 130401, 500, 300, 600, 500),
  directGuide(1601, 160101, 674, 474, 900, 500),
  directGuide(3101, 310101, 580, 380, 800, 500),
  directGuide(3103, 310301, 1380, 1180, 1100, 500),
  directGuide(3203, 320301, 810, 610, 700, 400),
  directGuide(3203, 320302, 810, 610, 700, 400),
  directGuide(4109, 410901, 580, 380, 2000, 400, 0, 500),
  directGuide(5104, 510402, 500, 300, 450, 500, 0),
  directGuide(5201, 520101, 680, 480, 700, 600),
  directGuide(5205, 520501, 760, 560, 850, 400),
  directGuide(5301, 530102, 500, 300, 600, 600),
]);

function circleGuide(
  skillId: number,
  attackId: number,
  aliveMs: number,
  scalingMs: number,
  indicatorNativeRadius: number,
  indicatorIndex: number = 102,
): Mir4NativeRuntimeGuidePolicy {
  return Object.freeze({
    skillId,
    attackId,
    nativeApplyType: 0,
    applyTo: 'self',
    guideEffectId: 102,
    guideEffectType: 2,
    guideShape: 'circle',
    materialPathId: 100012,
    materialAssetPath: CIRCLE_GUIDE_MATERIAL,
    aliveMs,
    scalingMs,
    materialScalarCurve: 'inside-linear-grow-then-hold',
    indicatorIndex,
    indicatorNativeRadius,
    colors: DIRECT_GUIDE_COLORS,
  });
}

const CIRCLE_GUIDES = Object.freeze([
  circleGuide(1201, 120101, 700, 500, 1100),
  circleGuide(1301, 130101, 350, 150, 1200),
  circleGuide(1301, 130102, 400, 200, 450),
  circleGuide(1302, 130201, 700, 500, 600),
  circleGuide(1501, 150101, 720, 150, 700),
  circleGuide(1501, 150102, 420, 220, 700),
  circleGuide(1501, 150103, 470, 270, 700),
  circleGuide(1501, 150104, 400, 200, 700),
  circleGuide(1501, 150105, 500, 300, 750),
  circleGuide(1502, 150201, 350, 150, 700, 0),
  circleGuide(2201, 220101, 1_200, 1_000, 750),
  circleGuide(2202, 220201, 3_200, 3_000, 700),
  circleGuide(2204, 220401, 1_050, 850, 700),
  circleGuide(3201, 320102, 300, 100, 1000),
  circleGuide(3404, 340401, 764, 564, 1500),
  circleGuide(3501, 350101, 400, 200, 1500),
  ...[410201, 410202, 410203, 410204, 410205].map((attackId) =>
    circleGuide(4102, attackId, 400, 200, 1000, 0),
  ),
  circleGuide(5103, 510301, 700, 500, 600),
  circleGuide(5103, 510302, 500, 100, 600),
  circleGuide(5103, 510303, 500, 100, 600),
  circleGuide(5303, 530302, 700, 500, 500),
  circleGuide(5304, 530401, 1_150, 950, 800, 0),
  circleGuide(5401, 540102, 300, 100, 550, 0),
]);

function sectorGuide(
  skillId: number,
  attackId: number,
  aliveMs: number,
  scalingMs: number,
  indicatorNativeAngle: number,
  indicatorNativeRadius: number,
  indicatorNativeOffset: number,
  indicatorIndex: number = 0,
): Mir4NativeRuntimeGuidePolicy {
  return Object.freeze({
    skillId,
    attackId,
    nativeApplyType: 0,
    applyTo: 'self',
    guideEffectId: 101,
    guideEffectType: 1,
    guideShape: 'sector',
    materialPathId: 100011,
    materialAssetPath: SECTOR_GUIDE_MATERIAL,
    aliveMs,
    scalingMs,
    materialScalarCurve: 'inside-linear-grow-then-hold',
    indicatorIndex,
    indicatorNativeAngle,
    indicatorNativeRadius,
    indicatorNativeOffset,
    colors: DIRECT_GUIDE_COLORS,
  });
}

const SECTOR_GUIDES = Object.freeze([
  sectorGuide(5101, 510102, 400, 200, 160, 700, -100),
  sectorGuide(5102, 510202, 0, 200, 160, 700, -100),
]);

/**
 * Exact preparation guides for the currently homologated direct actions.
 *
 * Sources:
 * - SKILL_ATTACK.json (sha256 a71fabdfff8883483566b622d2c909b946c015268b6da5a727459615106bba8c)
 *   row 110201: ForSelf (enum value 0), guide 103, 0.45 s alive, 0.25 s scaling.
 *   row 110401: ForSelf, guide 103, 0.85 s alive, 0.65 s scaling.
 *   row 130401: ForSelf, guide 103, 0.50 s alive, 0.30 s scaling.
 * - GUIDE_EFFECT.json (sha256 b79dfb1ad781de30cef7d70cf621d4cb2cab92a0a3a7bac8e51433c9a35a29fa)
 *   row 103: type 3, material selector 100013, exact color vectors below.
 * - GUIDE_EFFECT_APPLY_TYPE.h: enum order ForSelf, ForEnemy, ForAlly, ForAll.
 * - GUIDE_TYPE.h: enum order None, SectorForm, Circle, Direct, Cross; type 3 is Direct.
 * - MirMobile-Win64-Shipping.exe MM_ExecuteDecalComponent::TickComponent:
 *   linear elapsed/scaling progress capped at 1.0 is written to the dynamic
 *   material's `InsideName` scalar; the decal footprint itself is not scaled.
 *
 * Other skills remain closed until their own guide rows are admitted. The
 * canonical action checks make source drift fail closed instead of silently
 * reusing this presentation contract.
 */
export function mir4NativeRuntimeGuidePolicy(
  skillId: number,
  attackId: number,
): Mir4NativeRuntimeGuidePolicy | null {
  const policy = [...DIRECT_GUIDES, ...CIRCLE_GUIDES, ...SECTOR_GUIDES].find(
    (candidate) => candidate.skillId === skillId && candidate.attackId === attackId,
  );
  if (!policy) return null;
  const action = mir4NativeSkillActionById(skillId);
  const row = action?.rows.find((candidate) => candidate.attackId === attackId);
  const rawRow = mir4NativeDirectRawEvidenceBySkillId(skillId)?.rawAttackRecords.find(
    (candidate) => candidate.AttackID === attackId,
  );
  const guideAssetPaths =
    mir4NativeSkillAssetPresentationEvidence(skillId)?.presentation.guideAssetPaths ??
    action?.presentation.guideAssetPaths ??
    [];
  if (
    !action ||
    !row ||
    !rawRow ||
    action.indicator.type !== 0 ||
    action.indicator.index !== policy.indicatorIndex ||
    row.guideEffectId !== policy.guideEffectId ||
    rawRow.GuideEffectApplyType !== policy.nativeApplyType ||
    rawRow.GuideEffect !== policy.guideEffectId ||
    Math.round(rawRow.GuideEffectAliveTime * 1_000) !== policy.aliveMs ||
    Math.round(rawRow.GuideEffectScalingTime * 1_000) !== policy.scalingMs ||
    (!guideAssetPaths.includes(policy.materialAssetPath) &&
      !([2204, 3201, 4102].includes(policy.skillId) && policy.guideEffectId === 102) &&
      !(policy.skillId === 5201 && policy.guideEffectId === 103) &&
      !(policy.skillId === 5205 && policy.guideEffectId === 103) &&
      !(policy.skillId === 5104 && policy.guideEffectId === 103) &&
      !(policy.skillId === 5301 && policy.guideEffectId === 103) &&
      !(policy.skillId === 5401 && policy.guideEffectId === 102) &&
      !(policy.skillId === 5101 && policy.guideEffectId === 101) &&
      !(policy.skillId === 5102 && policy.guideEffectId === 101) &&
      !(policy.skillId === 5103 && policy.guideEffectId === 102) &&
      !(policy.skillId === 5303 && policy.guideEffectId === 102) &&
      !(policy.skillId === 5304 && policy.guideEffectId === 102))
  ) {
    return null;
  }
  if (
    policy.guideShape === 'direct' &&
    (policy.indicatorIndex === 0
      ? row.geometry.nativeDistanceMax !== policy.indicatorNativeLength ||
        row.geometry.nativeWidth !== policy.indicatorNativeWidth ||
        row.geometry.nativeHeight !== (policy.indicatorNativeHeight ?? policy.indicatorNativeWidth)
      : action.indicator.nativeMax !== policy.indicatorNativeLength ||
        action.indicator.nativeWidth !== policy.indicatorNativeWidth)
  ) {
    return null;
  }
  if (
    policy.guideShape === 'circle' &&
    (row.geometry.angleDegrees !== 360 ||
      row.geometry.nativeDistanceMin !== 0 ||
      row.geometry.nativeDistanceMax !== policy.indicatorNativeRadius ||
      row.geometry.nativeWidth !== 0)
  ) {
    return null;
  }
  if (
    policy.guideShape === 'sector' &&
    (row.geometry.angleDegrees !== policy.indicatorNativeAngle ||
      row.geometry.nativeDistanceMin !== 0 ||
      row.geometry.nativeDistanceMax !== policy.indicatorNativeRadius ||
      row.geometry.nativeOffset.x !== policy.indicatorNativeOffset ||
      row.geometry.nativeOffset.y !== 0 ||
      row.geometry.nativeOffset.z !== 0 ||
      row.geometry.nativeWidth !== 0)
  ) {
    return null;
  }
  return policy;
}
