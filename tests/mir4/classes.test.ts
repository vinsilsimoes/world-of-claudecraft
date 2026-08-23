import { describe, expect, it } from 'vitest';
import {
  MIR4_CLASS_IDS,
  MIR4_CLASSES,
  MIR4_LEVEL_COLUMNS,
  MIR4_LEVEL_ROWS,
  MIR4_MAX_LEVEL,
  mir4ClassById,
  mir4ClassByKey,
  mir4ClassRangeYards,
  mir4LevelRow,
} from '../../src/sim/content/mir4';

// Pins are literal values observed in the source project
// (F:\Dev\Survival-Game server/data/mir4-character-core-v1.json and the
// identity/range/appearance modules); see docs/migration/survival-game-port-plan.md.

describe('the mir4 class roster', () => {
  it('is exactly the five source classes with their identities', () => {
    expect(MIR4_CLASS_IDS).toEqual([1, 2, 3, 4, 5]);
    expect(MIR4_CLASSES.map((c) => [c.classId, c.key, c.name, c.weapon])).toEqual([
      [1, 'warrior', 'Guerreiro', 'heavySword'],
      [2, 'elementalist', 'Elementalista', 'largeStaff'],
      [3, 'taoist', 'Taoista', 'shortStaff'],
      [4, 'arbalist', 'Besteiro', 'arbalest'],
      [5, 'lancer', 'Lanceiro', 'spear'],
    ]);
  });
  it('only the elementalist is a magic class; range bands are 2/4/2/6/3 tiles', () => {
    expect(MIR4_CLASSES.map((c) => c.damageChannel)).toEqual([
      'physical',
      'magic',
      'physical',
      'physical',
      'physical',
    ]);
    expect(MIR4_CLASSES.map((c) => c.rangeTiles)).toEqual([2, 4, 2, 6, 3]);
    expect(MIR4_CLASSES.map(mir4ClassRangeYards)).toEqual([4, 8, 4, 12, 6]);
  });
  it('every class carries the same creation kit anchors', () => {
    for (const c of MIR4_CLASSES) {
      expect(c.initialStageId).toBe(100004010);
      expect(c.questStartId).toBe(100000000);
      expect(c.initialVehicleId).toBe(1011);
      expect(c.initialSkillIds).toHaveLength(4);
    }
    expect(mir4ClassById(1)?.initialSkillIds).toEqual([1102, 1104, 1304, 1401]);
    expect(mir4ClassByKey('arbalist')?.initialSkillIds).toEqual([4101, 4106, 4102, 4103]);
    expect(mir4ClassByKey('nope')).toBeNull();
    expect(mir4ClassById(9)).toBeNull();
  });
});

describe('the mir4 level table', () => {
  it('is the full 5 x 250 source table in class-then-level order', () => {
    expect(MIR4_LEVEL_COLUMNS).toHaveLength(27);
    expect(MIR4_LEVEL_COLUMNS.slice(0, 5)).toEqual([
      'classId',
      'level',
      'reqExp',
      'maxHp',
      'maxMana',
    ]);
    expect(MIR4_LEVEL_ROWS).toHaveLength(1250);
    for (let classId = 1; classId <= 5; classId++) {
      for (let level = 1; level <= MIR4_MAX_LEVEL; level++) {
        const row = mir4LevelRow(classId, level);
        expect(row, `${classId}:${level}`).not.toBeNull();
        expect(row?.[0]).toBe(classId);
        expect(row?.[1]).toBe(level);
      }
    }
    expect(mir4LevelRow(1, 0)).toBeNull();
    expect(mir4LevelRow(1, 251)).toBeNull();
    expect(mir4LevelRow(6, 1)).toBeNull();
  });
  it('pins level 1 stats: identical shell, PA/MA per class', () => {
    // [reqExp, maxHp, maxMana, physicalAttack, magicAttack, manaCost]
    const pick = (classId: number) => {
      const row = mir4LevelRow(classId, 1);
      return [row?.[2], row?.[3], row?.[4], row?.[5], row?.[6], row?.[20]];
    };
    expect(pick(1)).toEqual(['100', 4000, 600, 50, 0, 204]);
    expect(pick(2)).toEqual(['100', 4000, 600, 0, 50, 204]);
    expect(pick(3)).toEqual(['100', 4000, 600, 50, 50, 204]);
    expect(pick(4)).toEqual(['100', 4000, 600, 50, 0, 204]);
    expect(pick(5)).toEqual(['100', 4000, 600, 50, 50, 204]);
  });
  it('pins warrior level 2 and the level 250 cap row', () => {
    expect(mir4LevelRow(1, 2)?.slice(0, 7)).toEqual([1, 2, '240', 4240, 610, 58, 0]);
    expect(mir4LevelRow(1, 2)?.[20]).toBe(239);
    const cap = mir4LevelRow(5, 250);
    expect(cap?.[2]).toBe('23537050348087300'); // string: exceeds MAX_SAFE_INTEGER
    expect(cap?.slice(3, 9)).toEqual([63760, 3090, 2042, 2042, 1245, 1245]);
    expect(cap?.[10]).toBe(996); // accuracy
    expect(cap?.[20]).toBe(5644); // manaCost
  });
});
