import { afterAll, describe, expect, it } from 'vitest';

import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import { mir4CampaignProfessionAction } from '../../src/sim/mir4/arc_professions';
import {
  mir4ArcStageAnchor,
  mir4HandleArcBoardInteract,
  mir4HandleArcObjectiveInteract,
  updateMir4ArcQuestTravel,
} from '../../src/sim/mir4/arc_quest_runtime';
import { type Mir4ArcQuestProgress, mir4QuestCurrentStage } from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

function makeSim(): Sim {
  const world = buildMir4ArcWorld(3);
  setActiveWorldContent(world);
  return new Sim({
    seed: 1_101,
    playerClass: 'warrior',
    playerName: 'Profession',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world,
  });
}

function placeAtStage(sim: Sim, progress: Mir4ArcQuestProgress): void {
  const stage = mir4QuestCurrentStage(progress)!;
  const anchor = mir4ArcStageAnchor(progress.questId, stage, progress.stageProgress)!;
  sim.player.pos.x = anchor.x;
  sim.player.pos.z = anchor.z;
  sim.player.prevPos = { ...sim.player.pos };
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 campaign profession and logistics stages', () => {
  it('turns gathered 3D resource interactions into persistent logical regional materials', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-S01',
      stageIndex: 1,
      stageProgress: 0,
      state: 'active',
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M01-S01': progress };
    placeAtStage(sim, progress);

    expect(mir4HandleArcObjectiveInteract(sim.ctx, sim.playerId)).toBe(true);
    expect(meta.mir4ArcRewards?.items?.['material-pele-jovem']).toBe(1);
  });

  it('crafts a campaign component only at its anchor and atomically consumes four materials', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-S01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active',
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M01-S01': progress };
    meta.mir4ArcRewards = {
      items: { 'material-pele-jovem': 3, 'material-couro-grosso': 1 },
    };
    expect(mir4CampaignProfessionAction(sim.ctx, sim.playerId)).toBe('too-far');
    expect(meta.mir4ArcRewards.items).toEqual({
      'material-pele-jovem': 3,
      'material-couro-grosso': 1,
    });
    placeAtStage(sim, progress);
    expect(mir4CampaignProfessionAction(sim.ctx, sim.playerId)).toBe('crafted');
    expect(progress.stageIndex).toBe(3);
    expect(meta.mir4ArcRewards.items).toEqual({ 'component-r02-01': 1 });
  });

  it('refines three components with two regional materials per receipt', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M04-P01',
      stageIndex: 2,
      stageProgress: 0,
      state: 'active',
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M04-P01': progress };
    meta.mir4ArcRewards = { items: { 'material-sucata': 6 } };
    for (let attempt = 0; attempt < 3; attempt++) {
      placeAtStage(sim, progress);
      expect(mir4CampaignProfessionAction(sim.ctx, sim.playerId)).toBe('refined');
    }
    expect(progress.stageIndex).toBe(3);
    expect(meta.mir4ArcRewards.items).toEqual({ 'refined-regional-r04': 3 });
  });

  it('salvages damaged campaign gear into parts and credits the exact receipt', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M04-P02',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M04-P02': progress };
    meta.mir4ArcRewards = { items: { 'damaged-gear-r04': 2 } };
    placeAtStage(sim, progress);
    expect(mir4CampaignProfessionAction(sim.ctx, sim.playerId)).toBe('salvaged');
    placeAtStage(sim, progress);
    expect(mir4CampaignProfessionAction(sim.ctx, sim.playerId)).toBe('salvaged');
    expect(progress.stageIndex).toBe(4);
    expect(meta.mir4ArcRewards.items).toEqual({ 'profession-salvaged-parts': 4 });
  });

  it('spends twelve local materials at the native noticeboard before advancing delivery', () => {
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-R01',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active',
      selectedStageIndexes: [0, 1],
    };
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcQuests = { 'M01-R01': progress };
    meta.mir4ArcRewards = { items: { 'material-pele-jovem': 12 } };
    expect(mir4HandleArcBoardInteract(sim.ctx, sim.playerId)).toBe('M01-R01');
    expect(progress.stageIndex).toBe(1);
    expect(meta.mir4ArcRewards.items).toBeUndefined();
  });
});
