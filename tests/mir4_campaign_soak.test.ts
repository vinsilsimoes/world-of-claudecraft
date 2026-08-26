import { describe, expect, it } from 'vitest';

import {
  isForwardMir4SoakProgress,
  isMir4MainJourneyTraveling,
  isMir4PowerGrindXpProgress,
  isMir4SameQuestStageProgress,
  mir4SoakStageAllowsPowerGrind,
  nextMir4PowerGrindTarget,
  restoredMir4PowerGrindTarget,
  selectMir4NativeGatherTarget,
  selectMir4StrengtheningQuest,
  shouldEndMir4PowerGrindForMainStage,
  shouldEscalateMir4TravelThreatToPowerGrind,
  shouldKeepMir4MainQuestGrindRoute,
  shouldResumeMir4JourneyAfterTravelThreatKill,
  shouldResumeMir4MainQuest,
  shouldRunMir4SurvivalIntervention,
  shouldSkipStalledMir4NativeGatherRoute,
  shouldSkipStalledMir4StrengtheningQuest,
  shouldStartMir4PowerGrind,
} from '../scripts/lib/mir4_campaign_soak.mjs';

const questOrder = ['M06-Q01', 'M06-Q02', 'M06-Q03'];

describe('MIR4 campaign soak progress', () => {
  it('hands a survival route to manual combat only inside the objective clearance', () => {
    expect(
      shouldRunMir4SurvivalIntervention({
        stageKind: 'survive-zone',
        grindingUntilLevel: null,
        routeWaypointDistance: 34,
      }),
    ).toBe(false);
    expect(
      shouldRunMir4SurvivalIntervention({
        stageKind: 'survive-zone',
        grindingUntilLevel: null,
        routeWaypointDistance: 6,
      }),
    ).toBe(true);
    expect(
      shouldRunMir4SurvivalIntervention({
        stageKind: 'survive-zone',
        grindingUntilLevel: 36,
        routeWaypointDistance: 0,
      }),
    ).toBe(false);
    expect(
      shouldRunMir4SurvivalIntervention({
        stageKind: 'travel',
        grindingUntilLevel: null,
        routeWaypointDistance: 0,
      }),
    ).toBe(false);
  });

  it('ends a combat power check when the Main Quest reaches dialogue', () => {
    expect(
      shouldEndMir4PowerGrindForMainStage({
        grindingUntilLevel: 175,
        activeQuestId: 'M18-Q03',
        mainQuestId: 'M18-Q03',
        mainStageKind: 'talk',
      }),
    ).toBe(true);
    expect(
      shouldEndMir4PowerGrindForMainStage({
        grindingUntilLevel: 175,
        activeQuestId: 'M18-Q03',
        mainQuestId: 'M18-Q03',
        mainStageKind: 'defend-anchor',
      }),
    ).toBe(false);
    expect(
      shouldEndMir4PowerGrindForMainStage({
        grindingUntilLevel: 175,
        activeQuestId: 'M18-S03',
        mainQuestId: 'M18-Q03',
        mainStageKind: 'talk',
      }),
    ).toBe(false);
  });

  it('does not mistake a repeating escort checkpoint for forward progress', () => {
    const checkpoint = {
      completed: 31,
      activeQuestId: 'M06-Q02',
      stageIndex: 2,
      stageProgress: 1,
    };

    expect(
      isForwardMir4SoakProgress(checkpoint, { ...checkpoint, stageProgress: 0 }, questOrder),
    ).toBe(false);
    expect(
      isForwardMir4SoakProgress(checkpoint, { ...checkpoint, stageProgress: 2 }, questOrder),
    ).toBe(true);
    expect(
      isForwardMir4SoakProgress(
        checkpoint,
        { ...checkpoint, stageIndex: 3, stageProgress: 0 },
        questOrder,
      ),
    ).toBe(true);
  });

  it('does not count switching between Main and strengthening control as a stage advance', () => {
    expect(
      isMir4SameQuestStageProgress(
        {
          completed: 17,
          activeQuestId: 'M03-S02',
          stageIndex: 1,
          stageProgress: 0,
        },
        {
          completed: 17,
          activeQuestId: 'M03-Q06',
          stageIndex: 3,
          stageProgress: 0,
        },
      ),
    ).toBe(false);
    expect(
      isMir4SameQuestStageProgress(
        {
          completed: 17,
          activeQuestId: 'M03-S02',
          stageIndex: 1,
          stageProgress: 0,
        },
        {
          completed: 17,
          activeQuestId: 'M03-S02',
          stageIndex: 1,
          stageProgress: 1,
        },
      ),
    ).toBe(true);
  });

  it('enters a needed power grind before the stall detector ends the run', () => {
    expect(
      shouldStartMir4PowerGrind({
        tick: 4,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(false);
    expect(
      shouldStartMir4PowerGrind({
        tick: 599,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(false);
    expect(
      shouldStartMir4PowerGrind({
        tick: 600,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 48,
        recommendedLevel: 53,
      }),
    ).toBe(true);
    expect(
      shouldStartMir4PowerGrind({
        tick: 3_995,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 53,
        recommendedLevel: 53,
      }),
    ).toBe(true);
    expect(
      shouldStartMir4PowerGrind({
        tick: 600,
        lastProgressTick: 0,
        stallTicks: 4_000,
        policyTicks: 5,
        playerLevel: 55,
        recommendedLevel: 53,
      }),
    ).toBe(true);
  });

  it('does not confuse a long physical Main Quest journey with a power failure', () => {
    expect(
      isMir4MainJourneyTraveling({
        mainQuestId: 'M03-Q06',
        autoQuestId: 'M03-Q06',
        routeWaypointCount: 7,
      }),
    ).toBe(true);
    expect(
      isMir4MainJourneyTraveling({
        mainQuestId: 'M03-Q06',
        autoQuestId: 'M03-Q06',
        routeWaypointCount: 0,
      }),
    ).toBe(false);
    expect(
      shouldStartMir4PowerGrind({
        tick: 10_000,
        lastProgressTick: 0,
        stallTicks: 20_000,
        policyTicks: 5,
        playerLevel: 102,
        recommendedLevel: 111,
        traveling: true,
      }),
    ).toBe(false);
  });

  it('resumes Auto Mission after the player defeats one road aggressor', () => {
    expect(
      shouldResumeMir4JourneyAfterTravelThreatKill({
        interventionQuestId: 'M03-Q01',
        previousKills: 8,
        currentKills: 9,
      }),
    ).toBe(true);
    expect(
      shouldResumeMir4JourneyAfterTravelThreatKill({
        interventionQuestId: 'M03-Q01',
        previousKills: 9,
        currentKills: 9,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4JourneyAfterTravelThreatKill({
        interventionQuestId: null,
        previousKills: 8,
        currentKills: 9,
      }),
    ).toBe(false);
  });

  it('treats a prolonged failed travel fight as a strength gate', () => {
    expect(
      shouldEscalateMir4TravelThreatToPowerGrind({
        tick: 599,
        startedTick: 0,
        playerLevel: 132,
        recommendedLevel: 161,
      }),
    ).toBe(false);
    expect(
      shouldEscalateMir4TravelThreatToPowerGrind({
        tick: 600,
        startedTick: 0,
        playerLevel: 132,
        recommendedLevel: 161,
      }),
    ).toBe(true);
    expect(
      shouldEscalateMir4TravelThreatToPowerGrind({
        tick: 600,
        startedTick: 0,
        playerLevel: 161,
        recommendedLevel: 161,
      }),
    ).toBe(true);
  });

  it('counts earned XP as progress only while strengthening is active', () => {
    expect(isMir4PowerGrindXpProgress(823_633, 825_401, 53)).toBe(true);
    expect(isMir4PowerGrindXpProgress(825_401, 825_401, 53)).toBe(false);
    expect(isMir4PowerGrindXpProgress(823_633, 825_401, null)).toBe(false);
  });

  it('retries the mission after each earned level instead of treating its recommendation as a gate', () => {
    expect(nextMir4PowerGrindTarget(26, 30)).toBe(27);
    expect(nextMir4PowerGrindTarget(29, 30)).toBe(30);
    expect(nextMir4PowerGrindTarget(30, 30)).toBe(31);
    expect(nextMir4PowerGrindTarget(31, 30)).toBe(32);
  });

  it('resumes an active strengthening quest from a persisted campaign checkpoint', () => {
    expect(
      restoredMir4PowerGrindTarget({
        playerLevel: 163,
        sideQuests: [{ questId: 'M17-S02' }],
        progresses: { 'M17-S02': { state: 'active' } },
      }),
    ).toBe(164);
    expect(
      restoredMir4PowerGrindTarget({
        playerLevel: 163,
        sideQuests: [{ questId: 'M17-S02' }],
        progresses: { 'M17-S02': { state: 'done' } },
      }),
    ).toBeNull();
  });

  it('selects a nearby ready physical WoC node and alternates the requested resource family', () => {
    const nodes = [
      { id: 'spent-herb', type: 'herb', x: 2, z: 0, ready: false },
      { id: 'near-ore', type: 'ore', x: 8, z: 0, ready: true },
      { id: 'near-herb', type: 'herb', x: 12, z: 0, ready: true },
      { id: 'far-herb', type: 'herb', x: 180, z: 0, ready: true },
      { id: 'wood-is-not-training', type: 'wood', x: 1, z: 0, ready: true },
    ];

    expect(
      selectMir4NativeGatherTarget({
        nodes,
        position: { x: 0, z: 0 },
        preferredType: 'herb',
        maxDistanceYards: 140,
      })?.id,
    ).toBe('near-herb');
    expect(
      selectMir4NativeGatherTarget({
        nodes,
        position: { x: 0, z: 0 },
        preferredType: 'ore',
        excludedNodeIds: ['near-ore'],
        maxDistanceYards: 140,
      })?.id,
    ).toBe('near-herb');
    expect(
      selectMir4NativeGatherTarget({
        nodes,
        position: { x: 0, z: 0 },
        preferredType: 'herb',
        excludedNodeIds: ['near-herb'],
        maxDistanceYards: 10,
      })?.id,
    ).toBe('near-ore');
    expect(
      selectMir4NativeGatherTarget({
        nodes,
        position: { x: 500, z: 500 },
        preferredType: 'herb',
        maxDistanceYards: 10,
      }),
    ).toBeNull();
  });

  it('abandons only a physical gathering detour that stopped making progress', () => {
    expect(shouldSkipStalledMir4NativeGatherRoute(9)).toBe(false);
    expect(shouldSkipStalledMir4NativeGatherRoute(10)).toBe(true);
    expect(shouldSkipStalledMir4NativeGatherRoute(Number.NaN)).toBe(false);
    expect(shouldSkipStalledMir4NativeGatherRoute(2, 2)).toBe(true);
  });

  it('reserves power grinding for stages whose outcome depends on combat strength', () => {
    expect(mir4SoakStageAllowsPowerGrind('activate-sequence')).toBe(false);
    expect(mir4SoakStageAllowsPowerGrind('guardian-resolution')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('inspect-clues')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('track-signs')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('gather-resource-patches')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('escort-entity')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('survive-zone')).toBe(true);
    expect(mir4SoakStageAllowsPowerGrind('system-tutorial')).toBe(false);
    expect(mir4SoakStageAllowsPowerGrind('craft-receipt')).toBe(false);
  });

  it('strengthens through unfinished side quests in the reached campaign region', () => {
    const sideQuests = [
      { questId: 'M07-S01', mapId: 'm07-old', levelRange: null },
      { questId: 'M08-S01', mapId: 'm08-current', levelRange: null },
      {
        questId: 'M08-S02',
        mapId: 'm08-current',
        levelRange: [76, 77] as const,
      },
      { questId: 'M09-S01', mapId: 'm09-future', levelRange: null },
    ];
    const progresses = {
      'M08-S01': { state: 'done' },
      'M07-S01': { state: 'active' },
    };

    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses,
        currentMainMapId: 'm08-current',
        playerLevel: 72,
      }),
    ).toBe('M07-S01');
    expect(
      selectMir4StrengtheningQuest({
        sideQuests: [
          { questId: 'M11-S01', mapId: 'm11-previous', levelRange: null },
          { questId: 'M12-S01', mapId: 'm12-current', levelRange: null },
        ],
        progresses: {},
        currentMainMapId: 'm12-current',
        playerLevel: 105,
        includeCurrentMap: true,
      }),
    ).toBe('M12-S01');
    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses: {
          'M08-S01': { state: 'done' },
          'M07-S01': { state: 'done' },
        },
        currentMainMapId: 'm08-current',
        playerLevel: 72,
      }),
    ).toBeNull();
    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses: {},
        currentMainMapId: 'm08-current',
        playerLevel: 76,
      }),
    ).toBe('M08-S01');
    expect(
      selectMir4StrengtheningQuest({
        sideQuests,
        progresses: {},
        currentMainMapId: 'm08-current',
        playerLevel: 76,
        includeCurrentMap: false,
      }),
    ).toBe('M07-S01');

    expect(
      selectMir4StrengtheningQuest({
        sideQuests: [
          { questId: 'M15-S01', mapId: 'm15-fit', levelRange: null },
          { questId: 'M16-S01', mapId: 'm16-too-strong', levelRange: null },
        ],
        progresses: {},
        currentMainMapId: 'm17-current',
        playerLevel: 142,
        includeCurrentMap: false,
      }),
    ).toBe('M15-S01');

    expect(
      selectMir4StrengtheningQuest({
        sideQuests: [
          { questId: 'M16-S01', mapId: 'm16-previous', levelRange: null },
          { questId: 'M17-S01', mapId: 'm17-current', levelRange: null },
        ],
        progresses: { 'M16-S01': { state: 'done' } },
        currentMainMapId: 'm17-current',
        playerLevel: 163,
        preferPreviousMap: true,
      }),
    ).toBe('M17-S01');
  });

  it('stops mistaking a stuck optional route for a blocked Main Quest', () => {
    expect(
      shouldSkipStalledMir4StrengtheningQuest({
        tick: 14_374,
        selectedAtTick: 14_375,
        lastProgressTick: 14_375,
        attemptTicks: 600,
      }),
    ).toBe(false);
    expect(
      shouldSkipStalledMir4StrengtheningQuest({
        tick: 14_975,
        selectedAtTick: 14_375,
        lastProgressTick: 14_375,
        attemptTicks: 600,
      }),
    ).toBe(true);
    expect(
      shouldSkipStalledMir4StrengtheningQuest({
        tick: 14_975,
        selectedAtTick: 14_375,
        lastProgressTick: 14_900,
        attemptTicks: 600,
      }),
    ).toBe(false);
  });

  it('returns to the main journey after the last strengthening quest', () => {
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: 'M01-S03',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: 'M06-Q02',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: 'M05-S01',
        autoQuestId: 'M04-S02',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: null,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: 'M06-Q02',
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: 'M06-Q02',
        grindStalled: true,
      }),
    ).toBe(false);
    expect(
      shouldResumeMir4MainQuest({
        strengtheningQuestId: null,
        autoQuestId: null,
        mainQuestId: 'M06-Q02',
        resumedMainQuestId: 'M06-Q02',
        grindStalled: true,
      }),
    ).toBe(true);
  });

  it('keeps the Main route as a road finder until a normal grind target becomes visible', () => {
    const route = {
      resumedMainQuestId: 'M03-Q06',
      autoQuestId: 'M03-Q06',
      mainQuestId: 'M03-Q06',
    };
    expect(
      shouldKeepMir4MainQuestGrindRoute({
        ...route,
        hasVisibleGrindTarget: false,
      }),
    ).toBe(true);
    expect(
      shouldKeepMir4MainQuestGrindRoute({
        ...route,
        hasVisibleGrindTarget: true,
      }),
    ).toBe(false);
    expect(
      shouldKeepMir4MainQuestGrindRoute({
        ...route,
        autoQuestId: null,
        hasVisibleGrindTarget: false,
      }),
    ).toBe(false);
  });
});
