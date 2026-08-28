import { describe, expect, it } from 'vitest';
import {
  applyQuestAnchorDocumentToProjections,
  createQuestAnchorDocument,
  parseQuestAnchorDocument,
  removeQuestAnchorPoint,
  setQuestAnchorPoint,
  upsertQuestAnchorPlan,
  validateQuestAnchorPlan,
} from '../src/editor/quest_authoring_core';

function plan(
  mapId: string,
  questId: string,
  stageIndex: number,
  points: readonly { x: number; z: number }[],
) {
  return { mapId, questId, stageIndex, points };
}

describe('quest spatial authoring', () => {
  it('creates and updates one stable plan per quest stage', () => {
    const initial = createQuestAnchorDocument();
    const withPlan = upsertQuestAnchorPlan(initial, {
      mapId: 'm01-vila-do-vau',
      questId: 'M01-Q01',
      stageIndex: 2,
      points: [
        { x: 10, z: 20 },
        { x: 16, z: 20 },
        { x: 22, z: 20 },
      ],
    });
    const moved = setQuestAnchorPoint(withPlan, 'M01-Q01', 2, 1, { x: 18, z: 24 });

    expect(initial.plans).toEqual([]);
    expect(moved.plans).toHaveLength(1);
    expect(moved.plans[0]?.points[1]).toEqual({ x: 18, z: 24 });
    expect(withPlan.plans[0]?.points[1]).toEqual({ x: 16, z: 20 });
  });

  it('adds and removes objective points without mutating the prior document', () => {
    const seeded = upsertQuestAnchorPlan(createQuestAnchorDocument(), {
      mapId: 'm02-trilha-dos-juncos',
      questId: 'M02-Q02',
      stageIndex: 1,
      points: [{ x: -380, z: 208 }],
    });
    const added = setQuestAnchorPoint(seeded, 'M02-Q02', 1, 1, { x: -372, z: 212 });
    const removed = removeQuestAnchorPoint(added, 'M02-Q02', 1, 0);

    expect(seeded.plans[0]?.points).toEqual([{ x: -380, z: 208 }]);
    expect(added.plans[0]?.points).toHaveLength(2);
    expect(removed.plans[0]?.points).toEqual([{ x: -372, z: 212 }]);
  });

  it('reports count, overlap and invalid-coordinate problems', () => {
    const issues = validateQuestAnchorPlan(
      {
        mapId: 'm03-bosque-do-vale',
        questId: 'M03-Q06',
        stageIndex: 2,
        points: [
          { x: 10, z: 10 },
          { x: 11, z: 10 },
          { x: Number.NaN, z: 12 },
        ],
      },
      4,
      4,
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      'point_count',
      'invalid_coordinate',
      'point_overlap',
    ]);
  });

  it('sanitizes imported documents and rejects unsupported versions', () => {
    expect(
      parseQuestAnchorDocument({
        version: 1,
        plans: [
          {
            mapId: 'm01-vila-do-vau',
            questId: 'M01-Q01',
            stageIndex: 2,
            points: [{ x: 1.23456, z: 2.34567 }],
          },
        ],
      }),
    ).toEqual({
      version: 1,
      plans: [
        {
          mapId: 'm01-vila-do-vau',
          questId: 'M01-Q01',
          stageIndex: 2,
          points: [{ x: 1.23, z: 2.35 }],
        },
      ],
    });
    expect(parseQuestAnchorDocument({ version: 2, plans: [] })).toBeNull();
    expect(
      parseQuestAnchorDocument({
        version: 1,
        plans: [plan('m01', 'M01-Q01', -1, [{ x: 0, z: 0 }])],
      }),
    ).toBeNull();
    expect(
      parseQuestAnchorDocument({
        version: 1,
        plans: [
          plan('m01', 'M01-Q01', 2, [{ x: 0, z: 0 }]),
          plan('m02', 'M01-Q01', 2, [{ x: 8, z: 8 }]),
        ],
      }),
    ).toBeNull();
  });

  it('accepts exactly four yards and rejects a smaller separation', () => {
    const base = plan('m01', 'M01-Q01', 2, [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
    ]);
    expect(validateQuestAnchorPlan(base, 2)).toEqual([]);
    expect(
      validateQuestAnchorPlan(
        {
          ...base,
          points: [
            { x: 0, z: 0 },
            { x: 3.99, z: 0 },
          ],
        },
        2,
      ),
    ).toEqual([{ code: 'point_overlap', pointIndex: 1, otherPointIndex: 0 }]);
  });

  it('applies authored points to playtest projections and preserves other stages', () => {
    const document = createQuestAnchorDocument([plan('m01', 'M01-Q01', 2, [{ x: 80, z: 90 }])]);
    const source = [
      {
        mapId: 'm01',
        targetZoneId: 'eastbrook_vale',
        source: { xMin: 0, xMax: 10, zMin: 0, zMax: 10 },
        target: { xMin: 0, xMax: 10, zMin: 0, zMax: 10 },
        controlPoints: [],
        localScale: 1,
        portalIn: { x: 0, z: 0 },
        portalOut: { x: 10, z: 10 },
        objectiveAnchors: [
          { questId: 'M01-Q01', stageIndex: 2, points: [{ x: 1, z: 1 }] },
          { questId: 'M01-Q02', stageIndex: 1, points: [{ x: 2, z: 2 }] },
        ],
      },
    ];

    const applied = applyQuestAnchorDocumentToProjections(document, source);

    expect(applied[0]?.objectiveAnchors).toEqual([
      { questId: 'M01-Q01', stageIndex: 2, points: [{ x: 80, z: 90 }] },
      { questId: 'M01-Q02', stageIndex: 1, points: [{ x: 2, z: 2 }] },
    ]);
    expect(source[0]?.objectiveAnchors?.[0]?.points[0]).toEqual({ x: 1, z: 1 });
  });
});
