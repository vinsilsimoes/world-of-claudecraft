import { describe, expect, it } from 'vitest';
import { decodeMir4Snapshot } from '../../src/net/mir4_snapshot_wire';
import { bareClient } from '../helpers/bare_client';

function selfSnapshot(mir4?: unknown, level = 1): Record<string, unknown> {
  return {
    t: 'snap',
    ents: [],
    self: {
      id: 7,
      k: 'player',
      tid: 'warrior',
      nm: 'Elyra',
      lv: level,
      x: 0,
      y: 0,
      z: 0,
      f: 0,
      hp: 4000,
      mhp: 4000,
      ...(mir4 === undefined ? {} : { mir4 }),
    },
  };
}

describe('MIR4 snapshot wire', () => {
  it('validates the profile class and nested authoritative state', () => {
    expect(
      decodeMir4Snapshot({
        classId: 2,
        ultimateGauge: 45.9,
        autoBattle: {
          mode: 'battle',
          anchorX: 1,
          anchorZ: 2,
          acquireRadiusYards: 36,
          suspended: false,
        },
        mir4SkillLevels: { 2101: 2, 1102: 2 },
        mir4SkillResources: {
          effectPoints: 800.9,
          skillTomes: 6,
          injected: 999,
        },
        mir4AchievementClears: { 201: 2, injected: 999 },
        mir4Currencies: { darksteel: 1_000.9, energy: 500.9, injected: 999 },
        mir4Materials: { sunStone: 3, injected: 999 },
        mir4Training: {
          version: 1,
          constitution: [0, 0, 0, 0, 0, 0, 0],
          innerForce: [0, 0, 0, 0],
          solitude: { conceptionVessel: [1, 2, 3, 4, 5, 6, 7, 8] },
        },
        mir4NarrativeDialogue: {
          id: 'M01-Q01:accept:-1:17',
          questId: 'M01-Q01',
          npcEntityId: 17,
          npcTemplateId: 'mir4_npc_m01_tarek_duas_pontes',
          action: 'accept',
          beat: 'accept',
          startedAt: 10,
          durationSeconds: 8,
          completesAt: 18,
        },
      }),
    ).toMatchObject({
      classId: 2,
      ultimateGauge: 45,
      autoBattle: { mode: 'battle' },
      mir4SkillLevels: { 2101: 2 },
      mir4SkillResources: { effectPoints: 800, skillTomes: 6 },
      mir4AchievementClears: { 201: 2 },
      mir4Currencies: { darksteel: 1_000, energy: 500 },
      mir4Materials: { sunStone: 3 },
      mir4Training: {
        solitude: { conceptionVessel: [1, 2, 3, 4, 5, 6, 7, 8] },
      },
      mir4NarrativeDialogue: { id: 'M01-Q01:accept:-1:17', durationSeconds: 8 },
    });
    expect(decodeMir4Snapshot({ classId: 99, autoBattle: {} })).toBeNull();
    expect(decodeMir4Snapshot('invalid')).toBeNull();
    expect(
      decodeMir4Snapshot({
        classId: 2,
        mir4NarrativeDialogue: { id: 'forged', questId: 'unknown' },
      }),
    ).toBeNull();
  });

  it('reconciles client reads, retains omitted deltas, and ignores malformed replacements', () => {
    const client = bareClient(7, {
      cfg: {
        seed: 1,
        playerClass: 'warrior',
        gameProfile: 'mir4-gameplay-port',
      },
    });
    const apply = client as unknown as {
      applySnapshot(snapshot: unknown): void;
    };
    apply.applySnapshot(
      selfSnapshot({
        classId: 2,
        mir4DisabledAutoSkills: [2101],
        fullCampaignAvailable: true,
        campaignMapIds: ['m02-trilha-dos-juncos', 'invalid-map', 'm01-vila-do-vau'],
        ultimateGauge: 72,
        autoBattle: {
          mode: 'battle',
          anchorX: 1,
          anchorZ: 2,
          acquireRadiusYards: 36,
          suspended: false,
        },
        mir4Quests: {
          mir4_m01_q01: { state: 'active', inspected: [0] },
        },
        mir4AutoQuest: {
          questId: 'mir4_m01_q01',
          phase: 'to-site',
          siteIndex: 1,
          suspended: false,
        },
        mir4NarrativeDialogue: {
          id: 'M01-Q01:accept:-1:17',
          questId: 'M01-Q01',
          npcEntityId: 17,
          npcTemplateId: 'mir4_npc_m01_tarek_duas_pontes',
          action: 'accept',
          beat: 'accept',
          startedAt: 10,
          durationSeconds: 8,
          completesAt: 18,
        },
      }),
    );
    expect(client.mir4AutoBattleActive()).toBe(true);
    expect(client.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([2101]);
    expect(client.player.mir4UltGauge).toBe(72);
    expect(client.mir4PlayerState()?.playerLevel).toBe(client.player.level);
    expect(client.mir4PlayerState()?.fullCampaignAvailable).toBe(true);
    expect(client.mir4PlayerState()?.campaignMapIds).toEqual([
      'm01-vila-do-vau',
      'm02-trilha-dos-juncos',
    ]);
    expect(client.mir4AutoQuestActive()).toBe(true);
    expect(client.mir4QuestStatusText()).toContain('clue 2 of 3');
    expect(client.mir4QuestTrackerEntries()).toEqual([
      expect.objectContaining({
        id: 'mir4_m01_q01',
        autoJourneyActive: true,
        autoJourneySuspended: false,
        objective: { kind: 'inspect-clues', current: 1, total: 3 },
      }),
    ]);
    expect(client.known.map((ability) => ability.def.id)).toEqual([
      'mir4_skill_2101',
      'mir4_skill_2111',
      'mir4_skill_2501',
      'mir4_skill_2301',
      'mir4_ultimate_2',
    ]);

    apply.applySnapshot(selfSnapshot(undefined, 8));
    expect(client.mir4AutoBattleActive()).toBe(true);
    expect(client.player.mir4UltGauge).toBe(72);
    expect(client.mir4PlayerState()?.playerLevel).toBe(8);
    apply.applySnapshot(selfSnapshot('corrupt'));
    expect(client.mir4AutoBattleActive()).toBe(true);

    apply.applySnapshot(
      selfSnapshot({
        classId: 2,
        mir4DisabledAutoSkills: 'corrupt',
        ultimateGauge: 0,
      }),
    );
    expect(client.player.mir4UltGauge).toBe(72);
    expect(client.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([2101]);

    apply.applySnapshot(
      selfSnapshot({
        classId: 2,
        mir4NarrativeDialogue: { id: 'forged', questId: 'unknown' },
      }),
    );
    expect(client.mir4PlayerState()?.mir4NarrativeDialogue?.id).toBe('M01-Q01:accept:-1:17');

    apply.applySnapshot(selfSnapshot({ classId: 2 }));
    expect(client.mir4AutoBattleActive()).toBe(false);
    expect(client.player.mir4UltGauge).toBe(0);
    expect(client.mir4AutoQuestActive()).toBe(false);
    expect(client.mir4PlayerState()?.mir4NarrativeDialogue).toBeUndefined();
    expect(client.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    expect(client.mir4QuestStatusText()).toBe('Auto quest off');
    expect(client.mir4QuestTrackerEntries()).toEqual([]);
  });

  it('does not mutate authoritative mirrors while a command is only in flight', () => {
    const client = bareClient(7, {
      cfg: {
        seed: 1,
        playerClass: 'warrior',
        gameProfile: 'mir4-gameplay-port',
      },
      cmd: () => {},
    });
    client.setMir4AutoBattle(true);
    client.setMir4AutoQuest(true);
    expect(client.mir4AutoBattleActive()).toBe(false);
    expect(client.mir4AutoQuestActive()).toBe(false);
  });
});
