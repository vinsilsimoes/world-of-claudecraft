import { describe, expect, it } from 'vitest';
import {
  mir4ControlChanceFromStatuses,
  mir4ControlDurationMs,
  mir4ControlFamilyOf,
} from '../../src/sim/mir4/control';

describe('MIR4 status-backed control chance', () => {
  it('combines general and PvP stun lanes', () => {
    expect(
      mir4ControlChanceFromStatuses(
        1_000,
        'stun',
        { 48: 500, 121: 700, 129: 9_000 },
        { 49: 200, 122: 300, 130: 9_000 },
        'player',
      ),
    ).toBe(1_700);
  });

  it('combines general and monster knockdown lanes for normal mobs and bosses', () => {
    const attacker = { 119: 400, 135: 600 };
    const defender = { 120: 100, 136: 200 };
    expect(mir4ControlChanceFromStatuses(5_000, 'knockdown', attacker, defender, 'monster')).toBe(
      5_700,
    );
    expect(mir4ControlChanceFromStatuses(5_000, 'knockdown', attacker, defender, 'boss')).toBe(
      5_700,
    );
  });

  it('maps only implemented hard-control and debilitation effect families', () => {
    expect(mir4ControlFamilyOf('stun')).toBe('stun');
    expect(mir4ControlFamilyOf('knockdown')).toBe('knockdown');
    expect(mir4ControlFamilyOf('freeze')).toBe('debilitation');
    expect(mir4ControlFamilyOf('burn')).toBeNull();
  });

  it('applies family-specific duration boosts without changing knockdown duration', () => {
    expect(mir4ControlDurationMs(2_000, 'stun', { 153: 2_500, 154: 9_000 })).toBe(2_500);
    expect(mir4ControlDurationMs(2_000, 'debilitation', { 153: 9_000, 154: 1_000 })).toBe(2_200);
    expect(mir4ControlDurationMs(2_000, 'knockdown', { 153: 9_000 })).toBe(2_000);
  });
});
