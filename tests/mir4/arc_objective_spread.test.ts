import { describe, expect, it } from 'vitest';
import { resolvePosition } from '../../src/sim/colliders';
import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/arc_campaign';
import {
  MIR4_OBJECTIVE_MIN_SEPARATION,
  spreadMir4ObjectiveAnchors,
} from '../../src/sim/mir4/arc_objective_spread';
import {
  mir4ArcObjectiveUsesInteract,
  mir4ArcStageAnchor,
} from '../../src/sim/mir4/arc_quest_runtime';
import { mir4ArcStageGoal } from '../../src/sim/mir4/arc_quests';
import { buildMir4WocComparisonWorld } from '../../src/sim/mir4/woc_comparison_world';
import { PLAYER_BODY_RADIUS } from '../../src/sim/pathfind';
import { WORLD_SEED } from '../../src/sim/world_seed';

function minDistance(points: readonly { x: number; z: number }[]): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    for (let prior = 0; prior < index; prior += 1) {
      minimum = Math.min(
        minimum,
        Math.hypot(points[index]!.x - points[prior]!.x, points[index]!.z - points[prior]!.z),
      );
    }
  }
  return minimum;
}

describe('MIR4 sequential objective spread', () => {
  it('pins the readable separation contract at four world yards', () => {
    expect(MIR4_OBJECTIVE_MIN_SEPARATION).toBe(4);
  });

  it('preserves authored points that are already readable and spreads compressed points locally', () => {
    const authored = [
      { x: 10, z: 20 },
      { x: 18, z: 20 },
      { x: 14, z: 27 },
    ];
    expect(spreadMir4ObjectiveAnchors('authored', authored)).toEqual(authored);

    const compressed = [
      { x: 10, z: 20 },
      { x: 10.2, z: 20.1 },
      { x: 10.1, z: 20.2 },
    ];
    const spread = spreadMir4ObjectiveAnchors('compressed', compressed);
    expect(spread[0]).toEqual(compressed[0]);
    expect(minDistance(spread)).toBeGreaterThanOrEqual(MIR4_OBJECTIVE_MIN_SEPARATION);
    expect(spread.every((point) => Math.hypot(point.x - 10, point.z - 20) <= 10)).toBe(true);
    expect(spreadMir4ObjectiveAnchors('compressed', compressed)).toEqual(spread);
  });

  it('moves only compressed clusters and preserves distant authored objectives', () => {
    const authored = [
      { x: 0, z: 0 },
      { x: 1, z: 0 },
      { x: 100, z: 100 },
      { x: 101, z: 100 },
      { x: -120, z: 80 },
    ];
    const spread = spreadMir4ObjectiveAnchors('clustered', authored);
    expect(spread[0]).toEqual(authored[0]);
    expect(spread[2]).toEqual(authored[2]);
    expect(spread[4]).toEqual(authored[4]);
    expect(
      Math.hypot((spread[1]?.x ?? 0) - authored[0].x, (spread[1]?.z ?? 0) - authored[0].z),
    ).toBeLessThanOrEqual(22);
    expect(
      Math.hypot((spread[3]?.x ?? 0) - authored[2].x, (spread[3]?.z ?? 0) - authored[2].z),
    ).toBeLessThanOrEqual(22);
  });

  it('keeps every multi-step interaction in the WoC campaign distinct after projection', () => {
    const world = buildMir4WocComparisonWorld();
    let checked = 0;
    for (const quest of MIR4_QUESTS_ARC) {
      for (const stage of quest.stages) {
        if (!mir4ArcObjectiveUsesInteract(stage)) continue;
        const goal = mir4ArcStageGoal(stage);
        if (goal < 2) continue;
        const points = Array.from({ length: goal }, (_, objectiveIndex) =>
          mir4ArcStageAnchor(quest.questId, stage, objectiveIndex, world.mir4ArcMapProjections),
        ).filter((point): point is { x: number; z: number } => point !== null);
        expect(points, `${quest.questId}:${stage.kind}`).toHaveLength(goal);
        expect(minDistance(points), `${quest.questId}:${stage.kind}`).toBeGreaterThanOrEqual(4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('returns fresh collision-resolved anchors without poisoning later reads', () => {
    const world = buildMir4WocComparisonWorld();
    const quest = MIR4_QUESTS_ARC.find((candidate) => candidate.questId === 'M01-S03');
    const stage = quest?.stages[1];
    expect(stage).toBeDefined();
    if (!stage) return;
    const first = mir4ArcStageAnchor('M01-S03', stage, 1, world.mir4ArcMapProjections);
    expect(first).not.toBeNull();
    if (!first) return;
    const expected = { ...first };
    first.x += 1000;
    expect(mir4ArcStageAnchor('M01-S03', stage, 1, world.mir4ArcMapProjections)).toEqual(expected);
    expect(resolvePosition(WORLD_SEED, expected.x, expected.z, PLAYER_BODY_RADIUS)).toEqual(
      expected,
    );
  });
});
