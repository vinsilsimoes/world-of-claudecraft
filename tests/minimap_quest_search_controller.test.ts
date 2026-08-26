// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';
import { MinimapQuestSearchController } from '../src/ui/minimap_quest_search_controller';

describe('MinimapQuestSearchController', () => {
  it('shows the exact mission name while the mouse is over a search circle', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 162;
    canvas.height = 162;
    const moveTooltip = vi.fn();
    const showTooltip = vi.fn(() => moveTooltip);
    const hideTooltip = vi.fn();
    new MinimapQuestSearchController({
      canvas,
      questAt: (x, y) => (x === 81 && y === 81 ? 'M01-S03' : null),
      questTitle: () => 'Juramento da Vila do Vau',
      showTooltip,
      hideTooltip,
    });

    const over = new PointerEvent('pointermove', {
      clientX: 172,
      clientY: 182,
      pointerType: 'mouse',
    });
    Object.defineProperties(over, { offsetX: { value: 81 }, offsetY: { value: 81 } });
    canvas.dispatchEvent(over);
    expect(showTooltip).toHaveBeenCalledWith(
      '<div class="tt-title">Juramento da Vila do Vau</div>',
      172,
      182,
    );

    const acrossSameCircle = new PointerEvent('pointermove', {
      clientX: 176,
      clientY: 186,
      pointerType: 'mouse',
    });
    Object.defineProperties(acrossSameCircle, { offsetX: { value: 81 }, offsetY: { value: 81 } });
    canvas.dispatchEvent(acrossSameCircle);
    expect(showTooltip).toHaveBeenCalledTimes(1);
    expect(moveTooltip).toHaveBeenCalledWith(176, 186);

    const outside = new PointerEvent('pointermove', {
      clientX: 12,
      clientY: 22,
      pointerType: 'mouse',
    });
    Object.defineProperties(outside, { offsetX: { value: 1 }, offsetY: { value: 1 } });
    canvas.dispatchEvent(outside);
    expect(hideTooltip).toHaveBeenCalledTimes(1);
  });
});
