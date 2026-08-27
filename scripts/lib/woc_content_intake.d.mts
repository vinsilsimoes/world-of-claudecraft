export type WocContentCategory =
  | 'gameplay-blocked'
  | 'manual-review'
  | 'dungeon-adaptation'
  | 'world-adaptation'
  | 'engine-review'
  | 'asset-candidate'
  | 'unrelated';

export interface WocContentChange {
  status: string;
  path: string;
  oldPath?: string;
}

export interface ClassifiedWocContentChange extends WocContentChange {
  category: WocContentCategory;
  previousCategory?: WocContentCategory;
  reason: string;
}

export interface WocContentSummary {
  total: number;
  counts: Record<WocContentCategory, number>;
  reviewQueue: ClassifiedWocContentChange[];
  entries: ClassifiedWocContentChange[];
}

export function classifyWocContentChange(change: WocContentChange): ClassifiedWocContentChange;
export function summarizeWocContentChanges(changes: WocContentChange[]): WocContentSummary;
