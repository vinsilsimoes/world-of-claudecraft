// Pointer adapter for MIR4 minimap search areas. Geometry/hit-testing stays in
// the pure minimap core; this controller only maps client pixels and owns hover.

import { esc } from './esc';

export interface MinimapQuestSearchControllerDeps {
  canvas: HTMLCanvasElement;
  questAt(x: number, y: number): string | null;
  questTitle(questId: string): string;
  showTooltip(
    html: string,
    clientX: number,
    clientY: number,
  ): (clientX: number, clientY: number) => void;
  hideTooltip(): void;
}

export class MinimapQuestSearchController {
  private activeQuestId: string | null = null;
  private moveTooltip: ((clientX: number, clientY: number) => void) | null = null;

  constructor(private readonly deps: MinimapQuestSearchControllerDeps) {
    deps.canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    deps.canvas.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') this.hide();
    });
  }

  private onPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') {
      this.hide();
      return;
    }
    // #minimap has a fixed 162x162 author-space size matching its backing
    // canvas. offsetX/Y therefore already match painter coordinates and avoid
    // a forced layout read on every mousemove.
    const questId = this.deps.questAt(event.offsetX, event.offsetY);
    if (!questId) {
      this.hide();
      return;
    }
    if (questId === this.activeQuestId && this.moveTooltip) {
      this.moveTooltip(event.clientX, event.clientY);
      return;
    }
    this.activeQuestId = questId;
    this.moveTooltip = this.deps.showTooltip(
      `<div class="tt-title">${esc(this.deps.questTitle(questId))}</div>`,
      event.clientX,
      event.clientY,
    );
  }

  private hide(): void {
    if (!this.activeQuestId) return;
    this.activeQuestId = null;
    this.moveTooltip = null;
    this.deps.hideTooltip();
  }
}
