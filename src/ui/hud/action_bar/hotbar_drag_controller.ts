// Cold DOM interactions shared by the desktop action bars. Keeping drag marker
// handling and the used-button flash here leaves Hud as the coordinator.

import { attackDragDisposition } from './hotbar';

const usedTimers = new WeakMap<HTMLButtonElement, number>();

export function handleAttackMarkerDrag(
  event: DragEvent,
  button: HTMLButtonElement,
  slot: number,
  phase: 'over' | 'drop',
  restore: () => void,
): boolean {
  const disposition = attackDragDisposition(event.dataTransfer?.types, slot, phase);
  if (disposition === 'ignore') return false;
  event.preventDefault();
  if (phase === 'over') {
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    button.classList.toggle('drop-target', disposition === 'highlight');
  } else {
    button.classList.remove('drop-target');
    restore();
  }
  return true;
}

export function flashActionButton(button: HTMLButtonElement): void {
  button.classList.add('used');
  const previous = usedTimers.get(button);
  if (previous !== undefined) window.clearTimeout(previous);
  usedTimers.set(
    button,
    window.setTimeout(() => {
      button.classList.remove('used');
      usedTimers.delete(button);
    }, 180),
  );
}
