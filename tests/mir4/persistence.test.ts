import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4ResolveLayer, mir4RollLayer } from '../../src/sim/mir4/affixes';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeMir4Sim(seed: number, noPlayer = false): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Persistence',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
    noPlayer,
  });
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('MIR4 character persistence', () => {
  it.each([
    [21, 21],
    [100, 100],
    [250, 250],
    [999, 250],
  ])('restores profile level %i at the MIR4 cap as %i', (savedLevel, expectedLevel) => {
    const source = makeMir4Sim(399);
    const saved = source.serializeCharacter(source.playerId)!;
    saved.level = savedLevel;

    const target = makeMir4Sim(400, true);
    const pid = target.addPlayer('warrior', 'Level Restore', { state: saved });

    expect(target.entities.get(pid)?.level).toBe(expectedLevel);
  });

  it('round-trips an active campaign auto-journey without treating it as a legacy quest', () => {
    const source = makeMir4Sim(400);
    const meta = source.players.get(source.playerId)!;
    meta.mir4ArcQuests = {
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 2, stageProgress: 1, state: 'active' },
    };
    meta.mir4AutoQuest = {
      questId: 'M01-Q02',
      phase: 'to-site',
      siteIndex: 2,
      suspended: false,
    };

    const saved = source.serializeCharacter(source.playerId)!;
    expect(saved.mir4AutoQuest).toEqual(meta.mir4AutoQuest);

    const target = makeMir4Sim(401, true);
    const restoredPid = target.addPlayer('warrior', 'Journey', { state: saved });
    expect(target.players.get(restoredPid)?.mir4AutoQuest).toEqual(meta.mir4AutoQuest);
  });

  it('round-trips every authoritative MIR4 player field without aliasing the live state', () => {
    const source = makeMir4Sim(401, true);
    const pid = source.addPlayer('elementalist', 'Elyra');
    const meta = source.players.get(pid)!;
    meta.autoBattle = {
      mode: 'battle',
      anchorX: 12.5,
      anchorZ: -8.25,
      acquireRadiusYards: 48,
      suspended: true,
    };
    meta.mir4Quests = {
      mir4_m01_q01: { state: 'ready', inspected: [0, 1, 2] },
    };
    meta.mir4ArcQuests = {
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 2, stageProgress: 1, state: 'active' },
    };
    meta.mir4ArcRewards = {
      items: { 'material-tecido': 2 },
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
      claimedGrantIds: ['campaign-mount-01'],
    };
    meta.mir4AutoQuest = {
      questId: 'mir4_m01_q01',
      phase: 'return',
      siteIndex: 3,
      suspended: false,
    };
    meta.mir4SkillLevels = { 2101: 2 };
    meta.mir4SkillResources = { effectPoints: 800, skillTomes: 6 };
    meta.mir4AchievementClears = { 201: 2 };
    meta.mir4Currencies = { darksteel: 1_000 };
    meta.mir4Equipment = { 1: 991010201 };
    meta.mir4EquipmentInstances = {
      991010201: {
        itemId: 991010201,
        enhancement: 3,
        affixes: { enchantment: [[22, 7]] },
        pendingRoll: {
          rollId: 'persisted-roll',
          layer: 'blessing',
          affixes: [
            [22, 5],
            [28, 3],
            [31, 2],
          ],
        },
      },
    };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      moonStone: 5,
      lunarSeal: 2,
      solarWard: 1,
    };
    meta.mir4Mounts = {
      owned: { 'meadow-courser': 2 },
      discovered: ['meadow-courser', 'moss-boar'],
      equippedMountId: 'meadow-courser',
      pending: [{ id: `mount-pending-${pid}-1`, mountId: 'eclipse-lion', grade: 4 }],
      nextPendingId: 2,
    };
    meta.mir4Spirits = {
      owned: { 'spirit-uncommon-01': 1 },
      discovered: ['spirit-uncommon-01', 'spirit-uncommon-02'],
      equippedSpiritId: 'spirit-uncommon-01',
      pending: [{ id: `spirit-pending-${pid}-1`, spiritId: 'spirit-epic-01', grade: 4 }],
      nextPendingId: 2,
    };
    source.player.mir4UltGauge = 73.5;
    meta.mir4SpiritSkillReadyAt = source.time + 18.25;

    const saved = source.serializeCharacter(pid)! as any;
    expect(saved.autoBattle).toEqual(meta.autoBattle);
    expect(saved.mir4Quests).toEqual(meta.mir4Quests);
    expect(saved.mir4ArcQuests).toEqual(meta.mir4ArcQuests);
    expect(saved.mir4ArcRewards).toEqual(meta.mir4ArcRewards);
    expect(saved.mir4AutoQuest).toEqual(meta.mir4AutoQuest);
    expect(saved.mir4SkillLevels).toEqual(meta.mir4SkillLevels);
    expect(saved.mir4SkillResources).toEqual(meta.mir4SkillResources);
    expect(saved.mir4AchievementClears).toEqual(meta.mir4AchievementClears);
    expect(saved.mir4Currencies).toEqual(meta.mir4Currencies);
    expect(saved.mir4Equipment).toEqual(meta.mir4Equipment);
    expect(saved.mir4EquipmentInstances).toEqual(meta.mir4EquipmentInstances);
    expect(saved.mir4Materials).toEqual(meta.mir4Materials);
    expect(saved.mir4Mounts).toEqual(meta.mir4Mounts);
    expect(saved.mir4Spirits).toEqual(meta.mir4Spirits);
    expect(saved.mir4UltGauge).toBe(73.5);
    expect(saved.mir4SpiritSkillCooldownRemaining).toBe(18.25);

    meta.autoBattle.anchorX = 999;
    meta.mir4Quests.mir4_m01_q01.inspected.push(99);
    meta.mir4ArcQuests['M01-Q02']!.stageProgress = 999;
    meta.mir4ArcRewards.items!['material-tecido'] = 999;
    meta.mir4SkillResources.effectPoints = 999;
    meta.mir4AchievementClears[201] = 1;
    meta.mir4Currencies.darksteel = 999;
    (meta.mir4EquipmentInstances[991010201]!.pendingRoll!.affixes as [number, number][])[0][1] =
      999;
    meta.mir4Materials.moonStone = 999;
    meta.mir4Mounts.owned!['meadow-courser'] = 999;
    meta.mir4Spirits.owned!['spirit-uncommon-01'] = 999;
    expect(saved.autoBattle.anchorX).toBe(12.5);
    expect(saved.mir4Quests.mir4_m01_q01.inspected).toEqual([0, 1, 2]);
    expect(saved.mir4ArcQuests['M01-Q02'].stageProgress).toBe(1);
    expect(saved.mir4ArcRewards.items['material-tecido']).toBe(2);
    expect(saved.mir4SkillResources.effectPoints).toBe(800);
    expect(saved.mir4AchievementClears[201]).toBe(2);
    expect(saved.mir4Currencies.darksteel).toBe(1_000);
    expect(saved.mir4EquipmentInstances[991010201].pendingRoll.affixes[0][1]).toBe(5);
    expect(saved.mir4Materials.moonStone).toBe(5);
    expect(saved.mir4Mounts.owned['meadow-courser']).toBe(2);
    expect(saved.mir4Spirits.owned['spirit-uncommon-01']).toBe(1);

    const target = makeMir4Sim(402, true);
    const restoredPid = target.addPlayer('elementalist', 'Elyra', { state: saved });
    const restored = target.players.get(restoredPid)!;
    expect(restored.autoBattle).toEqual(saved.autoBattle);
    expect(restored.mir4Quests).toEqual(saved.mir4Quests);
    expect(restored.mir4ArcQuests).toEqual(saved.mir4ArcQuests);
    expect(restored.mir4ArcRewards).toEqual(saved.mir4ArcRewards);
    expect(restored.mir4AutoQuest).toEqual(saved.mir4AutoQuest);
    expect(restored.mir4SkillLevels).toEqual(saved.mir4SkillLevels);
    expect(restored.mir4SkillResources).toEqual(saved.mir4SkillResources);
    expect(restored.mir4AchievementClears).toEqual(saved.mir4AchievementClears);
    expect(restored.mir4Currencies).toEqual(saved.mir4Currencies);
    expect(restored.mir4Equipment).toEqual(saved.mir4Equipment);
    expect(restored.mir4EquipmentInstances).toEqual(saved.mir4EquipmentInstances);
    expect(restored.mir4Materials).toEqual(saved.mir4Materials);
    expect(restored.mir4Mounts).toEqual(saved.mir4Mounts);
    expect(restored.mir4Spirits).toEqual(saved.mir4Spirits);
    expect(target.entities.get(restoredPid)?.mir4UltGauge).toBe(73.5);
    expect(restored.mir4SpiritSkillReadyAt).toBe(target.time + 18.25);
    expect(target.entities.get(restoredPid)?.mir4?.classId).toBe(2);
    expect(target.entities.get(restoredPid)?.spellPower).toBeGreaterThan(50);
  });

  it('sanitizes MIR4 combat state and defaults pre-feature saves to ready/empty', () => {
    const source = makeMir4Sim(410);
    const invalid = source.serializeCharacter(source.playerId)! as any;
    invalid.mir4UltGauge = 999;
    invalid.mir4SpiritSkillCooldownRemaining = -5;
    const cappedTarget = makeMir4Sim(411, true);
    const cappedPid = cappedTarget.addPlayer('warrior', 'Capped', { state: invalid });
    expect(cappedTarget.entities.get(cappedPid)?.mir4UltGauge).toBe(100);
    expect(cappedTarget.players.get(cappedPid)?.mir4SpiritSkillReadyAt).toBeUndefined();

    delete invalid.mir4UltGauge;
    delete invalid.mir4SpiritSkillCooldownRemaining;
    const legacyTarget = makeMir4Sim(412, true);
    const legacyPid = legacyTarget.addPlayer('warrior', 'Legacy', { state: invalid });
    expect(legacyTarget.entities.get(legacyPid)?.mir4UltGauge).toBe(0);
    expect(legacyTarget.players.get(legacyPid)?.mir4SpiritSkillReadyAt).toBeUndefined();
  });

  it('sanitizes malformed JSONB without granting progress, equipment, or upgrades', () => {
    const source = makeMir4Sim(403);
    const saved = source.serializeCharacter(source.playerId)! as any;
    saved.autoBattle = {
      mode: 'battle',
      anchorX: Number.NaN,
      anchorZ: 1,
      acquireRadiusYards: Number.POSITIVE_INFINITY,
      suspended: 'yes',
    };
    saved.mir4Quests = {
      unknown: { state: 'done', inspected: [0, 1, 2] },
      mir4_m01_q01: { state: 'ready', inspected: [0, 0, 99] },
    };
    saved.mir4AutoQuest = {
      questId: 'unknown',
      phase: 'done',
      siteIndex: 999,
      suspended: false,
    };
    saved.mir4ArcQuests = {
      unknown: { questId: 'unknown', stageIndex: 0, stageProgress: 9, state: 'done' },
      'M01-Q01': { questId: 'M01-Q01', stageIndex: 999, stageProgress: -1, state: 'active' },
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 1, stageProgress: 2, state: 'active' },
    };
    saved.mir4ArcRewards = {
      items: { 'material-tecido': 2.9, injected: 999 },
      systems: ['mount-summon', 'god-mode'],
      tickets: { 'mount-ticket-dawn': 1, forged: 999 },
    };
    saved.mir4SkillLevels = { 1102: 99, 2101: 2, 9999: 2 };
    saved.mir4SkillResources = {
      effectPoints: 400.9,
      skillTomes: -3,
      injected: 999,
    };
    saved.mir4AchievementClears = { 201: 99, 999: 2 };
    saved.mir4Currencies = { darksteel: 1_000.9, injected: 999 };
    saved.mir4Equipment = { weapon: 200201000, 1: 991010201, 2: 991010101, 99: 991010101 };
    saved.mir4EquipmentInstances = {
      991010201: { itemId: 991010201, enhancement: 99 },
      123: { itemId: 123, enhancement: 15 },
    };
    saved.mir4Materials = {
      sunStone: 4.9,
      moonStone: -4,
      solarScroll: Number.POSITIVE_INFINITY,
      lunarSeal: 2,
      dawnTear: Number.NaN,
      solarWard: 1,
      injected: 999,
    };
    saved.mir4Mounts = {
      owned: { 'meadow-courser': 2.8, forged: 999 },
      discovered: ['moss-boar', 'forged'],
      equippedMountId: 'forged',
      pending: [
        { id: 'bad', mountId: 'meadow-courser', grade: 1 },
        { id: 'valid', mountId: 'eclipse-lion', grade: 4 },
      ],
      nextPendingId: 2,
    };
    saved.mir4Spirits = {
      owned: { 'spirit-common-01': 2.8, forged: 999 },
      discovered: ['spirit-common-02', 'forged'],
      equippedSpiritId: 'forged',
      pending: [
        { id: 'bad', spiritId: 'spirit-common-01', grade: 1 },
        { id: 'valid', spiritId: 'spirit-epic-01', grade: 4 },
      ],
      nextPendingId: 2,
    };

    const target = makeMir4Sim(404, true);
    const pid = target.addPlayer('warrior', 'Aldric', { state: saved });
    const restored = target.players.get(pid)!;
    expect(restored.autoBattle).toBeUndefined();
    expect(restored.mir4Quests).toEqual({
      mir4_m01_q01: { state: 'active', inspected: [0] },
    });
    expect(restored.mir4AutoQuest).toBeUndefined();
    expect(restored.mir4ArcQuests).toEqual({
      'M01-Q02': { questId: 'M01-Q02', stageIndex: 1, stageProgress: 2, state: 'active' },
    });
    expect(restored.mir4ArcRewards).toEqual({
      items: { 'material-tecido': 2 },
      systems: ['mount-summon'],
      tickets: { 'mount-ticket-dawn': 1 },
    });
    expect(restored.mir4SkillLevels).toBeUndefined();
    expect(restored.mir4SkillResources).toEqual({ effectPoints: 400, skillTomes: 0 });
    expect(restored.mir4AchievementClears).toBeUndefined();
    expect(restored.mir4Currencies).toEqual({ darksteel: 1_000 });
    expect(restored.mir4Equipment).toEqual({ 1: 200201000 });
    expect(restored.mir4EquipmentInstances).toEqual({
      200201000: { itemId: 200201000, enhancement: 0 },
    });
    expect(restored.mir4Materials).toEqual({
      sunStone: 4,
      moonStone: 0,
      solarScroll: 0,
      lunarSeal: 2,
      dawnTear: 0,
      solarWard: 1,
    });
    expect(restored.mir4Mounts).toEqual({
      owned: { 'meadow-courser': 2 },
      discovered: ['moss-boar', 'meadow-courser'],
      pending: [{ id: 'valid', mountId: 'eclipse-lion', grade: 4 }],
      nextPendingId: 2,
    });
    expect(restored.mir4Spirits).toEqual({
      owned: { 'spirit-common-01': 2 },
      discovered: ['spirit-common-02', 'spirit-common-01'],
      pending: [{ id: 'valid', spiritId: 'spirit-epic-01', grade: 4 }],
      nextPendingId: 2,
    });
  });

  it('keeps a pending affix preview resolvable after logout and reload', () => {
    const source = makeMir4Sim(405);
    const sourceMeta = source.players.get(source.playerId)!;
    sourceMeta.mir4ArcRewards = { items: { '991010101': 1 } };
    sourceMeta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(source.ctx, source.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;

    const saved = source.serializeCharacter(source.playerId)!;
    const target = makeMir4Sim(406, true);
    const pid = target.addPlayer('warrior', 'Aldric', { state: saved });
    expect(mir4ResolveLayer(target.ctx, pid, 991010101, 'enchantment', roll.rollId, true)).toEqual({
      ok: true,
      accepted: true,
    });
  });

  it('does not add MIR4 keys to classic character saves', () => {
    setActiveWorldContent(null);
    const classic = new Sim({ seed: 407, playerClass: 'warrior', playerName: 'Classic' });
    const meta = classic.players.get(classic.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, sunStone: 9 };
    const saved = classic.serializeCharacter(classic.playerId)! as any;
    expect(saved.gameProfile).toBeUndefined();
    expect(saved.mir4Materials).toBeUndefined();
    expect(saved.mir4Equipment).toBeUndefined();
    expect(saved.mir4SkillResources).toBeUndefined();
    expect(saved.mir4AchievementClears).toBeUndefined();
    expect(saved.mir4Currencies).toBeUndefined();
    expect(saved.mir4Quests).toBeUndefined();
    expect(saved.mir4ArcQuests).toBeUndefined();
    expect(saved.mir4ArcRewards).toBeUndefined();
    expect(saved.mir4Mounts).toBeUndefined();
    expect(saved.mir4Spirits).toBeUndefined();
  });
});
