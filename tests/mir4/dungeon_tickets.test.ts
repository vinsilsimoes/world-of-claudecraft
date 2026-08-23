import { describe, expect, it } from 'vitest';
import {
  currentMir4DungeonTickets,
  reserveMir4DungeonAdmission,
  sanitizeMir4DungeonTickets,
} from '../../src/sim/mir4/dungeon_tickets';

const DAY = 24 * 60 * 60 * 1_000;
const FIVE_AM = 5 * 60 * 60 * 1_000;

describe('MIR4 dungeon ticket wallet', () => {
  it('starts with the source maximum and spends repeatable entries exactly once', () => {
    const now = 10 * DAY + FIVE_AM + 1;
    const first = reserveMir4DungeonAdmission('M01-R02', undefined, now);
    const second = reserveMir4DungeonAdmission('M01-R02', first.state, now);
    const third = reserveMir4DungeonAdmission('M01-R02', second.state, now);

    expect(first).toMatchObject({ ok: true, source: 'daily', state: { count: 1 } });
    expect(second).toMatchObject({ ok: true, source: 'daily', state: { count: 0 } });
    expect(third).toMatchObject({ ok: false, source: 'daily', state: { count: 0 } });
  });

  it('renews the daily pool at the source reset boundary', () => {
    const beforeReset = 20 * DAY + FIVE_AM - 1;
    const spent = reserveMir4DungeonAdmission('M01-R02', undefined, beforeReset);
    const afterReset = currentMir4DungeonTickets(spent.state, 20 * DAY + FIVE_AM);

    expect(spent.state?.count).toBe(1);
    expect(afterReset).toEqual({ ticketType: 3, count: 2, resetAtMs: 20 * DAY + FIVE_AM });
  });

  it('uses a quest-bound admission for a first Main Quest clear', () => {
    const admission = reserveMir4DungeonAdmission('M04-Q05', undefined, 42 * DAY);

    expect(admission).toEqual({
      ok: true,
      source: 'story-bound',
      dungeonId: 101,
      state: undefined,
    });
  });

  it('routes the final repeatable chapters through the sixth ticketed dungeon', () => {
    const admission = reserveMir4DungeonAdmission('M19-R02', undefined, 42 * DAY);

    expect(admission).toMatchObject({
      ok: true,
      source: 'daily',
      dungeonId: 106,
      state: { count: 1 },
    });
  });

  it('preserves a previously spent wallet during a story-bound admission', () => {
    const state = { ticketType: 3 as const, count: 1, resetAtMs: 123 };

    expect(reserveMir4DungeonAdmission('M04-Q05', state, 42 * DAY)).toEqual({
      ok: true,
      source: 'story-bound',
      dungeonId: 101,
      state,
    });
  });

  it('sanitizes the persisted wallet without accepting another ticket family', () => {
    expect(sanitizeMir4DungeonTickets({ ticketType: 3, count: 2, resetAtMs: 123 })).toEqual({
      ticketType: 3,
      count: 2,
      resetAtMs: 123,
    });
    expect(
      sanitizeMir4DungeonTickets({ ticketType: 9, count: 99, resetAtMs: 123 }),
    ).toBeUndefined();
    expect(
      sanitizeMir4DungeonTickets({ ticketType: 3, count: 'two', resetAtMs: 123 }),
    ).toBeUndefined();
    expect(
      sanitizeMir4DungeonTickets({ ticketType: 3, count: 2, resetAtMs: 'today' }),
    ).toBeUndefined();
    expect(sanitizeMir4DungeonTickets({ ticketType: 3, count: 255, resetAtMs: 123 })).toEqual({
      ticketType: 3,
      count: 2,
      resetAtMs: 123,
    });
  });
});
