import { describe, expect, it, vi } from 'vitest';

vi.mock('../../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
}));

import { canObserveOwnerScopedEntity } from '../../server/entity_visibility';
import { GameServer } from '../../server/game';
import type { Entity } from '../../src/sim/types';

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: 10,
    kind: 'object',
    templateId: 'supply_crate',
    ownerId: null,
    ...overrides,
  } as Entity;
}

describe('owner-scoped entity visibility', () => {
  it('shows a physical MIR4 objective only to its owning player', () => {
    const objective = entity({
      templateId: 'mir4_objective_7_m01-q01_2_0_1',
      ownerId: 7,
    });

    expect(canObserveOwnerScopedEntity(entity({ id: 7, kind: 'player' }), objective)).toBe(true);
    expect(canObserveOwnerScopedEntity(entity({ id: 8, kind: 'player' }), objective)).toBe(false);
  });

  it('does not change visibility for ordinary shared world objects', () => {
    expect(
      canObserveOwnerScopedEntity(
        entity({ id: 8, kind: 'player' }),
        entity({ templateId: 'supply_crate', ownerId: 7 }),
      ),
    ).toBe(true);
  });

  it('applies owner scope in the production GameServer snapshot visibility path', () => {
    const server = new GameServer();
    const canObserveEntity = (
      server as unknown as {
        canObserveEntity(viewer: Entity, subject: Entity, distanceSquared: number): boolean;
      }
    ).canObserveEntity.bind(server);
    const objective = entity({
      templateId: 'mir4_objective_7_m01-q01_2_0_1',
      ownerId: 7,
    });

    expect(canObserveEntity(entity({ id: 7, kind: 'player' }), objective, 0)).toBe(true);
    expect(canObserveEntity(entity({ id: 8, kind: 'player' }), objective, 0)).toBe(false);
  });
});
