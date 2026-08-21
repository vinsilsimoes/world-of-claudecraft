import { afterAll, describe, expect, it } from 'vitest';
import {
  MIR4_QUESTS_ARC,
  MIR4_QUESTS_CITYPROFESSION,
  MIR4_QUESTS_MAIN,
  MIR4_QUESTS_REPEATABLE,
  MIR4_QUESTS_SIDE,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/quests_arc';

// Phase 5.2: the 230-quest chain table (generated verbatim) with its sealed
// cardinalities, chain wiring, and exact rewards.

describe('the quest arc table', () => {
  it('carries all 230 quests in the four source groups', () => {
    expect(MIR4_QUESTS_MAIN).toHaveLength(120);
    expect(MIR4_QUESTS_SIDE).toHaveLength(60);
    expect(MIR4_QUESTS_REPEATABLE).toHaveLength(40);
    expect(MIR4_QUESTS_CITYPROFESSION).toHaveLength(10);
    expect(MIR4_QUESTS_ARC).toHaveLength(230);
    expect(new Set(MIR4_QUESTS_ARC.map((q) => q.questId)).size).toBe(230);
  });
  it('M01-Q01 pins verbatim: giver, rewards, stage kinds, chain wiring', () => {
    const q = mir4ArcQuest('M01-Q01');
    expect(q).toMatchObject({
      questId: 'M01-Q01',
      chainId: 'main-m01',
      order: 1,
      mapId: 'm01-vila-do-vau',
      title: 'Primeiros Rastros',
      giverNpcId: 'tarek-duas-pontes',
      turnInNpcId: 'tarek-duas-pontes',
      levelRange: [1, 2],
      xp: 1432,
      copper: 200,
      nextQuestId: 'M01-Q02',
    });
    expect(q?.stageKinds).toEqual([
      'talk',
      'travel',
      'inspect-clues',
      'system-tutorial',
      'reconstruct-evidence',
      'lore-resolution',
      'talk',
    ]);
    expect(q?.stages[2]).toMatchObject({
      kind: 'inspect-clues',
      target: 'clues-m01-z01',
      goal: 3,
    });
    expect(q?.purpose).toContain('pegadas dos lobos');
    expect(q?.dialogue).toHaveLength(3);
    expect(q?.rewards).toMatchObject({
      xp: '1432',
      copper: '200',
      materials: [
        { itemId: 'material-pele-jovem', quantity: 2 },
        { itemId: 'material-fibra-de-espinho', quantity: 2 },
      ],
    });
  });
  it('the main chain wires every map: 120 quests across 20 chains', () => {
    const chains = new Set(MIR4_QUESTS_MAIN.map((q) => q.chainId));
    expect(chains.size).toBe(20);
    // Every map contributes exactly 6 main quests (m01..m20).
    const byMap = new Map<string, number>();
    for (const q of MIR4_QUESTS_MAIN) byMap.set(q.mapId, (byMap.get(q.mapId) ?? 0) + 1);
    expect([...byMap.values()].every((n) => n === 6)).toBe(true);
    // nextQuestId chains within each map: order 1..6.
    const m01 = MIR4_QUESTS_MAIN.filter((q) => q.mapId === 'm01-vila-do-vau');
    expect(m01.map((q) => q.order)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('the stage-kind vocabulary matches the source census', () => {
    const kinds = new Set(MIR4_QUESTS_ARC.flatMap((q) => q.stageKinds));
    for (const kind of [
      'talk',
      'travel',
      'inspect-clues',
      'system-tutorial',
      'lore-resolution',
      'collect-quest-wallet',
      'activate-sequence',
      'defend-anchor',
      'guardian-resolution',
      'escort-entity',
      'selective-hunt',
      'discover-waypoint',
      'deliver',
      'explore-landmarks',
      'gather-resource-patches',
    ]) {
      expect(kinds.has(kind)).toBe(true);
    }
    expect(kinds.size).toBe(35);
  });
});

afterAll(() => {
  // Nothing to restore (data-only suite), kept for symmetry with the world tests.
});
