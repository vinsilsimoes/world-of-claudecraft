import { afterAll, describe, expect, it, vi } from 'vitest';
import { handleMir4Command } from '../../server/mir4_commands';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Native WoC presentation cues on every admitted cast, and the WS
// envelope's server dispatch routed through the real Sim (the online half of
// the parity contract; the wire token itself is pinned by command_schema).

function makeSim(cls: Mir4ClassKey = 'warrior', seed = 131): Sim {
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Teste',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function spawnWolf(sim: Sim): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + 2, p.pos.z + 0.5),
  );
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('the native WoC VFX hook', () => {
  it('every admitted cast emits the native cue selected for the logical skill', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim();
    const wolf = spawnWolf(sim);
    const events: SimEvent[] = [];
    const origTick = sim.tick.bind(sim);
    sim.tick = () => {
      const drained = origTick();
      events.push(...drained);
      return drained;
    };
    sim.mir4CastSkill(1102, wolf.id);
    sim.tick(); // drain the emit buffer
    const fx = events.filter(
      (e) => e.type === 'spellfx' && e.school === 'physical' && e.sourceId === sim.playerId,
    );
    expect(fx).toHaveLength(1);
    expect(fx[0]).toMatchObject({ ability: 'storm_bolt', fx: 'projectile' });
  });
  it('self utilities emit the native shield cue keyed to the caster', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('elementalist', 132);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 5;
    p.cooldowns.clear();
    p.gcdRemaining = 0;
    const events: SimEvent[] = [];
    const origTick = sim.tick.bind(sim);
    sim.tick = () => {
      const drained = origTick();
      events.push(...drained);
      return drained;
    };
    expect(sim.mir4CastSkill(2503)).toEqual({ ok: true });
    sim.tick(); // drain the emit buffer
    const fx = events.filter((e) => e.type === 'spellfx' && e.school === 'holy');
    expect(fx).toHaveLength(1);
    expect((fx[0] as { targetId?: number }).targetId).toBe(p.id);
    expect(fx[0]).toMatchObject({ ability: 'power_word_shield', fx: 'selfCast' });
  });
});

