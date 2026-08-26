// Thin, facet-routed painter for the MIR4-specific action tools. Potion slot
// painting stays in ActionBarPainter; this class owns only the two independent
// toggle controls and the visibility of their shared dock.

import type { PainterHostWriters } from '../../painter_host';
import type { Mir4ActionToolsState } from './mir4_action_tools_view';

const CLASS_ACTIVE = 'active';
const ARIA_PRESSED_ATTR = 'aria-pressed';

export interface Mir4ActionToolsPaintDescriptor {
  root: HTMLElement;
  autoBattleButton: HTMLElement;
  autoCollectButton: HTMLElement;
  mobileAutoCollectButton?: HTMLElement;
  autoBattleKeybind: HTMLElement;
  autoCollectKeybind: HTMLElement;
}

export class Mir4ActionToolsPainter {
  constructor(
    private readonly writers: PainterHostWriters,
    private readonly descriptor: Mir4ActionToolsPaintDescriptor,
  ) {}

  paint(state: Mir4ActionToolsState): void {
    this.writers.setDisplay(this.descriptor.root, state.visible ? 'flex' : 'none');
    this.paintToggle(
      this.descriptor.autoBattleButton,
      this.descriptor.autoBattleKeybind,
      state.autoBattleActive,
      state.autoBattleKeybind,
    );
    this.paintToggle(
      this.descriptor.autoCollectButton,
      this.descriptor.autoCollectKeybind,
      state.autoCollectActive,
      state.autoCollectKeybind,
    );
    if (this.descriptor.mobileAutoCollectButton) {
      this.paintToggle(this.descriptor.mobileAutoCollectButton, null, state.autoCollectActive, '');
    }
  }

  private paintToggle(
    button: HTMLElement,
    keybind: HTMLElement | null,
    active: boolean,
    keybindLabel: string,
  ): void {
    this.writers.toggleClass(button, CLASS_ACTIVE, active);
    this.writers.setAttr(button, ARIA_PRESSED_ATTR, active ? 'true' : 'false');
    if (keybind) this.writers.setText(keybind, keybindLabel);
  }
}
