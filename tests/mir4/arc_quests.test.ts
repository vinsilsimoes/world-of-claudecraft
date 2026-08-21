import { afterAll, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  type Mir4ArcQuestProgress,
  mir4AdvanceQuestStage,
  mir4ApplyQuestEvidence,
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
  it('fails closed without validated evidence and advances M01-Q01 one exact objective at a time', () => {
    setActiveWorldContent(buildMir4ArcWorld(2));
    const sim = makeSim();
    const progress: Mir4ArcQuestProgress = {
      questId: 'M01-Q01',
      stageIndex: 0,
      stageProgress: 0,
      state: 'active',
    };
    expect(mir4AdvanceQuestStage(sim.ctx, sim.playerId, progress)).toBe('blocked');
    expect(mir4ApplyQuestEvidence(progress, { kind: 'talk', target: 'wrong-npc' })).toBe('blocked');
    expect(
      mir4AdvanceQuestStage(sim.ctx, sim.playerId, progress, {
        kind: 'talk',
        target: 'tarek-duas-pontes',
      }),
    ).toBe('advanced');
    expect(mir4ApplyQuestEvidence(progress, { kind: 'travel', target: 'm01-z01' })).toBe(
      'advanced',
    );
    expect(
      mir4ApplyQuestEvidence(progress, {
        kind: 'stage',
        stageKind: 'inspect-clues',
        target: 'clues-m01-z01',
      }),
    ).toBe('progress');
    expect(
      mir4ApplyQuestEvidence(progress, {
        kind: 'stage',
        stageKind: 'inspect-clues',
        target: 'clues-m01-z01',
        amount: 2,
      }),
    ).toBe('advanced');
    for (const [stageKind, target] of [
      ['system-tutorial', 'M01-Q01'],
      ['reconstruct-evidence', 'evidence-m01-z01'],
      ['lore-resolution', 'lore-m01-z01'],
    ] as const) {
      expect(mir4ApplyQuestEvidence(progress, { kind: 'stage', stageKind, target })).toBe(
        'advanced',
      );
    }
    expect(mir4ApplyQuestEvidence(progress, { kind: 'talk', target: 'tarek-duas-pontes' })).toBe(
      'ready',
    );
    expect(progress.state).toBe('ready');
    expect(progress.stageIndex).toBe(7);
  });

  it('credits only the authored target and exact goal for selective hunts', () => {
    const hunt: Mir4ArcQuestProgress = {
      questId: 'M03-Q04',
      stageIndex: 3,
      stageProgress: 0,
      state: 'active',
    };
    expect(mir4CreditQuestKill(hunt, 'mir4_forest_wolf')).toBe('blocked');
    for (let kill = 1; kill <= 4; kill++) {
      expect(mir4CreditQuestKill(hunt, 'mir4_m03-bosque-do-vale_owlbear_cub')).toBe(
        kill === 4 ? 'advanced' : 'progress',
      );
    }
    expect(hunt.stageIndex).toBe(4);
    expect(hunt.stageProgress).toBe(0);
  });
  it('the hunt targets come from the quest map census', () => {
    expect(mir4QuestHuntTargets('M01-Q01')).toContain('forest_wolf');
    expect(mir4QuestHuntTargets('M05-Q01')).toContain('crypt_rat');
    expect(mir4QuestHuntTargets('nonexistent')).toEqual([]);
  });
});
