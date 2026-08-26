// Pure search-area projection for active MIR4 physical objectives. The minimap
// consumes quest identity plus world geometry; player-facing titles stay in UI.

import { mir4ArcQuest } from '../content/mir4/arc_campaign';
import type { Mir4ArcMapProjection } from '../types';
import { mir4ArcStageAnchor } from './arc_quest_runtime';
import { MIR4_ARC_INTERACT_STAGE_KINDS } from './arc_stage_kinds';
import type { Mir4QuestTrackerEntry } from './quest_tracker';

export interface Mir4QuestSearchArea {
  questId: string;
  center: { x: number; z: number };
  radius: number;
}

export const MIR4_QUEST_SEARCH_MIN_RADIUS = 6;
export const MIR4_QUEST_SEARCH_MAX_RADIUS = 16;
const MIR4_QUEST_SEARCH_PADDING = 2;
const MIR4_QUEST_SEARCH_MAX_CONTENT_RADIUS =
  MIR4_QUEST_SEARCH_MAX_RADIUS - MIR4_QUEST_SEARCH_PADDING;

function enclosingCircle(points: readonly { x: number; z: number }[]): {
  center: { x: number; z: number };
  contentRadius: number;
} {
  let x = 0;
  let z = 0;
  for (const point of points) {
    x += point.x;
    z += point.z;
  }
  const center = { x: x / points.length, z: z / points.length };
  let contentRadius = 0;
  for (const point of points) {
    contentRadius = Math.max(contentRadius, Math.hypot(point.x - center.x, point.z - center.z));
  }
  return { center, contentRadius };
}

function localPointGroups(
  points: readonly { x: number; z: number }[],
): { x: number; z: number }[][] {
  const remaining = points.map((point) => ({ ...point }));
  const groups: { x: number; z: number }[][] = [];
  while (remaining.length > 0) {
    const seed = remaining.shift();
    if (!seed) break;
    const group = [seed];
    remaining.sort(
      (a, b) => Math.hypot(a.x - seed.x, a.z - seed.z) - Math.hypot(b.x - seed.x, b.z - seed.z),
    );
    for (let index = 0; index < remaining.length; ) {
      const candidate = remaining[index];
      if (!candidate) {
        index += 1;
        continue;
      }
      if (
        enclosingCircle([...group, candidate]).contentRadius <= MIR4_QUEST_SEARCH_MAX_CONTENT_RADIUS
      ) {
        group.push(candidate);
        remaining.splice(index, 1);
      } else {
        index += 1;
      }
    }
    groups.push(group);
  }
  return groups;
}

export function mir4QuestSearchAreas(
  entries: readonly Mir4QuestTrackerEntry[],
  projections?: readonly Mir4ArcMapProjection[],
): Mir4QuestSearchArea[] {
  const areas: Mir4QuestSearchArea[] = [];
  for (const entry of entries) {
    const objective = entry.objective;
    if (
      entry.complete ||
      objective.kind !== 'campaign-stage' ||
      !objective.stageKind ||
      !MIR4_ARC_INTERACT_STAGE_KINDS.has(objective.stageKind)
    ) {
      continue;
    }
    const quest = mir4ArcQuest(entry.id);
    const stage = quest?.stages[objective.stageIndex ?? -1];
    if (!stage || objective.current >= objective.total) continue;
    const start = Math.max(0, objective.current);
    const points: { x: number; z: number }[] = [];
    for (let index = start; index < objective.total; index += 1) {
      const point = mir4ArcStageAnchor(entry.id, stage, index, projections);
      if (point) points.push(point);
    }
    if (points.length === 0) continue;
    for (const group of localPointGroups(points)) {
      const { center, contentRadius } = enclosingCircle(group);
      areas.push({
        questId: entry.id,
        center,
        radius: Math.max(MIR4_QUEST_SEARCH_MIN_RADIUS, contentRadius + MIR4_QUEST_SEARCH_PADDING),
      });
    }
  }
  return areas;
}
