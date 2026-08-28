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

  it('pins every family contextual lane, including PvP knockdown', () => {
    expect(
      mir4ControlChanceFromStatuses(
        2_000,
        'debilitation',
        { 50: 300, 123: 500 },
        { 51: 100, 124: 200 },
        'player',
      ),
    ).toBe(2_500);
    expect(
      mir4ControlChanceFromStatuses(
        2_000,
        'silence',
        { 52: 400, 133: 600 },
        { 53: 200, 134: 300 },
        'monster',
      ),
    ).toBe(2_500);
    expect(
      mir4ControlChanceFromStatuses(
        2_000,
        'knockdown',
        { 119: 500, 127: 700 },
        { 120: 300, 128: 400 },
        'player',
      ),
    ).toBe(2_500);
  });

  it('maps only implemented hard-control and debilitation effect families', () => {
    expect(mir4ControlFamilyOf('stun')).toBe('stun');
    expect(mir4ControlFamilyOf('knockdown')).toBe('knockdown');
    expect(mir4ControlFamilyOf('freeze')).toBe('debilitation');
    expect(mir4ControlFamilyOf('root')).toBe('debilitation');
    expect(mir4ControlFamilyOf('silence')).toBe('silence');
    expect(mir4ControlFamilyOf('burn')).toBeNull();
  });

  it('applies family-specific duration boosts without changing knockdown duration', () => {
    expect(mir4ControlDurationMs(2_000, 'stun', { 153: 2_500, 154: 9_000 })).toBe(2_500);
    expect(mir4ControlDurationMs(2_000, 'debilitation', { 153: 9_000, 154: 1_000 })).toBe(2_200);
    expect(mir4ControlDurationMs(2_000, 'knockdown', { 153: 9_000 })).toBe(2_000);
    expect(mir4ControlDurationMs(2_000, 'silence', { 155: 2_500 })).toBe(2_500);
  });

  it('uses family resistance as anti-control duration and caps player control chance', () => {
    expect(
      mir4ControlDurationMs(2_000, 'stun', { 153: 2_000 }, { 49: 1_000, 122: 2_000 }, 'player'),
    ).toBe(1_800);
    expect(mir4ControlChanceFromStatuses(10_000, 'stun', { 48: 10_000 }, {}, 'player')).toBe(9_500);
  });

  it('pins PvE and PvP duration ceilings plus the shared 35% floor', () => {
    expect(mir4ControlDurationMs(2_000, 'silence', { 155: 10_000 }, {}, 'monster')).toBe(3_000);
    expect(mir4ControlDurationMs(2_000, 'silence', { 155: 10_000 }, {}, 'player')).toBe(2_500);
    expect(mir4ControlDurationMs(2_000, 'silence', {}, { 53: 50_000 }, 'monster')).toBe(700);
    expect(mir4ControlDurationMs(2_000, 'knockdown', {}, { 120: 50_000 }, 'player')).toBe(700);
  });
});