describe('the mir4 WS envelope dispatch', () => {
  it('rejects every MIR4 sub-action outside the MIR4 profile', () => {
    const sim = new Sim({ seed: 132, playerClass: 'warrior', playerName: 'Classic' });
    const player = sim.entities.get(sim.playerId)!;
    const before = {
      maxHp: player.maxHp,
      attackPower: player.attackPower,
      mir4: player.mir4,
      autoBattle: sim.mir4AutoBattleActive(),
    };

    handleMir4Command(sim, { m: 'equip' }, sim.playerId);
    handleMir4Command(sim, { m: 'auto', on: true }, sim.playerId);

    expect(player.maxHp).toBe(before.maxHp);
    expect(player.attackPower).toBe(before.attackPower);
    expect(player.mir4).toBe(before.mir4);
    expect(sim.mir4AutoBattleActive()).toBe(before.autoBattle);
  });

  it("routes the sub-actions onto the Sim's verbs with field validation", () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('warrior', 133);
    const wolf = spawnWolf(sim);
    const pid = sim.playerId;
    // auto: on; cast: 1102 at the wolf; basic: swing; equip; ultimate refused
    handleMir4Command(sim, { m: 'auto', on: true }, pid);
    expect(sim.mir4AutoBattleActive()).toBe(true);
    handleMir4Command(sim, { m: 'auto', on: false }, pid);
    expect(sim.mir4AutoBattleActive()).toBe(false);
    wolf.maxHp = 1_000;
    wolf.hp = 1_000;
    const hp = wolf.hp;
    handleMir4Command(sim, { m: 'cast', skill: 1102, target: wolf.id }, pid);
    expect(hp - wolf.hp).toBe(312); // class-native starter stats crossed the pid-first delegate
    handleMir4Command(sim, { m: 'basic', target: wolf.id }, pid);
    handleMir4Command(sim, { m: 'equip' }, pid);
    expect(sim.mir4EquipStarterWeapon()).toBe('Already equipped.');
    // Invalid envelopes are dropped, never thrown.
    handleMir4Command(sim, { m: 'cast', skill: 'nope' }, pid);
    handleMir4Command(sim, {}, pid);
    handleMir4Command(sim, { m: 'unknown' }, pid);
    expect(true).toBe(true);
  });
  it('rejects non-canonical skill and target numbers without coercion', () => {
    const sim = makeSim('warrior', 137);
    const cast = vi.spyOn(sim, 'castMir4Skill').mockReturnValue({ ok: false, reason: 'no-target' });
    const basic = vi
      .spyOn(sim, 'mir4BasicAttack')
      .mockReturnValue({ ok: false, reason: 'no-target' });

    for (const skill of [1102.5, -1, 0, Number.NaN, Number.POSITIVE_INFINITY, '1102']) {
      handleMir4Command(sim, { m: 'cast', skill }, sim.playerId);
    }
    for (const target of [-1, 0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      handleMir4Command(sim, { m: 'cast', skill: 1102, target }, sim.playerId);
      handleMir4Command(sim, { m: 'basic', target }, sim.playerId);
    }

    expect(cast).not.toHaveBeenCalled();
    expect(basic).not.toHaveBeenCalled();
  });
  it('toggle quests routes to the journey', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('warrior', 134);
    handleMir4Command(sim, { m: 'quest', on: true }, sim.playerId);
    expect(sim.mir4AutoQuestActive()).toBe(true);
    handleMir4Command(sim, { m: 'quest', on: false }, sim.playerId);
    expect(sim.mir4AutoQuestActive()).toBe(false);
  });

  it('validates and routes skill evolution revisions without numeric coercion', () => {
    const sim = makeSim('warrior', 138);
    const upgrade = vi.spyOn(sim, 'mir4UpgradeSkill').mockReturnValue({
      ok: true,
      skillId: 1102,
      previousLevel: 1,
      currentLevel: 2,
    });

    handleMir4Command(
      sim,
      { m: 'upgradeSkill', skillId: 1102, expectedCurrentLevel: 1 },
      sim.playerId,
    );
    expect(upgrade).toHaveBeenCalledWith(1102, 1, sim.playerId);

    for (const skillId of [0, -1, 1102.5, Number.NaN, Number.POSITIVE_INFINITY, '1102']) {
      handleMir4Command(sim, { m: 'upgradeSkill', skillId, expectedCurrentLevel: 1 }, sim.playerId);
    }
    for (const expectedCurrentLevel of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '1']) {
      handleMir4Command(
        sim,
        { m: 'upgradeSkill', skillId: 1102, expectedCurrentLevel },
        sim.playerId,
      );
    }
    expect(upgrade).toHaveBeenCalledTimes(1);
  });

  it('admits only the two source-backed achievement ids', () => {
    const sim = makeSim('warrior', 139);
    const claim = vi.spyOn(sim, 'mir4ClaimAchievement').mockReturnValue({
      ok: true,
      achievementId: 20101,
      groupGrade: 1,
    });

    handleMir4Command(sim, { m: 'claimAchievement', achievementId: 20101 }, sim.playerId);
    handleMir4Command(sim, { m: 'claimAchievement', achievementId: 20102 }, sim.playerId);
    for (const achievementId of [0, -1, 20101.5, 20103, '20101']) {
      handleMir4Command(sim, { m: 'claimAchievement', achievementId }, sim.playerId);
    }

    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim).toHaveBeenNthCalledWith(1, 20101, sim.playerId);
    expect(claim).toHaveBeenNthCalledWith(2, 20102, sim.playerId);
  });

  it('validates authoritative equipment item and slot identifiers', () => {
    const sim = makeSim('warrior', 135);
    const equip = vi.spyOn(sim, 'mir4EquipItem').mockReturnValue('equipped');
    const unequip = vi.spyOn(sim, 'mir4UnequipSlot').mockReturnValue('unequipped');

    handleMir4Command(sim, { m: 'equipItem', itemId: 991010101 }, sim.playerId);
    handleMir4Command(sim, { m: 'unequipSlot', equipSlot: 8 }, sim.playerId);
    expect(equip).toHaveBeenCalledWith(991010101, sim.playerId);
    expect(unequip).toHaveBeenCalledWith(8, sim.playerId);

    for (const itemId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '991010101']) {
      handleMir4Command(sim, { m: 'equipItem', itemId }, sim.playerId);
    }
    for (const equipSlot of [0, 9, 1.5, '1']) {
      handleMir4Command(sim, { m: 'unequipSlot', equipSlot }, sim.playerId);
    }
    expect(equip).toHaveBeenCalledTimes(1);
    expect(unequip).toHaveBeenCalledTimes(1);
  });

  it('validates refinement, layer-preview, material-craft and collection-ticket envelopes', () => {
    const sim = makeSim('warrior', 136);
    const enhance = vi.spyOn(sim, 'mir4EnhanceItem').mockImplementation(() => undefined);
    const roll = vi.spyOn(sim, 'mir4RollItemLayer').mockImplementation(() => undefined);
    const resolve = vi.spyOn(sim, 'mir4ResolveItemLayer').mockImplementation(() => undefined);
    const craft = vi.spyOn(sim, 'mir4CraftMaterial').mockImplementation(() => undefined);
    const redeem = vi.spyOn(sim, 'mir4RedeemTicket').mockImplementation(() => undefined);
    const confirmSpirit = vi.spyOn(sim, 'mir4ConfirmSpirit').mockImplementation(() => undefined);
    const equipSpirit = vi.spyOn(sim, 'mir4EquipSpirit').mockImplementation(() => undefined);
    const combineSpirits = vi.spyOn(sim, 'mir4CombineSpirits').mockImplementation(() => undefined);
    const confirmMount = vi.spyOn(sim, 'mir4ConfirmMount').mockImplementation(() => undefined);
    const equipMount = vi.spyOn(sim, 'mir4EquipMount').mockImplementation(() => undefined);
    const combineMounts = vi.spyOn(sim, 'mir4CombineMounts').mockImplementation(() => undefined);
    const campaignProfession = vi
      .spyOn(sim, 'mir4CampaignProfession')
      .mockImplementation(() => undefined);

    handleMir4Command(sim, { m: 'enhanceItem', itemId: 991010101 }, sim.playerId);
    handleMir4Command(sim, { m: 'rollLayer', itemId: 991010101, layer: 'blessing' }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'resolveLayer', itemId: 991010101, layer: 'blessing', rollId: 'roll-1', accept: false },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'lunar-seal' }, sim.playerId);
    handleMir4Command(sim, { m: 'redeemTicket', ticketId: 'mount-ticket-dawn' }, sim.playerId);
    handleMir4Command(sim, { m: 'redeemTicket', ticketId: 'spirit-ticket-dawn' }, sim.playerId);
    handleMir4Command(sim, { m: 'confirmSpirit', pendingId: 'spirit-pending-1-2' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipSpirit', spiritId: 'spirit-rare-01' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipSpirit', spiritId: null }, sim.playerId);
    handleMir4Command(sim, { m: 'combineSpirits', grade: 4 }, sim.playerId);
    handleMir4Command(sim, { m: 'confirmMount', pendingId: 'mount-pending-1-2' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipMount', mountId: 'meadow-courser' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipMount', mountId: null }, sim.playerId);
    handleMir4Command(sim, { m: 'combineMounts', grade: 3 }, sim.playerId);
    handleMir4Command(sim, { m: 'campaignProfession' }, sim.playerId);
    expect(enhance).toHaveBeenCalledOnce();
    expect(roll).toHaveBeenCalledWith(991010101, 'blessing', sim.playerId);
    expect(resolve).toHaveBeenCalledWith(991010101, 'blessing', 'roll-1', false, sim.playerId);
    expect(craft).toHaveBeenCalledWith('lunar-seal', sim.playerId);
    expect(redeem).toHaveBeenCalledWith('mount-ticket-dawn', sim.playerId);
    expect(redeem).toHaveBeenLastCalledWith('spirit-ticket-dawn', sim.playerId);
    expect(confirmSpirit).toHaveBeenCalledWith('spirit-pending-1-2', sim.playerId);
    expect(equipSpirit).toHaveBeenNthCalledWith(1, 'spirit-rare-01', sim.playerId);
    expect(equipSpirit).toHaveBeenNthCalledWith(2, null, sim.playerId);
    expect(combineSpirits).toHaveBeenCalledWith(4, sim.playerId);
    expect(confirmMount).toHaveBeenCalledWith('mount-pending-1-2', sim.playerId);
    expect(equipMount).toHaveBeenNthCalledWith(1, 'meadow-courser', sim.playerId);
    expect(equipMount).toHaveBeenNthCalledWith(2, null, sim.playerId);
    expect(combineMounts).toHaveBeenCalledWith(3, sim.playerId);
    expect(campaignProfession).toHaveBeenCalledWith(sim.playerId);

    handleMir4Command(sim, { m: 'enhanceItem', itemId: 1.5 }, sim.playerId);
    handleMir4Command(sim, { m: 'rollLayer', itemId: 991010101, layer: 'other' }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'resolveLayer', itemId: 991010101, layer: 'blessing', rollId: '', accept: true },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'unknown' }, sim.playerId);
    for (const ticketId of ['spirit-ticket-celestial', 'mount-ticket-sunset', '', 1]) {
      handleMir4Command(sim, { m: 'redeemTicket', ticketId }, sim.playerId);
    }
    for (const pendingId of ['spirit-pending-x-1', '', 1]) {
      handleMir4Command(sim, { m: 'confirmSpirit', pendingId }, sim.playerId);
    }
    for (const spiritId of ['spirit-forged-01', 'spirit-rare-1', 1]) {
      handleMir4Command(sim, { m: 'equipSpirit', spiritId }, sim.playerId);
    }
    for (const grade of [0, 6, 1.5, '1']) {
      handleMir4Command(sim, { m: 'combineSpirits', grade }, sim.playerId);
    }
    for (const pendingId of ['mount-pending-x-1', '', 1]) {
      handleMir4Command(sim, { m: 'confirmMount', pendingId }, sim.playerId);
    }
    for (const mountId of ['Mount Invalid', '../x', 1]) {
      handleMir4Command(sim, { m: 'equipMount', mountId }, sim.playerId);
    }
    for (const grade of [0, 6, 1.5, '1']) {
      handleMir4Command(sim, { m: 'combineMounts', grade }, sim.playerId);
    }
    expect(enhance).toHaveBeenCalledTimes(1);
    expect(roll).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(craft).toHaveBeenCalledTimes(1);
    expect(redeem).toHaveBeenCalledTimes(2);
    expect(confirmSpirit).toHaveBeenCalledTimes(1);
    expect(equipSpirit).toHaveBeenCalledTimes(2);
    expect(combineSpirits).toHaveBeenCalledTimes(1);
    expect(confirmMount).toHaveBeenCalledTimes(1);
    expect(equipMount).toHaveBeenCalledTimes(2);
    expect(combineMounts).toHaveBeenCalledTimes(1);
  });
});
