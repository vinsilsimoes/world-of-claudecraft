// Presentation-only bridge between logical MIR4 Mount identities and native
// Aeldrune mount models/reins art.

import { mountVisualSpec } from '../render/mount_visuals';
import { mir4MountVisualKey } from '../sim/mir4/mounts';
import { mountItemId } from '../sim/mounts';
import { itemImageUrl } from './icons';

export interface Mir4MountPresentation {
  visualKey: string;
  portraitUrl: string | null;
}

export function mir4MountPresentation(mountId: string): Mir4MountPresentation | null {
  const nativeKey = mir4MountVisualKey(mountId);
  const spec = mountVisualSpec(nativeKey);
  if (!spec) return null;
  const itemId = mountItemId(nativeKey);
  return {
    visualKey: spec.visualKey,
    portraitUrl: itemId ? itemImageUrl(itemId) : null,
  };
}

export function mir4MountPortraitUrl(mountId: string): string | null {
  return mir4MountPresentation(mountId)?.portraitUrl ?? null;
}
