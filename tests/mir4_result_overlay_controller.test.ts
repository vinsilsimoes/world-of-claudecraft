// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '../src/game/audio';
import type { SimEvent } from '../src/sim/types';
import { Mir4ResultOverlayController } from '../src/ui/mir4_result_overlay_controller';

vi.mock('../src/game/audio', () => ({
  audio: { click: vi.fn(), enchant: vi.fn(), achievement: vi.fn(), error: vi.fn() },
}));

describe('MIR4 result overlay controller', () => {
  beforeEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts the revealed Spirit model and restores the owning preview on dismissal', () => {
    const mountCollectionPreview = vi.fn();
    const restoreCollectionPreview = vi.fn();
    const controller = new Mir4ResultOverlayController(document, {
      mountCollectionPreview,
      restoreCollectionPreview,
    });
    const event: SimEvent = {
      type: 'mir4CollectionResult',
      collection: 'spirit',
      ticketId: 'spirit-ticket-sunset',
      collectionId: 'spirit-epic-01',
      grade: 4,
      status: 'pending-confirmation',
    };

    controller.handle(event);

    expect(mountCollectionPreview).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'spirit',
      'spirit-epic-01',
    );
    expect(document.querySelector('.mir4-result-model')).not.toBeNull();
    controller.skip();
    expect(restoreCollectionPreview).toHaveBeenCalledOnce();
    controller.dispose();
  });

  it('shows one readable summary with the complete batch grade distribution', () => {
    const controller = new Mir4ResultOverlayController(document);
    controller.handle({
      type: 'mir4CollectionResult',
      collection: 'spirit',
      ticketId: 'spirit-ticket-sunset',
      collectionId: 'spirit-epic-06',
      grade: 4,
      status: 'pending-confirmation',
      batchCount: 100,
      gradeCounts: [0, 99, 0, 1, 0, 0],
    });

    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('100 summons');
    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('Grade 2 × 99');
    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('Grade 4 × 1');
    controller.dispose();
  });

  it('shows combine-all success and failure totals in one ceremony', () => {
    const controller = new Mir4ResultOverlayController(document);
    controller.handle({
      type: 'mir4CombinationResult',
      collection: 'spirit',
      sourceGrade: 1,
      outcome: 'success',
      collectionId: 'spirit-uncommon-01',
      grade: 2,
      status: 'owned',
      batchCount: 10,
      successCount: 4,
      failureCount: 6,
    });

    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('10 combinations');
    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('4 succeeded');
    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain('6 failed');
    controller.dispose();
  });

  it('formats the Solitude success chance as a locale-aware percentage', () => {
    const controller = new Mir4ResultOverlayController(document);
    controller.handle({
      type: 'mir4SolitudeTrainingResult',
      pid: 1,
      branchId: 1,
      outcome: 'success',
      previousLevel: 0,
      level: 1,
      chanceBps: 7_000,
    });

    expect(document.querySelector('.mir4-result-copy')?.textContent).toContain(
      'Success chance 70%',
    );
    controller.dispose();
  });

  it('advances its bounded queue, times out, and plays outcome-specific cues', () => {
    vi.useFakeTimers();
    const controller = new Mir4ResultOverlayController(document);
    const enhancement: SimEvent = {
      type: 'mir4EnhancementResult',
      pid: 1,
      itemId: 991010101,
      outcome: 'success',
      previousLevel: 0,
      targetLevel: 1,
      level: 1,
      chanceBps: 100_000,
    };
    const failure: SimEvent = {
      ...enhancement,
      outcome: 'failure',
      previousLevel: 5,
      targetLevel: 6,
      level: 5,
      chanceBps: 50_000,
    };

    expect(controller.handle(enhancement)).toBe(true);
    expect(audio.enchant).toHaveBeenCalledOnce();
    expect(document.querySelector('.tone-success')).not.toBeNull();
    expect(controller.handle(failure)).toBe(true);
    vi.advanceTimersByTime(3_200);
    expect(document.querySelector('.tone-failure')).not.toBeNull();
    expect(audio.error).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(3_200);
    expect(document.querySelector('#mir4-result-overlay')?.children).toHaveLength(0);

    controller.dispose();
    controller.dispose();
    expect(document.querySelector('#mir4-result-overlay')).toBeNull();
  });

  it('drops results beyond the five-item waiting queue limit', () => {
    vi.useFakeTimers();
    const controller = new Mir4ResultOverlayController(document);
    for (let index = 0; index < 7; index++) {
      controller.handle({ type: 'questDone', questId: `M01-Q0${index + 1}` });
    }

    for (let shown = 0; shown < 6; shown++) controller.skip();
    expect(document.querySelector('#mir4-result-overlay')?.children).toHaveLength(0);
    controller.dispose();
  });
});
