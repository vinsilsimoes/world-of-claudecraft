// Pure document and validation core for spatial quest authoring. The editor
// keeps these overrides separate from generated campaign data, then exports a
// small reviewed file that production world composition can consume.

import type { Mir4ArcMapProjection } from '../sim/types';

export const QUEST_ANCHOR_DOCUMENT_VERSION = 1;
export const QUEST_ANCHOR_MIN_SEPARATION = 4;
const MAX_PLANS = 2_000;
const MAX_POINTS_PER_PLAN = 100;
const MAX_ID_LENGTH = 80;
const MAX_COORDINATE = 10_000;

export interface QuestAnchorPoint {
  x: number;
  z: number;
}

export interface QuestAnchorPlan {
  mapId: string;
  questId: string;
  stageIndex: number;
  points: readonly QuestAnchorPoint[];
}

export interface QuestAnchorDocument {
  version: typeof QUEST_ANCHOR_DOCUMENT_VERSION;
  plans: readonly QuestAnchorPlan[];
}

export type QuestAnchorIssueCode = 'point_count' | 'invalid_coordinate' | 'point_overlap';

export interface QuestAnchorIssue {
  code: QuestAnchorIssueCode;
  pointIndex?: number;
  otherPointIndex?: number;
  expected?: number;
  actual?: number;
}

export function createQuestAnchorDocument(
  plans: readonly QuestAnchorPlan[] = [],
): QuestAnchorDocument {
  return {
    version: QUEST_ANCHOR_DOCUMENT_VERSION,
    plans: plans.map(clonePlan),
  };
}

function clonePlan(plan: Readonly<QuestAnchorPlan>): QuestAnchorPlan {
  return {
    mapId: plan.mapId,
    questId: plan.questId,
    stageIndex: plan.stageIndex,
    points: plan.points.map((point) => ({ ...point })),
  };
}

function planMatches(
  plan: Readonly<QuestAnchorPlan>,
  questId: string,
  stageIndex: number,
): boolean {
  return plan.questId === questId && plan.stageIndex === stageIndex;
}

export function questAnchorPlan(
  document: Readonly<QuestAnchorDocument>,
  questId: string,
  stageIndex: number,
): QuestAnchorPlan | null {
  const plan = document.plans.find((candidate) => planMatches(candidate, questId, stageIndex));
  return plan ? clonePlan(plan) : null;
}

export function upsertQuestAnchorPlan(
  document: Readonly<QuestAnchorDocument>,
  nextPlan: Readonly<QuestAnchorPlan>,
): QuestAnchorDocument {
  const plans = document.plans.map(clonePlan);
  const index = plans.findIndex((plan) => planMatches(plan, nextPlan.questId, nextPlan.stageIndex));
  const next = clonePlan(nextPlan);
  if (index >= 0) plans[index] = next;
  else plans.push(next);
  plans.sort(
    (left, right) =>
      left.mapId.localeCompare(right.mapId) ||
      left.questId.localeCompare(right.questId) ||
      left.stageIndex - right.stageIndex,
  );
  return createQuestAnchorDocument(plans);
}

export function setQuestAnchorPoint(
  document: Readonly<QuestAnchorDocument>,
  questId: string,
  stageIndex: number,
  pointIndex: number,
  point: Readonly<QuestAnchorPoint>,
): QuestAnchorDocument {
  const plan = questAnchorPlan(document, questId, stageIndex);
  if (!plan || pointIndex < 0 || pointIndex > plan.points.length)
    return createQuestAnchorDocument(document.plans);
  const points = plan.points.map((candidate) => ({ ...candidate }));
  points[pointIndex] = { ...point };
  return upsertQuestAnchorPlan(document, { ...plan, points });
}

export function removeQuestAnchorPoint(
  document: Readonly<QuestAnchorDocument>,
  questId: string,
  stageIndex: number,
  pointIndex: number,
): QuestAnchorDocument {
  const plan = questAnchorPlan(document, questId, stageIndex);
  if (!plan || pointIndex < 0 || pointIndex >= plan.points.length) {
    return createQuestAnchorDocument(document.plans);
  }
  const points = plan.points.filter((_point, index) => index !== pointIndex);
  return upsertQuestAnchorPlan(document, { ...plan, points });
}

