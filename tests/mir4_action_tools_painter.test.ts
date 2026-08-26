import { describe, expect, it, vi } from 'vitest';
import {
  type Mir4ActionToolsPaintDescriptor,
  Mir4ActionToolsPainter,
} from '../src/ui/hud/action_bar/mir4_action_tools_painter';
import type { PainterHostWriters } from '../src/ui/painter_host';

function element(): HTMLElement {
  return {} as HTMLElement;
}

function harness() {
  const descriptor: Mir4ActionToolsPaintDescriptor = {
    root: element(),
    autoBattleButton: element(),
    autoCollectButton: element(),
    mobileAutoCollectButton: element(),
    autoBattleKeybind: element(),
    autoCollectKeybind: element(),
  };
  const writers: PainterHostWriters = {
    setText: vi.fn(),
    setDisplay: vi.fn(),
    setTransform: vi.fn(),
    setWidth: vi.fn(),
    setStyleProp: vi.fn(),
    toggleClass: vi.fn(),
    setAttr: vi.fn(),
  };
  return { descriptor, writers, painter: new Mir4ActionToolsPainter(writers, descriptor) };
}

describe('MIR4 action tools painter', () => {
  it('shows only the MIR4 dock and exposes both toggles as pressed controls', () => {
    const { descriptor, writers, painter } = harness();
    painter.paint({
      visible: true,
      autoBattleActive: true,
      autoCollectActive: false,
      autoBattleKeybind: 'F9',
      autoCollectKeybind: 'F10',
      potionIds: [null, null],
    });

    expect(writers.setDisplay).toHaveBeenCalledWith(descriptor.root, 'flex');
    expect(writers.toggleClass).toHaveBeenCalledWith(descriptor.autoBattleButton, 'active', true);
    expect(writers.toggleClass).toHaveBeenCalledWith(descriptor.autoCollectButton, 'active', false);
    expect(writers.setAttr).toHaveBeenCalledWith(
      descriptor.autoBattleButton,
      'aria-pressed',
      'true',
    );
    expect(writers.setAttr).toHaveBeenCalledWith(
      descriptor.autoCollectButton,
      'aria-pressed',
      'false',
    );
    expect(writers.setAttr).toHaveBeenCalledWith(
      descriptor.mobileAutoCollectButton,
      'aria-pressed',
      'false',
    );
    expect(writers.setText).toHaveBeenCalledWith(descriptor.autoBattleKeybind, 'F9');
    expect(writers.setText).toHaveBeenCalledWith(descriptor.autoCollectKeybind, 'F10');
  });

  it('hides the whole dock outside the MIR4 profile', () => {
    const { descriptor, writers, painter } = harness();
    painter.paint({
      visible: false,
      autoBattleActive: false,
      autoCollectActive: false,
      autoBattleKeybind: '',
      autoCollectKeybind: '',
      potionIds: [null, null],
    });
    expect(writers.setDisplay).toHaveBeenCalledWith(descriptor.root, 'none');
  });
});
