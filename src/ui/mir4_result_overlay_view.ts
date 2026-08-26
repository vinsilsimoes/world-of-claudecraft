// Pure presentation policy for the MIR4 result overlay. The sim sends only
// authoritative facts; this module decides which visual tone and localized
// message family represents them without touching the DOM or a clock.

import type { SimEvent } from '../sim/types';
import type { TranslationKey } from './i18n';

export type Mir4ResultTone = 'success' | 'great' | 'warning' | 'failure' | 'danger';
export type Mir4ResultIcon = 'check' | 'crown' | 'enchant-rune' | 'skull' | 'questlog';

export interface Mir4ResultOverlayView {
  kind: 'enhancement' | 'collection' | 'combination' | 'training' | 'mission';
  tone: Mir4ResultTone;
  icon: Mir4ResultIcon;
  titleKey: TranslationKey;
  detailKey: TranslationKey;
  itemId?: number;
  previousLevel?: number;
  targetLevel?: number;
  level?: number;
  chanceBps?: number;
  collection?: 'spirit' | 'mount';
  collectionId?: string;
  grade?: number;
  batchCount?: number;
  gradeCounts?: readonly [number, number, number, number, number, number];
  successCount?: number;
  failureCount?: number;
  questId?: string;
  branchId?: number;
}

export function buildMir4ResultOverlayView(event: SimEvent): Mir4ResultOverlayView | null {
  if (event.type === 'mir4EnhancementResult') {
    if (event.outcome === 'denied') return null;
    const base = {
      kind: 'enhancement' as const,
      detailKey: 'hudChrome.mir4.results.enhancementDetail' as const,
      itemId: event.itemId,
      previousLevel: event.previousLevel,
      targetLevel: event.targetLevel,
      level: event.level,
      chanceBps: event.chanceBps,
    };
    if (event.outcome === 'success') {
      return {
        ...base,
        tone: 'success',
        icon: 'enchant-rune',
        titleKey: 'hudChrome.mir4.results.enhancementSuccess',
      };
    }
    if (event.outcome === 'protected') {
      return {
        ...base,
        tone: 'warning',
        icon: 'enchant-rune',
        titleKey: 'hudChrome.mir4.results.enhancementProtected',
      };
    }
    if (event.outcome === 'destroyed') {
      return {
        ...base,
        tone: 'danger',
        icon: 'skull',
        titleKey: 'hudChrome.mir4.results.enhancementDestroyed',
      };
    }
    return {
      ...base,
      tone: 'failure',
      icon: 'enchant-rune',
      titleKey: 'hudChrome.mir4.results.enhancementFailed',
    };
  }

  if (event.type === 'mir4CollectionResult') {
    return {
      kind: 'collection',
      tone: event.grade >= 4 ? 'great' : 'success',
      icon: event.grade >= 4 ? 'crown' : 'check',
      titleKey:
        event.collection === 'spirit'
          ? 'hudChrome.mir4.results.spiritSummoned'
          : 'hudChrome.mir4.results.mountSummoned',
      detailKey:
        event.batchCount && event.batchCount > 1
          ? 'hudChrome.mir4.results.collectionBatchReveal'
          : 'hudChrome.mir4.results.collectionReveal',
      collection: event.collection,
      collectionId: event.collectionId,
      grade: event.grade,
      ...(event.batchCount ? { batchCount: event.batchCount } : {}),
      ...(event.gradeCounts ? { gradeCounts: event.gradeCounts } : {}),
    };
  }

  if (event.type === 'mir4CombinationResult') {
    return {
      kind: 'combination',
      tone: event.outcome === 'success' ? 'great' : 'failure',
      icon: event.outcome === 'success' ? 'crown' : 'enchant-rune',
      titleKey:
        event.outcome === 'success'
          ? 'hudChrome.mir4.results.combinationSuccess'
          : 'hudChrome.mir4.results.combinationFailed',
      detailKey:
        event.batchCount && event.batchCount > 1
          ? 'hudChrome.mir4.results.combinationBatchReveal'
          : 'hudChrome.mir4.results.collectionReveal',
      collection: event.collection,
      collectionId: event.collectionId,
      grade: event.grade ?? event.sourceGrade,
      ...(event.batchCount ? { batchCount: event.batchCount } : {}),
      ...(event.successCount !== undefined ? { successCount: event.successCount } : {}),
      ...(event.failureCount !== undefined ? { failureCount: event.failureCount } : {}),
    };
  }

  if (event.type === 'mir4SolitudeTrainingResult') {
    return {
      kind: 'training',
      tone:
        event.outcome === 'success'
          ? 'success'
          : event.outcome === 'critical-failure'
            ? 'danger'
            : 'failure',
      icon: event.outcome === 'success' ? 'check' : 'enchant-rune',
      titleKey:
        event.outcome === 'success'
          ? 'hudChrome.mir4.results.solitudeSuccess'
          : event.outcome === 'critical-failure'
            ? 'hudChrome.mir4.results.solitudeCriticalFailed'
            : 'hudChrome.mir4.results.solitudeFailed',
      detailKey: 'hudChrome.mir4.results.solitudeDetail',
      branchId: event.branchId,
      previousLevel: event.previousLevel,
      level: event.level,
      chanceBps: event.chanceBps,
    };
  }

  if (event.type === 'questDone') {
    return {
      kind: 'mission',
      tone: 'success',
      icon: 'questlog',
      titleKey: 'hudChrome.mir4.results.missionComplete',
      detailKey: 'hudChrome.mir4.results.missionDetail',
      questId: event.questId,
    };
  }

  if (event.type === 'delveComplete' || event.type === 'delveFailed') {
    const success = event.type === 'delveComplete';
    return {
      kind: 'mission',
      tone: success ? 'great' : 'failure',
      icon: success ? 'crown' : 'skull',
      titleKey: success
        ? 'hudChrome.mir4.results.battleVictory'
        : 'hudChrome.mir4.results.missionFailed',
      detailKey: 'hudChrome.mir4.results.verdictDetail',
    };
  }

  return null;
}