export function validateQuestAnchorPlan(
  plan: Readonly<QuestAnchorPlan>,
  expectedPointCount: number,
  minimumSeparation = QUEST_ANCHOR_MIN_SEPARATION,
): QuestAnchorIssue[] {
  const issues: QuestAnchorIssue[] = [];
  if (plan.points.length !== expectedPointCount) {
    issues.push({
      code: 'point_count',
      expected: expectedPointCount,
      actual: plan.points.length,
    });
  }
  for (let index = 0; index < plan.points.length; index += 1) {
    const point = plan.points[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) {
      issues.push({ code: 'invalid_coordinate', pointIndex: index });
    }
  }
  for (let index = 0; index < plan.points.length; index += 1) {
    const point = plan.points[index];
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z)) continue;
    for (let prior = 0; prior < index; prior += 1) {
      const other = plan.points[prior];
      if (!other || !Number.isFinite(other.x) || !Number.isFinite(other.z)) continue;
      if (Math.hypot(point.x - other.x, point.z - other.z) < minimumSeparation) {
        issues.push({ code: 'point_overlap', pointIndex: index, otherPointIndex: prior });
        break;
      }
    }
  }
  return issues;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

function roundedCoordinate(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (Math.abs(value) > MAX_COORDINATE) return null;
  return Math.round(value * 100) / 100;
}

function parsePlan(value: unknown): QuestAnchorPlan | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!validId(row.mapId) || !validId(row.questId)) return null;
  if (!Number.isInteger(row.stageIndex) || (row.stageIndex as number) < 0) return null;
  if (!Array.isArray(row.points) || row.points.length > MAX_POINTS_PER_PLAN) return null;
  const points: QuestAnchorPoint[] = [];
  for (const valuePoint of row.points) {
    if (!valuePoint || typeof valuePoint !== 'object') return null;
    const point = valuePoint as Record<string, unknown>;
    const x = roundedCoordinate(point.x);
    const z = roundedCoordinate(point.z);
    if (x === null || z === null) return null;
    points.push({ x, z });
  }
  return {
    mapId: row.mapId,
    questId: row.questId,
    stageIndex: row.stageIndex as number,
    points,
  };
}

export function parseQuestAnchorDocument(value: unknown): QuestAnchorDocument | null {
  if (!value || typeof value !== 'object') return null;
  const document = value as Record<string, unknown>;
  if (document.version !== QUEST_ANCHOR_DOCUMENT_VERSION || !Array.isArray(document.plans)) {
    return null;
  }
  if (document.plans.length > MAX_PLANS) return null;
  const plans: QuestAnchorPlan[] = [];
  const seen = new Set<string>();
  for (const valuePlan of document.plans) {
    const plan = parsePlan(valuePlan);
    if (!plan) return null;
    const key = `${plan.questId}:${plan.stageIndex}`;
    if (seen.has(key)) return null;
    seen.add(key);
    plans.push(plan);
  }
  return createQuestAnchorDocument(plans);
}

/** Apply authored quest points to a campaign projection without mutating either input. */
export function applyQuestAnchorDocumentToProjections(
  document: Readonly<QuestAnchorDocument>,
  projections: readonly Mir4ArcMapProjection[],
): readonly Mir4ArcMapProjection[] {
  return projections.map((projection) => {
    const overrides = document.plans.filter((plan) => plan.mapId === projection.mapId);
    if (overrides.length === 0) {
      return {
        ...projection,
        objectiveAnchors: projection.objectiveAnchors?.map(cloneObjectiveAnchor),
      };
    }
    const replaced = new Set(overrides.map((plan) => `${plan.questId}:${plan.stageIndex}`));
    const retained = (projection.objectiveAnchors ?? []).filter(
      (plan) => !replaced.has(`${plan.questId}:${plan.stageIndex}`),
    );
    return {
      ...projection,
      objectiveAnchors: [
        ...overrides.map(cloneObjectiveAnchor),
        ...retained.map(cloneObjectiveAnchor),
      ],
    };
  });
}

type ObjectiveAnchor = NonNullable<Mir4ArcMapProjection['objectiveAnchors']>[number];

function cloneObjectiveAnchor(plan: Readonly<ObjectiveAnchor>): ObjectiveAnchor {
  return {
    questId: plan.questId,
    stageIndex: plan.stageIndex,
    points: plan.points.map((point) => ({ ...point })),
  };
}
