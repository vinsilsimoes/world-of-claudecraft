// Product progression rules layered over the source-extracted MIR4 skill
// catalogue. Skill admission follows each official client row's class-level
// requirement; Aeldrune retains its fifteen authored upgrade ranks.

export const MIR4_SKILL_MAX_LEVEL = 15;
export const MIR4_ULTIMATE_UNLOCK_LEVEL = 1;

export type Mir4SkillUnlock =
  | { readonly kind: 'initial-deck' }
  | { readonly kind: 'level'; readonly level: number };

export type Mir4KnowledgeTomeKey =
  | 'knowledgeTomeCommon'
  | 'knowledgeTomeRare'
  | 'knowledgeTomeEpic'
  | 'knowledgeTomeLegendary';

export interface Mir4KnowledgeTomeCost {
  readonly key: Mir4KnowledgeTomeKey;
  readonly count: 1;
}

/** Resolve the class-level requirement preserved on an official MIR4 skill row. */
export function mir4SkillUnlockLevel(skill: { readonly unlock: Mir4SkillUnlock }): number {
  return skill.unlock.kind === 'initial-deck' ? 1 : Math.max(1, Math.floor(skill.unlock.level));
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
