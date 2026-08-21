import { describe, expect, it } from 'vitest';
import { browserSmokeScenarioForProfile } from '../scripts/lib/browser_smoke_scenario.mjs';

describe('browser smoke profile scenarios', () => {
  it('drives the MIR4 roster, M01 mobs, combat facade, and existing quest tracker', () => {
    expect(browserSmokeScenarioForProfile('mir4-gameplay-port')).toEqual({
      profile: 'mir4-gameplay-port',
      classKey: 'elementalist',
      movementKey: 's',
      target: { exactTemplateId: null, templatePrefix: 'mir4_m01-vila-do-vau_' },
      combatMode: 'mir4',
      questMode: 'tracker',
    });
  });

  it('preserves the established classic smoke path', () => {
    expect(browserSmokeScenarioForProfile('woc-classic')).toEqual({
      profile: 'woc-classic',
      classKey: 'warrior',
      movementKey: 'w',
      target: { exactTemplateId: 'forest_wolf', templatePrefix: null },
      combatMode: 'classic',
      questMode: 'dialog',
    });
  });

  it('fails closed for an unsupported profile', () => {
    expect(() => browserSmokeScenarioForProfile('unknown' as never)).toThrow(
      'Unsupported browser smoke profile: unknown',
    );
  });
});
