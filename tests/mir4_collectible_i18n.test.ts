import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MIR4_MOUNTS_CATALOG } from '../src/sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG } from '../src/sim/content/mir4/spirits_catalog';
import { mir4SpiritSpecialSkill } from '../src/sim/mir4/spirits';
import { ensureLocaleLoaded, getLanguage, setLanguage } from '../src/ui/i18n';
import {
  mir4MountDisplayName,
  mir4SpiritDisplayName,
  mir4SpiritSkillDisplayName,
} from '../src/ui/mir4_collectible_i18n';

describe('MIR4 collectible localization', () => {
  const originalLanguage = getLanguage();

  beforeAll(async () => {
    await ensureLocaleLoaded('pt_BR');
  });

  afterAll(() => {
    setLanguage(originalLanguage);
  });

  it('renders every collectible and Spirit skill in English without leaking PT-BR', () => {
    setLanguage('en');
    for (const mount of MIR4_MOUNTS_CATALOG) {
      const rendered = mir4MountDisplayName(mount.id);
      expect(rendered).not.toBe(mount.name);
      expect(rendered).not.toContain('hudChrome.mir4.collectibles');
    }
    for (const spirit of MIR4_SPIRITS_CATALOG) {
      expect(mir4SpiritDisplayName(spirit.id)).not.toBe(spirit.name);
      const skill = mir4SpiritSpecialSkill(spirit.id);
      if (!skill) throw new Error(`missing Spirit skill for ${spirit.id}`);
      expect(mir4SpiritSkillDisplayName(skill.id)).not.toBe(skill.name);
    }
  });

  it('preserves every source-authored name as the PT-BR locale fill', () => {
    setLanguage('pt_BR');
    for (const mount of MIR4_MOUNTS_CATALOG) {
      expect(mir4MountDisplayName(mount.id)).toBe(mount.name);
    }
    for (const spirit of MIR4_SPIRITS_CATALOG) {
      expect(mir4SpiritDisplayName(spirit.id)).toBe(spirit.name);
      const skill = mir4SpiritSpecialSkill(spirit.id);
      if (!skill) throw new Error(`missing Spirit skill for ${spirit.id}`);
      expect(mir4SpiritSkillDisplayName(skill.id)).toBe(skill.name);
    }
  });
});
