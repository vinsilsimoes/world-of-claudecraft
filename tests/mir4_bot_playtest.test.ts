import { describe, expect, it } from 'vitest';
import {
  buildMir4PlaytestReport,
  createMir4BotTracker,
  MIR4_BOT_PORTAL_TUTORIAL_TARGETS,
  MIR4_BOT_UI_TUTORIAL_QUEST_IDS,
  MIR4_PLAYTEST_ROSTER,
  mir4BotAccountIdentity,
  mir4BotHasDuelRequest,
  planMir4GrindingEngagement,
  planMir4ProgressionActions,
  planMir4PvpChallenge,
  planMir4ThreatIntervention,
  planMir4TutorialEngagement,
  recordMir4BotEvents,
  recordMir4BotSnapshot,
  selectMir4PlaytestRoster,
} from '../scripts/lib/mir4_bot_playtest.mjs';
import { MIR4_ARC_UI_ACKNOWLEDGEMENT_TUTORIALS } from '../src/sim/mir4/arc_receipts';
import { MIR4_WOC_TUTORIAL_PORTALS } from '../src/sim/mir4/woc_campaign_portals';

function selfSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    lv: 1,
    xp: 0,
    copper: 0,
    hp: 100,
    mhp: 100,
    dead: false,
    x: 10,
    z: 20,
    mir4: {
      classId: 1,
      autoBattle: { mode: 'off' },
      mir4Equipment: { 1: 200201000, 5: 301201000 },
      mir4EquipmentInstances: {
        200201000: { enhancement: 0 },
        301201000: { enhancement: 0 },
      },
    },
    ...overrides,
  };
}

