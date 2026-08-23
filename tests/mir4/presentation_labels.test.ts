import { afterEach, describe, expect, it } from 'vitest';
import { mobEntityDisplayName, objectDisplayName } from '../../src/render/entity_labels';
import type { Entity } from '../../src/sim/types';
import {
  entityTranslationFallbackLog,
  resetEntityTranslationFallbackLog,
} from '../../src/ui/entity_i18n';
import { ensureLocaleLoaded, setLanguage } from '../../src/ui/i18n';

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: 1,
    kind: 'object',
    templateId: 'test',
    name: 'test',
    ...overrides,
  } as Entity;
}

afterEach(() => {
  setLanguage('en');
  resetEntityTranslationFallbackLog();
});

describe('MIR4 runtime presentation labels', () => {
  it('localizes physical objectives as actions instead of leaking internal target names', async () => {
    await ensureLocaleLoaded('pt_BR');
    setLanguage('pt_BR');
    expect(
      objectDisplayName(
        entity({
          templateId: 'mir4_objective_1_m01-q01_2_0_9',
          objectItemId: 'mir4_object_clue_magnifier',
          name: 'M01-Q01 clue 0',
        }),
      ),
    ).toBe('Investigue a evidência marcada');
  });

  it('uses the authored display name for a dynamic escort instead of its pid template id', () => {
    resetEntityTranslationFallbackLog();
    expect(
      mobEntityDisplayName(
        entity({
          kind: 'mob',
          templateId: 'mir4_escort_m02-q02_2_42',
          name: 'Maela Reedwalker',
        }),
      ),
    ).toBe('Maela Reedwalker');
    expect(entityTranslationFallbackLog()).toContainEqual(
      expect.objectContaining({
        id: 'mir4_escort_m02-q02_2',
        source: 'Maela Reedwalker',
        value: 'Maela Reedwalker',
      }),
    );
  });
});
