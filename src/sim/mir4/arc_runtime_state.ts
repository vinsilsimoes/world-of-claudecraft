// Session-only MIR4 campaign runtime state. The owning maps live on Sim and
// are exposed as live views through SimContext so multiple Sims in one process
// cannot share encounters, templates, or entity ownership.

import type { Entity, MobTemplate } from '../types';

export interface Mir4ArcEscortRun {
  key: string;
  pid: number;
  questId: string;
  stageIndex: number;
  npcId: number | null;
  checkpoint: number;
  waitingCheckpoint: boolean;
  ambushIds: number[];
  startedAt: number;
  started: boolean;
  respawnAt: number;
}

export interface Mir4ArcDungeonRun {
  key: string;
  claimKey: string;
  ownerPid: number;
  questId: string;
  stageIndex: number;
  instanceSlot: number;
  returnPos: { x: number; z: number };
  inside: boolean;
  reentryArmed: boolean;
  guardIds: number[];
  bossId: number | null;
}

export interface Mir4ArcEncounterRun {
  key: string;
  ownerPid: number;
  questId: string;
  stageIndex: number;
  entityId: number;
}

export type Mir4ArcRuntimeTemplateMap = Map<string, MobTemplate>;

export interface Mir4ArcRuntimeOwner {
  readonly mir4ArcEscortRuns: Map<string, Mir4ArcEscortRun>;
  readonly mir4ArcDungeonRuns: Map<string, Mir4ArcDungeonRun>;
  readonly mir4ArcEncounterRuns: Map<string, Mir4ArcEncounterRun>;
  readonly mir4RuntimeMobTemplates: Mir4ArcRuntimeTemplateMap;
}

/** Stable map references suitable for spreading into a SimContext view. */
export function mir4ArcRuntimeViews(owner: Mir4ArcRuntimeOwner): Mir4ArcRuntimeOwner {
  return {
    mir4ArcEscortRuns: owner.mir4ArcEscortRuns,
    mir4ArcDungeonRuns: owner.mir4ArcDungeonRuns,
    mir4ArcEncounterRuns: owner.mir4ArcEncounterRuns,
    mir4RuntimeMobTemplates: owner.mir4RuntimeMobTemplates,
  };
}

/** Drop a dynamic template once its last live/dead entity has left this Sim. */
export function releaseMir4RuntimeMobTemplate(
  owner: {
    entities: ReadonlyMap<number, Entity>;
    mir4RuntimeMobTemplates: Mir4ArcRuntimeTemplateMap;
  },
  templateId: string,
): void {
  for (const entity of owner.entities.values()) {
    if (entity.templateId === templateId) return;
  }
  owner.mir4RuntimeMobTemplates.delete(templateId);
}
