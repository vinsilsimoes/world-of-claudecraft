import { afterAll, describe, expect, it } from 'vitest';
import {
  MIR4_ACHIEVEMENT_PORT_BONUSES,
  MIR4_LEVEL_ACHIEVEMENTS,
} from '../../src/sim/content/mir4/achievements';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { claimMir4Achievement } from '../../src/sim/mir4/achievements';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import { MIR4_PERSISTED_COUNT_CAP } from '../../src/sim/mir4/persistence';
import { upgradeMir4Skill } from '../../src/sim/mir4/skill_evolution';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  return new Sim({
    seed: 1_449,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Achievement',
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
}

function playerMeta(sim: Sim) {
  const meta = sim.players.get(sim.playerId);
  if (!meta) throw new Error('missing MIR4 achievement player');
  return meta;
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 source-backed level achievements', () => {
  it('pins the two grades admitted by the original runtime', () => {
    expect(MIR4_LEVEL_ACHIEVEMENTS).toEqual([
      {
        achievementId: 20101,
        groupId: 201,
        groupGrade: 1,
        requiredLevel: 5,
        rewards: { copper: 1_100, darksteel: 1_000, effectPoints: 0 },
      },
      {
        achievementId: 20102,
        groupId: 201,
        groupGrade: 2,
        requiredLevel: 10,
        rewards: { copper: 1_200, darksteel: 0, effectPoints: 500 },
      },
    ]);
    expect(MIR4_ACHIEVEMENT_PORT_BONUSES).toEqual({
      20102: { knowledgeTomeCommon: 1 },
    });
  });

  it('requires both the source level threshold and strict grade order', () => {
    const sim = makeSim();

    expect(claimMir4Achievement(sim.ctx, sim.playerId, 20101)).toEqual({
      ok: false,
      reason: 'not-cleared',
    });

    sim.setPlayerLevel(10);
    expect(claimMir4Achievement(sim.ctx, sim.playerId, 20102)).toEqual({
      ok: false,
      reason: 'grade-order',
    });
  });

  it('does not grant the level-ten port bonus at level nine after grade one', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    sim.setPlayerLevel(5);
    expect(sim.mir4ClaimAchievement(20101).ok).toBe(true);
    sim.setPlayerLevel(9);
    const before = JSON.stringify(sim.mir4PlayerState());

    expect(sim.mir4ClaimAchievement(20102)).toEqual({
      ok: false,
      reason: 'not-cleared',
    });
    expect(JSON.stringify(sim.mir4PlayerState())).toBe(before);
    expect(meta.mir4SkillResources?.skillTomes ?? 0).toBe(0);

    sim.setPlayerLevel(10);
    expect(sim.mir4ClaimAchievement(20102).ok).toBe(true);
    expect(meta.mir4Materials?.knowledgeTomeCommon).toBe(1);
  });

  it('credits copper, Darksteel and Effect Points exactly once', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    meta.copper = 0;
    sim.setPlayerLevel(10);

    expect(sim.mir4ClaimAchievement(20101)).toEqual({
      ok: true,
      achievementId: 20101,
      groupGrade: 1,
    });
    expect(meta.copper).toBe(1_100);
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_000, energy: 0 });
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 0, skillTomes: 0 });
    expect(meta.mir4AchievementClears).toEqual({ 201: 1 });

    expect(sim.mir4ClaimAchievement(20102)).toEqual({
      ok: true,
      achievementId: 20102,
      groupGrade: 2,
    });
    expect(meta.copper).toBe(2_300);
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_000, energy: 0 });
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 500, skillTomes: 0 });
    expect(meta.mir4Materials).toEqual({
      ...MIR4_EMPTY_MATERIALS,
      knowledgeTomeCommon: 1,
    });
    expect(meta.mir4AchievementClears).toEqual({ 201: 2 });

    const snapshot = JSON.stringify(sim.mir4PlayerState());
    expect(sim.mir4ClaimAchievement(20102)).toEqual({
      ok: false,
      reason: 'already-claimed',
    });
    expect(JSON.stringify(sim.mir4PlayerState())).toBe(snapshot);
  });

  it('applies reward Copper and Darksteel statuses at the achievement claim boundary', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    sim.setPlayerLevel(5);
    const mir4 = sim.player.mir4!;
    mir4.statusValues = { ...mir4.statusValues, 85: 1_000, 87: 2_000 };
    meta.copper = 0;

    expect(sim.mir4ClaimAchievement(20101).ok).toBe(true);
    expect(meta.copper).toBe(1_210);
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_200, energy: 0 });
  });

  it('turns the level-ten port bonus into one L2 transition', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);
    meta.copper = 900;
    sim.setPlayerLevel(10);

    expect(sim.mir4ClaimAchievement(20101).ok).toBe(true);
    expect(sim.mir4ClaimAchievement(20102).ok).toBe(true);
    expect(meta.copper).toBe(3_200);
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 500, skillTomes: 0 });
    expect(meta.mir4Materials?.knowledgeTomeCommon).toBe(1);

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1)).toEqual({
      ok: true,
      skillId: 1102,
      previousLevel: 1,
      currentLevel: 2,
    });
    expect(meta.copper).toBe(3_200);
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 500, skillTomes: 0 });
    expect(meta.mir4Materials?.knowledgeTomeCommon).toBe(0);
  });

  it('rejects unknown ids without materializing progression bags', () => {
    const sim = makeSim();
    const meta = playerMeta(sim);

    expect(claimMir4Achievement(sim.ctx, sim.playerId, 999_999)).toEqual({
      ok: false,
      reason: 'unknown-achievement',
    });
    expect(meta.mir4Currencies).toBeUndefined();
    expect(meta.mir4AchievementClears).toBeUndefined();
  });

  it('fails closed for the classic profile and each missing MIR4 player boundary', () => {
    const classic = new Sim({ seed: 2, playerClass: 'warrior' });
    expect(claimMir4Achievement(classic.ctx, classic.playerId, 20101)).toEqual({
      ok: false,
      reason: 'missing-player',
    });

    const missingEntity = makeSim();
    missingEntity.entities.delete(missingEntity.playerId);
    expect(claimMir4Achievement(missingEntity.ctx, missingEntity.playerId, 20101)).toEqual({
      ok: false,
      reason: 'missing-player',
    });

    const missingMeta = makeSim();
    missingMeta.players.delete(missingMeta.playerId);
    expect(claimMir4Achievement(missingMeta.ctx, missingMeta.playerId, 20101)).toEqual({
      ok: false,
      reason: 'missing-player',
    });
  });

  it('saturates source-backed currencies at the persistence boundary cap', () => {
    const sim = makeSim();
    sim.setPlayerLevel(10);
    const meta = playerMeta(sim);
    meta.mir4Currencies = { darksteel: MIR4_PERSISTED_COUNT_CAP - 1, energy: 7 };
    meta.mir4SkillResources = {
      effectPoints: MIR4_PERSISTED_COUNT_CAP - 1,
      skillTomes: MIR4_PERSISTED_COUNT_CAP - 1,
    };
    meta.mir4Materials = {
      ...MIR4_EMPTY_MATERIALS,
      knowledgeTomeCommon: MIR4_PERSISTED_COUNT_CAP - 1,
    };
    meta.copper = MIR4_PERSISTED_COUNT_CAP + 1;

    expect(claimMir4Achievement(sim.ctx, sim.playerId, 20101)).toMatchObject({ ok: true });
    expect(claimMir4Achievement(sim.ctx, sim.playerId, 20102)).toMatchObject({ ok: true });
    expect(meta.mir4Currencies).toEqual({ darksteel: MIR4_PERSISTED_COUNT_CAP, energy: 7 });
    expect(meta.mir4SkillResources?.effectPoints).toBe(MIR4_PERSISTED_COUNT_CAP);
    expect(meta.mir4SkillResources?.skillTomes).toBe(MIR4_PERSISTED_COUNT_CAP - 1);
    expect(meta.mir4Materials?.knowledgeTomeCommon).toBe(MIR4_PERSISTED_COUNT_CAP);
    expect(meta.copper).toBe(MIR4_PERSISTED_COUNT_CAP + 2_301);

    const saved = sim.serializeCharacter(sim.playerId)!;
    const restored = makeSim();
    restored.addPlayer('warrior', 'Restored', { state: saved });
    const restoredMeta = [...restored.players.values()].at(-1)!;
    expect(restoredMeta.mir4AchievementClears).toEqual({ 201: 2 });
    expect(restoredMeta.mir4Currencies).toEqual({ darksteel: MIR4_PERSISTED_COUNT_CAP, energy: 7 });
    expect(restoredMeta.mir4SkillResources?.effectPoints).toBe(MIR4_PERSISTED_COUNT_CAP);
    expect(restoredMeta.mir4SkillResources?.skillTomes).toBe(MIR4_PERSISTED_COUNT_CAP - 1);
    expect(restoredMeta.mir4Materials?.knowledgeTomeCommon).toBe(MIR4_PERSISTED_COUNT_CAP);
    expect(restoredMeta.copper).toBe(MIR4_PERSISTED_COUNT_CAP + 2_301);
  });
});
