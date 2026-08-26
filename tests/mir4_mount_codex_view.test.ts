import { describe, expect, it } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4MountCodexView } from '../src/ui/mir4_mount_codex_view';

describe('MIR4 Mount codex view', () => {
  it('projects the complete authored catalog with ownership, tickets and fusion readiness', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4ArcRewards: { tickets: { 'mount-ticket-dawn': 100_000 } },
      mir4Mounts: {
        owned: { 'meadow-courser': 5, 'amber-bear': 1 },
        discovered: ['meadow-courser', 'amber-bear'],
        equippedMountId: 'amber-bear',
        pending: [{ id: 'mount-pending-1', mountId: 'eclipse-lion', grade: 4 }],
      },
    };

    const view = buildMir4MountCodexView(state);

    expect(view.entries).toHaveLength(85);
    expect(view.selected?.mountId).toBe('amber-bear');
    expect(view.entries.find((entry) => entry.mountId === 'meadow-courser')).toMatchObject({
      status: 'owned',
      count: 5,
      stats: { moveSpeedBps: 1_000, basicAttackSpeedBps: 500 },
    });
    expect(view.entries.find((entry) => entry.mountId === 'amber-bear')).toMatchObject({
      status: 'equipped',
      count: 1,
    });
    expect(view.entries.find((entry) => entry.mountId === 'eclipse-lion')).toMatchObject({
      status: 'pending',
      pendingId: 'mount-pending-1',
    });
    expect(view.tickets).toEqual([
      { ticketId: 'mount-ticket-dawn', count: 100_000, pendingCapacity: null },
    ]);
    expect(view.combinations.find((entry) => entry.grade === 1)).toMatchObject({
      owned: 5,
      attempts: 1,
      combineAllAttempts: 1,
    });
    expect(view.confirmations).toMatchObject([
      {
        pendingId: 'mount-pending-1',
        mountId: 'eclipse-lion',
        grade: 4,
        gradeKey: 'epic',
      },
    ]);
    expect(view.album).toMatchObject({
      discovered: 2,
      total: 85,
      current: {
        maxHp: 25,
      },
    });
    expect(Object.values(view.album.maximum).every((value) => value > 0)).toBe(true);
  });

  it('reserves pending capacity only for the Twilight ticket and high-grade fusion', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4ArcRewards: {
        tickets: { 'mount-ticket-dawn': 100, 'mount-ticket-twilight': 100 },
      },
      mir4Mounts: {
        pending: Array.from({ length: 79 }, (_, index) => ({
          id: `mount-pending-1-${index + 1}`,
          mountId: 'eclipse-lion',
          grade: 4,
        })),
      },
    };

    const view = buildMir4MountCodexView(state);

    expect(view.pendingCapacity).toBe(49);
    expect(view.tickets).toEqual([
      { ticketId: 'mount-ticket-dawn', count: 100, pendingCapacity: null },
      { ticketId: 'mount-ticket-twilight', count: 100, pendingCapacity: 49 },
    ]);
  });

  it('caps high-grade combine-all to the available confirmation capacity', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: {
        owned: { 'amber-bear': 40 },
        pending: Array.from({ length: 125 }, (_, index) => ({
          id: `mount-pending-${index + 1}`,
          mountId: 'eclipse-lion',
          grade: 4,
        })),
      },
    };

    const gradeThree = buildMir4MountCodexView(state).combinations.find(
      (entry) => entry.grade === 3,
    );

    expect(gradeThree).toMatchObject({ owned: 40, attempts: 10, combineAllAttempts: 3 });
  });

  it('does not advertise a combine-all batch above the authoritative abuse limit', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: { owned: { 'meadow-courser': 100_004 } },
    };

    expect(
      buildMir4MountCodexView(state).combinations.find((entry) => entry.grade === 1),
    ).toMatchObject({ attempts: 25_001, combineAllAttempts: 0 });
  });

  it('advertises the exact combine-all abuse boundary', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: { owned: { 'meadow-courser': 100_000 } },
    };

    expect(
      buildMir4MountCodexView(state).combinations.find((entry) => entry.grade === 1),
    ).toMatchObject({ attempts: 25_000, combineAllAttempts: 25_000 });
  });

  it('labels every unconfirmed copy as a possible first discovery until one is confirmed', () => {
    const pending = [
      { id: 'mount-pending-1', mountId: 'eclipse-lion', grade: 4 },
      { id: 'mount-pending-2', mountId: 'eclipse-lion', grade: 4 },
    ];
    const undiscovered = buildMir4MountCodexView({
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: { pending },
    });
    const discovered = buildMir4MountCodexView({
      classId: 1,
      ultimateGauge: 0,
      mir4Mounts: { pending, discovered: ['eclipse-lion'] },
    });

    expect(undiscovered.confirmations.every((entry) => entry.albumAward !== null)).toBe(true);
    expect(discovered.confirmations.every((entry) => entry.albumAward === null)).toBe(true);
  });
});
