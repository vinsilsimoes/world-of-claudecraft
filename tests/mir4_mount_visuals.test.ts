import { describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../src/sim/content/mir4/mounts_catalog';
import { mir4MountPortraitUrl, mir4MountPresentation } from '../src/ui/mir4_mount_visuals';

describe('MIR4 Mount native presentation bridge', () => {
  it('maps every logical Mount to a WoC mount model and committed reins portrait', () => {
    for (const mount of MIR4_MOUNTS_CATALOG) {
      const presentation = mir4MountPresentation(mount.id);
      expect(presentation?.visualKey).toMatch(/^mount_/);
      expect(presentation?.portraitUrl).toMatch(/^\/ui\/items\/reins_.*\.webp$/);
      expect(mir4MountPortraitUrl(mount.id)).toBe(presentation?.portraitUrl);
    }
  });
});
