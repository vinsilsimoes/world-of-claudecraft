import { describe, expect, it } from 'vitest';
import type { Mir4PlayerUiState } from '../src/sim/mir4/ui_state';
import { buildMir4SpiritCodexView } from '../src/ui/mir4_spirit_codex_view';

describe('MIR4 Spirit codex view', () => {
  it('projects the complete authored catalog with ownership, tickets and fusion readiness', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4ArcRewards: { tickets: { 'spirit-ticket-dawn': 2 } },
      mir4Spirits: {
        owned: { 'spirit-common-01': 5, 'spirit-rare-01': 1 },
        discovered: ['spirit-common-01', 'spirit-rare-01'],
        equippedSpiritId: 'spirit-rare-01',
        pending: [{ id: 'pending-1', spiritId: 'spirit-epic-01', grade: 4 }],
      },
    };

    const view = buildMir4SpiritCodexView(state);

    expect(view.entries).toHaveLength(30);
    expect(view.selected?.spiritId).toBe('spirit-rare-01');
    expect(view.entries.find((entry) => entry.spiritId === 'spirit-common-01')).toMatchObject({
      status: 'owned',
      count: 5,
    });
    expect(view.entries.find((entry) => entry.spiritId === 'spirit-rare-01')).toMatchObject({
      status: 'equipped',
      count: 1,
    });
    expect(view.entries.find((entry) => entry.spiritId === 'spirit-epic-01')).toMatchObject({
      status: 'pending',
      pendingId: 'pending-1',
    });
    expect(view.tickets).toEqual([
      { ticketId: 'spirit-ticket-dawn', count: 2, pendingCapacity: null },
    ]);
    expect(view.combinations.find((entry) => entry.grade === 1)).toMatchObject({
      owned: 5,
      attempts: 1,
      combineAllAttempts: 1,
    });
    expect(view.confirmations).toMatchObject([
      {
        pendingId: 'pending-1',
        spiritId: 'spirit-epic-01',
        grade: 4,
        gradeKey: 'epic',
      },
    ]);
    expect(view.album).toMatchObject({
      discovered: 2,
      total: 30,
      current: {
        maxHp: 25,
      },
    });
    expect(Object.values(view.album.maximum).every((value) => value > 0)).toBe(true);
  });

  it('honors an available preferred selection and rejects unknown ids', () => {
    const state: Mir4PlayerUiState = { classId: 1, ultimateGauge: 0 };

    expect(buildMir4SpiritCodexView(state, 'spirit-mythical-06').selected?.spiritId).toBe(
      'spirit-mythical-06',
    );
    expect(buildMir4SpiritCodexView(state, 'not-a-spirit').selected?.spiritId).toBe(
      'spirit-common-01',
    );
  });

  it('does not advertise a combine-all batch above the authoritative abuse limit', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Spirits: { owned: { 'spirit-common-01': 100_004 } },
    };

    expect(
      buildMir4SpiritCodexView(state).combinations.find((entry) => entry.grade === 1),
    ).toMatchObject({ attempts: 25_001, combineAllAttempts: 0 });
  });

  it('advertises the exact combine-all abuse boundary', () => {
    const state: Mir4PlayerUiState = {
      classId: 1,
      ultimateGauge: 0,
      mir4Spirits: { owned: { 'spirit-common-01': 100_000 } },
    };

    expect(
      buildMir4SpiritCodexView(state).combinations.find((entry) => entry.grade === 1),
    ).toMatchObject({ attempts: 25_000, combineAllAttempts: 25_000 });
  });

  it('labels every unconfirmed copy as a possible first discovery until one is confirmed', () => {
    const pending = [
      { id: 'pending-1', spiritId: 'spirit-epic-01', grade: 4 },
      { id: 'pending-2', spiritId: 'spirit-epic-01', grade: 4 },
    ];
    const undiscovered = buildMir4SpiritCodexView({
      classId: 1,
      ultimateGauge: 0,
      mir4Spirits: { pending },
    });
    const discovered = buildMir4SpiritCodexView({
      classId: 1,
      ultimateGauge: 0,
      mir4Spirits: { pending, discovered: ['spirit-epic-01'] },
    });

    expect(undiscovered.confirmations.every((entry) => entry.albumAward !== null)).toBe(true);
    expect(discovered.confirmations.every((entry) => entry.albumAward === null)).toBe(true);
  });
});
