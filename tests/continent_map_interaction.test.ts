// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ContinentMapInteractionHost,
  continentMapSummaryText,
  wireContinentMapInteraction,
} from '../src/ui/continent_map_interaction';
import type { ContinentZoneRegion } from '../src/ui/continent_map_view';

const regions: readonly ContinentZoneRegion[] = [
  {
    zoneId: 'south',
    rect: { mx: 0, my: 0, w: 100, h: 100 },
    labelX: 50,
    labelY: 50,
    isCurrent: true,
    isHovered: false,
    levelMin: 1,
    levelMax: 10,
  },
  {
    zoneId: 'north',
    rect: { mx: 100, my: 0, w: 100, h: 100 },
    labelX: 150,
    labelY: 50,
    isCurrent: false,
    isHovered: false,
    levelMin: 11,
    levelMax: 20,
  },
];

describe('continent map DOM interaction controller', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('describes the focused region through the existing localized summary surface', () => {
    expect(continentMapSummaryText(regions, null)).not.toBe('');
    expect(continentMapSummaryText(regions, 'south')).toContain('1');
    expect(continentMapSummaryText(regions, 'south')).toContain('10');
  });

  it('routes focus, keyboard activation, hit testing, tooltip and pointer exit through the host', () => {
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.width = 200;
    canvas.height = 100;
    canvas.getBoundingClientRect = () =>
      ({ left: 10, top: 20, width: 200, height: 100, right: 210, bottom: 120 }) as DOMRect;
    document.body.append(canvas);

    let hover: string | null = null;
    const repaint = vi.fn();
    const openZone = vi.fn();
    const hideTooltip = vi.fn();
    const paintTooltip = vi.fn();
    const host: ContinentMapInteractionHost = {
      canvas,
      isContinent: () => true,
      regions: () => regions,
      hoverZone: () => hover,
      setHoverZone: (zoneId) => {
        hover = zoneId;
      },
      repaint,
      toggleLevel: vi.fn(),
      openZone,
      hideTooltip,
      paintTooltip,
    };
    wireContinentMapInteraction(host);

    canvas.focus();
    expect(hover).toBe('south');
    expect(repaint).toHaveBeenCalledTimes(1);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(hover).toBe('north');
    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(openZone).toHaveBeenCalledWith('north');

    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX: 35,
        clientY: 45,
        pointerType: 'mouse',
        bubbles: true,
      }),
    );
    expect(hover).toBe('south');
    expect(paintTooltip).toHaveBeenCalledWith('south', 35, 45);

    canvas.blur();
    canvas.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    expect(hover).toBeNull();
    expect(hideTooltip).toHaveBeenCalledTimes(1);
  });

  it('leaves zone interactions inert while the existing canvas shows a zone map', () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const openZone = vi.fn();
    const host: ContinentMapInteractionHost = {
      canvas,
      isContinent: () => false,
      regions: () => regions,
      hoverZone: () => null,
      setHoverZone: vi.fn(),
      repaint: vi.fn(),
      toggleLevel: vi.fn(),
      openZone,
      hideTooltip: vi.fn(),
      paintTooltip: vi.fn(),
    };
    wireContinentMapInteraction(host);

    canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    canvas.dispatchEvent(new MouseEvent('click', { clientX: 1, clientY: 1 }));
    expect(openZone).not.toHaveBeenCalled();
  });
});
