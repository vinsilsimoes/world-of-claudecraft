import { describe, expect, it } from 'vitest';
import { sanitizeMir4PlayerState } from '../../src/sim/mir4/persistence';

describe('MIR4 Codex persistence boundary', () => {
  it('loads pre-Codex saves without inventing state', () => {
    expect(sanitizeMir4PlayerState({}, 1)).not.toHaveProperty('mir4Codex');
  });

  it('stores only bounded manual progress and is byte-stable', () => {
    const first = sanitizeMir4PlayerState(
      {
        mir4Codex: {
          version: 1,
          registered: {
            'field-notes': { 'knowledge-fragment': 99_999, hacked: 5 },
            'rank-two-armory': { 'warrior-item': 1 },
            hacked: { item: 1 },
          },
          completed: ['field-notes'],
          filters: { search: 'not-persisted' },
        },
      },
      1,
    );
    expect(first.mir4Codex).toEqual({
      version: 1,
      registered: { 'field-notes': { 'knowledge-fragment': 25 } },
    });
    const second = sanitizeMir4PlayerState(first, 1);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(Buffer.byteLength(JSON.stringify(first.mir4Codex), 'utf8')).toBeLessThanOrEqual(
      4 * 1024,
    );
  });

  it('rejects unknown schema versions and non-numeric counters', () => {
    expect(
      sanitizeMir4PlayerState(
        {
          mir4Codex: {
            version: 99,
            registered: { 'field-notes': { 'knowledge-fragment': 25 } },
          },
        },
        1,
      ),
    ).not.toHaveProperty('mir4Codex');
    expect(
      sanitizeMir4PlayerState(
        {
          mir4Codex: {
            version: 1,
            registered: {
              'field-notes': { 'knowledge-fragment': '25' },
              'artisan-records': { 'knowledge-tome-common': true },
            },
          },
        },
        1,
      ),
    ).not.toHaveProperty('mir4Codex');
  });
});
