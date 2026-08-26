// Product progression rules layered over the source-extracted MIR4 skill
// catalogue. The source rows preserve their original initial-deck admission
// and rank-2 experiment; Aeldrune deliberately replaces those two rules with
// a paced 1/10/20/30/40 active-skill curve and fifteen authored ranks.

export const MIR4_SKILL_MAX_LEVEL = 15;
export const MIR4_ULTIMATE_UNLOCK_LEVEL = 50;

export type Mir4KnowledgeTomeKey =
  | 'knowledgeTomeCommon'
  | 'knowledgeTomeRare'
  | 'knowledgeTomeEpic'
  | 'knowledgeTomeLegendary';

export interface Mir4KnowledgeTomeCost {
  readonly key: Mir4KnowledgeTomeKey;
  readonly count: 1;
}

/** Slot 1 is the starting action; every following catalogue slot waits ten levels. */
export function mir4SkillUnlockLevel(slot: number): number {
  const normalized = Math.max(1, Math.floor(slot));
  return normalized === 1 ? 1 : (normalized - 1) * 10;
}

/** The tome consumed while leaving `currentLevel`; rank 15 is already complete. */
export function mir4KnowledgeTomeForUpgrade(currentLevel: number): Mir4KnowledgeTomeCost | null {
  const level = Math.max(1, Math.floor(currentLevel));
  if (level >= MIR4_SKILL_MAX_LEVEL) return null;
  if (level <= 3) return { key: 'knowledgeTomeCommon', count: 1 };
  if (level <= 6) return { key: 'knowledgeTomeRare', count: 1 };
  if (level <= 9) return { key: 'knowledgeTomeEpic', count: 1 };
  return { key: 'knowledgeTomeLegendary', count: 1 };
}
