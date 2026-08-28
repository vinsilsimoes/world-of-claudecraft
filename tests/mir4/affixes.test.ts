import { afterAll, describe, expect, it } from 'vitest';
import { mir4EquipmentItem } from '../../src/sim/content/mir4/equipment_catalog';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  MIR4_AFFIXES,
  mir4AffixPoolFor,
  mir4ResolveLayer,
  mir4RollbackBridgeAffixKeysFor,
  mir4RollbackBridgeAffixPoolFor,
  mir4RollLayer,
} from '../../src/sim/mir4/affixes';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { deriveMir4PlayerStats } from '../../src/sim/mir4/derived_stats';
import {
  MIR4_EMPTY_MATERIALS,
  MIR4_SPECIAL_AFFIX_STATUS_IDS,
  mir4CanonicalAffixStatusId,
  mir4EquippedSpecialAffixBonuses,
  mir4ItemAttributes,
  mir4ItemSpecialAffixBonuses,
} from '../../src/sim/mir4/equipment';
import { Sim } from '../../src/sim/sim';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 4.2/4.3: the enchantment (Selo Lunar, 2 affixes) and blessing
// (Lágrima da Aurora, 3 affixes at 0.7x) layers with the roll -> preview ->
// resolve flow and the source's pool weighting and value scaling.

function makeSim(seed = 151): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerName: 'Aldric',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  sim.players.get(sim.playerId)!.mir4ArcRewards = { items: { '991010101': 1 } };
  return sim;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the enchantment layer', () => {
  it('does not materialize a preview for equipment the character does not own', () => {
    const sim = makeSim(150);
    const meta = sim.players.get(sim.playerId)!;
    const starterInstances = structuredClone(meta.mir4EquipmentInstances);
    meta.mir4ArcRewards = undefined;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };

    expect(mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment')).toEqual({
      ok: false,
      code: 'unknown-item',
    });
    expect(meta.mir4EquipmentInstances).toEqual(starterInstances);
    expect(meta.mir4EquipmentInstances?.[991010101]).toBeUndefined();
    expect(meta.mir4Materials.lunarSeal).toBe(1);
  });

  it('rolls 2 unique affixes for 1 Selo Lunar, pending until resolved', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    sim.mir4EquipItem(991010101);
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes).toHaveLength(2);
    const keys = roll.affixes.map((a) => a.key);
    expect(new Set(keys).size).toBe(2);
    const pool = mir4RollbackBridgeAffixPoolFor(1, 1);
    const eligibleKeys = new Set(pool.map((def) => def.key));
    for (const affix of roll.affixes) {
      expect(eligibleKeys.has(affix.key)).toBe(true);
    }
    // The live compatibility bridge preserves the production pool and RNG
    // contract; family competition activates with the expanded V2 roller.
    expect(meta.mir4Materials.lunarSeal).toBe(0);
    // A second roll while the preview is pending fails closed.
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    expect(mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment')).toEqual({
      ok: false,
      code: 'preview-pending',
    });
    // Refusing keeps nothing; accepting writes the layer.
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.enchantment).toHaveLength(2);
    expect(inst.pendingRoll).toBeUndefined();
    expect(
      inst.affixes?.enchantment?.every(([statusId]) =>
        new Set([0, 20, 22, 24, 26, 28, 29, 30, 31]).has(statusId),
      ),
    ).toBe(true);
    // The accepted affixes land in the applied attributes.
    const attrs = mir4ItemAttributes(mir4EquipmentItem(991010101)!, inst);
    const regularAffixes = roll.affixes.filter((affix) => affix.statusId <= 164);
    expect(attrs.length).toBe(2 + regularAffixes.length);
    const specials = mir4ItemSpecialAffixBonuses(mir4EquipmentItem(991010101)!, inst);
    expect(
      regularAffixes.length +
        Number(specials.penetrationBps > 0) +
        Number(specials.penetrationDefenseBps > 0),
    ).toBe(2);
    const expected = deriveMir4PlayerStats(
      1,
      sim.player.level,
      meta.mir4Equipment,
      meta.mir4EquipmentInstances,
    );
    expect(sim.player.attackPower).toBe(expected.physicalAttack);
    expect(sim.player.mir4?.accuracy).toBe(expected.accuracy);
    expect(sim.player.mir4?.critical).toBe(expected.critical);
  });
  it('no material means no roll; refusing leaves the layer empty', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(152);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS };
    expect(mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment')).toEqual({
      ok: false,
      code: 'no-materials',
    });
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', roll.rollId, false),
    ).toEqual({ ok: true, accepted: false });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.enchantment).toBeUndefined();
  });
  it('a stale rollId is refused (the preview-stale gate)', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(153);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', 'wrong-id', true),
    ).toEqual({ ok: false, code: 'preview-stale' });
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'blessing', roll.rollId, true),
    ).toEqual({ ok: false, code: 'preview-stale' });
  });
});

