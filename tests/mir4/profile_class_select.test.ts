import { describe, expect, it } from 'vitest';
import { profileClassOptions } from '../../src/ui/profile_class_select';

describe('profile class select view', () => {
  it('maps every MIR4 identity to a safe renderer shell without losing its key', () => {
    expect(profileClassOptions('mir4-gameplay-port')).toEqual([
      expect.objectContaining({ key: 'warrior', shellClass: 'warrior' }),
      expect.objectContaining({ key: 'elementalist', shellClass: 'warrior' }),
      expect.objectContaining({ key: 'taoist', shellClass: 'warrior' }),
      expect.objectContaining({ key: 'arbalist', shellClass: 'warrior' }),
      expect.objectContaining({ key: 'lancer', shellClass: 'warrior' }),
    ]);
  });

  it('keeps the classic roster and renderer identities unchanged', () => {
    const options = profileClassOptions('woc-classic');
    expect(options).toHaveLength(9);
    expect(options.every((option) => option.key === option.shellClass)).toBe(true);
  });
});
