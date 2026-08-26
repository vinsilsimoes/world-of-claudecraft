import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VISUALS } from '../src/render/characters/manifest';
import { MIR4_SPIRITS_CATALOG } from '../src/sim/content/mir4/spirits_catalog';
import { MIR4_SPIRIT_PRESENTATIONS, mir4SpiritPresentation } from '../src/ui/mir4_spirit_visuals';

describe('MIR4 Spirit WoC presentation inventory', () => {
  it('assigns every Spirit one unique existing WoC creature presentation', () => {
    expect(Object.keys(MIR4_SPIRIT_PRESENTATIONS)).toHaveLength(MIR4_SPIRITS_CATALOG.length);
    expect(
      new Set(Object.values(MIR4_SPIRIT_PRESENTATIONS).map((entry) => entry.visualKey)).size,
    ).toBe(MIR4_SPIRITS_CATALOG.length);
    expect(
      new Set(Object.values(MIR4_SPIRIT_PRESENTATIONS).map((entry) => entry.portraitMobId)).size,
    ).toBe(MIR4_SPIRITS_CATALOG.length);
    for (const spirit of MIR4_SPIRITS_CATALOG) {
      const presentation = mir4SpiritPresentation(spirit.id);
      expect(presentation).toBeDefined();
      expect(VISUALS[presentation?.visualKey ?? '']).toBeDefined();
      expect(
        existsSync(
          join(process.cwd(), 'public', 'ui', 'mobs', `${presentation?.portraitMobId}.webp`),
        ),
      ).toBe(true);
    }
  });
});
