import { afterEach, describe, expect, it } from 'vitest';
import { MIR4_QUESTS_MAIN } from '../../src/sim/content/mir4/arc_campaign';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { setActiveWorldContent } from '../../src/sim/data';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import type { Mir4ArcQuestProgress } from '../../src/sim/mir4/arc_quests';
import {
  isMir4CampaignMapUnlocked,
  mir4PortalDestinationMapId,
} from '../../src/sim/mir4/map_unlocks';
import {
  MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS,
  MIR4_WOC_TUTORIAL_PORTALS,
} from '../../src/sim/mir4/woc_campaign_portals';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';
import { updatePortalTriggers } from '../../src/sim/portals';
import { Sim } from '../../src/sim/sim';

const progress = (questId: string): Mir4ArcQuestProgress => ({
  questId,
  stageIndex: 0,
  stageProgress: 0,
  state: 'active',
});

const done = (questId: string): Mir4ArcQuestProgress => ({
  questId,
  stageIndex: 99,
  stageProgress: 0,
  state: 'done',
});

afterEach(() => setActiveWorldContent(null));

describe('MIR4 campaign map unlocks', () => {
  it('keeps the starting map open and unlocks a later map as soon as its main quest is accepted', () => {
    expect(isMir4CampaignMapUnlocked('m01-vila-do-vau', undefined)).toBe(true);
    expect(isMir4CampaignMapUnlocked('m02-trilha-dos-juncos', undefined)).toBe(false);
    expect(
      isMir4CampaignMapUnlocked('m02-trilha-dos-juncos', {
        'M02-Q01': progress('M02-Q01'),
      }),
    ).toBe(true);
  });

  it('opens the M01 to M02 portal when Fogo nos Juncos is the offered main quest', () => {
    const quests = Object.fromEntries(
      ['M01-Q01', 'M01-Q02', 'M01-Q03', 'M01-Q04', 'M01-Q05', 'M01-Q06'].map((questId) => [
        questId,
        done(questId),
      ]),
    );
    const destinationMapId = mir4PortalDestinationMapId('mir4_woc_tutorial_m02_waypoint', 'b-to-a');

    expect(destinationMapId).toBe('m02-trilha-dos-juncos');
    if (!destinationMapId) throw new Error('M01 to M02 campaign portal destination is required');
    expect(isMir4CampaignMapUnlocked(destinationMapId, quests)).toBe(true);
  });

  it('lets the live Aeldrune runtime cross M01 to M02 when Fogo nos Juncos is offered', () => {
    const world = buildMir4WocCampaignWorld(2);
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 42,
      playerClass: 'warrior',
      playerName: 'PortalRegression',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    const portal = MIR4_WOC_TUTORIAL_PORTALS.find(
      (candidate) => candidate.id === 'mir4_woc_tutorial_m02_waypoint',
    );
    if (!portal) throw new Error('M01 to M02 tutorial portal is required');
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Portal regression player metadata is required');
    meta.mir4ArcQuests = Object.fromEntries(
      ['M01-Q01', 'M01-Q02', 'M01-Q03', 'M01-Q04', 'M01-Q05', 'M01-Q06'].map((questId) => [
        questId,
        done(questId),
      ]),
    );
    const player = sim.player;
    player.pos = sim.groundPos(portal.b.x, portal.b.z);
    player.prevPos = { ...player.pos };
    sim.ctx.rebucket(player);
    sim.drainEvents();

    updatePortalTriggers(sim.ctx, player);

    expect(player.pos.x).toBeCloseTo(portal.a.landing.x, 5);
    expect(player.pos.z).toBeCloseTo(portal.a.landing.z, 5);
    expect(sim.drainEvents()).not.toContainEqual(
      expect.objectContaining({ type: 'error', text: 'The passage is sealed.' }),
    );
  });

  it('gates every WoC campaign portal by the quest offer for its destination map', () => {
    const world = buildMir4WocCampaignWorld();
    setActiveWorldContent(world);
    const sim = new Sim({
      seed: 42,
      playerClass: 'warrior',
      playerName: 'AllPortalRegression',
      gameProfile: MIR4_GAME_PROFILE,
      world,
    });
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Campaign portal player metadata is required');
    const player = sim.player;
    const portals = [...MIR4_WOC_TUTORIAL_PORTALS, ...MIR4_WOC_CAMPAIGN_TRANSIT_PORTALS];
    const directions = ['a-to-b', 'b-to-a'] as const;

    for (const portal of portals) {
      for (const direction of directions) {
        const destinationMapId = mir4PortalDestinationMapId(portal.id, direction);
        expect(destinationMapId, `${portal.id}:${direction}`).not.toBeNull();
        if (!destinationMapId) continue;
        const firstQuestIndex = MIR4_QUESTS_MAIN.findIndex(
          (quest) => quest.mapId === destinationMapId,
        );
        expect(firstQuestIndex, destinationMapId).toBeGreaterThanOrEqual(0);
        const from = direction === 'a-to-b' ? portal.a : portal.b;
        const to = direction === 'a-to-b' ? portal.b : portal.a;
        const placeAtEntrance = () => {
          player.pos = sim.groundPos(from.x, from.z);
          player.prevPos = { ...player.pos };
          player.campaignPortalDeniedAt = undefined;
          sim.ctx.rebucket(player);
          sim.drainEvents();
        };

        if (firstQuestIndex > 0) {
          meta.mir4ArcQuests = Object.fromEntries(
            MIR4_QUESTS_MAIN.slice(0, firstQuestIndex - 1).map((quest) => [
              quest.questId,
              done(quest.questId),
            ]),
          );
          placeAtEntrance();

          updatePortalTriggers(sim.ctx, player);

          expect(
            player.pos.x,
            `${portal.id}:${direction} stays sealed before its quest`,
          ).toBeCloseTo(from.x, 5);
          expect(player.pos.z).toBeCloseTo(from.z, 5);
          expect(sim.drainEvents()).toContainEqual(
            expect.objectContaining({ type: 'error', text: 'The passage is sealed.' }),
          );
        }

        meta.mir4ArcQuests = Object.fromEntries(
          MIR4_QUESTS_MAIN.slice(0, firstQuestIndex).map((quest) => [
            quest.questId,
            done(quest.questId),
          ]),
        );
        placeAtEntrance();

        updatePortalTriggers(sim.ctx, player);

        expect(player.pos.x, `${portal.id}:${direction} opens with its quest`).toBeCloseTo(
          to.landing.x,
          5,
        );
        expect(player.pos.z).toBeCloseTo(to.landing.z, 5);
        expect(sim.drainEvents()).not.toContainEqual(
          expect.objectContaining({ type: 'error', text: 'The passage is sealed.' }),
        );
      }
    }
  });

  it('opens every later campaign map when its first main quest is offered', () => {
    for (const map of MIR4_WORLD_ARC.slice(1)) {
      const firstQuestIndex = MIR4_QUESTS_MAIN.findIndex((quest) => quest.mapId === map.mapId);
      expect(firstQuestIndex, map.mapId).toBeGreaterThan(0);
      const quests = Object.fromEntries(
        MIR4_QUESTS_MAIN.slice(0, firstQuestIndex).map((quest) => [
          quest.questId,
          done(quest.questId),
        ]),
      );

      expect(isMir4CampaignMapUnlocked(map.mapId, quests), map.mapId).toBe(true);
    }
  });

  it('resolves native and WoC portal destinations in both travel directions', () => {
    expect(
      mir4PortalDestinationMapId('mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos', 'a-to-b'),
    ).toBe('m02-trilha-dos-juncos');
    expect(mir4PortalDestinationMapId('mir4_woc_m02_m03_garden_waypoint', 'b-to-a')).toBe(
      'm02-trilha-dos-juncos',
    );
    expect(mir4PortalDestinationMapId('mir4_woc_tutorial_m09_waypoint', 'b-to-a')).toBe(
      'm09-pantano-das-lanternas',
    );
  });
});
