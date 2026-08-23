import { describe, expect, it } from 'vitest';
import {
  MAX_INPUT_LINE_LENGTH,
  maxLevelForGameProfile,
  parseTalentResetRequest,
  validateAction,
  validateGameProfile,
  validatePlayerClass,
  validatePlayerLevel,
} from '../headless/protocol';
import { gainDoom } from '../src/sim/combat/affliction';
import { addSoulFragments } from '../src/sim/combat/necromancy';
import { buildMir4ArcWorld } from '../src/sim/content/mir4/arc_world';
import { CLASSES, MOBS, QUEST_ORDER } from '../src/sim/data';
import { createMob } from '../src/sim/entity';
import { upgradeMir4Skill } from '../src/sim/mir4/skill_evolution';
import { ACTIONS, applyAction, encodeObs, NUM_ACTIONS, obsSize } from '../src/sim/obs';
import { grantDevotion } from '../src/sim/paladin_devotion';
import { Sim } from '../src/sim/sim';
import type { SimContext } from '../src/sim/sim_context';
import { ALL_CLASSES, type Aura } from '../src/sim/types';

describe('headless environment protocol validation', () => {
  it('accepts only integer action ids from the declared action space', () => {
    expect(validateAction(0)).toBe(0);
    expect(validateAction(NUM_ACTIONS - 1)).toBe(NUM_ACTIONS - 1);
    expect(validateAction(-1)).toBeNull();
    expect(validateAction(NUM_ACTIONS)).toBeNull();
    expect(validateAction(1.5)).toBeNull();
    expect(validateAction('1')).toBeNull();
    expect(validateAction(Number.NaN)).toBeNull();
  });

  it('accepts only the roster declared by the selected game profile', () => {
    // all 9 classes are valid env inputs, not just warrior/mage
    for (const cls of ALL_CLASSES) {
      expect(validatePlayerClass(cls, 'woc-classic')).toBe(cls);
    }
    expect(ALL_CLASSES.length).toBe(9);
    expect(validatePlayerClass('warlock', 'woc-classic')).toBe('warlock');
    for (const cls of ['warrior', 'elementalist', 'taoist', 'arbalist', 'lancer']) {
      expect(validatePlayerClass(cls, 'mir4-gameplay-port')).toBe(cls);
    }
    expect(validatePlayerClass('paladin', 'mir4-gameplay-port')).toBeNull();
    expect(validatePlayerClass('elementalist', 'woc-classic')).toBeNull();
    expect(validatePlayerClass('necromancer')).toBeNull();
    expect(validatePlayerClass('')).toBeNull();
    expect(validatePlayerClass(' warrior')).toBeNull(); // no trimming
    expect(validatePlayerClass(undefined)).toBeNull();
    expect(validatePlayerClass(null)).toBeNull();
    expect(validatePlayerClass(0)).toBeNull();
    expect(validatePlayerClass('Warrior')).toBeNull(); // case-sensitive
  });

  it('accepts the two game profiles, defaults only when absent, and rejects unknown values', () => {
    expect(validateGameProfile(undefined)).toBe('woc-classic');
    expect(validateGameProfile('woc-classic')).toBe('woc-classic');
    expect(validateGameProfile('mir4-gameplay-port')).toBe('mir4-gameplay-port');
    expect(validateGameProfile('mir4')).toBeNull();
    expect(validateGameProfile(1)).toBeNull();
  });

  it('accepts only safe playable starting levels', () => {
    expect(validatePlayerLevel(1)).toBe(1);
    expect(validatePlayerLevel(20)).toBe(20);
    for (const value of [0, 21, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '5', null]) {
      expect(validatePlayerLevel(value)).toBeNull();
    }
    expect(validatePlayerLevel(250, 'mir4-gameplay-port')).toBe(250);
    expect(validatePlayerLevel(251, 'mir4-gameplay-port')).toBeNull();
    expect(maxLevelForGameProfile('woc-classic')).toBe(20);
    expect(maxLevelForGameProfile('mir4-gameplay-port')).toBe(250);
  });

  it('parses one strict canonical talent allocation for a reset', () => {
    const canonical = {
      player_level: 20,
      talents: { spec: 'arms', rows: { 5: 'war_row_double_charge' } },
    };

    expect(parseTalentResetRequest(canonical)).toEqual({
      ok: true,
      playerLevel: 20,
      talents: canonical.talents,
    });
    expect(parseTalentResetRequest({})).toEqual({ ok: true, playerLevel: 1 });
    expect(
      parseTalentResetRequest({ player_level: 250 }, 'mir4-gameplay-port', 'elementalist'),
    ).toEqual({ ok: true, playerLevel: 250 });
    expect(
      parseTalentResetRequest(
        { player_level: 1, talents: canonical.talents },
        'mir4-gameplay-port',
        'elementalist',
      ),
    ).toEqual({ ok: false, error: 'talents are unavailable for mir4-gameplay-port' });
  });

  it('rejects malformed levels and every legacy or dual-model talent reset shape', () => {
    expect(parseTalentResetRequest({ player_level: 1.5 })).toEqual({
      ok: false,
      error: 'invalid player_level: expected integer 1-20',
    });
    for (const talents of [
      { spec: 'arms', ranks: {}, choices: {} },
      { spec: 'arms', rows: {}, rowPicks: [] },
      { spec: 'arms', rows: {}, unknown: true },
      undefined,
    ]) {
      expect(parseTalentResetRequest({ talents })).toEqual({
        ok: false,
        error: 'invalid talents: expected canonical spec/rows allocation',
      });
    }
  });

  it('builds an identical-shape, full-size, finite observation for every class', () => {
    // Loop ALL_CLASSES (not a hardcoded subset) so all 9 obs vectors are guarded
    // and a 10th class would self-extend the check. The obs space is content-scaled
    // and class-agnostic (ability slots pad to the largest kit), so every class
    // yields the same-length vector as the advertised obsSize(): switching
    // player_class never silently changes a trained config's obs shape.
    const sizes = new Set<number>();
    for (const cls of ALL_CLASSES) {
      const obs = encodeObs(new Sim({ seed: 7, playerClass: cls, autoEquip: true }));
      expect(obs.every((v) => Number.isFinite(v))).toBe(true);
      // every value stays inside the Python Gym observation_space Box(-2, 2)
      // (python/wow_env.py), so the cross-language obs contract holds for all 9 classes
      expect(obs.every((v) => v >= -2 && v <= 2)).toBe(true);
      sizes.add(obs.length);
    }
    // a single distinct length across all 9 classes, equal to the advertised
    // obsSize(): a trained config's obs vector shape is identical for every class.
    expect(sizes).toEqual(new Set([obsSize()]));
  });

  it('projects MIR4 cooldowns, level cap, XP and campaign progress into the stable observation shape', () => {
    // Observation normalization still verifies the explicit 20-map campaign
    // scaffold; the production default intentionally contains authored maps only.
    const world = buildMir4ArcWorld(20);
    const sim = new Sim({
      seed: 19,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      playerName: 'Headless MIR4',
      gameProfile: 'mir4-gameplay-port',
      world,
    });
    sim.setPlayerLevel(250);
    const slot = sim.known.findIndex((ability) => ability.cooldownId === '1102');
    expect(slot).toBeGreaterThanOrEqual(0);
    sim.player.cooldowns.set('1102', 5);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) throw new Error('missing headless MIR4 player metadata');
    meta.mir4ArcQuests = {
      'M01-Q01': {
        questId: 'M01-Q01',
        stageIndex: 2,
        stageProgress: 1,
        state: 'active',
      },
    };

    const obs = encodeObs(sim);
    const readyIndex = 16 + slot * 2;
    const questStart = obsSize() - 7 - QUEST_ORDER.length * 2;
    expect(obs).toHaveLength(obsSize());
    expect(obs[2]).toBe(1);
    expect(obs[3]).toBe(1);
    expect(obs[readyIndex]).toBe(0);
    expect(obs[readyIndex + 1]).toBeGreaterThan(0);
    expect(obs[questStart]).toBe(0.33);
    expect(obs[questStart + 1]).toBeGreaterThan(0);

    sim.player.pos.x = world.zones[12]!.hub.x;
    sim.player.pos.z = world.zones[12]!.hub.z;
    const earlyLateGame = encodeObs(sim)[5];
    sim.player.pos.x = world.zones[15]!.hub.x;
    sim.player.pos.z = world.zones[15]!.hub.z;
    const midLateGame = encodeObs(sim)[5];
    sim.player.pos.x = world.zones[19]!.hub.x;
    sim.player.pos.z = world.zones[19]!.hub.z;
    const finalMap = encodeObs(sim)[5];
    expect(earlyLateGame).toBeLessThan(midLateGame);
    expect(midLateGame).toBeLessThan(finalMap);
    expect(finalMap).toBeLessThanOrEqual(1);
  });

  it('claims and observes MIR4 achievements and the port progression bonus through stable RL actions', () => {
    const sim = new Sim({
      seed: 23,
      playerClass: 'warrior',
      playerClassMir4: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      world: buildMir4ArcWorld(),
    });
    sim.setPlayerLevel(10);
    const meta = sim.players.get(sim.playerId);
    expect(meta).toBeDefined();
    if (!meta) throw new Error('missing headless MIR4 player metadata');
    meta.copper = 900;
    const claimGrade1 = ACTIONS.indexOf('claim_achievement_20101');
    const claimGrade2 = ACTIONS.indexOf('claim_achievement_20102');
    expect(claimGrade1).toBeGreaterThanOrEqual(0);
    expect(claimGrade2).toBeGreaterThan(claimGrade1);

    applyAction(sim, claimGrade2);
    expect(sim.players.get(sim.playerId)?.mir4AchievementClears).toBeUndefined();

    applyAction(sim, claimGrade1);
    applyAction(sim, claimGrade1);
    applyAction(sim, claimGrade2);
    expect(meta.mir4AchievementClears).toEqual({ 201: 2 });
    expect(meta.copper).toBe(3_200);
    expect(meta.mir4Currencies).toEqual({ darksteel: 1_000 });
    expect(meta.mir4SkillResources).toEqual({ effectPoints: 500, skillTomes: 3 });

    const claimedObs = encodeObs(sim);
    const achievementObs = claimedObs.slice(-7, -4);
    expect(achievementObs).toEqual([1, 1, 1]);
    expect(claimedObs.at(-1)).toBe(1);

    expect(upgradeMir4Skill(sim.ctx, sim.playerId, 1102, 1).ok).toBe(true);
    expect(encodeObs(sim).at(-1)).toBe(0);
  });

  it('sizes the action space to the largest class kit so every class is castable', () => {
    // The action space is a module constant with no class input, so num_actions is
    // identical for every player_class. Its ability slots are sized to the largest
    // class kit, so no class's learnable abilities fall outside ACTIONS: a trained
    // policy's action head stays valid across all 9 classes.
    const abilitySlots = ACTIONS.filter((a) => a.startsWith('ability_')).length;
    const maxKit = Math.max(...ALL_CLASSES.map((cls) => CLASSES[cls].abilities.length));
    expect(abilitySlots).toBe(maxKit);
    for (const cls of ALL_CLASSES) {
      expect(CLASSES[cls].abilities.length).toBeLessThanOrEqual(abilitySlots);
    }
    // 15 fixed actions (10 move/target + interact/stop/eat_drink + 2 MIR4 claims)
    // plus the ability slots.
    expect(NUM_ACTIONS).toBe(15 + abilitySlots);
  });

  it('observes Devotion, Ascension, and the real Divine Ascension readiness gate', () => {
    const sim = new Sim({ seed: 17, playerClass: 'paladin', autoEquip: true });
    sim.setPlayerLevel(20);
    expect(sim.setSpec('retribution')).toBe(true);
    const slot = sim.known.findIndex((known) => known.def.id === 'divine_ascension');
    expect(slot).toBeGreaterThanOrEqual(0);
    const readyIndex = 16 + slot * 2;

    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim).slice(-4, -1)).toEqual([0, 0, 0]);

    grantDevotion(sim.player, 20);
    expect(encodeObs(sim)[readyIndex]).toBe(1);
    expect(encodeObs(sim).slice(-4, -1)).toEqual([1, 0, 0]);

    sim.castAbility('divine_ascension');
    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim).slice(-4, -1)).toEqual([0, 1, 1]);

    const warrior = new Sim({ seed: 18, playerClass: 'warrior', autoEquip: true });
    expect(encodeObs(warrior).slice(-4, -1)).toEqual([0, 0, 0]);
  });

  it('marks a Necromancy spender ready only when enough Soul Fragments exist', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warlock', autoEquip: true });
    sim.setPlayerLevel(20);
    sim.setSpec('demonology');
    sim.player.resource = sim.player.maxResource;
    const slot = sim.known.findIndex((ability) => ability.def.id === 'raise_bone_mage');
    if (slot < 0) throw new Error('Expected Raise Bone Mage');
    const readyIndex = 16 + slot * 2;

    expect(encodeObs(sim)[readyIndex]).toBe(0);
    addSoulFragments(sim as unknown as SimContext, sim.player, 2);
    expect(encodeObs(sim)[readyIndex]).toBe(1);
  });

  it('marks Dominion summons ready only when the requested archetype fits the live composition', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warlock', autoEquip: true });
    sim.setPlayerLevel(20);
    sim.setSpec('demonology');
    sim.player.resource = sim.player.maxResource;
    addSoulFragments(sim as unknown as SimContext, sim.player, 5);
    const readiness = (abilityId: string): number => {
      const slot = sim.known.findIndex((ability) => ability.def.id === abilityId);
      if (slot < 0) throw new Error(`Expected ${abilityId}`);
      return encodeObs(sim)[16 + slot * 2];
    };

    expect(readiness('raise_skeletal_warrior')).toBe(1);
    sim.castAbility('raise_skeletal_warrior');
    while (sim.player.castingAbility) sim.tick();
    sim.player.gcdRemaining = 0;
    expect(readiness('raise_skeletal_warrior')).toBe(0);
    expect(readiness('raise_bone_mage')).toBe(1);
    expect(readiness('raise_gravewing')).toBe(1);

    sim.castAbility('raise_bone_mage');
    while (sim.player.castingAbility) sim.tick();
    sim.player.gcdRemaining = 0;
    expect(readiness('raise_skeletal_warrior')).toBe(0);
    expect(readiness('raise_bone_mage')).toBe(0);
    expect(readiness('raise_gravewing')).toBe(0);
  });

  it('exposes the exact specialization resource in the shared secondary-resource scalar', () => {
    const affliction = new Sim({ seed: 7, playerClass: 'warlock', autoEquip: true });
    affliction.setPlayerLevel(20);
    affliction.setSpec('affliction');
    gainDoom(affliction as unknown as SimContext, affliction.player, 37);
    expect(encodeObs(affliction)[13]).toBeCloseTo(0.37);

    const necromancy = new Sim({ seed: 8, playerClass: 'warlock', autoEquip: true });
    necromancy.setPlayerLevel(20);
    necromancy.setSpec('demonology');
    addSoulFragments(necromancy as unknown as SimContext, necromancy.player, 3);
    expect(encodeObs(necromancy)[13]).toBeCloseTo(0.6);
  });

  it('marks Sentence, Possess, and Hour ready only on the owned primary Evil Eye', () => {
    const sim = new Sim({ seed: 7, playerClass: 'warlock', autoEquip: true });
    sim.setPlayerLevel(20);
    sim.setSpec('affliction');
    sim.player.resource = sim.player.maxResource;
    const target = createMob(99_001, MOBS.ridge_stalker, 20, {
      x: sim.player.pos.x,
      y: sim.player.pos.y,
      z: sim.player.pos.z + 5,
    });
    sim.addEntity(target);
    sim.targetEntity(target.id);
    const slot = sim.known.findIndex((ability) => ability.def.id === 'sentence');
    if (slot < 0) throw new Error('Expected Sentence');
    const readyIndex = 16 + slot * 2;
    const possessSlot = sim.known.findIndex((ability) => ability.def.id === 'possess_evil_eye');
    if (possessSlot < 0) throw new Error('Expected Possess the Evil Eye');
    const possessReadyIndex = 16 + possessSlot * 2;
    const hourSlot = sim.known.findIndex((ability) => ability.def.id === 'hour_of_judgment');
    if (hourSlot < 0) throw new Error('Expected Hour of Judgment');
    const hourReadyIndex = 16 + hourSlot * 2;

    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim)[possessReadyIndex]).toBe(0);
    expect(encodeObs(sim)[hourReadyIndex]).toBe(0);
    gainDoom(sim as unknown as SimContext, sim.player, 20);
    expect(encodeObs(sim)[readyIndex]).toBe(0);
    const eye: Aura = {
      id: 'evil_eye',
      name: 'Evil Eye',
      kind: 'affliction_eye_secondary',
      remaining: 3600,
      duration: 3600,
      value: 1,
      sourceId: sim.playerId,
      school: 'shadow',
    };
    target.auras.push(eye);
    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim)[possessReadyIndex]).toBe(0);
    expect(encodeObs(sim)[hourReadyIndex]).toBe(0);

    eye.kind = 'affliction_eye';
    expect(encodeObs(sim)[readyIndex]).toBe(1);
    expect(encodeObs(sim)[possessReadyIndex]).toBe(1);
    expect(encodeObs(sim)[hourReadyIndex]).toBe(1);

    eye.sourceId = sim.playerId + 1;
    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim)[possessReadyIndex]).toBe(0);
    expect(encodeObs(sim)[hourReadyIndex]).toBe(0);
  });

  it('reports a Forbidden Reflection copy as ready despite the original cooldown', () => {
    const sim = new Sim({ seed: 9, playerClass: 'warlock', autoEquip: true });
    sim.setPlayerLevel(20);
    sim.player.resource = sim.player.maxResource;
    const slot = sim.known.findIndex((ability) => ability.def.id === 'umbral_anchor');
    if (slot < 0) throw new Error('Expected Umbral Anchor');
    const readyIndex = 16 + slot * 2;
    const cooldownIndex = readyIndex + 1;
    sim.player.cooldowns.set('umbral_anchor', 20);

    expect(encodeObs(sim)[readyIndex]).toBe(0);
    expect(encodeObs(sim)[cooldownIndex]).toBeGreaterThan(0);

    sim.player.auras.push({
      id: 'wlk_forbidden_reflection',
      name: 'Forbidden Reflection',
      kind: 'internal_cd',
      remaining: 10,
      duration: 10,
      value: 0,
      sourceId: sim.player.id,
      school: 'shadow',
      empowerAbilities: ['umbral_anchor'],
    });

    expect(encodeObs(sim)[readyIndex]).toBe(1);
    expect(encodeObs(sim)[cooldownIndex]).toBe(0);
  });

  it('keeps the stdin line cap at one mebibyte', () => {
    expect(MAX_INPUT_LINE_LENGTH).toBe(1024 * 1024);
  });
});