describe('MIR4 real-player bot playtest core', () => {
  it('approaches a distant duel target and waits for the authoritative invite event', () => {
    expect(planMir4PvpChallenge({ x: 0, z: 0 }, { x: 30, z: 0 })).toMatchObject({
      ready: false,
      facing: Math.PI / 2,
      move: { f: 1 },
    });
    expect(planMir4PvpChallenge({ x: 0, z: 0 }, { x: 10, z: 0 })).toEqual({
      ready: true,
      facing: Math.PI / 2,
      move: {},
    });
    expect(mir4BotHasDuelRequest([{ type: 'damage' }], 41)).toBe(false);
    expect(
      mir4BotHasDuelRequest(
        [
          { type: 'duelRequest', fromPid: 40 },
          { type: 'duelRequest', fromPid: 41 },
        ],
        41,
      ),
    ).toBe(true);
  });

  it('pins bot UI tutorial acknowledgements to the authoritative simulation allowlist', () => {
    expect(MIR4_BOT_UI_TUTORIAL_QUEST_IDS).toEqual([...MIR4_ARC_UI_ACKNOWLEDGEMENT_TUTORIALS]);
  });

  it('pins one persistent player identity for every native class', () => {
    expect(MIR4_PLAYTEST_ROSTER.map(({ classKey, classId }) => [classKey, classId])).toEqual([
      ['warrior', 1],
      ['elementalist', 2],
      ['taoist', 3],
      ['arbalist', 4],
      ['lancer', 5],
    ]);
    expect(new Set(MIR4_PLAYTEST_ROSTER.map((entry) => entry.initialSkillIds[0])).size).toBe(5);
    expect(mir4BotAccountIdentity('Cohort-A', MIR4_PLAYTEST_ROSTER[4])).toEqual({
      username: 'm4cohorta5',
      characterName: 'Kaelorplrq',
    });
  });

  it('selects deterministic class shards for resumable campaign soak runs', () => {
    expect(selectMir4PlaytestRoster()).toEqual(MIR4_PLAYTEST_ROSTER);
    expect(selectMir4PlaytestRoster('lancer,warrior').map(({ classKey }) => classKey)).toEqual([
      'lancer',
      'warrior',
    ]);
    expect(() => selectMir4PlaytestRoster('warrior,warrior')).toThrow(/duplicate/i);
    expect(() => selectMir4PlaytestRoster('warlock')).toThrow(/unknown/i);
  });

  it('records authoritative progression, combat, quests and equipment transitions', () => {
    const tracker = createMir4BotTracker(MIR4_PLAYTEST_ROSTER[0], 'BotWarrior', 1_000);
    recordMir4BotSnapshot(tracker, selfSnapshot(), 1_000);
    recordMir4BotEvents(
      tracker,
      [
        { type: 'xp', amount: 40 },
        { type: 'loot', text: 'Reward' },
      ],
      1_500,
    );
    recordMir4BotSnapshot(
      tracker,
      selfSnapshot({
        lv: 2,
        xp: 15,
        copper: 120,
        hp: 80,
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q01', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q01': {
              questId: 'M01-Q01',
              stageIndex: 1,
              stageProgress: 2,
              state: 'active',
            },
          },
          mir4Equipment: { 1: 200201000, 5: 301201000 },
          mir4EquipmentInstances: {
            200201000: { enhancement: 1 },
            301201000: { enhancement: 0 },
          },
        },
      }),
      2_000,
    );
    recordMir4BotEvents(tracker, [{ type: 'death', entityId: 11, killerId: 99 }], 2_500);
    recordMir4BotSnapshot(
      tracker,
      selfSnapshot({ lv: 2, xp: 15, copper: 120, dead: true, hp: 0 }),
      2_500,
    );
    recordMir4BotSnapshot(tracker, selfSnapshot({ lv: 2, xp: 15, copper: 120, hp: 100 }), 3_000);

    expect(tracker.progress).toMatchObject({
      levelDelta: 1,
      xpEvents: 1,
      xpEarned: 40,
      copperDelta: 120,
      questAdvances: 1,
      equipmentEnhancements: 1,
      lootEvents: 1,
      deaths: 1,
      recoveries: 1,
    });
    expect(tracker.timeline.map((entry) => entry.kind)).toEqual(
      expect.arrayContaining(['level', 'quest', 'equipment', 'death', 'recovery']),
    );
  });

  it('ignores death events belonging to another visible player', () => {
    const tracker = createMir4BotTracker(MIR4_PLAYTEST_ROSTER[0], 'BotWarrior', 1_000);
    recordMir4BotSnapshot(tracker, selfSnapshot(), 1_000);

    recordMir4BotEvents(tracker, [{ type: 'death', entityId: 77, killerId: 99 }], 1_500);

    expect(tracker.progress.deaths).toBe(0);
    expect(tracker.deathActive).toBe(false);
  });

  it('plans only ordinary profile commands from the authoritative snapshot', () => {
    expect(planMir4ProgressionActions(selfSnapshot())).toEqual([
      { cmd: 'mir4', m: 'auto', on: true },
      { cmd: 'mir4', m: 'quest', on: true },
    ]);

    const ready = selfSnapshot({
      lv: 10,
      copper: 4_000,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M01-Q01', phase: 'to-site' },
        mir4AchievementClears: { 20101: { groupGrade: 1 } },
        mir4SkillLevels: { 1102: 1 },
        mir4SkillResources: { effectPoints: 400, skillTomes: 3 },
        mir4Mounts: {
          pending: [{ id: 'mount-pending-11-1', mountId: 'meadow-courser', grade: 4 }],
        },
        mir4Spirits: {
          pending: [{ id: 'spirit-pending-11-1', spiritId: 'spirit-epic-01', grade: 4 }],
        },
      },
    });
    expect(planMir4ProgressionActions(ready, MIR4_PLAYTEST_ROSTER[0])).toEqual([
      { cmd: 'mir4', m: 'claimAchievement', achievementId: 20102 },
      { cmd: 'mir4', m: 'upgradeSkill', skillId: 1102, expectedCurrentLevel: 1 },
      { cmd: 'mir4', m: 'confirmMount', pendingId: 'mount-pending-11-1' },
      { cmd: 'mir4', m: 'confirmSpirit', pendingId: 'spirit-pending-11-1' },
    ]);
    expect(planMir4ProgressionActions(selfSnapshot({ dead: true, hp: 0 }))).toEqual([
      { cmd: 'release' },
    ]);
    expect(planMir4ProgressionActions(selfSnapshot({ dead: true, hp: 0, gh: 1 }))).toEqual([
      { cmd: 'resurrect_healer' },
    ]);
    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          hp: 75,
          pcd: 0,
          inv: [{ itemId: 'minor_healing_potion', count: 2 }],
          mir4: {
            classId: 1,
            autoBattle: { mode: 'battle' },
            mir4AutoQuest: { questId: 'M01-Q02', phase: 'to-site' },
            mir4ArcQuests: {
              'M01-Q02': {
                questId: 'M01-Q02',
                stageIndex: 3,
                stageProgress: 0,
                state: 'active',
              },
            },
          },
        }),
      ),
    ).toEqual([{ cmd: 'use', item: 'minor_healing_potion' }]);

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          hp: 75,
          pcd: 30,
          inv: [{ itemId: 'minor_healing_potion', count: 2 }],
          mir4: {
            classId: 1,
            autoBattle: { mode: 'battle' },
            mir4AutoQuest: { questId: 'M01-Q02', phase: 'to-site' },
            mir4ArcQuests: {
              'M01-Q02': {
                questId: 'M01-Q02',
                stageIndex: 3,
                stageProgress: 0,
                state: 'active',
              },
            },
          },
        }),
      ),
    ).toEqual([]);

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          hp: 75,
          pcd: 0,
          inv: [{ itemId: 'minor_healing_potion', count: 2 }],
          mir4: {
            classId: 1,
            autoBattle: { mode: 'battle' },
            mir4AutoQuest: { questId: 'M01-Q02', phase: 'to-site' },
            mir4ArcQuests: {
              'M01-Q02': {
                questId: 'M01-Q02',
                stageIndex: 2,
                stageProgress: 2,
                state: 'active',
              },
            },
          },
        }),
      ),
    ).toEqual([]);
  });

  it('uses the native campaign profession command for an active receipt stage', () => {
    const crafting = selfSnapshot({
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M08-S01', phase: 'to-site' },
        mir4ArcQuests: {
          'M08-S01': {
            questId: 'M08-S01',
            stageIndex: 2,
            stageProgress: 0,
            state: 'active',
          },
        },
      },
    });

    expect(planMir4ProgressionActions(crafting, MIR4_PLAYTEST_ROSTER[0])).toContainEqual({
      cmd: 'mir4',
      m: 'campaignProfession',
    });
  });

  it('equips the highest owned native catalog item for every available slot', () => {
    const geared = selfSnapshot({
      lv: 105,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M13-Q05', phase: 'to-site' },
        mir4Equipment: { 1: 991010101, 5: 301201000 },
        mir4EquipmentInstances: {
          991010101: { itemId: 991010101, enhancement: 7 },
          301201000: { itemId: 301201000, enhancement: 0 },
        },
        mir4AchievementClears: { 20101: { groupGrade: 1 }, 20102: { groupGrade: 1 } },
        mir4ArcRewards: {
          items: {
            '991010105': 1,
            '991010106': 1,
            '991020106': 1,
            '991050106': 1,
          },
        },
      },
    });

    expect(planMir4ProgressionActions(geared, MIR4_PLAYTEST_ROSTER[0])).toEqual([
      { cmd: 'mir4', m: 'equipItem', itemId: 991010106 },
      { cmd: 'mir4', m: 'equipItem', itemId: 991020106 },
      { cmd: 'mir4', m: 'equipItem', itemId: 991050106 },
    ]);
  });

  it('re-equips a retrofitted catalog item to inherit stronger slot progress', () => {
    const repaired = selfSnapshot({
      lv: 112,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M16-Q06', phase: 'to-site' },
        mir4Equipment: { 1: 991010106 },
        mir4EquipmentInstances: {
          991010101: { itemId: 991010101, enhancement: 7 },
          991010106: { itemId: 991010106, enhancement: 0 },
        },
        mir4ArcRewards: { items: { '991010106': 1 } },
        mir4AchievementClears: { 20101: { groupGrade: 1 }, 20102: { groupGrade: 1 } },
      },
    });

    expect(planMir4ProgressionActions(repaired, MIR4_PLAYTEST_ROSTER[0])).toContainEqual({
      cmd: 'mir4',
      m: 'equipItem',
      itemId: 991010106,
    });
  });

  it('seeks a real hostile when the potion tutorial requires the bot to suffer damage', () => {
    const tutorial = selfSnapshot({
      hp: 100,
      mhp: 100,
      x: 10,
      z: 20,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M01-Q02', phase: 'to-site' },
        mir4ArcQuests: {
          'M01-Q02': {
            questId: 'M01-Q02',
            stageIndex: 3,
            stageProgress: 0,
            state: 'active',
          },
        },
      },
    });
    const distant = new Map([
      [90, { id: 90, k: 'mob', hp: 200, x: 10, z: 29 }],
      [91, { id: 91, k: 'mob', hp: 200, x: 40, z: 20 }],
    ]);
    expect(planMir4TutorialEngagement(tutorial, distant, MIR4_PLAYTEST_ROSTER[0])).toEqual([
      { t: 'input', mi: { f: 1 }, facing: 0 },
    ]);

    const close = new Map([[90, { id: 90, kind: 'mob', hp: 200, x: 10, z: 22 }]]);
    expect(planMir4TutorialEngagement(tutorial, close, MIR4_PLAYTEST_ROSTER[0])).toEqual([
      { t: 'input', mi: {}, facing: 0 },
      { cmd: 'mir4', m: 'cast', skill: 1102, target: 90 },
      { cmd: 'mir4', m: 'basic', target: 90 },
    ]);

    expect(
      planMir4TutorialEngagement({ ...tutorial, hp: 99 }, close, MIR4_PLAYTEST_ROSTER[0]),
    ).toEqual([]);
  });

  it('releases movement inside the Auto Battle radius and ignores quest-scoped summons', () => {
    const self = selfSnapshot({ x: 10, z: 20 });
    const nearby = new Map([
      [90, { id: 90, kind: 'mob', hp: 200, x: 11, z: 21, runScoped: true }],
      [91, { id: 91, kind: 'mob', hp: 200, x: 10, z: 29, hostile: true }],
      [92, { id: 92, kind: 'mob', hp: 0, x: 10, z: 22, hostile: true }],
    ]);

    expect(planMir4GrindingEngagement(self, nearby)).toEqual([]);

    const distant = new Map([
      [90, { id: 90, kind: 'mob', hp: 200, x: 11, z: 21, runScoped: true }],
      [91, { id: 91, kind: 'mob', hp: 200, x: 10, z: 60, hostile: true }],
    ]);
    expect(planMir4GrindingEngagement(self, distant)).toEqual([
      { t: 'input', mi: { f: 1 }, facing: 0 },
    ]);
  });

  it('manually clears collection threats but never interrupts an active collection cast', () => {
    const self = selfSnapshot({ x: 10, z: 20 });
    const threats = new Map([
      [90, { id: 90, kind: 'mob', hp: 200, x: 10, z: 22, hostile: true, targetId: 11 }],
      [91, { id: 91, kind: 'mob', hp: 200, x: 10, z: 50, hostile: true }],
    ]);

    expect(planMir4ThreatIntervention(self, threats, MIR4_PLAYTEST_ROSTER[0])).toEqual([
      { t: 'input', mi: {}, facing: 0 },
      { cmd: 'mir4', m: 'cast', skill: 1102, target: 90 },
      { cmd: 'mir4', m: 'basic', target: 90 },
    ]);
    expect(
      planMir4ThreatIntervention(
        { ...self, castingAbility: 'gather' },
        threats,
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toEqual([]);
  });

  it('walks through the admitted forward portal when M02-Q01 teaches safe portal travel', () => {
    const portal = MIR4_WOC_TUTORIAL_PORTALS[0]!.a;
    expect(MIR4_BOT_PORTAL_TUTORIAL_TARGETS['M02-Q01']).toEqual({
      x: portal.x,
      z: portal.z,
    });
    const self = selfSnapshot({
      x: portal.x + 12,
      z: portal.z + 20,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M02-Q01', phase: 'to-site' },
        mir4ArcQuests: {
          'M02-Q01': {
            questId: 'M02-Q01',
            stageIndex: 3,
            stageProgress: 0,
            state: 'active',
          },
        },
      },
    });

    expect(planMir4TutorialEngagement(self, new Map(), MIR4_PLAYTEST_ROSTER[0])).toEqual([
      {
        t: 'input',
        mi: { f: 1 },
        facing: Math.atan2(portal.x - self.x, portal.z - self.z),
      },
    ]);
  });

  it('drives the late-campaign tutorial verbs instead of stalling Auto Journey', () => {
    const enhancement = selfSnapshot({
      copper: 20_000,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M15-Q05', phase: 'to-site' },
        mir4ArcQuests: {
          'M15-Q05': {
            questId: 'M15-Q05',
            stageIndex: 3,
            stageProgress: 0,
            state: 'active',
          },
        },
        mir4Equipment: { 1: 200201000 },
        mir4EquipmentInstances: { 200201000: { enhancement: 7 } },
        mir4Materials: { sunStone: 1, solarScroll: 0, solarWard: 1 },
      },
    });
    expect(planMir4ProgressionActions(enhancement, MIR4_PLAYTEST_ROSTER[0])).toContainEqual({
      cmd: 'mir4',
      m: 'craftMaterial',
      recipeId: 'solar-scroll',
    });

    const fusion = selfSnapshot({
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M10-Q03', phase: 'to-site' },
        mir4ArcQuests: {
          'M10-Q03': {
            questId: 'M10-Q03',
            stageIndex: 4,
            stageProgress: 0,
            state: 'active',
          },
        },
        mir4Spirits: { owned: { 'spirit-common-01': 4 } },
      },
    });
    expect(planMir4ProgressionActions(fusion, MIR4_PLAYTEST_ROSTER[0])).toContainEqual({
      cmd: 'mir4',
      m: 'combineSpirits',
      grade: 1,
    });

    const advancedCraft = selfSnapshot({
      copper: 8_000,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M13-Q03', phase: 'to-site' },
        mir4ArcQuests: {
          'M13-Q03': {
            questId: 'M13-Q03',
            stageIndex: 3,
            stageProgress: 0,
            state: 'active',
          },
        },
        mir4Materials: { sunStone: 1, solarScroll: 0 },
      },
    });
    expect(planMir4ProgressionActions(advancedCraft, MIR4_PLAYTEST_ROSTER[0])).toContainEqual({
      cmd: 'mir4',
      m: 'craftMaterial',
      recipeId: 'solar-scroll',
    });
  });

  it('walks through a real portal for the M09 regional travel lesson', () => {
    const portal = MIR4_WOC_TUTORIAL_PORTALS[1]!.a;
    expect(MIR4_BOT_PORTAL_TUTORIAL_TARGETS['M09-Q04']).toEqual({
      x: portal.x,
      z: portal.z,
    });
    const self = selfSnapshot({
      x: portal.x + 10,
      z: portal.z - 20,
      mir4: {
        classId: 1,
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M09-Q04', phase: 'to-site' },
        mir4ArcQuests: {
          'M09-Q04': {
            questId: 'M09-Q04',
            stageIndex: 3,
            stageProgress: 0,
            state: 'active',
          },
        },
      },
    });

    expect(planMir4TutorialEngagement(self, new Map(), MIR4_PLAYTEST_ROSTER[0])).toEqual([
      {
        t: 'input',
        mi: { f: 1 },
        facing: Math.atan2(portal.x - self.x, portal.z - self.z),
      },
    ]);
  });

  it('acknowledges informational tutorials without bypassing gameplay-backed lessons', () => {
    const informational = planMir4ProgressionActions(
      selfSnapshot({
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q01', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q01': {
              questId: 'M01-Q01',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
        },
      }),
      MIR4_PLAYTEST_ROSTER[0],
    );
    expect(informational).toContainEqual({
      cmd: 'mir4',
      m: 'ackTutorial',
      questId: 'M01-Q01',
    });

    const partyFinderLesson = planMir4ProgressionActions(
      selfSnapshot({
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M05-Q02', phase: 'to-site' },
          mir4ArcQuests: {
            'M05-Q02': {
              questId: 'M05-Q02',
              stageIndex: 4,
              stageProgress: 0,
              state: 'active',
            },
          },
        },
      }),
      MIR4_PLAYTEST_ROSTER[0],
    );
    expect(partyFinderLesson).toContainEqual({
      cmd: 'mir4',
      m: 'ackTutorial',
      questId: 'M05-Q02',
    });

    const gameplayBacked = planMir4ProgressionActions(
      selfSnapshot({
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q03', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q03': {
              questId: 'M01-Q03',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
        },
      }),
      MIR4_PLAYTEST_ROSTER[0],
    );
    expect(gameplayBacked).not.toContainEqual(expect.objectContaining({ m: 'ackTutorial' }));
  });

  it('equips earned native gear when the campaign teaches equipment', () => {
    const actions = planMir4ProgressionActions(
      selfSnapshot({
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q03', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q03': {
              questId: 'M01-Q03',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
          mir4Equipment: { 1: 200201000 },
          mir4ArcRewards: { items: { 991010101: 1, 'material-presa': 2 } },
        },
      }),
      MIR4_PLAYTEST_ROSTER[0],
    );

    expect(actions).toContainEqual({ cmd: 'mir4', m: 'equipItem', itemId: 991010101 });

    const alreadyEquipped = planMir4ProgressionActions(
      selfSnapshot({
        mir4: {
          classId: 2,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q03', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q03': {
              questId: 'M01-Q03',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
          mir4Equipment: { 1: 991010201 },
          mir4EquipmentInstances: { 991010201: { itemId: 991010201, enhancement: 0 } },
          mir4ArcRewards: { items: { 991010201: 1 } },
        },
      }),
      MIR4_PLAYTEST_ROSTER[1],
    );
    expect(alreadyEquipped).toContainEqual({
      cmd: 'mir4',
      m: 'equipItem',
      itemId: 991010201,
    });
  });

  it('crafts the granted Solar Scroll when the campaign teaches material creation', () => {
    const actions = planMir4ProgressionActions(
      selfSnapshot({
        copper: 5_000,
        mir4: {
          classId: 2,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M01-Q04', phase: 'to-site' },
          mir4ArcQuests: {
            'M01-Q04': {
              questId: 'M01-Q04',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
          mir4Materials: { sunStone: 1 },
        },
      }),
      MIR4_PLAYTEST_ROSTER[1],
    );

    expect(actions).toContainEqual({
      cmd: 'mir4',
      m: 'craftMaterial',
      recipeId: 'solar-scroll',
    });
  });

  it('crafts two Solar Scrolls and then enhances the equipped weapon to +2 for M01-Q06', () => {
    const tutorial = {
      questId: 'M01-Q06',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M01-Q06', phase: 'to-site' },
      mir4ArcQuests: { 'M01-Q06': tutorial },
      mir4Equipment: { 1: 991010101 },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 10_000,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 2, solarScroll: 0 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 0 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'solar-scroll' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 0,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 0, solarScroll: 2 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 0 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 0,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 0, solarScroll: 1 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 1 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 });
  });

  it('uses the three campaign grants to advance the equipped weapon from +2 to +5', () => {
    const tutorial = {
      questId: 'M04-Q03',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M04-Q03', phase: 'to-site' },
      mir4ArcQuests: { 'M04-Q03': tutorial },
      mir4Equipment: { 1: 991010101 },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 15_000,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 3, solarScroll: 0 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 2 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'solar-scroll' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 0,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 0, solarScroll: 3 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 2 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          copper: 0,
          mir4: {
            ...baseMir4,
            mir4Materials: { sunStone: 0, solarScroll: 1 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 4 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 });
  });

  it('uses the protected campaign attempt to advance the equipped weapon from +5 to +6', () => {
    const actions = planMir4ProgressionActions(
      selfSnapshot({
        copper: 5_000,
        mir4: {
          classId: 1,
          autoBattle: { mode: 'battle' },
          mir4AutoQuest: { questId: 'M07-Q05', phase: 'to-site' },
          mir4ArcQuests: {
            'M07-Q05': {
              questId: 'M07-Q05',
              stageIndex: 3,
              stageProgress: 0,
              state: 'active',
            },
          },
          mir4Equipment: { 1: 991010101 },
          mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 5 } },
          mir4Materials: { sunStone: 0, solarScroll: 1, solarWard: 1 },
          mir4ArcRewards: { guarantees: { 'tutorial-first-plus-six': 1 } },
        },
      }),
      MIR4_PLAYTEST_ROSTER[0],
    );

    expect(actions).toContainEqual({ cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 });
  });

  it('redeems, confirms and equips the granted Spirit for the M02-Q04 lesson', () => {
    const tutorial = {
      questId: 'M02-Q04',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M02-Q04', phase: 'to-site' },
      mir4ArcQuests: { 'M02-Q04': tutorial },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4ArcRewards: { tickets: { 'spirit-ticket-dawn': 1 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'redeemTicket', ticketId: 'spirit-ticket-dawn' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Spirits: {
              pending: [{ id: 'spirit-pending-11-1', spiritId: 'spirit-epic-01', grade: 4 }],
            },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'confirmSpirit', pendingId: 'spirit-pending-11-1' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Spirits: { owned: { 'spirit-common-01': 1 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'equipSpirit', spiritId: 'spirit-common-01' });
  });

  it('crafts, rolls and resolves the first weapon enchantment for M03-Q01', () => {
    const tutorial = {
      questId: 'M03-Q01',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M03-Q01', phase: 'to-site' },
      mir4ArcQuests: { 'M03-Q01': tutorial },
      mir4Equipment: { 1: 991010101 },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Materials: { moonStone: 5, lunarSeal: 0 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 2 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'lunar-seal' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Materials: { moonStone: 0, lunarSeal: 1 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 2 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({
      cmd: 'mir4',
      m: 'rollLayer',
      itemId: 991010101,
      layer: 'enchantment',
    });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Materials: { moonStone: 0, lunarSeal: 0 },
            mir4EquipmentInstances: {
              991010101: {
                itemId: 991010101,
                enhancement: 2,
                pendingRoll: {
                  rollId: 'roll-42-991010101-enchantment',
                  layer: 'enchantment',
                  affixes: [[20, 7]],
                },
              },
            },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({
      cmd: 'mir4',
      m: 'resolveLayer',
      itemId: 991010101,
      layer: 'enchantment',
      rollId: 'roll-42-991010101-enchantment',
      accept: true,
    });
  });

  it('rolls and accepts the tutorial weapon Blessing for M04-Q04', () => {
    const tutorial = {
      questId: 'M04-Q04',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M04-Q04', phase: 'to-site' },
      mir4ArcQuests: { 'M04-Q04': tutorial },
      mir4Equipment: { 1: 991010101 },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Materials: { dawnTear: 1 },
            mir4EquipmentInstances: { 991010101: { itemId: 991010101, enhancement: 5 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({
      cmd: 'mir4',
      m: 'rollLayer',
      itemId: 991010101,
      layer: 'blessing',
    });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Materials: { dawnTear: 0 },
            mir4EquipmentInstances: {
              991010101: {
                itemId: 991010101,
                enhancement: 5,
                pendingRoll: {
                  rollId: 'roll-84-991010101-blessing',
                  layer: 'blessing',
                  affixes: [[29, 3]],
                },
              },
            },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({
      cmd: 'mir4',
      m: 'resolveLayer',
      itemId: 991010101,
      layer: 'blessing',
      rollId: 'roll-84-991010101-blessing',
      accept: true,
    });
  });

  it('redeems, confirms and equips the granted native-shell Mount for M03-Q04', () => {
    const tutorial = {
      questId: 'M03-Q04',
      stageIndex: 4,
      stageProgress: 0,
      state: 'active',
    };
    const baseMir4 = {
      classId: 1,
      autoBattle: { mode: 'battle' },
      mir4AutoQuest: { questId: 'M03-Q04', phase: 'to-site' },
      mir4ArcQuests: { 'M03-Q04': tutorial },
    };

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4ArcRewards: { tickets: { 'mount-ticket-dawn': 1 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'redeemTicket', ticketId: 'mount-ticket-dawn' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Mounts: {
              pending: [{ id: 'mount-pending-11-1', mountId: 'eclipse-lion', grade: 4 }],
            },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'confirmMount', pendingId: 'mount-pending-11-1' });

    expect(
      planMir4ProgressionActions(
        selfSnapshot({
          mir4: {
            ...baseMir4,
            mir4Mounts: { owned: { 'meadow-courser': 1 } },
          },
        }),
        MIR4_PLAYTEST_ROSTER[0],
      ),
    ).toContainEqual({ cmd: 'mir4', m: 'equipMount', mountId: 'meadow-courser' });
  });

  it('turns comparable bot histories into actionable progression findings', () => {
    const trackers = MIR4_PLAYTEST_ROSTER.map((entry, index) => {
      const tracker = createMir4BotTracker(entry, `Bot${index}`, 0);
      recordMir4BotSnapshot(tracker, selfSnapshot(), 0);
      const progressed = index < 4;
      recordMir4BotSnapshot(
        tracker,
        selfSnapshot({
          lv: progressed ? 3 : 1,
          xp: progressed ? 80 : 0,
          mir4: {
            classId: entry.classId,
            autoBattle: { mode: 'battle' },
            ...(progressed
              ? {
                  mir4ArcQuests: {
                    'M01-Q01': {
                      questId: 'M01-Q01',
                      stageIndex: 2,
                      stageProgress: 0,
                      state: 'active',
                    },
                  },
                }
              : {}),
          },
        }),
        120_000,
      );
      return tracker;
    });

    const report = buildMir4PlaytestReport({
      namespace: 'cohort-a',
      trackers,
      startedAt: 0,
      endedAt: 120_000,
      stallThresholdMs: 60_000,
      pvp: { status: 'completed', winnerClass: 'warrior', durationMs: 18_000 },
    });

    expect(report.summary).toMatchObject({ bots: 5, classesRepresented: 5, pvpCompleted: true });
    expect(report.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'high',
          code: 'progression-stalled',
          classKey: 'lancer',
        }),
        expect.objectContaining({
          severity: 'high',
          code: 'class-progression-outlier',
          classKey: 'lancer',
        }),
      ]),
    );
  });
});
