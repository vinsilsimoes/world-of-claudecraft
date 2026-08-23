import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld, mir4ArcNpcTemplateId } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import type { Mir4ArcQuestProgress } from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${label}`);
  return value;
}

function makeFullCampaignSim(): Sim {
  const world = buildMir4ArcWorld(20);
  setActiveWorldContent(world);
  return new Sim({
    seed: 941,
    playerClass: 'warrior',
    playerName: 'Campaign Host Probe',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

function npcByCanonicalId(sim: Sim, npcId: string): Entity | null {
  const templateId = mir4ArcNpcTemplateId(npcId);
  return (
    [...sim.entities.values()].find(
      (entity) => entity.kind === 'npc' && entity.templateId === templateId,
    ) ?? null
  );
}

function progressAtStage(
  quest: (typeof MIR4_QUESTS_ARC)[number],
  authoredStageIndex: number,
): Mir4ArcQuestProgress {
  if (!quest.objectivePoolSelection) {
    return {
      questId: quest.questId,
      stageIndex: authoredStageIndex,
      stageProgress: 0,
      state: 'active',
    };
  }
  const remaining = Array.from({ length: quest.stages.length }, (_, index) => index).filter(
    (index) => index !== authoredStageIndex,
  );
  return {
    questId: quest.questId,
    stageIndex: 0,
    stageProgress: 0,
    state: 'active',
    selectedStageIndexes: [
      authoredStageIndex,
      ...remaining.slice(0, quest.objectivePoolSelection - 1),
    ],
  };
}

afterAll(() => setActiveWorldContent(null));

describe('complete MIR4 campaign host routing', () => {
  it('spawns every authored giver, turn-in and talk target as a real host NPC', () => {
    const sim = makeFullCampaignSim();
    for (const quest of MIR4_QUESTS_ARC) {
      if (quest.group === 'repeatable') continue;
      expect(npcByCanonicalId(sim, quest.giverNpcId), `${quest.questId} giver`).not.toBeNull();
      expect(npcByCanonicalId(sim, quest.turnInNpcId), `${quest.questId} turn-in`).not.toBeNull();
      for (const stage of quest.stages) {
        if (stage.kind !== 'talk' && stage.kind !== 'deliver') continue;
        const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
        for (const target of targets) {
          expect(
            typeof target === 'string' ? npcByCanonicalId(sim, target) : null,
            `${quest.questId}:${stage.kind}:${String(target)}`,
          ).not.toBeNull();
        }
      }
    }
  });

  it('advances every NPC talk/delivery and turns in every non-repeatable quest through Sim', () => {
    const sim = makeFullCampaignSim();
    const meta = required(sim.players.get(sim.playerId), 'campaign probe player');
    for (const quest of MIR4_QUESTS_ARC) {
      if (quest.group === 'repeatable') continue;
      for (let stageIndex = 0; stageIndex < quest.stages.length; stageIndex++) {
        const stage = required(quest.stages[stageIndex], `${quest.questId} stage ${stageIndex}`);
        if (stage.kind !== 'talk' && stage.kind !== 'deliver') continue;
        const targets = Array.isArray(stage.target) ? stage.target : [stage.target];
        for (const target of targets) {
          if (typeof target !== 'string') continue;
          const progress = progressAtStage(quest, stageIndex);
          meta.mir4ArcQuests = { [quest.questId]: progress };
          const npc = required(npcByCanonicalId(sim, target), `${quest.questId} target ${target}`);
          sim.player.pos = { ...npc.pos };
          sim.player.prevPos = { ...npc.pos };
          const before = `${progress.stageIndex}:${progress.stageProgress}:${progress.state}`;
          sim.talkToNpc(npc.id);
          expect(
            `${progress.stageIndex}:${progress.stageProgress}:${progress.state}`,
            `${quest.questId}:${stage.kind}:${target}`,
          ).not.toBe(before);
        }
      }

      const ready: Mir4ArcQuestProgress = {
        questId: quest.questId,
        stageIndex: quest.stages.length,
        stageProgress: 0,
        state: 'ready',
      };
      meta.mir4ArcQuests = { [quest.questId]: ready };
      const turnIn = required(
        npcByCanonicalId(sim, quest.turnInNpcId),
        `${quest.questId} turn-in NPC`,
      );
      sim.player.pos = { ...turnIn.pos };
      sim.player.prevPos = { ...turnIn.pos };
      sim.talkToNpc(turnIn.id);
      expect(ready.state, `${quest.questId} turn-in`).toBe('done');
    }
  });
});
