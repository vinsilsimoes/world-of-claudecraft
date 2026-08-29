import { describe, expect, it } from 'vitest';
import { mir4ClassDetailsView, profileClassOptions } from '../../src/ui/profile_class_select';

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

  it('presents each class with its MIR4-style combat identity', () => {
    expect(mir4ClassDetailsView('warrior')).toMatchObject({
      roleKey: 'classDetails.mir4.roles.frontline-control',
      identityKey: 'classDetails.mir4.identity.warrior',
      rangeYards: 4,
    });
    expect(mir4ClassDetailsView('elementalist')).toMatchObject({
      labelKey: 'classes.elementalist',
      roleKey: 'classDetails.mir4.roles.magic-artillery',
      damageKey: 'classDetails.mir4.damage.magic',
      rangeYards: 8,
    });
    expect(mir4ClassDetailsView('taoist')).toMatchObject({
      roleKey: 'classDetails.mir4.roles.support-controller',
      damageKey: 'classDetails.mir4.damage.hybrid',
      rangeYards: 8,
    });
    expect(mir4ClassDetailsView('lancer').damageKey).toBe('classDetails.mir4.damage.hybrid');
  });

  it('keeps the classic roster and renderer identities unchanged', () => {
    const options = profileClassOptions('woc-classic');
    expect(options).toHaveLength(9);
    expect(options.every((option) => option.key === option.shellClass)).toBe(true);
    expect(options.every((option) => option.key === option.visualClass)).toBe(true);
    expect(options.every((option) => option.armorSet === null)).toBe(true);
  });
});
