import { describe, expect, it } from 'vitest';
import { mir4ItemProgressionRank } from '../../src/sim/content/mir4/item_progression';
import { MIR4_MOUNTS_CATALOG } from '../../src/sim/content/mir4/mounts_catalog';
import { MIR4_SPIRITS_CATALOG } from '../../src/sim/content/mir4/spirits_catalog';
import {
  emptyMir4CodexState,
  mir4CodexBonuses,
  mir4CodexProgress,
  registerMir4CodexRequirement,
  sanitizeMir4CodexState,
} from '../../src/sim/mir4/codex';
import { deriveMir4PlayerStats } from '../../src/sim/mir4/derived_stats';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';

describe('MIR4 Codex domain', () => {
  it('registers materials atomically and permanently', () => {
    const state = emptyMir4CodexState();
    const materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
    const result = registerMir4CodexRequirement({
      classId: 1,
      level: 12,
      collectionId: 'field-notes',
      requirementId: 'knowledge-fragment',
      count: 25,
      expectedRegistered: 0,
      state,
      materials,
    });
    expect(result).toEqual({ ok: true, registered: 25, completed: true });
    expect(materials.knowledgeFragment).toBe(0);
    expect(
      mir4CodexProgress('field-notes', {
        classId: 1,
        state,
        materials,
      }).completed,
    ).toBe(true);
  });

  it('rejects stale or insufficient material registration without consuming anything', () => {
    const state = emptyMir4CodexState();
    const materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 3 };
    expect(
      registerMir4CodexRequirement({
        classId: 1,
        level: 12,
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 10,
        expectedRegistered: 0,
        state,
        materials,
      }),
    ).toEqual({ ok: false, reason: 'insufficient-items' });
    expect(materials.knowledgeFragment).toBe(3);
    expect(state.registered).toEqual({});
  });

  it('rejects every invalid registration branch without mutating materials or progress', () => {
    const cases = [
      {
        collectionId: 'missing',
        requirementId: 'knowledge-fragment',
        reason: 'unknown-collection',
      },
      {
        collectionId: 'rank-two-armory',
        requirementId: 'knowledge-fragment',
        reason: 'automatic-collection',
      },
      { collectionId: 'field-notes', requirementId: 'missing', reason: 'unknown-requirement' },
    ] as const;
    for (const testCase of cases) {
      const state = emptyMir4CodexState();
      const materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
      expect(
        registerMir4CodexRequirement({
          classId: 1,
          level: 12,
          collectionId: testCase.collectionId,
          requirementId: testCase.requirementId,
          count: 1,
          expectedRegistered: 0,
          state,
          materials,
        }),
      ).toEqual({ ok: false, reason: testCase.reason });
      expect(state.registered).toEqual({});
      expect(materials.knowledgeFragment).toBe(25);
    }

    const state = emptyMir4CodexState();
    const materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
    expect(
      registerMir4CodexRequirement({
        classId: 1,
        level: 12,
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 0,
        expectedRegistered: 0,
        state,
        materials,
      }),
    ).toEqual({ ok: false, reason: 'invalid-count' });
    expect(
      registerMir4CodexRequirement({
        classId: 1,
        level: 12,
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 1,
        state,
        materials,
      }),
    ).toEqual({ ok: false, reason: 'stale-progress' });
    expect(state.registered).toEqual({});
    expect(materials.knowledgeFragment).toBe(25);
    expect(
      registerMir4CodexRequirement({
        classId: 1,
        level: 11,
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 0,
        state,
        materials,
      }),
    ).toEqual({ ok: false, reason: 'locked' });
    state.registered['field-notes'] = { 'knowledge-fragment': 25 };
    expect(
      registerMir4CodexRequirement({
        classId: 1,
        level: 12,
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 25,
        state,
        materials,
      }),
    ).toEqual({ ok: false, reason: 'already-complete' });
  });

  it('automatically completes only the current class equipment collection', () => {
    const warriorItems = Object.fromEntries(
      (mir4ItemProgressionRank(2)?.itemsByClass[1] ?? []).map((item) => [
        item.itemId,
        { itemId: item.itemId, enhancement: 0 },
      ]),
    );
    const wrongClass = mir4CodexProgress('rank-two-armory', {
      classId: 2,
      state: emptyMir4CodexState(),
      equipmentInstances: warriorItems,
    });
    expect(wrongClass.completed).toBe(false);
    const currentClass = mir4CodexProgress('rank-two-armory', {
      classId: 1,
      level: 12,
      state: emptyMir4CodexState(),
      equipmentInstances: warriorItems,
    });
    expect(currentClass.completed).toBe(true);
  });

  it('derives every automatic collection source and rejects destroyed or incomplete sets', () => {
    const rankTwo = mir4ItemProgressionRank(2)?.itemsByClass[1] ?? [];
    const rankThree = mir4ItemProgressionRank(3)?.itemsByClass[1] ?? [];
    const rewardItems = Object.fromEntries(rankTwo.map((item) => [String(item.itemId), 1]));
    const equipped = Object.fromEntries(rankThree.map((item) => [item.equipSlot, item.itemId]));
    const commonMountIds = MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade === 1)
      .slice(0, 3)
      .map((mount) => mount.id);
    const commonSpiritIds = MIR4_SPIRITS_CATALOG.filter((spirit) => spirit.grade === 1)
      .slice(0, 3)
      .map((spirit) => spirit.id);
    expect(commonMountIds).toEqual(['meadow-courser', 'moss-boar', 'brook-stag']);
    expect(commonSpiritIds).toEqual(['spirit-common-01', 'spirit-common-02', 'spirit-common-03']);
    const sources = {
      classId: 1 as const,
      level: 25,
      rewardItems,
      equipment: equipped,
      mounts: { discovered: commonMountIds },
      spirits: { discovered: commonSpiritIds },
    };
    expect(mir4CodexProgress('rank-two-armory', sources).completed).toBe(true);
    expect(mir4CodexProgress('rank-three-armory', sources).completed).toBe(true);
    expect(mir4CodexProgress('common-mounts', sources).completed).toBe(true);
    expect(mir4CodexProgress('common-spirits', sources).completed).toBe(true);

    const missingReward = { ...rewardItems };
    delete missingReward[String(rankTwo[0]?.itemId)];
    expect(
      mir4CodexProgress('rank-two-armory', { ...sources, rewardItems: missingReward }).completed,
    ).toBe(false);
    const destroyedInstances = Object.fromEntries(
      rankTwo.map((item) => [item.itemId, { itemId: item.itemId, destroyed: item === rankTwo[0] }]),
    );
    expect(
      mir4CodexProgress('rank-two-armory', {
        classId: 1,
        level: 25,
        equipmentInstances: destroyedInstances,
      }).completed,
    ).toBe(false);
    expect(
      mir4CodexProgress('common-mounts', {
        ...sources,
        mounts: { discovered: commonMountIds.slice(0, 2) },
      }).completed,
    ).toBe(false);
    expect(
      mir4CodexProgress('common-spirits', {
        ...sources,
        spirits: { discovered: commonSpiritIds.slice(0, 2) },
      }).completed,
    ).toBe(false);
  });

  it('adds each completed collection bonus once', () => {
    const state = sanitizeMir4CodexState({
      version: 1,
      registered: {
        'field-notes': { 'knowledge-fragment': 25 },
        'artisan-records': { 'knowledge-tome-common': 2 },
      },
    });
    const bonuses = mir4CodexBonuses({ classId: 1, state });
    expect(bonuses.maxHp).toBeGreaterThan(0);
    expect(bonuses.accuracy).toBeGreaterThan(0);
    expect(bonuses.physicalAttack).toBe(0);
  });

  it('adds the exact six-collection bonuses once and increases combat power', () => {
    const state = {
      version: 1 as const,
      registered: {
        'field-notes': { 'knowledge-fragment': 25 },
        'artisan-records': { 'knowledge-tome-common': 2 },
      },
    };
    const rankTwo = mir4ItemProgressionRank(2)?.itemsByClass[1] ?? [];
    const rankThree = mir4ItemProgressionRank(3)?.itemsByClass[1] ?? [];
    const rewardItems = Object.fromEntries(
      [...rankTwo, ...rankThree].map((item) => [String(item.itemId), 1]),
    );
    const mounts = {
      discovered: MIR4_MOUNTS_CATALOG.filter((mount) => mount.grade === 1)
        .slice(0, 3)
        .map((mount) => mount.id),
    };
    const spirits = {
      discovered: MIR4_SPIRITS_CATALOG.filter((spirit) => spirit.grade === 1)
        .slice(0, 3)
        .map((spirit) => spirit.id),
    };
    expect(
      mir4CodexBonuses({ classId: 1, level: 25, state, rewardItems, mounts, spirits }),
    ).toMatchObject({
      maxHp: 100,
      accuracy: 2,
      physicalAttack: 2,
      magicAttack: 2,
      physicalDefense: 4,
      magicDefense: 4,
      dodge: 2,
      skillDamageBps: 20,
    });
    const baseline = deriveMir4PlayerStats(1, 25, undefined, undefined, spirits, mounts);
    const withCodex = deriveMir4PlayerStats(
      1,
      25,
      undefined,
      undefined,
      spirits,
      mounts,
      state,
      rewardItems,
    );
    // Warrior's level-25 passive scales the raw +100 Codex HP bonus by 8%.
    expect(withCodex.maxHp - baseline.maxHp).toBe(108);
    expect(withCodex.combatPower).toBeGreaterThan(baseline.combatPower);
    expect(
      deriveMir4PlayerStats(1, 25, undefined, undefined, spirits, mounts, state, rewardItems),
    ).toEqual(withCodex);
  });

  it('bounds and filters untrusted persisted state', () => {
    expect(
      sanitizeMir4CodexState({
        version: 1,
        registered: {
          'field-notes': {
            'knowledge-fragment': 999_999,
            hacked: 123,
          },
          hacked: { anything: 999 },
        },
      }),
    ).toEqual({
      version: 1,
      registered: { 'field-notes': { 'knowledge-fragment': 25 } },
    });
  });
});
