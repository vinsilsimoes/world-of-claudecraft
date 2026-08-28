import { describe, expect, it } from 'vitest';
import { browserGameProfile } from '../src/game_profile_runtime';

describe('browserGameProfile', () => {
  it('pins the entire browser runtime to Aeldrune for an editor playtest', () => {
    expect(browserGameProfile('woc-classic', true)).toBe('mir4-gameplay-port');
  });

  it('keeps the configured build profile outside editor playtest', () => {
    expect(browserGameProfile('woc-classic', false)).toBe('woc-classic');
    expect(browserGameProfile('mir4-gameplay-port', false)).toBe('mir4-gameplay-port');
  });
});
