// Lazy bridge for the dedicated MIR4 Mount turntable. Native WoC mount GLBs
// are intentionally excluded from the boot sweep, so a collection window must
// wait for the selected shell without letting a stale async load repaint a
// newer selection.

import { mountAssetsReady, preloadMountAssets } from '../render/characters/assets';
import { type Mir4MountPresentation, mir4MountPresentation } from './mir4_mount_visuals';

export interface Mir4MountPreviewLoaderDeps {
  presentation(mountId: string): Mir4MountPresentation | null;
  ready(visualKey: string): boolean;
  preload(visualKey: string): Promise<void>;
}

const DEFAULT_DEPS: Mir4MountPreviewLoaderDeps = {
  presentation: mir4MountPresentation,
  ready: mountAssetsReady,
  preload: preloadMountAssets,
};

export async function prepareMir4MountPreview(
  container: HTMLElement,
  visualKey: string,
  mountId: string,
  deps: Mir4MountPreviewLoaderDeps = DEFAULT_DEPS,
  active: () => boolean = () => true,
): Promise<boolean> {
  if (!container.isConnected || !active() || deps.presentation(mountId)?.visualKey !== visualKey)
    return false;
  if (!deps.ready(visualKey)) {
    try {
      await deps.preload(visualKey);
    } catch {
      return false;
    }
  }
  return (
    container.isConnected &&
    active() &&
    deps.presentation(mountId)?.visualKey === visualKey &&
    deps.ready(visualKey)
  );
}
