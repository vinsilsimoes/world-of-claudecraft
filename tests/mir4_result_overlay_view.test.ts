import { describe, expect, it } from 'vitest';

import { buildMir4ResultOverlayView } from '../src/ui/mir4_result_overlay_view';

describe('MIR4 result overlay view', () => {
  it('maps enhancement outcomes to distinct readable tones', () => {
    const base = {
      type: 'mir4EnhancementResult' as const,
      pid: 1,
      itemId: 991010101,
      previousLevel: 5,
      targetLevel: 6,
      level: 5,
      chanceBps: 50_000,
    };

    expect(buildMir4ResultOverlayView({ ...base, outcome: 'success', level: 6 })).toMatchObject({
      tone: 'success',
      icon: 'enchant-rune',
      titleKey: 'hudChrome.mir4.results.enhancementSuccess',
    });
    expect(buildMir4ResultOverlayView({ ...base, outcome: 'protected' })).toMatchObject({
      tone: 'warning',
      titleKey: 'hudChrome.mir4.results.enhancementProtected',
    });
    expect(buildMir4ResultOverlayView({ ...base, outcome: 'destroyed' })).toMatchObject({
      tone: 'danger',
      icon: 'skull',
      titleKey: 'hudChrome.mir4.results.enhancementDestroyed',
    });
    expect(buildMir4ResultOverlayView({ ...base, outcome: 'failure' })).toMatchObject({
      tone: 'failure',
      titleKey: 'hudChrome.mir4.results.enhancementFailed',
    });
    expect(buildMir4ResultOverlayView({ ...base, outcome: 'denied' })).toBeNull();
  });

  it('elevates high-grade collection reveals and maps combination failure', () => {
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CollectionResult',
        pid: 1,
        collection: 'spirit',
        ticketId: 'spirit-ticket-sunset',
        collectionId: 'spirit-epic-06',
        grade: 4,
        status: 'pending-confirmation',
      }),
    ).toEqual({
      kind: 'collection',
      tone: 'great',
      icon: 'crown',
      titleKey: 'hudChrome.mir4.results.spiritSummoned',
      detailKey: 'hudChrome.mir4.results.collectionReveal',
      collection: 'spirit',
      collectionId: 'spirit-epic-06',
      grade: 4,
    });
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CombinationResult',
        pid: 1,
        collection: 'spirit',
        sourceGrade: 2,
        outcome: 'failure',
        collectionId: 'spirit-uncommon-01',
        grade: 2,
        status: 'owned',
      }),
    ).toMatchObject({
      kind: 'combination',
      tone: 'failure',
      titleKey: 'hudChrome.mir4.results.combinationFailed',
    });
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CollectionResult',
        pid: 1,
        collection: 'mount',
        ticketId: 'mount-ticket-dawn',
        collectionId: 'meadow-courser',
        grade: 1,
        status: 'owned',
      }),
    ).toMatchObject({
      kind: 'collection',
      tone: 'success',
      icon: 'check',
      titleKey: 'hudChrome.mir4.results.mountSummoned',
    });
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CombinationResult',
        pid: 1,
        collection: 'mount',
        sourceGrade: 3,
        outcome: 'success',
        collectionId: 'eclipse-lion',
        grade: 4,
        status: 'pending-confirmation',
      }),
    ).toMatchObject({
      kind: 'combination',
      tone: 'great',
      titleKey: 'hudChrome.mir4.results.combinationSuccess',
    });
  });

  it('keeps the full grade distribution for a summarized batch reveal', () => {
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CollectionResult',
        pid: 1,
        collection: 'spirit',
        ticketId: 'spirit-ticket-sunset',
        collectionId: 'spirit-epic-06',
        grade: 4,
        status: 'pending-confirmation',
        batchCount: 100,
        gradeCounts: [0, 99, 0, 1, 0, 0],
      }),
    ).toMatchObject({
      detailKey: 'hudChrome.mir4.results.collectionBatchReveal',
      batchCount: 100,
      gradeCounts: [0, 99, 0, 1, 0, 0],
    });
  });

  it('maps combine-all totals to one summarized result', () => {
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CombinationResult',
        pid: 1,
        collection: 'spirit',
        sourceGrade: 1,
        outcome: 'success',
        collectionId: 'spirit-uncommon-01',
        grade: 2,
        status: 'owned',
        batchCount: 10,
        successCount: 4,
        failureCount: 6,
      }),
    ).toMatchObject({
      detailKey: 'hudChrome.mir4.results.combinationBatchReveal',
      batchCount: 10,
      successCount: 4,
      failureCount: 6,
    });
  });

  it('keeps an all-failure combine-all summary in the failure tone', () => {
    expect(
      buildMir4ResultOverlayView({
        type: 'mir4CombinationResult',
        pid: 1,
        collection: 'spirit',
        sourceGrade: 1,
        outcome: 'failure',
        collectionId: 'spirit-common-01',
        grade: 1,
        status: 'owned',
        batchCount: 2,
        successCount: 0,
        failureCount: 2,
      }),
    ).toMatchObject({
      tone: 'failure',
      detailKey: 'hudChrome.mir4.results.combinationBatchReveal',
      batchCount: 2,
      successCount: 0,
      failureCount: 2,
    });
  });

  it('reuses the same presentation for quest and delve verdicts', () => {
    expect(buildMir4ResultOverlayView({ type: 'questDone', questId: 'M01-Q01' })).toMatchObject({
      kind: 'mission',
      tone: 'success',
    });
    expect(
      buildMir4ResultOverlayView({ type: 'delveComplete', delveId: 'hollow', tierId: 'normal' }),
    ).toMatchObject({ kind: 'mission', tone: 'great' });
    expect(
      buildMir4ResultOverlayView({ type: 'delveFailed', delveId: 'hollow', tierId: 'normal' }),
    ).toMatchObject({ kind: 'mission', tone: 'failure' });
  });

  it('distinguishes Solitude Training failure from critical level loss', () => {
    const base = {
      type: 'mir4SolitudeTrainingResult' as const,
      pid: 1,
      branchId: 1,
      previousLevel: 3,
      level: 3,
      chanceBps: 3_500,
    };
    expect(buildMir4ResultOverlayView({ ...base, outcome: 'failure' })).toMatchObject({
      kind: 'training',
      tone: 'failure',
      titleKey: 'hudChrome.mir4.results.solitudeFailed',
    });
    expect(
      buildMir4ResultOverlayView({ ...base, outcome: 'critical-failure', level: 2 }),
    ).toMatchObject({
      kind: 'training',
      tone: 'danger',
      titleKey: 'hudChrome.mir4.results.solitudeCriticalFailed',
      previousLevel: 3,
      level: 2,
    });
  });
});
