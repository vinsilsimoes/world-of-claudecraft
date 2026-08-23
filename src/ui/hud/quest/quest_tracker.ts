// Pure, host-agnostic core for the in-game quest tracker (the persistent
// #quest-tracker overlay). It decides WHAT the tracker shows given the active
// quests and the player's collapse preference, so the collapse + per-objective
// "done" logic is unit-testable without the DOM or a locale loaded.
//
// The thin consumer (quest_tracker_controller.ts) resolves quest/objective text
// through t(), formats the count through formatNumber, and renders this view
// model to HTML. Keeping this module fully string/DOM-free mirrors unit_portrait's
// pure-core split (the consumer owns all t()/formatNumber, the way xp_bar's does),
// so the collapse + done logic is testable without a locale loaded.

export interface TrackedObjective {
  /** Already-localized objective label. */
  label: string;
  current: number;
  total: number;
}

export interface TrackedQuest {
  id: string;
  /** 1-based acceptance-order number, matching the world map's badges. */
  number: number;
  /** Already-localized quest title. */
  title: string;
  /** True when the quest is ready to turn in (the "(Complete)" state). */
  complete: boolean;
  /** False when no compatible quest-detail provider exists for this profile. */
  openable?: boolean;
  /** Toggle state for rows that reuse the tracker as an inline action. */
  pressed?: boolean;
  /** Already-localized action hint for an actionable tracker row. */
  actionHint?: string;
  tutorial?: TrackedTutorial;
  objectives: readonly TrackedObjective[];
}

export interface TrackedTutorial {
  launcherId: string;
  tab?: string;
  destination: string;
  shortcut: string;
  steps: readonly string[];
  requirements: readonly string[];
}

export interface QuestTrackerObjectiveRow extends TrackedObjective {
  done: boolean;
}

export interface QuestTrackerQuestRow {
  id: string;
  number: number;
  title: string;
  complete: boolean;
  openable: boolean;
  pressed?: boolean;
  actionHint?: string;
  tutorial?: TrackedTutorial;
  objectives: QuestTrackerObjectiveRow[];
}

export interface QuestTrackerView {
  /** Whether to render anything at all (false when no quests are tracked). */
  visible: boolean;
  collapsed: boolean;
  /** Number of tracked quests; shown beside the header while collapsed. */
  count: number;
  /** The quest rows to render; empty when collapsed (header only). */
  quests: QuestTrackerQuestRow[];
}

/** Build the tracker view from the tracked quests + the collapse preference.
 *  Collapsed renders the header only (with the quest count); expanded renders
 *  every quest and objective, with each objective's done state computed. */
export function questTrackerView(
  quests: readonly TrackedQuest[],
  collapsed: boolean,
): QuestTrackerView {
  const count = quests.length;
  if (count === 0) return { visible: false, collapsed, count: 0, quests: [] };
  if (collapsed) return { visible: true, collapsed: true, count, quests: [] };
  const questRows = quests.map((q) => ({
    id: q.id,
    number: q.number,
    title: q.title,
    complete: q.complete,
    openable: q.openable !== false,
    pressed: q.pressed,
    actionHint: q.actionHint,
    tutorial: q.tutorial,
    objectives: q.objectives.map((o) => ({ ...o, done: o.current >= o.total })),
  }));
  return { visible: true, collapsed: false, count, quests: questRows };
}
