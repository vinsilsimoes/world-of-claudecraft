// DOM wiring for the existing continent canvas. Hud owns the map state and
// painting; this controller owns only browser events and reports narrow state
// changes back through callbacks.

import {
  type ContinentNavigationKey,
  type ContinentZoneRegion,
  continentZoneAt,
  continentZoneForKeyboard,
} from './continent_map_view';
import { zoneDisplayName } from './entity_i18n';
import { formatNumber, t } from './i18n';

export interface ContinentMapInteractionHost {
  canvas: HTMLCanvasElement;
  isContinent(): boolean;
  regions(): readonly ContinentZoneRegion[];
  hoverZone(): string | null;
  setHoverZone(zoneId: string | null): void;
  repaint(): void;
  toggleLevel(): void;
  openZone(zoneId: string): void;
  hideTooltip(): void;
  paintTooltip(zoneId: string, clientX: number, clientY: number): void;
}

export function continentMapSummaryText(
  regions: readonly ContinentZoneRegion[],
  hoveredZoneId: string | null,
): string {
  const selected = hoveredZoneId
    ? regions.find((region) => region.zoneId === hoveredZoneId)
    : undefined;
  if (!selected) return t('hudChrome.continentMap.summary');
  return t('hud.core.mapSummary', {
    zone: `${zoneDisplayName(selected.zoneId)}: ${t('hudChrome.continentMap.levels', {
      min: formatNumber(selected.levelMin, { maximumFractionDigits: 0 }),
      max: formatNumber(selected.levelMax, { maximumFractionDigits: 0 }),
    })}`,
  });
}

const NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

function preferredZone(host: ContinentMapInteractionHost): string | null {
  return (
    host.hoverZone() ??
    host.regions().find((region) => region.isCurrent)?.zoneId ??
    host.regions()[0]?.zoneId ??
    null
  );
}

export function wireContinentMapInteraction(host: ContinentMapInteractionHost): void {
  const canvas = host.canvas;
  let tipShown = false;
  const hideTip = (): void => {
    if (!tipShown) return;
    tipShown = false;
    host.hideTooltip();
  };
  const canvasPoint = (clientX: number, clientY: number): { cx: number; cy: number } => {
    const rect = canvas.getBoundingClientRect();
    return {
      cx: ((clientX - rect.left) * canvas.width) / rect.width,
      cy: ((clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    host.toggleLevel();
  });
  canvas.addEventListener('click', (event) => {
    if (!host.isContinent()) return;
    const { cx, cy } = canvasPoint(event.clientX, event.clientY);
    const zoneId = continentZoneAt(host.regions(), cx, cy);
    if (!zoneId) return;
    hideTip();
    host.openZone(zoneId);
  });
  canvas.addEventListener('focus', () => {
    if (!host.isContinent() || host.hoverZone() !== null) return;
    const zoneId = preferredZone(host);
    host.setHoverZone(zoneId);
    if (zoneId) host.repaint();
  });
  canvas.addEventListener('keydown', (event) => {
    if (!host.isContinent()) return;
    if (event.key === 'Enter' || event.key === ' ' || event.code === 'Space') {
      const zoneId = preferredZone(host);
      if (!zoneId) return;
      event.preventDefault();
      event.stopPropagation();
      hideTip();
      host.openZone(zoneId);
      return;
    }
    if (!NAVIGATION_KEYS.has(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    hideTip();
    const current = host.hoverZone();
    const next = continentZoneForKeyboard(
      host.regions(),
      current,
      event.key as ContinentNavigationKey,
    );
    if (next === current) return;
    host.setHoverZone(next);
    host.repaint();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!host.isContinent() || event.pointerType !== 'mouse') return;
    const { cx, cy } = canvasPoint(event.clientX, event.clientY);
    const zoneId = continentZoneAt(host.regions(), cx, cy);
    if (zoneId !== host.hoverZone()) {
      host.setHoverZone(zoneId);
      host.repaint();
    }
    if (!zoneId) {
      hideTip();
      return;
    }
    host.paintTooltip(zoneId, event.clientX, event.clientY);
    tipShown = true;
  });
  canvas.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hideTip();
    if (
      !host.isContinent() ||
      host.hoverZone() === null ||
      canvas.ownerDocument.activeElement === canvas
    )
      return;
    host.setHoverZone(null);
    host.repaint();
  });
}
