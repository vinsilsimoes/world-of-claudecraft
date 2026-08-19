import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  type Mir4ArcQuestProgress,
  mir4AdvanceQuestStage,
  mir4CreditQuestKill,
  mir4NextMainQuest,
  mir4QuestHuntTargets,
} from '../../src/sim/mir4/arc_quests';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 5.5: the arc quest runtime - chain wiring, stage advancement, hunt
// credit, and the census hunt targets.

function makeSim(seed = 191): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: buildMir4ArcWorld(2),
  });
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the arc quest chain', () => {
  it('picks the first undone main quest', () => {
    expect(mir4NextMainQuest(new Set())).toBe('M01-Q01');
    expect(mir4NextMainQuest(new Set(['M01-Q01']))).toBe('M01-Q02');
    // The whole chain done: null.
    const doneAll = new Set(
      Array.from({ length: 20 }, (_, m) =>
        Array.from(
          { length: 6 },
          (_, q) => `M${String(m + 1).padStart(2, '0')}-Q${String(q + 1).padStart(2, '0')}`,
        ),
      ).flat(),
    );
    expect(doneAll.size).toBe(120);
    expect(mir4NextMainQuest(doneAll)).toBeNull();
  });
  it('advances through stages to ready, hunting kills on hunt stages', () => {
    setActiveWorldContent(buildMir4ArcWorld(2));
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q01',
      stageIndex: 0,
      kills: 0,
      state: 'active',
    };
    // M01-Q01: talk>travel>inspect-clues>system-tutorial>reconstruct-evidence>lore-resolution>talk
    let result: string = 'advanced';
    let guard = 0;
    while (guard++ < 30) {
      result = mir4AdvanceQuestStage(sim.ctx, sim.playerId, progress);
      if (result === 'ready' || result === 'done' || result === 'blocked') break;
    }
    expect(result).toBe('ready');
    expect(progress.state).toBe('ready');
    expect(progress.stageIndex).toBe(7);
    // A hunt quest credits kills: use M02-Q02 (escort-entity>guardian-resolution).
    const hunt: Mir4ArcQuestProgress = {
      questId: 'M02-Q02',
      stageIndex: 3,
      kills: 0,
      state: 'active',
    };
    // Stage 3 is guardian-resolution: 3 kills advance it.
    mir4CreditQuestKill(hunt, 'mir4_forest_wolf');
    mir4CreditQuestKill(hunt, 'mir4_thorn_imp');
    expect(hunt.stageIndex).toBe(3); // not yet
    mir4CreditQuestKill(hunt, 'mir4_thorn_imp');
    expect(hunt.stageIndex).toBe(4); // advanced past the hunt
  });
  it('the hunt targets come from the quest map census', () => {
    expect(mir4QuestHuntTargets('M01-Q01')).toContain('forest_wolf');
    expect(mir4QuestHuntTargets('M05-Q01')).toContain('crypt_rat');
    expect(mir4QuestHuntTargets('nonexistent')).toEqual([]);
  });
});
