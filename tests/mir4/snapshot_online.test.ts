import { describe, expect, it, vi } from 'vitest';

vi.mock('../../server/db', () => ({
  pool: { query: vi.fn(async () => ({ rows: [] })) },
  saveCharacterState: vi.fn(async () => {}),
  saveCharacterAndMarketState: vi.fn(async () => {}),
  openPlaySession: vi.fn(async () => 1),
  touchCharacterLogin: vi.fn(async () => {}),
  closePlaySession: vi.fn(async () => {}),
  insertChatLogs: vi.fn(async () => {}),
  walletForAccount: vi.fn(async () => null),
  markAccountQuestComplete: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  grantAccountMechChroma: vi.fn(async () => ({ completedQuestIds: [], mechChromaIds: [] })),
  setAccountWeaponSkinLoadout: vi.fn(async () => ({
    completedQuestIds: [],
    mechChromaIds: [],
    weaponSkinIds: [],
    weaponSkinLoadout: {},
  })),
  loadAccountFlair: vi.fn(async () => ({ ai: false, streamer: false, links: {} })),
}));

import { GameServer } from '../../server/game';
import { Mir4SelfWireCache } from '../../server/mir4_host';
import { mir4ArcQuest } from '../../src/sim/content/mir4/quests_arc';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { grantMir4ArcQuestRewards } from '../../src/sim/mir4/arc_rewards';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import type { Mir4PersistenceMeta } from '../../src/sim/mir4/persistence';
import { markMir4WireDirty } from '../../src/sim/mir4/wire_revision';
import { broadcast, fakeWs, lastSnap } from '../helpers/bare_client';

