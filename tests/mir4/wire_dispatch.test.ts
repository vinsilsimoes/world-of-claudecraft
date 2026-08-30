import { afterAll, describe, expect, it, vi } from 'vitest';
import { handleMir4Command } from '../../server/mir4_commands';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
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
    expect(fx[0]).toMatchObject({
      ability: 'mir4_skill_1102',
      fx: 'selfCast',
      impactDelayMs: 900,
      attackAnimationStarted: true,
    });
  });
  it('self utilities emit the native shield cue keyed to the caster', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeSim('elementalist', 132);
    const p = sim.entities.get(sim.playerId)!;
    p.level = 50;
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
  it('validates and routes class-safe Codex registration commands', () => {
    const sim = makeSim('warrior', 1301);
    sim.setPlayerLevel(12);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };

    for (const collectionId of ['', '../field-notes', 'X'.repeat(81), 12]) {
      handleMir4Command(sim, { m: 'registerAllCodex', collectionId }, sim.playerId);
    }
    expect(meta.mir4Codex).toBeUndefined();
    handleMir4Command(sim, { m: 'registerAllCodex', collectionId: 'field-notes' }, sim.playerId);
    expect(meta.mir4Codex?.registered['field-notes']?.['knowledge-fragment']).toBe(25);
  });

  it('validates every direct Codex registration field before dispatch', () => {
    const sim = makeSim('warrior', 1302);
    sim.setPlayerLevel(12);
    const meta = sim.players.get(sim.playerId)!;
    meta.mir4Materials = { ...MIR4_EMPTY_MATERIALS, knowledgeFragment: 25 };
    const invalid = [
      {
        collectionId: '../field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 0,
      },
      {
        collectionId: 'field-notes',
        requirementId: '../fragment',
        count: 1,
        expectedRegistered: 0,
      },
      {
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 0,
        expectedRegistered: 0,
      },
      {
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1_000_001,
        expectedRegistered: 0,
      },
      {
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1.5,
        expectedRegistered: 0,
      },
      {
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: -1,
      },
      {
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 1_000_001,
      },
    ];
    for (const payload of invalid) {
      handleMir4Command(sim, { m: 'registerCodex', ...payload }, sim.playerId);
    }
    expect(meta.mir4Codex).toBeUndefined();
    expect(meta.mir4Materials.knowledgeFragment).toBe(25);

    handleMir4Command(
      sim,
      {
        m: 'registerCodex',
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 0,
      },
      sim.playerId,
    );
    expect(meta.mir4Codex?.registered['field-notes']?.['knowledge-fragment']).toBe(1);
    expect(meta.mir4Materials.knowledgeFragment).toBe(24);
  });

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
    handleMir4Command(sim, { m: 'autoSkill', skillId: 1102, enabled: false }, sim.playerId);

    expect(player.maxHp).toBe(before.maxHp);
    expect(player.attackPower).toBe(before.attackPower);
    expect(player.mir4).toBe(before.mir4);
    expect(sim.mir4AutoBattleActive()).toBe(before.autoBattle);
    expect(sim.mir4PlayerState()).toBeNull();
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
    handleMir4Command(sim, { m: 'autoSkill', skillId: 1102, enabled: false }, pid);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([1102]);
    handleMir4Command(sim, { m: 'autoSkill', skillId: 2101, enabled: false }, pid);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toEqual([1102]);
    handleMir4Command(sim, { m: 'autoSkill', skillId: 1102, enabled: true }, pid);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    handleMir4Command(sim, { m: 'autoSkill', skillId: '1102', enabled: false }, pid);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    handleMir4Command(sim, { m: 'autoSkill', skillId: 1102, enabled: 'false' }, pid);
    expect(sim.mir4PlayerState()?.mir4DisabledAutoSkills).toBeUndefined();
    wolf.maxHp = 1_000;
    wolf.hp = 1_000;
    const hp = wolf.hp;
    handleMir4Command(sim, { m: 'cast', skill: 1102, target: wolf.id }, pid);
    for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
    updateMir4PendingImpacts(sim.ctx);
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

  it('routes an explicitly selected side quest and rejects malformed quest ids', () => {
    const sim = makeSim('warrior', 1342);
    const setJourney = vi.spyOn(sim, 'setMir4AutoQuest').mockImplementation(() => undefined);

    handleMir4Command(sim, { m: 'quest', on: true, questId: 'M08-S01' }, sim.playerId);
    for (const questId of ['', 'M8-S01', 'M08-X01', 801]) {
      handleMir4Command(sim, { m: 'quest', on: true, questId }, sim.playerId);
    }

    expect(setJourney).toHaveBeenCalledOnce();
    expect(setJourney).toHaveBeenCalledWith(true, 'M08-S01', sim.playerId);
  });

  it('validates the narrative skip id before routing it to the authoritative gate', () => {
    const sim = makeSim('warrior', 1341);
    const skip = vi.spyOn(sim, 'mir4SkipNarrativeDialogue').mockImplementation(() => undefined);

    handleMir4Command(sim, { m: 'skipDialogue', dialogueId: 'M01-Q01:accept:-1:17' }, sim.playerId);
    for (const dialogueId of ['', 17, 'x'.repeat(161)]) {
      handleMir4Command(sim, { m: 'skipDialogue', dialogueId }, sim.playerId);
    }

    expect(skip).toHaveBeenCalledOnce();
    expect(skip).toHaveBeenCalledWith('M01-Q01:accept:-1:17', sim.playerId);
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

  it('validates all three independent progression systems before authoritative dispatch', () => {
    const sim = makeSim('warrior', 1_384);
    const constitution = vi.spyOn(sim, 'mir4TrainConstitution').mockReturnValue({
      ok: true,
      code: 'success',
      level: 1,
      energySpent: 100,
    });
    const innerForce = vi.spyOn(sim, 'mir4TrainInnerForce').mockReturnValue({
      ok: true,
      code: 'success',
      level: 1,
      energySpent: 100,
    });
    const solitude = vi.spyOn(sim, 'mir4TrainSolitude').mockReturnValue({
      ok: true,
      code: 'success',
      previousLevel: 0,
      level: 1,
      darksteelSpent: 1_000,
    });

    handleMir4Command(
      sim,
      { m: 'trainConstitution', branchId: 7, expectedCurrentLevel: 0 },
      sim.playerId,
    );
    handleMir4Command(
      sim,
      { m: 'trainInnerForce', branchId: 4, expectedCurrentLevel: 0 },
      sim.playerId,
    );
    handleMir4Command(
      sim,
      { m: 'trainSolitude', branchId: 8, expectedCurrentLevel: 0 },
      sim.playerId,
    );
    for (const branchId of [0, 8, 1.5, Number.NaN, '1']) {
      handleMir4Command(
        sim,
        { m: 'trainConstitution', branchId, expectedCurrentLevel: 0 },
        sim.playerId,
      );
    }
    for (const branchId of [0, 5, 1.5, Number.NaN, '1']) {
      handleMir4Command(
        sim,
        { m: 'trainInnerForce', branchId, expectedCurrentLevel: 0 },
        sim.playerId,
      );
    }
    for (const branchId of [0, 9, 1.5, Number.NaN, '1']) {
      handleMir4Command(
        sim,
        { m: 'trainSolitude', branchId, expectedCurrentLevel: 0 },
        sim.playerId,
      );
    }
    for (const expectedCurrentLevel of [-1, 6, 1.5, Number.NaN, '0']) {
      handleMir4Command(
        sim,
        { m: 'trainConstitution', branchId: 1, expectedCurrentLevel },
        sim.playerId,
      );
      handleMir4Command(
        sim,
        { m: 'trainInnerForce', branchId: 1, expectedCurrentLevel },
        sim.playerId,
      );
    }
    for (const expectedCurrentLevel of [-1, 11, 1.5, Number.NaN, '0']) {
      handleMir4Command(
        sim,
        { m: 'trainSolitude', branchId: 1, expectedCurrentLevel },
        sim.playerId,
      );
    }

    expect(constitution).toHaveBeenCalledOnce();
    expect(constitution).toHaveBeenCalledWith(7, 0, sim.playerId);
    expect(innerForce).toHaveBeenCalledOnce();
    expect(innerForce).toHaveBeenCalledWith(4, 0, sim.playerId);
    expect(solitude).toHaveBeenCalledOnce();
    expect(solitude).toHaveBeenCalledWith(8, 0, sim.playerId);
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
    const buy = vi.spyOn(sim, 'mir4BuyVillageEquipment').mockReturnValue('purchased');
    const unequip = vi.spyOn(sim, 'mir4UnequipSlot').mockReturnValue('unequipped');

    handleMir4Command(sim, { m: 'equipItem', itemId: 991010101 }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'buyVillageEquipment', npcId: 77, itemId: 991010101 },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'unequipSlot', equipSlot: 8 }, sim.playerId);
    expect(equip).toHaveBeenCalledWith(991010101, sim.playerId);
    expect(buy).toHaveBeenCalledWith(77, 991010101, sim.playerId);
    expect(unequip).toHaveBeenCalledWith(8, sim.playerId);

    for (const itemId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '991010101']) {
      handleMir4Command(sim, { m: 'equipItem', itemId }, sim.playerId);
      handleMir4Command(sim, { m: 'buyVillageEquipment', npcId: itemId, itemId }, sim.playerId);
    }
    for (const equipSlot of [0, 9, 1.5, '1']) {
      handleMir4Command(sim, { m: 'unequipSlot', equipSlot }, sim.playerId);
    }
    expect(equip).toHaveBeenCalledTimes(1);
    expect(buy).toHaveBeenCalledTimes(1);
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
    const confirmAllSpirits = vi
      .spyOn(sim, 'mir4ConfirmAllSpirits')
      .mockImplementation(() => undefined);
    const equipSpirit = vi.spyOn(sim, 'mir4EquipSpirit').mockImplementation(() => undefined);
    const combineSpirits = vi.spyOn(sim, 'mir4CombineSpirits').mockImplementation(() => undefined);
    const confirmMount = vi.spyOn(sim, 'mir4ConfirmMount').mockImplementation(() => undefined);
    const confirmAllMounts = vi
      .spyOn(sim, 'mir4ConfirmAllMounts')
      .mockImplementation(() => undefined);
    const equipMount = vi.spyOn(sim, 'mir4EquipMount').mockImplementation(() => undefined);
    const combineMounts = vi.spyOn(sim, 'mir4CombineMounts').mockImplementation(() => undefined);
    const campaignProfession = vi
      .spyOn(sim, 'mir4CampaignProfession')
      .mockImplementation(() => undefined);
    const acknowledgeTutorial = vi
      .spyOn(sim, 'mir4AcknowledgeTutorial')
      .mockImplementation(() => undefined);

    handleMir4Command(sim, { m: 'enhanceItem', itemId: 991010101 }, sim.playerId);
    handleMir4Command(sim, { m: 'rollLayer', itemId: 991010101, layer: 'blessing' }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'resolveLayer', itemId: 991010101, layer: 'blessing', rollId: 'roll-1', accept: false },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'lunar-seal' }, sim.playerId);
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'metal-uncommon' }, sim.playerId);
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'equipment-991020101' }, sim.playerId);
    handleMir4Command(sim, { m: 'redeemTicket', ticketId: 'mount-ticket-dawn' }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'redeemTicket', ticketId: 'mount-ticket-dawn', count: 10 },
      sim.playerId,
    );
    handleMir4Command(
      sim,
      { m: 'redeemTicket', ticketId: 'mount-ticket-dawn', count: 100 },
      sim.playerId,
    );
    handleMir4Command(
      sim,
      { m: 'redeemTicket', ticketId: 'spirit-ticket-dawn', count: 10 },
      sim.playerId,
    );
    handleMir4Command(
      sim,
      { m: 'redeemTicket', ticketId: 'spirit-ticket-dawn', count: 100 },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'confirmSpirit', pendingId: 'spirit-pending-1-2' }, sim.playerId);
    handleMir4Command(sim, { m: 'confirmAllSpirits' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipSpirit', spiritId: 'spirit-rare-01' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipSpirit', spiritId: null }, sim.playerId);
    handleMir4Command(sim, { m: 'combineSpirits', grade: 4 }, sim.playerId);
    handleMir4Command(sim, { m: 'combineSpirits', grade: 2, all: true }, sim.playerId);
    handleMir4Command(sim, { m: 'confirmMount', pendingId: 'mount-pending-1-2' }, sim.playerId);
    handleMir4Command(sim, { m: 'confirmAllMounts' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipMount', mountId: 'meadow-courser' }, sim.playerId);
    handleMir4Command(sim, { m: 'equipMount', mountId: null }, sim.playerId);
    handleMir4Command(sim, { m: 'combineMounts', grade: 3 }, sim.playerId);
    handleMir4Command(sim, { m: 'combineMounts', grade: 2, all: true }, sim.playerId);
    handleMir4Command(sim, { m: 'campaignProfession' }, sim.playerId);
    handleMir4Command(sim, { m: 'ackTutorial', questId: 'M01-Q01' }, sim.playerId);
    expect(enhance).toHaveBeenCalledOnce();
    expect(roll).toHaveBeenCalledWith(991010101, 'blessing', sim.playerId);
    expect(resolve).toHaveBeenCalledWith(991010101, 'blessing', 'roll-1', false, sim.playerId);
    expect(craft).toHaveBeenNthCalledWith(1, 'lunar-seal', sim.playerId);
    expect(craft).toHaveBeenNthCalledWith(2, 'metal-uncommon', sim.playerId);
    expect(craft).toHaveBeenNthCalledWith(3, 'equipment-991020101', sim.playerId);
    expect(redeem).toHaveBeenCalledWith('mount-ticket-dawn', 1, sim.playerId);
    expect(redeem).toHaveBeenCalledWith('mount-ticket-dawn', 10, sim.playerId);
    expect(redeem).toHaveBeenCalledWith('mount-ticket-dawn', 100, sim.playerId);
    expect(redeem).toHaveBeenCalledWith('spirit-ticket-dawn', 10, sim.playerId);
    expect(redeem).toHaveBeenCalledWith('spirit-ticket-dawn', 100, sim.playerId);
    expect(confirmSpirit).toHaveBeenCalledWith('spirit-pending-1-2', sim.playerId);
    expect(confirmAllSpirits).toHaveBeenCalledWith(sim.playerId);
    expect(equipSpirit).toHaveBeenNthCalledWith(1, 'spirit-rare-01', sim.playerId);
    expect(equipSpirit).toHaveBeenNthCalledWith(2, null, sim.playerId);
    expect(combineSpirits).toHaveBeenNthCalledWith(1, 4, false, sim.playerId);
    expect(combineSpirits).toHaveBeenNthCalledWith(2, 2, true, sim.playerId);
    expect(confirmMount).toHaveBeenCalledWith('mount-pending-1-2', sim.playerId);
    expect(confirmAllMounts).toHaveBeenCalledWith(sim.playerId);
    expect(equipMount).toHaveBeenNthCalledWith(1, 'meadow-courser', sim.playerId);
    expect(equipMount).toHaveBeenNthCalledWith(2, null, sim.playerId);
    expect(combineMounts).toHaveBeenNthCalledWith(1, 3, false, sim.playerId);
    expect(combineMounts).toHaveBeenNthCalledWith(2, 2, true, sim.playerId);
    expect(campaignProfession).toHaveBeenCalledWith(sim.playerId);
    expect(acknowledgeTutorial).toHaveBeenCalledWith('M01-Q01', sim.playerId);

    handleMir4Command(sim, { m: 'enhanceItem', itemId: 1.5 }, sim.playerId);
    handleMir4Command(sim, { m: 'rollLayer', itemId: 991010101, layer: 'other' }, sim.playerId);
    handleMir4Command(
      sim,
      { m: 'resolveLayer', itemId: 991010101, layer: 'blessing', rollId: '', accept: true },
      sim.playerId,
    );
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 'unknown' }, sim.playerId);
    handleMir4Command(sim, { m: 'craftMaterial', recipeId: 1 }, sim.playerId);
    for (const ticketId of ['spirit-ticket-celestial', 'mount-ticket-sunset', '', 1]) {
      handleMir4Command(sim, { m: 'redeemTicket', ticketId }, sim.playerId);
    }
    for (const count of [null, 0, 2, 101, 1.5, '10']) {
      handleMir4Command(
        sim,
        { m: 'redeemTicket', ticketId: 'spirit-ticket-dawn', count },
        sim.playerId,
      );
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
    handleMir4Command(sim, { m: 'combineSpirits', grade: 2, all: 'yes' }, sim.playerId);
    for (const pendingId of ['mount-pending-x-1', '', 1]) {
      handleMir4Command(sim, { m: 'confirmMount', pendingId }, sim.playerId);
    }
    for (const mountId of ['Mount Invalid', '../x', 1]) {
      handleMir4Command(sim, { m: 'equipMount', mountId }, sim.playerId);
    }
    for (const grade of [0, 6, 1.5, '1']) {
      handleMir4Command(sim, { m: 'combineMounts', grade }, sim.playerId);
    }
    handleMir4Command(sim, { m: 'combineMounts', grade: 2, all: 'yes' }, sim.playerId);
    for (const questId of ['M1-Q01', 'M01-S01', '../M01-Q01', 1]) {
      handleMir4Command(sim, { m: 'ackTutorial', questId }, sim.playerId);
    }
    expect(enhance).toHaveBeenCalledTimes(1);
    expect(roll).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(craft).toHaveBeenCalledTimes(3);
    expect(redeem).toHaveBeenCalledTimes(5);
    expect(confirmSpirit).toHaveBeenCalledTimes(1);
    expect(equipSpirit).toHaveBeenCalledTimes(2);
    expect(combineSpirits).toHaveBeenCalledTimes(2);
    expect(confirmMount).toHaveBeenCalledTimes(1);
    expect(equipMount).toHaveBeenCalledTimes(2);
    expect(combineMounts).toHaveBeenCalledTimes(2);
    expect(acknowledgeTutorial).toHaveBeenCalledTimes(1);
  });
});
