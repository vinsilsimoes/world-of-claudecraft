import { describe, expect, it } from 'vitest';
import { profileClassOptions } from '../../src/ui/profile_class_select';

describe('profile class select view', () => {
  it('keeps the simulation shell while assigning every MIR4 identity its native presentation', () => {
    expect(profileClassOptions('mir4-gameplay-port')).toMatchObject([
      { key: 'warrior', shellClass: 'warrior', visualClass: 'warrior', armorSet: 'knight' },
      { key: 'elementalist', shellClass: 'warrior', visualClass: 'mage', armorSet: 'mage' },
      { key: 'taoist', shellClass: 'warrior', visualClass: 'shaman', armorSet: 'druid' },
      { key: 'arbalist', shellClass: 'warrior', visualClass: 'hunter', armorSet: 'ranger' },
      { key: 'lancer', shellClass: 'warrior', visualClass: 'paladin', armorSet: 'paladin' },
    ]);
  });

  it('keeps the classic roster and renderer identities unchanged', () => {
    const options = profileClassOptions('woc-classic');
    expect(options).toHaveLength(9);
    expect(options.every((option) => option.key === option.shellClass)).toBe(true);
    expect(options.every((option) => option.key === option.visualClass)).toBe(true);
    expect(options.every((option) => option.armorSet === null)).toBe(true);
  });
});