describe('MIR4 online authoritative snapshot', () => {
  it('invalidates the owner delta after a real achievement command and pays once', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const fc = fakeWs();
    const joined = server.join(fc.ws, 1, 1, 'Aldric', 'warrior', null, false, {});
    if ('error' in joined) throw new Error(joined.error);
    joined.blockListLoaded = true;
    server.sim.setPlayerLevel(10, joined.pid);
    const meta = server.sim.players.get(joined.pid);
    if (!meta) throw new Error('missing joined MIR4 player');
    meta.copper = 0;
    const gameplayReward = mir4ArcQuest('M01-Q05');
    if (!gameplayReward) throw new Error('missing campaign copper reward');
    grantMir4ArcQuestRewards(server.sim.ctx, meta, gameplayReward);
    expect(meta.copper).toBe(1_000);

    broadcast(server);
    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'claimAchievement',
        achievementId: 20102,
        rid: 10,
      }),
    );
    expect(fc.sent).toContainEqual({ t: 'commandOutcome', rid: 10, ok: false });
    broadcast(server);
    expect(lastSnap(fc.sent).self).not.toHaveProperty('mir4');

    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'claimAchievement',
        achievementId: 20101,
        rid: 11,
      }),
    );
    expect(fc.sent).toContainEqual({ t: 'commandOutcome', rid: 11, ok: true });
    broadcast(server);
    expect(lastSnap(fc.sent).self).toMatchObject({
      copper: 2_100,
      mir4: {
        mir4AchievementClears: { 201: 1 },
        mir4Currencies: { darksteel: 1_000 },
        mir4SkillResources: { effectPoints: 0, skillTomes: 0 },
      },
    });

    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'claimAchievement',
        achievementId: 20101,
        rid: 12,
      }),
    );
    expect(fc.sent).toContainEqual({ t: 'commandOutcome', rid: 12, ok: false });
    broadcast(server);
    expect(lastSnap(fc.sent).self).not.toHaveProperty('mir4');
    expect(meta.copper).toBe(2_100);

    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'claimAchievement',
        achievementId: 20102,
        rid: 13,
      }),
    );
    expect(fc.sent).toContainEqual({ t: 'commandOutcome', rid: 13, ok: true });
    broadcast(server);
    expect(lastSnap(fc.sent).self).toMatchObject({
      copper: 3_300,
      mir4: {
        mir4AchievementClears: { 201: 2 },
        mir4Currencies: { darksteel: 1_000 },
        mir4SkillResources: { effectPoints: 500, skillTomes: 3 },
      },
    });

    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'upgradeSkill',
        skillId: 1102,
        expectedCurrentLevel: 1,
      }),
    );
    broadcast(server);
    expect(lastSnap(fc.sent).self).toMatchObject({
      copper: 100,
      mir4: {
        mir4SkillLevels: { 1102: 2 },
        mir4SkillResources: { effectPoints: 100, skillTomes: 0 },
      },
    });

    server.handleMessage(
      joined,
      JSON.stringify({
        t: 'cmd',
        cmd: 'mir4',
        m: 'upgradeSkill',
        skillId: 1102,
        expectedCurrentLevel: 1,
      }),
    );
    broadcast(server);
    expect(lastSnap(fc.sent).self).not.toHaveProperty('mir4');
    expect(meta.copper).toBe(100);
  });

  it('carries native identity and gameplay metadata, then delta-elides it while unchanged', () => {
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const fc = fakeWs();
    const joined = server.join(fc.ws, 1, 1, 'Elyra', 'elementalist', null, false, {});
    if ('error' in joined) throw new Error(joined.error);
    joined.blockListLoaded = true;
    const meta = server.sim.players.get(joined.pid);
    if (!meta) throw new Error('missing joined MIR4 player');
    meta.autoBattle = {
      mode: 'battle',
      anchorX: 4,
      anchorZ: 5,
      acquireRadiusYards: 36,
      suspended: false,
    };
    meta.mir4SkillLevels = { 2101: 2 };
    meta.mir4SkillResources = { effectPoints: 800, skillTomes: 6 };
    meta.mir4AchievementClears = { 201: 2 };
    meta.mir4Currencies = { darksteel: 1_000 };
    meta.copper = 10_000;
    meta.mir4ArcQuests = {
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 2, stageProgress: 1, state: 'active' },
    };
    meta.mir4Quests = {
      mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: true,
    };
    meta.mir4NarrativeDialogue = {
      id: 'M01-Q02:advance:2:17',
      questId: 'M01-Q02',
      npcEntityId: 17,
      npcTemplateId: 'mir4_npc_m01_tarek_duas_pontes',
      action: 'advance',
      beat: 'reveal',
      startedAt: 100,
      durationSeconds: 8,
      completesAt: 108,
    };
    meta.mir4ArcRewards = {
      items: { 'material-tecido': 2 },
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
    };
    meta.mir4Equipment = { 1: 991010201 };
    meta.mir4EquipmentInstances = {
      991010201: { itemId: 991010201, enhancement: 3 },
    };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, moonStone: 5 };
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser', 'moss-boar'],
      equippedMountId: 'meadow-courser',
      pending: [{ id: 'mount-pending-7', mountId: 'eclipse-lion', grade: 4 }],
      nextPendingId: 8,
    };
    meta.mir4Spirits = {
      owned: { 'spirit-uncommon-01': 1 },
      discovered: ['spirit-uncommon-01', 'spirit-common-01'],
      equippedSpiritId: 'spirit-uncommon-01',
      pending: [{ id: 'spirit-pending-4', spiritId: 'spirit-epic-01', grade: 4 }],
      nextPendingId: 5,
    };
    const player = server.sim.entities.get(joined.pid);
    if (!player) throw new Error('missing joined MIR4 entity');
    player.mir4UltGauge = 33;

    broadcast(server);
    const first = lastSnap(fc.sent);
    expect(first.self.mir4).toMatchObject({
      classId: 2,
      fullCampaignAvailable: true,
      campaignMapIds: MIR4_WORLD_ARC.map((map) => map.mapId),
      ultimateGauge: 33,
      autoBattle: { mode: 'battle' },
      mir4SkillLevels: { 2101: 2 },
      mir4SkillResources: { effectPoints: 800, skillTomes: 6 },
      mir4AchievementClears: { 201: 2 },
      mir4Currencies: { darksteel: 1_000 },
      mir4ArcQuests: {
        'M01-Q02': { questId: 'M01-Q02', stageIndex: 2, stageProgress: 1, state: 'active' },
      },
      mir4Quests: {
        mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] },
      },
      mir4AutoQuest: {
        questId: 'M01-Q02',
        phase: 'to-site',
        siteIndex: 2,
        suspended: true,
      },
      mir4NarrativeDialogue: {
        id: 'M01-Q02:advance:2:17',
        npcEntityId: 17,
        durationSeconds: 8,
      },
      mir4ArcRewards: {
        items: { 'material-tecido': 2 },
        systems: ['mount-summon'],
        tickets: { 'mount-ticket-dawn': 1 },
      },
      mir4Equipment: { 1: 991010201 },
      mir4EquipmentInstances: {
        991010201: { itemId: 991010201, enhancement: 3 },
      },
      mir4Materials: { moonStone: 5 },
      mir4Mounts: {
        owned: { 'meadow-courser': 1 },
        discovered: ['meadow-courser', 'moss-boar'],
        equippedMountId: 'meadow-courser',
        pending: [{ id: 'mount-pending-7', mountId: 'eclipse-lion', grade: 4 }],
        nextPendingId: 8,
      },
      mir4Spirits: {
        owned: { 'spirit-uncommon-01': 1 },
        discovered: ['spirit-uncommon-01', 'spirit-common-01'],
        equippedSpiritId: 'spirit-uncommon-01',
        pending: [{ id: 'spirit-pending-4', spiritId: 'spirit-epic-01', grade: 4 }],
        nextPendingId: 5,
      },
    });
    expect(first.self.mir4.mir4Quests).toEqual({
      mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] },
    });
    expect(first.self.mir4.mir4AutoQuest).toEqual({
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: true,
    });
    expect(first.self.mir4.mir4Mounts).toEqual({
      owned: { 'meadow-courser': 1 },
      discovered: ['meadow-courser', 'moss-boar'],
      equippedMountId: 'meadow-courser',
      pending: [{ id: 'mount-pending-7', mountId: 'eclipse-lion', grade: 4 }],
      nextPendingId: 8,
    });
    expect(first.self.mir4.mir4Spirits).toEqual({
      owned: { 'spirit-uncommon-01': 1 },
      discovered: ['spirit-uncommon-01', 'spirit-common-01'],
      equippedSpiritId: 'spirit-uncommon-01',
      pending: [{ id: 'spirit-pending-4', spiritId: 'spirit-epic-01', grade: 4 }],
      nextPendingId: 5,
    });

    broadcast(server);
    const second = lastSnap(fc.sent);
    expect(second.self).not.toHaveProperty('mir4');

    meta.mir4NarrativeDialogue = undefined;
    markMir4WireDirty(meta);
    broadcast(server);
    const dialogueCleared = lastSnap(fc.sent);
    expect(dialogueCleared.self.mir4).toBeDefined();
    expect(dialogueCleared.self.mir4).not.toHaveProperty('mir4NarrativeDialogue');

    expect(server.sim.mir4UpgradeSkill(2111, 1, joined.pid)).toMatchObject({
      ok: true,
      skillId: 2111,
      currentLevel: 2,
    });
    broadcast(server);
    const third = lastSnap(fc.sent);
    expect(third.self.mir4).toMatchObject({
      mir4SkillLevels: { 2101: 2, 2111: 2 },
      mir4SkillResources: { effectPoints: 400, skillTomes: 3 },
    });
    expect(third.self.copper).toBe(6_800);
  });

  it('sanitizes once per player revision instead of once per 20 Hz snapshot', () => {
    const serialize = vi.fn(() => ({}));
    const cache = new Mir4SelfWireCache(serialize);
    const server = new GameServer(undefined, MIR4_GAME_PROFILE);
    const fc = fakeWs();
    const joined = server.join(fc.ws, 1, 1, 'Elyra', 'warrior', null, false, {});
    if ('error' in joined) throw new Error(joined.error);
    const entity = server.sim.entities.get(joined.pid);
    if (!entity) throw new Error('missing joined MIR4 entity');
    const metas = Array.from({ length: 500 }, () => ({}) as Mir4PersistenceMeta);

    for (let tick = 0; tick < 20; tick += 1) {
      for (const meta of metas) cache.encode(MIR4_GAME_PROFILE, meta, entity.mir4);
    }
    expect(serialize).toHaveBeenCalledTimes(500);

    markMir4WireDirty(metas[0]);
    cache.encode(MIR4_GAME_PROFILE, metas[0], entity.mir4);
    expect(serialize).toHaveBeenCalledTimes(501);

    cache.encode(MIR4_GAME_PROFILE, metas[0], entity.mir4, 12);
    expect(serialize).toHaveBeenCalledTimes(502);
    cache.encode(MIR4_GAME_PROFILE, metas[0], entity.mir4, 12);
    expect(serialize).toHaveBeenCalledTimes(502);
  });
});
