import { describe, expect, it } from 'vitest';
import { MIR4_QUESTS_ARC, mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import {
  mir4ArcObjectiveUsesInteract,
  mir4ArcStageAnchor,
} from '../../src/sim/mir4/arc_quest_runtime';
import { mir4ArcStageGoal } from '../../src/sim/mir4/arc_quests';
import {
  MIR4_QUEST_SEARCH_MAX_RADIUS,
  mir4QuestSearchAreas,
} from '../../src/sim/mir4/quest_search_areas';
import type { Mir4QuestTrackerEntry } from '../../src/sim/mir4/quest_tracker';
import { buildMir4WocComparisonWorld } from '../../src/sim/mir4/woc_comparison_world';

function entry(
  overrides: Partial<Mir4QuestTrackerEntry> & Pick<Mir4QuestTrackerEntry, 'id'>,
): Mir4QuestTrackerEntry {
  const { id, ...rest } = overrides;
  return {
    id,
    complete: false,
    autoJourneyActive: false,
    autoJourneySuspended: false,
    objective: {
      kind: 'campaign-stage',
      stageKind: 'prepare-civilians',
      stageIndex: 1,
      current: 0,
      total: 3,
    },
    ...rest,
  };
}

describe('MIR4 quest search areas', () => {
  it('encloses every remaining physical objective in local mission circles', () => {
    const world = buildMir4WocComparisonWorld();
    const tracker = entry({ id: 'M01-S03' });
    const areas = mir4QuestSearchAreas([tracker], world.mir4ArcMapProjections);
    expect(areas.length).toBeGreaterThan(0);
    expect(areas.every((area) => area.questId === 'M01-S03')).toBe(true);
    expect(areas.every((area) => area.radius >= 6 && area.radius <= 16)).toBe(true);

    const stage = mir4ArcQuest('M01-S03')?.stages[1];
    expect(stage).toBeDefined();
    if (!stage) return;
    for (let index = tracker.objective.current; index < tracker.objective.total; index += 1) {
      const anchor = mir4ArcStageAnchor(tracker.id, stage, index, world.mir4ArcMapProjections);
      expect(anchor).not.toBeNull();
      if (!anchor) continue;
      expect(
        areas.some(
          (area) => Math.hypot(anchor.x - area.center.x, anchor.z - area.center.z) <= area.radius,
        ),
      ).toBe(true);
    }
  });

  it('recomputes circles from only the remaining objectives and stops at the total', () => {
    const world = buildMir4WocComparisonWorld();
    const all = mir4QuestSearchAreas([entry({ id: 'M01-S03' })], world.mir4ArcMapProjections);
    const remaining = mir4QuestSearchAreas(
      [
        entry({
          id: 'M01-S03',
          objective: {
            kind: 'campaign-stage',
            stageKind: 'prepare-civilians',
            stageIndex: 1,
            current: 2,
            total: 3,
          },
        }),
      ],
      world.mir4ArcMapProjections,
    );
    expect(remaining).toHaveLength(1);
    expect(remaining).not.toEqual(all);
    expect(
      mir4QuestSearchAreas(
        [
          entry({
            id: 'M01-S03',
            objective: {
              kind: 'campaign-stage',
              stageKind: 'prepare-civilians',
              stageIndex: 1,
              current: 3,
              total: 3,
            },
          }),
        ],
        world.mir4ArcMapProjections,
      ),
    ).toEqual([]);
  });

  it('keeps every campaign search region local while covering every remaining anchor', () => {
    const world = buildMir4WocComparisonWorld();
    let checked = 0;
    for (const quest of MIR4_QUESTS_ARC) {
      for (let stageIndex = 0; stageIndex < quest.stages.length; stageIndex += 1) {
        const stage = quest.stages[stageIndex];
        if (!stage || !mir4ArcObjectiveUsesInteract(stage)) continue;
        const total = mir4ArcStageGoal(stage);
        if (total < 1) continue;
        for (let current = 0; current < total; current += 1) {
          const areas = mir4QuestSearchAreas(
            [
              entry({
                id: quest.questId,
                objective: {
                  kind: 'campaign-stage',
                  stageKind: stage.kind,
                  stageIndex,
                  current,
                  total,
                },
              }),
            ],
            world.mir4ArcMapProjections,
          );
          expect(areas.length, `${quest.questId}:${stageIndex}:${current}`).toBeGreaterThan(0);
          expect(
            areas.every((area) => area.radius <= MIR4_QUEST_SEARCH_MAX_RADIUS),
            `${quest.questId}:${stageIndex}:${current}`,
          ).toBe(true);
          for (let objectiveIndex = current; objectiveIndex < total; objectiveIndex += 1) {
            const anchor = mir4ArcStageAnchor(
              quest.questId,
              stage,
              objectiveIndex,
              world.mir4ArcMapProjections,
            );
            expect(anchor).not.toBeNull();
            if (!anchor) continue;
            expect(
              areas.some(
                (area) =>
                  Math.hypot(anchor.x - area.center.x, anchor.z - area.center.z) <= area.radius,
              ),
              `${quest.questId}:${stageIndex}:${current}:${objectiveIndex}`,
            ).toBe(true);
          }
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(700);
  });

  it('does not invent a search circle for combat, completed, or turn-in stages', () => {
    expect(
      mir4QuestSearchAreas([
        entry({
          id: 'M01-S03',
          objective: {
            kind: 'campaign-stage',
            stageKind: 'defend-anchor',
            stageIndex: 2,
            current: 0,
            total: 1,
          },
        }),
        entry({ id: 'M01-S03', complete: true }),
        entry({
          id: 'M01-S03',
          objective: { kind: 'return-giver', current: 0, total: 1 },
        }),
      ]),
    ).toEqual([]);
  });
});