describe('the blessing layer', () => {
  it('rolls 3 affixes for 1 Lágrima at the 0.7x multiplier', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(154);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, dawnTear: 1 };
    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'blessing');
    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes).toHaveLength(3);
    expect(new Set(roll.affixes.map((a) => a.key)).size).toBe(3);
    expect(meta.mir4Materials.dawnTear).toBe(0);
    // The 0.7x multiplier: every rating value <= its unscaled max * scale * 0.7 ceiling.
    for (const affix of roll.affixes) {
      expect(affix.value).toBeGreaterThanOrEqual(1);
    }
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'blessing', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    const inst = meta.mir4EquipmentInstances![991010101]!;
    expect(inst.affixes?.blessing).toHaveLength(3);
  });
});

describe('build-path affix pools', () => {
  it('pins persisted special-channel ids', () => {
    expect(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration).toBe(1_000_001);
    expect(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense).toBe(1_000_002);
  });

  it('keeps live rolls rollback-safe while the expanded pool is staged', () => {
    const previousReleaseIds = new Set([0, 20, 22, 24, 26, 28, 29, 30, 31]);
    for (const classId of [1, 2, 3, 4, 5]) {
      for (const equipSlot of [1, 2, 5]) {
        const pool = mir4RollbackBridgeAffixPoolFor(classId, equipSlot);
        for (const definition of pool) {
          const persistedId =
            definition.statusId === MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration ||
            definition.statusId === MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense
              ? 0
              : definition.statusId;
          expect(previousReleaseIds.has(persistedId)).toBe(true);
        }
      }
    }
    expect(mir4RollbackBridgeAffixPoolFor(1, 2).map((definition) => definition.key)).toContain(
      'penetrationDefense',
    );
    expect(mir4RollbackBridgeAffixPoolFor(1, 2).map((definition) => definition.key)).not.toContain(
      'penetration',
    );
    expect(mir4RollbackBridgeAffixPoolFor(1, 3).map((definition) => definition.key)).toContain(
      'penetration',
    );
    expect(mir4RollbackBridgeAffixPoolFor(1, 3).map((definition) => definition.key)).not.toContain(
      'penetrationDefense',
    );
    expect(mir4AffixPoolFor(1, 2).map((definition) => definition.key)).toEqual(
      expect.arrayContaining(['penetration', 'penetrationDefense', 'cooldownReduction']),
    );
  });

  it('pins the exact rollback pool order and duplicate weights', () => {
    expect(mir4RollbackBridgeAffixKeysFor(1, 1)).toEqual([
      'physicalAttack',
      'physicalAttack',
      'accuracy',
      'accuracy',
      'critical',
      'penetration',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(2, 1)).toEqual([
      'magicAttack',
      'magicAttack',
      'accuracy',
      'accuracy',
      'critical',
      'penetration',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(3, 1)).toEqual([
      'physicalAttack',
      'magicAttack',
      'physicalAttack',
      'magicAttack',
      'accuracy',
      'accuracy',
      'critical',
      'penetration',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(1, 5)).toEqual([
      'physicalDefense',
      'physicalDefense',
      'magicDefense',
      'magicDefense',
      'dodge',
      'criticalDefense',
      'penetrationDefense',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(1, 2)).toEqual([
      'physicalAttack',
      'physicalDefense',
      'magicDefense',
      'accuracy',
      'dodge',
      'critical',
      'criticalDefense',
      'penetration',
      'penetrationDefense',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(1, 3)).toEqual([
      'physicalAttack',
      'physicalDefense',
      'magicDefense',
      'accuracy',
      'dodge',
      'critical',
      'criticalDefense',
      'penetration',
      'penetrationDefense',
    ]);
    expect(mir4RollbackBridgeAffixKeysFor(4, 1)).toEqual(mir4RollbackBridgeAffixKeysFor(1, 1));
    expect(mir4RollbackBridgeAffixKeysFor(5, 1)).toEqual(mir4RollbackBridgeAffixKeysFor(3, 1));
  });

  it('keeps both legacy special selections draw-distinct before slot canonicalization', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(157);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = { items: { '991020101': 1 } };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const draws = [0.8, 0, 0.999, 0, 0.4321];
    let calls = 0;
    const originalNext = sim.rng.next;
    sim.rng.next = () => {
      calls += 1;
      return draws.shift() ?? 0;
    };

    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991020101, 'enchantment');

    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(calls).toBe(4);
    expect(roll.affixes).toEqual([
      {
        key: 'penetrationDefense',
        statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
        value: 25,
      },
      {
        key: 'penetrationDefense',
        statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
        value: 25,
      },
    ]);
    expect(meta.mir4EquipmentInstances?.[991020101]?.pendingRoll?.affixes).toEqual([
      [0, 25],
      [0, 25],
    ]);
    expect(sim.rng.next()).toBe(0.4321);
    expect(calls).toBe(5);
    sim.rng.next = originalNext;
  });

  it('serializes a live weapon penetration roll as the rollback-safe zero id', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(155);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const draws = [0.999, 0, 0, 0];
    const originalNext = sim.rng.next;
    sim.rng.next = () => draws.shift() ?? 0;

    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991010101, 'enchantment');
    sim.rng.next = originalNext;

    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes[0]).toMatchObject({
      key: 'penetration',
      statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration,
    });
    expect(meta.mir4EquipmentInstances?.[991010101]?.pendingRoll?.affixes[0]).toEqual([0, 25]);
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991010101, 'enchantment', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    expect(
      mir4ItemSpecialAffixBonuses(
        mir4EquipmentItem(991010101)!,
        meta.mir4EquipmentInstances![991010101]!,
      ),
    ).toMatchObject({ penetrationBps: 25, penetrationDefenseBps: 0 });
  });

  it('serializes a live armor protection roll as the rollback-safe zero id', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim(156);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4ArcRewards = { items: { '991050101': 1 } };
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
    const draws = [0.999, 0, 0, 0];
    const originalNext = sim.rng.next;
    sim.rng.next = () => draws.shift() ?? 0;

    const roll = mir4RollLayer(sim.ctx, sim.playerId, 991050101, 'enchantment');
    sim.rng.next = originalNext;

    expect(roll.ok).toBe(true);
    if (!roll.ok) return;
    expect(roll.affixes[0]).toMatchObject({
      key: 'penetrationDefense',
      statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
    });
    expect(meta.mir4EquipmentInstances?.[991050101]?.pendingRoll?.affixes[0]).toEqual([0, 25]);
    expect(
      mir4ResolveLayer(sim.ctx, sim.playerId, 991050101, 'enchantment', roll.rollId, true),
    ).toEqual({ ok: true, accepted: true });
    expect(
      mir4ItemSpecialAffixBonuses(
        mir4EquipmentItem(991050101)!,
        meta.mir4EquipmentInstances![991050101]!,
      ),
    ).toMatchObject({ penetrationBps: 0, penetrationDefenseBps: 25 });
  });

  it.each([
    {
      itemId: 991020101,
      key: 'penetrationDefense',
      statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
      expected: { penetrationBps: 0, penetrationDefenseBps: 25 },
    },
    {
      itemId: 991030101,
      key: 'penetration',
      statusId: MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration,
      expected: { penetrationBps: 25, penetrationDefenseBps: 0 },
    },
  ])(
    'keeps the legacy zero id unambiguous for accessory $itemId',
    ({ itemId, key, statusId, expected }) => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(itemId);
      const meta = sim.players.get(sim.playerId)!;
      meta.mir4ArcRewards = { items: { [String(itemId)]: 1 } };
      meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, lunarSeal: 1 };
      const draws = [0.999, 0, 0, 0];
      const originalNext = sim.rng.next;
      sim.rng.next = () => draws.shift() ?? 0;

      const roll = mir4RollLayer(sim.ctx, sim.playerId, itemId, 'enchantment');
      sim.rng.next = originalNext;

      expect(roll.ok).toBe(true);
      if (!roll.ok) return;
      expect(roll.affixes[0]).toMatchObject({ key, statusId });
      expect(meta.mir4EquipmentInstances?.[itemId]?.pendingRoll?.affixes[0]).toEqual([0, 25]);
      expect(
        mir4ResolveLayer(sim.ctx, sim.playerId, itemId, 'enchantment', roll.rollId, true),
      ).toEqual({ ok: true, accepted: true });
      expect(
        mir4ItemSpecialAffixBonuses(
          mir4EquipmentItem(itemId)!,
          meta.mir4EquipmentInstances![itemId]!,
        ),
      ).toMatchObject(expected);
    },
  );

  it('exposes weighted competing families for every class and slot kind', () => {
    for (const classId of [1, 2, 3, 4, 5]) {
      for (const equipSlot of [1, 2, 5]) {
        const pool = mir4AffixPoolFor(classId, equipSlot);
        expect(pool.length).toBeGreaterThanOrEqual(6);
        expect(new Set(pool.map((def) => def.family)).size).toBeGreaterThanOrEqual(5);
        expect(pool.every((def) => Number.isInteger(def.weight) && def.weight > 0)).toBe(true);
      }
    }
    expect(mir4AffixPoolFor(1, 1).map((def) => def.key)).toContain('physicalAttack');
    expect(mir4AffixPoolFor(1, 1).map((def) => def.key)).not.toContain('magicAttack');
    expect(mir4AffixPoolFor(2, 1).map((def) => def.key)).toContain('magicAttack');
    expect(mir4AffixPoolFor(2, 1).map((def) => def.key)).not.toContain('physicalAttack');
    expect(mir4AffixPoolFor(3, 1).map((def) => def.key)).toEqual(
      expect.arrayContaining(['physicalAttack', 'magicAttack']),
    );
    expect(
      Object.values(MIR4_AFFIXES).map((definition) => ({
        key: definition.key,
        statusId: definition.statusId,
        unit: definition.unit,
        min: definition.min,
        max: definition.max,
        family: definition.family,
        weight: definition.weight,
        slots: definition.slots,
      })),
    ).toMatchSnapshot('complete affix balance registry');
  });

  it('keeps potion boosts on their specific status lanes and cooldown on tempo', () => {
    expect(MIR4_AFFIXES.potionEffect).toMatchObject({
      statusId: 146,
      family: 'sustain',
      slots: ['armor'],
    });
    expect(MIR4_AFFIXES.manaPotionEffect).toMatchObject({
      statusId: 147,
      family: 'sustain',
      slots: ['armor'],
    });
    expect(MIR4_AFFIXES.cooldownReduction).toMatchObject({
      statusId: 95,
      family: 'tempo',
      slots: ['accessory'],
    });
  });

  it('keeps penetration channels outside official status attributes', () => {
    const weapon = mir4EquipmentItem(991010101)!;
    const armor = mir4EquipmentItem(991050101)!;
    const instances = {
      [weapon.itemId]: {
        itemId: weapon.itemId,
        enhancement: 0,
        affixes: {
          enchantment: [[MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration, 55] as const],
        },
      },
      [armor.itemId]: {
        itemId: armor.itemId,
        enhancement: 0,
        affixes: {
          blessing: [[MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense, 45] as const],
        },
      },
    };

    expect(mir4ItemAttributes(weapon, instances[weapon.itemId])).toEqual(weapon.baseAttributes);
    expect(mir4ItemSpecialAffixBonuses(weapon, instances[weapon.itemId])).toEqual({
      penetrationBps: 55,
      penetrationDefenseBps: 0,
    });
    expect(
      mir4EquippedSpecialAffixBonuses({ 1: weapon.itemId, 5: armor.itemId }, instances),
    ).toEqual({
      penetrationBps: 55,
      penetrationDefenseBps: 45,
    });
  });

  it('carries equipped canonical and legacy penetration through recalc into real damage', () => {
    const weaponId = 991010106;
    const armorId = 991050106;
    const pairValue = MIR4_AFFIXES.penetration.max;
    const expectedChannelValue = pairValue * 2;
    const run = (
      attackerStatusId?: number,
      defenderStatusId?: number,
    ): {
      damage: number;
      penetrationBps: number;
      penetrationDefenseBps: number;
    } => {
      setActiveWorldContent(MIR4_SLICE_WORLD);
      const sim = makeSim(158);
      const attackerId = sim.playerId;
      const defenderId = sim.addPlayer('warrior', 'Penetration target');
      sim.setPlayerLevel(200, attackerId);
      sim.setPlayerLevel(200, defenderId);

      const attackerMeta = sim.players.get(attackerId)!;
      attackerMeta.mir4ArcRewards = {
        ...attackerMeta.mir4ArcRewards,
        items: { ...attackerMeta.mir4ArcRewards?.items, [String(weaponId)]: 1 },
      };
      attackerMeta.mir4EquipmentInstances = {
        ...attackerMeta.mir4EquipmentInstances,
        [weaponId]: {
          itemId: weaponId,
          enhancement: 0,
          ...(attackerStatusId === undefined
            ? {}
            : {
                affixes: {
                  enchantment: [[attackerStatusId, pairValue] as const],
                  blessing: [[attackerStatusId, pairValue] as const],
                },
              }),
        },
      };
      expect(sim.mir4EquipItem(weaponId, attackerId)).toBe(
        `${mir4EquipmentItem(weaponId)!.name} equipped.`,
      );

      const defenderMeta = sim.players.get(defenderId)!;
      defenderMeta.mir4ArcRewards = {
        ...defenderMeta.mir4ArcRewards,
        items: { ...defenderMeta.mir4ArcRewards?.items, [String(armorId)]: 1 },
      };
      defenderMeta.mir4EquipmentInstances = {
        ...defenderMeta.mir4EquipmentInstances,
        [armorId]: {
          itemId: armorId,
          enhancement: 0,
          ...(defenderStatusId === undefined
            ? {}
            : {
                affixes: {
                  enchantment: [[defenderStatusId, pairValue] as const],
                  blessing: [[defenderStatusId, pairValue] as const],
                },
              }),
        },
      };
      expect(sim.mir4EquipItem(armorId, defenderId)).toBe(
        `${mir4EquipmentItem(armorId)!.name} equipped.`,
      );

      const attacker = sim.entities.get(attackerId)!;
      const defender = sim.entities.get(defenderId)!;
      defender.pos = sim.groundPos(attacker.pos.x + 2, attacker.pos.z);
      defender.prevPos = { ...defender.pos };
      const duel = { a: attackerId, b: defenderId, state: 'active' as const, timer: 0 };
      sim.duels.set(attackerId, duel);
      sim.duels.set(defenderId, duel);

      const hpBefore = defender.hp;
      expect(sim.mir4BasicAttack(defenderId, attackerId)).toEqual({ ok: true });
      for (const impact of attacker.mir4PendingImpacts ?? []) {
        impact.dueAt = sim.ctx.time;
        impact.forceHit = true;
        impact.forceCritical = false;
      }
      updateMir4PendingImpacts(sim.ctx);

      return {
        damage: hpBefore - defender.hp,
        penetrationBps: attacker.mir4?.penetrationBps ?? -1,
        penetrationDefenseBps: defender.mir4?.penetrationDefenseBps ?? -1,
      };
    };

    const baseline = run();
    const canonical = run(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration);
    const legacy = run(0);
    const protectedCanonical = run(
      MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration,
      MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense,
    );
    const protectedLegacy = run(0, 0);

    expect(baseline).toMatchObject({ penetrationBps: 0, penetrationDefenseBps: 0 });
    expect(canonical.penetrationBps).toBe(expectedChannelValue);
    expect(canonical.damage).toBeGreaterThan(baseline.damage);
    expect(legacy).toEqual(canonical);
    expect(protectedCanonical).toEqual({
      damage: baseline.damage,
      penetrationBps: expectedChannelValue,
      penetrationDefenseBps: expectedChannelValue,
    });
    expect(protectedLegacy).toEqual(protectedCanonical);
  });

  it('heals the legacy status id 0 deterministically by equipment slot', () => {
    expect(mir4CanonicalAffixStatusId(0, 1)).toBe(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration);
    expect(mir4CanonicalAffixStatusId(0, 2)).toBe(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense);
    expect(mir4CanonicalAffixStatusId(0, 3)).toBe(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetration);
    expect(mir4CanonicalAffixStatusId(0, 4)).toBe(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense);
    expect(mir4CanonicalAffixStatusId(0, 8)).toBe(MIR4_SPECIAL_AFFIX_STATUS_IDS.penetrationDefense);
  });
});
