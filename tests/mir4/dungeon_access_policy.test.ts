import { describe, expect, it } from 'vitest';
import { DUNGEON_LIST } from '../../src/sim/data';
import {
  dungeonAdmissionKind,
  dungeonContentPolicy,
  MIR4_DUNGEON_TICKET_POLICY,
  MIR4_TICKETED_DUNGEON_CATALOG,
  mir4DungeonIdForQuest,
  mir4StoryDungeonIdForQuest,
  WOC_OPEN_DUNGEON_IDS,
} from '../../src/sim/mir4/dungeon_access_policy';

describe('MIR4 and WoC dungeon admission families', () => {
  it('keeps every original WoC dungeon outside the MIR4 ticket economy', () => {
    const physicalDungeonIds = DUNGEON_LIST.filter(
      (dungeon) => dungeon.overworldDoor !== false,
    ).map((dungeon) => dungeon.id);

    expect([...WOC_OPEN_DUNGEON_IDS].sort()).toEqual(
      [...physicalDungeonIds, 'nythraxis_boss_arena'].sort(),
    );
    for (const dungeonId of physicalDungeonIds) {
      expect(dungeonAdmissionKind(dungeonId)).toBe('woc-open');
    }
    expect(dungeonAdmissionKind('nythraxis_boss_arena')).toBe('woc-open');
    expect(dungeonAdmissionKind('campaign_trial_room')).toBe('unknown');
    expect(dungeonContentPolicy('hollow_crypt')).toEqual({
      source: 'woc',
      admission: 'open',
      tuningProfile: 'aeldrune-open-dungeon',
      rewardProfile: 'aeldrune-grind',
    });
    expect(dungeonContentPolicy('campaign_trial_room')).toBeNull();
  });

  it('pins the source-backed MIR4 type-3 ticket policy and six-dungeon catalog', () => {
    expect(MIR4_DUNGEON_TICKET_POLICY).toEqual({
      ticketType: 3,
      ticketCost: 1,
      defaultMax: 2,
      resetHour: 5,
      resetMinute: 0,
      ticketItemId: 601201603,
    });
    expect(MIR4_TICKETED_DUNGEON_CATALOG).toEqual([
      {
        dungeonId: 101,
        stageId: 200501400,
        minLevel: 20,
        startLevel: 20,
        requiredCombatPower: 11_000,
        recommendedCombatPower: 13_200,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
      {
        dungeonId: 102,
        stageId: 200400201,
        minLevel: 20,
        startLevel: 30,
        requiredCombatPower: 20_000,
        recommendedCombatPower: 24_600,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
      {
        dungeonId: 103,
        stageId: 200501020,
        minLevel: 20,
        startLevel: 40,
        requiredCombatPower: 29_000,
        recommendedCombatPower: 36_100,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
      {
        dungeonId: 104,
        stageId: 200400501,
        minLevel: 20,
        startLevel: 50,
        requiredCombatPower: 39_000,
        recommendedCombatPower: 48_600,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
      {
        dungeonId: 105,
        stageId: 200400401,
        minLevel: 20,
        startLevel: 60,
        requiredCombatPower: 46_000,
        recommendedCombatPower: 57_000,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
      {
        dungeonId: 106,
        stageId: 200400301,
        minLevel: 20,
        startLevel: 70,
        requiredCombatPower: 52_000,
        recommendedCombatPower: 64_800,
        recommendedPlayers: 5,
        durationSeconds: 3_600,
      },
    ]);
    expect(dungeonAdmissionKind(101)).toBe('mir4-ticketed');
    expect(dungeonContentPolicy(101)).toEqual({
      source: 'mir4',
      admission: 'ticketed',
      tuningProfile: 'aeldrune-ticket-dungeon',
      rewardProfile: 'mir4-premium',
    });
  });

  it('binds the five campaign dungeon lessons to source dungeon identities', () => {
    expect(
      ['M04-Q05', 'M08-Q05', 'M12-Q05', 'M16-Q04', 'M20-Q05'].map(mir4StoryDungeonIdForQuest),
    ).toEqual([101, 102, 103, 104, 105]);
    expect(mir4StoryDungeonIdForQuest('M01-Q01')).toBeNull();
    expect(
      ['M01-R02', 'M05-R02', 'M09-R02', 'M13-R02', 'M17-R02', 'M19-R02'].map(mir4DungeonIdForQuest),
    ).toEqual([101, 102, 103, 104, 105, 106]);
  });
});
