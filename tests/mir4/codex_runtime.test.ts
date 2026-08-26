import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { updateMir4ArcQuestTravel } from '../../src/sim/mir4/arc_quest_runtime';
import { refreshMir4CodexDerivedStats } from '../../src/sim/mir4/codex';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { confirmMir4Mount } from '../../src/sim/mir4/mount_commands';
import { confirmMir4Spirit } from '../../src/sim/mir4/spirit_commands';
import { forceDismount } from '../../src/sim/mounts';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  return new Sim({
    seed: 441,
    playerClass: 'warrior',
    playerName: 'Codex',
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === undefined || value === null) throw new Error(`missing ${label}`);
  return value;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 Codex authoritative runtime', () => {
  it('consumes materials, persists registration and applies the permanent bonus', () => {
    const sim = makeSim();
    sim.setPlayerLevel(12);
    const player = sim.entities.get(sim.playerId);
    const meta = sim.players.get(sim.playerId);
    if (!player || !meta) throw new Error('test player must exist');
    const beforeHp = player.maxHp;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };

    sim.mir4RegisterAllCodex('field-notes');

    expect(meta.mir4Materials.knowledgeFragment).toBe(0);
    expect(meta.mir4Codex?.registered['field-notes']).toEqual({ 'knowledge-fragment': 25 });
    expect(player.maxHp).toBe(beforeHp + 100);
    expect(sim.serializeCharacter(sim.playerId)?.mir4Codex).toEqual(meta.mir4Codex);
  });

  it('cannot register below the system unlock or repeat a completed collection', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('test player metadata must exist');
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 50 };

    sim.mir4RegisterAllCodex('field-notes');
    expect(meta.mir4Materials.knowledgeFragment).toBe(50);
    sim.setPlayerLevel(12);
    sim.mir4RegisterAllCodex('field-notes');
    sim.mir4RegisterAllCodex('field-notes');
    expect(meta.mir4Materials.knowledgeFragment).toBe(25);
  });

  it('preserves permanent Codex bonuses through a legacy mount recalculation', () => {
    const sim = makeSim();
    sim.setPlayerLevel(12);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const meta = required(sim.players.get(sim.playerId), 'player metadata');
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
    sim.mir4RegisterAllCodex('field-notes');
    const maxHpWithCodex = player.maxHp;
    player.mountKey = 'valorsteed';

    forceDismount(sim.ctx, player);

    expect(player.maxHp).toBe(maxHpWithCodex);
  });

  it('applies automatic armory bonuses immediately when old campaign saves are repaired', () => {
    const sim = makeSim();
    sim.setPlayerLevel(25);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const meta = required(sim.players.get(sim.playerId), 'player metadata');
    const beforeAttack = player.attackPower;
    meta.mir4ArcQuests = {
      'M02-Q06': {
        questId: 'M02-Q06',
        stageIndex: 6,
        stageProgress: 0,
        state: 'done',
      },
    };
    meta.mir4ArcRewards = undefined;

    updateMir4ArcQuestTravel(sim.ctx);

    const repairedMeta = required(sim.players.get(sim.playerId), 'repaired metadata');
    expect(repairedMeta.mir4ArcRewards?.claimedGrantIds).toContain(
      'campaign-equipment-rank-2-class-1',
    );
    expect(player.attackPower).toBe(beforeAttack + 2);
  });

  it('applies common Mount and Spirit Codex bonuses on the confirming command', () => {
    const mountSim = makeSim();
    mountSim.setPlayerLevel(12);
    const mountPlayer = required(mountSim.entities.get(mountSim.playerId), 'mount player');
    const mountMeta = required(mountSim.players.get(mountSim.playerId), 'mount metadata');
    mountMeta.mir4Mounts = {
      owned: { 'meadow-courser': 1, 'moss-boar': 1 },
      discovered: ['meadow-courser', 'moss-boar'],
      pending: [{ id: 'codex-third-mount', mountId: 'brook-stag', grade: 1 }],
    };
    refreshMir4CodexDerivedStats(mountSim.ctx, mountSim.playerId);
    const dodgeBefore = mountPlayer.mir4?.dodge ?? 0;

    expect(confirmMir4Mount(mountSim.ctx, mountSim.playerId, 'codex-third-mount')).toMatchObject({
      ok: true,
      mountId: 'brook-stag',
    });
    expect(mountPlayer.mir4?.dodge).toBe(dodgeBefore + 2);

    const spiritSim = makeSim();
    spiritSim.setPlayerLevel(12);
    const spiritPlayer = required(spiritSim.entities.get(spiritSim.playerId), 'spirit player');
    const spiritMeta = required(spiritSim.players.get(spiritSim.playerId), 'spirit metadata');
    spiritMeta.mir4Spirits = {
      owned: { 'spirit-common-01': 1, 'spirit-common-02': 1 },
      discovered: ['spirit-common-01', 'spirit-common-02'],
      pending: [{ id: 'codex-third-spirit', spiritId: 'spirit-common-03', grade: 1 }],
    };
    refreshMir4CodexDerivedStats(spiritSim.ctx, spiritSim.playerId);
    const skillDamageBefore = spiritPlayer.mir4?.skillDamageBps ?? 0;

    expect(
      confirmMir4Spirit(spiritSim.ctx, spiritSim.playerId, 'codex-third-spirit'),
    ).toMatchObject({ ok: true, spiritId: 'spirit-common-03' });
    expect(spiritPlayer.mir4?.skillDamageBps).toBe(skillDamageBefore + 20);
  });

  it('round-trips manual progress and re-derives its bonus after restore', () => {
    const source = makeSim();
    source.setPlayerLevel(12);
    const sourceMeta = required(source.players.get(source.playerId), 'source metadata');
    sourceMeta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
    source.mir4RegisterAllCodex('field-notes');
    const saved = required(source.serializeCharacter(source.playerId), 'serialized source');

    const restored = makeSim();
    const pid = restored.addPlayer('warrior', 'Restored Codex', { state: saved });
    const restoredPlayer = required(restored.entities.get(pid), 'restored player');
    const reserialized = required(restored.serializeCharacter(pid), 'reserialized player');
    const sourcePlayer = required(source.entities.get(source.playerId), 'source player');

    expect(reserialized.mir4Codex).toEqual(saved.mir4Codex);
    expect(restoredPlayer.maxHp).toBe(sourcePlayer.maxHp);
  });
});
