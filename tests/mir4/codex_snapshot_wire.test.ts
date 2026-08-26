import { describe, expect, it, vi } from 'vitest';
import { Mir4CodexSelfWireCache, Mir4SelfWireCache } from '../../server/mir4_host';
import {
  applyMir4CodexSnapshotDelta,
  applyMir4SnapshotDelta,
} from '../../src/net/mir4_snapshot_wire';
import { createPlayer } from '../../src/sim/entity';
import type { Mir4PersistenceMeta } from '../../src/sim/mir4/persistence';
import { restoreMir4PlayerState } from '../../src/sim/mir4/persistence';
import { markMir4CodexWireDirty } from '../../src/sim/mir4/wire_revision';

describe('MIR4 Codex snapshot delta', () => {
  it('never includes Codex in the ultimate-gauge-coupled MIR4 aggregate', () => {
    const meta: Mir4PersistenceMeta = {
      mir4Codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 25 } },
      },
    };
    const json = new Mir4SelfWireCache().encode(
      'mir4-gameplay-port',
      meta,
      { classId: 1 } as never,
      50,
    );
    expect(JSON.parse(json ?? '{}')).not.toHaveProperty('mir4Codex');
  });

  it('does not read Codex while serializing the combat aggregate', () => {
    const meta: Mir4PersistenceMeta = {};
    Object.defineProperty(meta, 'mir4Codex', {
      configurable: true,
      get: () => {
        throw new Error('combat projection read Codex');
      },
    });
    expect(() =>
      new Mir4SelfWireCache().encode('mir4-gameplay-port', meta, { classId: 1 } as never, 100),
    ).not.toThrow();
  });

  it('serializes Codex once until its dedicated revision changes', () => {
    const meta: Mir4PersistenceMeta = {};
    const serialize = vi.fn((value: Mir4PersistenceMeta) => value.mir4Codex ?? null);
    const cache = new Mir4CodexSelfWireCache(serialize);
    expect(cache.encode('mir4-gameplay-port', meta)).toBe('null');
    expect(cache.encode('mir4-gameplay-port', meta)).toBe('null');
    expect(serialize).toHaveBeenCalledOnce();
    meta.mir4Codex = {
      version: 1,
      registered: { 'field-notes': { 'knowledge-fragment': 1 } },
    };
    markMir4CodexWireDirty(meta);
    expect(cache.encode('mir4-gameplay-port', meta)).toContain('knowledge-fragment');
    expect(serialize).toHaveBeenCalledTimes(2);
  });

  it('retains a valid Codex across omitted and malformed deltas', () => {
    const valid = applyMir4CodexSnapshotDelta(
      {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 4 } },
      },
      undefined,
    );
    expect(applyMir4CodexSnapshotDelta(undefined, valid)).toBe(valid);
    expect(applyMir4CodexSnapshotDelta({ hacked: true }, valid)).toBe(valid);
    expect(
      applyMir4CodexSnapshotDelta(
        {
          version: 1,
          registered: { 'field-notes': { 'knowledge-fragment': '25' } },
        },
        valid,
      ),
    ).toBe(valid);
    expect(applyMir4CodexSnapshotDelta(null, valid)).toBeUndefined();
  });

  it('invalidates the dedicated cache when state is restored on the same metadata object', () => {
    const meta: Mir4PersistenceMeta = {
      mir4Codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 1 } },
      },
    };
    const cache = new Mir4CodexSelfWireCache();
    expect(cache.encode('mir4-gameplay-port', meta)).toContain('knowledge-fragment');
    restoreMir4PlayerState(
      meta,
      {
        mir4Codex: {
          version: 1,
          registered: { 'field-notes': { 'knowledge-fragment': 25 } },
        },
      },
      1,
    );
    expect(cache.encode('mir4-gameplay-port', meta)).toContain('"knowledge-fragment":25');
  });

  it('retains Codex when a later MIR4 combat payload changes', () => {
    const entity = createPlayer(1, 'warrior', { x: 0, y: 0, z: 0 }, 'Wire');
    entity.level = 12;
    const baseline = createPlayer(2, 'warrior', { x: 0, y: 0, z: 0 }, 'Baseline');
    baseline.level = 12;
    applyMir4SnapshotDelta({ classId: 1, ultimateGauge: 5 }, baseline, null);
    const first = applyMir4SnapshotDelta({ classId: 1, ultimateGauge: 5 }, entity, {
      classId: 1,
      ultimateGauge: 0,
      mir4Codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 25 } },
      },
    });
    expect(first?.mir4Codex?.registered['field-notes']?.['knowledge-fragment']).toBe(25);
    expect(entity.maxHp).toBe(baseline.maxHp + 100);
  });
});
