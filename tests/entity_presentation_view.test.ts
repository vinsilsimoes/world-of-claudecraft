import { describe, expect, it } from 'vitest';
import type { Entity } from '../src/sim/types';
import {
  entityDisplayName,
  entityMobFamily,
  entityTargetRank,
} from '../src/ui/entity_presentation_view';

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: 42,
    kind: 'mob',
    templateId: 'mir4_runtime_boss',
    name: 'Arc Warden',
    ownerId: null,
    mobFamily: 'dragonkin',
    mobElite: true,
    mobBoss: true,
    ...overrides,
  } as Entity;
}

describe('entity presentation view', () => {
  it('projects authoritative runtime mob metadata without a static template', () => {
    const boss = entity({});
    expect(entityDisplayName(boss)).toBe('Arc Warden');
    expect(entityMobFamily(boss)).toBe('dragonkin');
    expect(entityTargetRank(boss)).toBe('boss');
  });

  it('keeps boss precedence and accepts a static fallback template for portraits', () => {
    const elite = entity({ mobBoss: false, mobFamily: undefined });
    expect(entityMobFamily(elite, 'forest_wolf')).toBe('beast');
    expect(entityTargetRank(elite)).toBe('elite');
  });

  it('uses the authoritative runtime name for a campaign NPC without a static template', () => {
    const npc = entity({
      kind: 'npc',
      templateId: 'mir4_tarek_duas_pontes',
      name: 'Tarek Duas Pontes',
      mobFamily: undefined,
      mobElite: undefined,
      mobBoss: undefined,
    });

    expect(entityDisplayName(npc)).toBe('Tarek Duas Pontes');
  });
});
