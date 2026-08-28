import { describe, expect, it, vi } from 'vitest';
import { MIR4_QUESTS_MAIN, MIR4_QUESTS_SIDE } from '../../src/sim/content/mir4/arc_campaign';
import { MIR4_ARC_MOB_IDS } from '../../src/sim/content/mir4/arc_mob_ids';
import {
  MIR4_ARC_NORMAL_XP,
  MIR4_ARC_XP_DIVISORS,
  mir4ArcMobTemplate,
  mir4ArcNormalXp,
} from '../../src/sim/content/mir4/arc_mobs';
import { mir4LevelRow } from '../../src/sim/content/mir4/class_levels';
import {
  MIR4_CLASSES as MIR4_CLASS_CATALOG,
  type Mir4ClassId,
} from '../../src/sim/content/mir4/classes';
import { mir4ItemProgressionRank } from '../../src/sim/content/mir4/item_progression';
import {
  mir4MobAccuracy,
  mir4MobBuildDefenses,
  mir4MobStats,
} from '../../src/sim/content/mir4/mobs';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import { createMob } from '../../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import { encounterTemplate, stageMobSource } from '../../src/sim/mir4/arc_encounters';
import { mir4ArcStageGoal } from '../../src/sim/mir4/arc_quests';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS,
} from '../../src/sim/mir4/arc_stage_kinds';
import {
  MIR4_CAMPAIGN_PACING,
  mir4CampaignBandBalance,
  mir4CampaignEquipmentTarget,
  mir4CampaignProgressionEstimate,
} from '../../src/sim/mir4/campaign_balance';
import { mir4MobAttackPlayer, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4HitChanceBps, mir4ResolveDamage } from '../../src/sim/mir4/math';
import { recalcMir4ProfilePlayerStats } from '../../src/sim/mir4/profile_player';
import { MIR4_LEVEL_COL } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import { addThreat } from '../../src/sim/threat';
import type { Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { EMPTY_TEST_WORLD } from '../sim_shared';

const MIR4_CLASSES: readonly Mir4ClassKey[] = [
  'warrior',
  'elementalist',
  'taoist',
  'arbalist',
  'lancer',
];

function balanceSim(classKey: Mir4ClassKey, level: number, seed = 91_000): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: classKey,
    playerName: `Balance ${classKey}`,
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: EMPTY_TEST_WORLD,
  });
  sim.setPlayerLevel(level);
  return sim;
}

function campaignMobAtLevel(sim: Sim, level: number) {
  const mapIndex = MIR4_WORLD_ARC.findIndex(
    (map) => level >= map.levelMin && level <= map.levelMax,
  );
  const map = MIR4_WORLD_ARC[mapIndex];
  const sourceId = MIR4_ARC_MOB_IDS[mapIndex]?.[0];
  if (!map || !sourceId) throw new Error(`missing campaign monster for level ${level}`);
  const template = mir4ArcMobTemplate(`mir4_${map.mapId}_${sourceId}`);
  if (!template) throw new Error(`missing campaign template for level ${level}`);
  const mob = createMob(
    sim.nextId++,
    template,
    level,
    sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
  );
  sim.addEntity(mob);
  return { map, template, mob };
}

function equipCampaignTarget(sim: Sim, sequence: number): void {
  const target = mir4CampaignBandBalance(sequence).equipment;
  const rank = mir4ItemProgressionRank(target.catalogRank);
  const meta = sim.players.get(sim.playerId);
  const classId = sim.player.mir4?.classId as Mir4ClassId | undefined;
  if (!rank || !meta || !classId) throw new Error(`missing equipment target for map ${sequence}`);
  const items = rank.itemsByClass[classId];
  meta.mir4Equipment = Object.fromEntries(items.map((item) => [item.equipSlot, item.itemId]));
  meta.mir4EquipmentInstances = Object.fromEntries(
    items.map((item) => [
      item.itemId,
      { itemId: item.itemId, enhancement: target.enhancementLevel },
    ]),
  );
  recalcMir4ProfilePlayerStats(MIR4_GAME_PROFILE, sim.player, meta);
  sim.player.hp = sim.player.maxHp;
}

const LATE_GAME_ENCOUNTERS = [
  {
    level: 100,
    sequence: 10,
    normal: ['M10-Q03', 3, 'fen_wisp'] as const,
    veteran: ['M10-S03', 3, 'Vigia Micelial'] as const,
    guardian: ['M10-Q03', 5, 'Reflexo Azul'] as const,
  },
  {
    level: 200,
    sequence: 20,
    normal: ['M20-Q01', 3, 'frost_goblin'] as const,
    veteran: ['M20-S03', 3, 'Regente do Eclipse'] as const,
    guardian: ['M20-Q01', 4, 'Guarda da Bastilha'] as const,
  },
] as const;

describe('MIR4 long-term campaign progression', () => {
  it('keeps the source XP rows while progressively reducing live grind awards', () => {
    expect(MIR4_ARC_NORMAL_XP).toHaveLength(20);
    expect(MIR4_ARC_XP_DIVISORS).toEqual([
      1, 1, 2, 3, 3, 5, 5, 5, 24, 24, 24, 24, 36, 36, 36, 36, 60, 60, 60, 60,
    ]);
    expect(mir4ArcNormalXp(1)).toBe(34);
    expect(mir4ArcNormalXp(3)).toBe(343);
    expect(mir4ArcNormalXp(20)).toBe(401_811_933);
  });

  it('requires years of casual active play to reach level 200', () => {
    const estimate = mir4CampaignProgressionEstimate();
    expect(MIR4_CAMPAIGN_PACING.secondsPerNormalEquivalentKill).toBe(6.5);
    expect(estimate.totalNormalEquivalentKills).toBeGreaterThan(1_000_000);
    expect(estimate.totalActiveHours).toBeGreaterThanOrEqual(1_850);
    expect(estimate.casualYearsAtTwoHoursPerDay).toBeGreaterThanOrEqual(2.5);
    expect(estimate.casualYearsAtTwoHoursPerDay).toBeLessThan(4);
  });

  it('subtracts authored encounter XP from the grind budget exactly once', () => {
    expect(mir4CampaignBandBalance(1)).toMatchObject({
      authoredCombatXp: 1_428n,
      normalEquivalentKills: 199,
    });
    expect(mir4CampaignBandBalance(20)).toMatchObject({
      authoredCombatXp: 73_129_771_806n,
      normalEquivalentKills: 143_819,
    });
  });

  it('matches every chapter budget to the XP paid by live authored templates', () => {
    for (const map of MIR4_WORLD_ARC) {
      const quests = [...MIR4_QUESTS_MAIN, ...MIR4_QUESTS_SIDE].filter(
        (quest) => quest.mapId === map.mapId,
      );
      let expectedXp = 0n;
      for (const quest of quests) {
        for (const [stageIndex, stage] of quest.stages.entries()) {
          if (MIR4_ARC_SHORT_DUNGEON_STAGE_KINDS.has(stage.kind)) {
            const source = stageMobSource(stage, 0);
            const template = source
              ? encounterTemplate(quest.questId, stageIndex, 0, source)
              : null;
            if (!template?.mir4XpReward) throw new Error(`missing dungeon XP for ${quest.questId}`);
            expectedXp += BigInt(template.mir4XpReward * 20);
            continue;
          }
          if (!MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) continue;
          for (let attempt = 0; attempt < mir4ArcStageGoal(stage); attempt += 1) {
            const source = stageMobSource(stage, attempt);
            const template = source
              ? encounterTemplate(quest.questId, stageIndex, attempt, source)
              : null;
            if (!template?.mir4XpReward) {
              throw new Error(`missing encounter XP for ${quest.questId}:${stageIndex}`);
            }
            expectedXp += BigInt(template.mir4XpReward);
          }
        }
      }
      expect(mir4CampaignBandBalance(map.sequence).authoredCombatXp).toBe(expectedXp);
    }
  });

  it('keeps every chapter below its XP requirement without grind', () => {
    for (const map of MIR4_WORLD_ARC) {
      const band = mir4CampaignBandBalance(map.sequence);
      expect(band.mainQuestXp + band.sideQuestXp).toBeLessThan(band.requiredXp);
      expect(band.normalEquivalentKills).toBeGreaterThan(0);
      expect(band.mainQuestCount).toBe(6);
      expect(band.sideQuestCount).toBe(3);
      expect(band.combatStageCount).toBeGreaterThanOrEqual(5);
      expect(band.authoredCombatGoal).toBeGreaterThanOrEqual(5);
      expect(band.interventionStageCount).toBeGreaterThanOrEqual(2);
    }
    expect(MIR4_QUESTS_MAIN).toHaveLength(120);
    expect(MIR4_QUESTS_SIDE).toHaveLength(60);
  });

  it('maps late world gear ranks onto the six class sets plus enhancement', () => {
    expect(mir4CampaignEquipmentTarget(2)).toEqual({ catalogRank: 2, enhancementLevel: 0 });
    expect(mir4CampaignEquipmentTarget(6)).toEqual({ catalogRank: 6, enhancementLevel: 0 });
    expect(mir4CampaignEquipmentTarget(7)).toEqual({ catalogRank: 6, enhancementLevel: 3 });
    expect(mir4CampaignEquipmentTarget(12)).toEqual({ catalogRank: 6, enhancementLevel: 15 });
  });
});

describe('MIR4 monster pressure', () => {
  it.each([1, 10, 50, 100, 150, 200])(
    'keeps an equal-level normal monster dangerous and readable at level %i',
    (level) => {
      const row = mir4LevelRow(1, level);
      if (!row) throw new Error(`missing level row ${level}`);
      const playerHp = Number(row[MIR4_LEVEL_COL.maxHp]);
      const playerDefense = Number(row[MIR4_LEVEL_COL.physicalDefense]);
      const playerDodge = Number(row[MIR4_LEVEL_COL.dodge]);
      const expectedPressure = level <= 10 ? 0.06 : level <= 20 ? 0.08 : 0.1;
      const mob = mir4MobStats(level);
      const hit = mir4ResolveDamage({
        rawDamage: mob.attack,
        attacker: { accuracy: mir4MobAccuracy(level) },
        defender: { physicalDefense: playerDefense, dodge: playerDodge },
        targetKind: 'player',
        forceHit: true,
        forceCritical: false,
      });

      expect(hit.damage / playerHp).toBeGreaterThanOrEqual(expectedPressure - 0.01);
      expect(hit.damage / playerHp).toBeLessThanOrEqual(expectedPressure + 0.01);
      expect(mir4HitChanceBps(mir4MobAccuracy(level), playerDodge)).toBeGreaterThanOrEqual(9_500);
      expect(mob.maxHp).toBeGreaterThan(0);
    },
  );

  it('materializes the same pressure through every real campaign template', () => {
    for (let index = 0; index < MIR4_WORLD_ARC.length; index += 1) {
      const map = MIR4_WORLD_ARC[index];
      if (!map) throw new Error(`missing campaign map ${index + 1}`);
      const sourceId = MIR4_ARC_MOB_IDS[index]?.[0];
      if (!sourceId) throw new Error(`missing mob family for map ${map.sequence}`);
      const template = mir4ArcMobTemplate(`mir4_${map.mapId}_${sourceId}`);
      if (!template) throw new Error(`missing template for map ${map.sequence}`);
      const level = map.levelMax;
      const row = mir4LevelRow(1, level);
      if (!row) throw new Error(`missing level row ${level}`);
      const mob = createMob(1, template, level, { x: 0, y: 0, z: 0 });
      const rawDamage =
        template.dmgBase + template.dmgPerLevel * (level - (template.statAnchorLevel ?? 1));
      const hit = mir4ResolveDamage({
        rawDamage,
        attacker: { accuracy: mir4MobAccuracy(level) },
        defender: {
          physicalDefense: Number(row[MIR4_LEVEL_COL.physicalDefense]),
          dodge: Number(row[MIR4_LEVEL_COL.dodge]),
        },
        targetKind: 'player',
        forceHit: true,
        forceCritical: false,
      });
      const playerHp = Number(row[MIR4_LEVEL_COL.maxHp]);
      const expectedPressure = level <= 10 ? 0.06 : level <= 20 ? 0.08 : 0.1;
      expect(hit.damage / playerHp).toBeGreaterThanOrEqual(expectedPressure - 0.005);
      expect(hit.damage / playerHp).toBeLessThanOrEqual(expectedPressure + 0.005);
      expect(mob.maxHp).toBeGreaterThan(0);
    }
  });

  it.each(MIR4_CLASSES)(
    'uses the real %s basic attack pipeline for readable level-band TTK',
    (classKey) => {
      for (const level of [1, 100, 200]) {
        const sim = balanceSim(classKey, level, 92_000 + level);
        const { mob } = campaignMobAtLevel(sim, level);
        if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
        sim.player.mir4.accuracy = 10_000;
        sim.player.mir4.critical = 0;
        const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0.5);
        let attacks = 0;
        while (!mob.dead && attacks < 24) {
          sim.player.cooldowns.delete('mir4_basic');
          expect(sim.mir4BasicAttack(mob.id)).toEqual({ ok: true });
          for (const impact of sim.player.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
          updateMir4PendingImpacts(sim.ctx);
          attacks += 1;
        }
        next.mockRestore();
        expect(mob.dead).toBe(true);
        expect(attacks).toBeGreaterThanOrEqual(1);
        expect(attacks).toBeLessThanOrEqual(20);
      }
    },
  );

  it.each(MIR4_CLASS_CATALOG.map((mir4Class) => [mir4Class.key, mir4Class.name] as const))(
    'keeps late-game mission pressure playable for the equipped %s',
    (classKey) => {
      for (const scenario of LATE_GAME_ENCOUNTERS) {
        const sim = balanceSim(classKey, scenario.level, 92_500 + scenario.level);
        equipCampaignTarget(sim, scenario.sequence);
        const templates = [scenario.normal, scenario.veteran, scenario.guardian].map(
          ([questId, stageIndex, source]) => {
            const template = encounterTemplate(questId, stageIndex, 0, source);
            if (!template) throw new Error(`missing ${questId}:${stageIndex} encounter`);
            sim.ctx.mir4RuntimeMobTemplates.set(template.id, template);
            return template;
          },
        );
        const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0.5);
        const ratios: number[] = [];
        const mobs = templates.map((template, index) => {
          const mob = createMob(
            sim.nextId++,
            template,
            scenario.level,
            sim.groundPos(sim.player.pos.x + 2 + index, sim.player.pos.z),
          );
          sim.addEntity(mob);
          const beforeHp = sim.player.hp;
          mir4MobAttackPlayer(sim.ctx, mob, sim.player);
          ratios.push((beforeHp - sim.player.hp) / sim.player.maxHp);
          sim.player.hp = sim.player.maxHp;
          return mob;
        });
        const [normalRatio, veteranRatio, guardianRatio] = ratios;
        const normal = mobs[0];
        if (
          normalRatio === undefined ||
          veteranRatio === undefined ||
          guardianRatio === undefined ||
          !normal ||
          !sim.player.mir4
        ) {
          throw new Error(`missing equipped pressure result for ${classKey}`);
        }
        expect(normalRatio).toBeGreaterThanOrEqual(0.04);
        expect(normalRatio).toBeLessThanOrEqual(0.07);
        expect(veteranRatio / normalRatio).toBeGreaterThanOrEqual(1.33);
        expect(veteranRatio / normalRatio).toBeLessThanOrEqual(1.37);
        // Equipment defense is applied after the authored 1.8x raw pressure,
        // so the landed ratio compresses at higher levels while remaining distinct.
        expect(guardianRatio / normalRatio).toBeGreaterThanOrEqual(1.62);
        expect(guardianRatio / normalRatio).toBeLessThanOrEqual(1.75);

        for (const extra of mobs.slice(1)) sim.ctx.dropEntity(extra.id);
        sim.player.mir4.accuracy = 10_000;
        sim.player.mir4.critical = 0;
        let attacks = 0;
        const startedAt = sim.ctx.time;
        for (let tick = 0; !normal.dead && tick < 240; tick += 1) {
          const attack = sim.mir4BasicAttack(normal.id);
          if (attack.ok) attacks += 1;
          else expect(['on-cooldown', 'on-gcd']).toContain(attack.reason);
          sim.tick();
        }
        const killSeconds = sim.ctx.time - startedAt;
        next.mockRestore();
        expect(normal.dead).toBe(true);
        expect(attacks).toBeGreaterThanOrEqual(1);
        expect(attacks).toBeLessThanOrEqual(14);
        expect(killSeconds).toBeGreaterThanOrEqual(0.3);
        expect(killSeconds).toBeLessThanOrEqual(12);
      }
    },
  );

  it.each([1, 10, 20])('pays live map %i XP through the real death funnel', (sequence) => {
    const map = MIR4_WORLD_ARC[sequence - 1];
    if (!map) throw new Error(`missing map ${sequence}`);
    const sim = balanceSim('warrior', map.levelMin, 93_000 + sequence);
    const { mob } = campaignMobAtLevel(sim, map.levelMin);
    const beforeXp = sim.players.get(sim.playerId)?.xp ?? 0;
    sim.dealDamage(sim.player, mob, mob.hp + 1, false, 'physical', null, 'hit');
    expect(mob.dead).toBe(true);
    expect((sim.players.get(sim.playerId)?.xp ?? 0) - beforeXp).toBe(mir4ArcNormalXp(sequence));
  });

  it.each([
    ['normal', 'M03-Q04', 3, 'owlbear_cub', 343],
    ['veteran', 'M03-S03', 3, 'Presa de Casca', 1_715],
    ['guardian', 'M03-Q06', 3, 'dire_wolf_matriarch', 6_860],
  ] as const)(
    'pays %s authored XP through the runtime-template death funnel',
    (_grade, questId, stageIndex, source, expectedXp) => {
      const sim = balanceSim('warrior', 25, 93_500 + stageIndex);
      const template = encounterTemplate(questId, stageIndex, 0, source);
      if (!template) throw new Error(`missing runtime XP template for ${questId}`);
      sim.ctx.mir4RuntimeMobTemplates.set(template.id, template);
      const mob = createMob(
        sim.nextId++,
        template,
        25,
        sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
      );
      sim.addEntity(mob);
      const beforeXp = sim.players.get(sim.playerId)?.xp ?? 0;
      sim.dealDamage(sim.player, mob, mob.hp + 1, false, 'physical', null, 'hit');
      expect((sim.players.get(sim.playerId)?.xp ?? 0) - beforeXp).toBe(expectedXp);
    },
  );

  it('materializes normal, veteran, and guardian pressure through the real mob attack', () => {
    const run = () => {
      const cases = [
        encounterTemplate('M03-Q04', 3, 0, 'owlbear_cub'),
        encounterTemplate('M03-S03', 3, 0, 'Presa de Casca'),
        encounterTemplate('M03-Q06', 3, 0, 'dire_wolf_matriarch'),
      ];
      return cases.map((template, index) => {
        if (!template) throw new Error(`missing grade template ${index}`);
        const sim = balanceSim('warrior', 25, 94_000 + index);
        sim.ctx.mir4RuntimeMobTemplates.set(template.id, template);
        const mob = createMob(
          sim.nextId++,
          template,
          25,
          sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
        );
        sim.addEntity(mob);
        const beforeHp = sim.player.hp;
        const next = vi.spyOn(sim.rng, 'next').mockReturnValue(0.5);
        mir4MobAttackPlayer(sim.ctx, mob, sim.player);
        next.mockRestore();
        return {
          damageRatio: (beforeHp - sim.player.hp) / sim.player.maxHp,
          maxHp: mob.maxHp,
          effectiveHp:
            mob.maxHp *
            (1 +
              mir4MobBuildDefenses(
                mob.level,
                template.family,
                template.boss ? 'guardian' : template.elite ? 'veteran' : 'normal',
              ).physicalDefense /
                100),
          reward: template.mir4XpReward,
        };
      });
    };
    const [normal, veteran, guardian] = run();
    if (!normal || !veteran || !guardian) throw new Error('missing grade result');
    // The live starter set already grants some defense and HP over the naked
    // campaign row. It must provide a real benefit without trivializing the
    // encounter pressure calibrated above.
    expect(normal.damageRatio).toBeGreaterThanOrEqual(0.085);
    expect(normal.damageRatio).toBeLessThanOrEqual(0.105);
    expect(veteran.damageRatio).toBeGreaterThanOrEqual(0.115);
    expect(veteran.damageRatio).toBeLessThanOrEqual(0.14);
    expect(guardian.damageRatio).toBeGreaterThanOrEqual(0.155);
    expect(guardian.damageRatio).toBeLessThanOrEqual(0.185);
    expect(veteran.effectiveHp).toBeGreaterThan(normal.effectiveHp * 2);
    expect(guardian.effectiveHp).toBeGreaterThanOrEqual(normal.effectiveHp * 7);
    expect(veteran.reward).toBe((normal.reward ?? 0) * 5);
    expect(guardian.reward).toBe((normal.reward ?? 0) * 20);
    expect(run()).toEqual(run());
  });

  it('replays seeded mixed-grade enemy swings deterministically through the tick loop', () => {
    const run = () => {
      const sim = balanceSim('warrior', 25, 95_000);
      const templates = [
        encounterTemplate('M03-Q04', 3, 0, 'owlbear_cub'),
        encounterTemplate('M03-S03', 3, 0, 'Presa de Casca'),
        encounterTemplate('M03-Q06', 3, 0, 'dire_wolf_matriarch'),
      ];
      for (const [index, template] of templates.entries()) {
        if (!template) throw new Error(`missing tick grade template ${index}`);
        sim.ctx.mir4RuntimeMobTemplates.set(template.id, template);
        const mob = createMob(
          sim.nextId++,
          template,
          25,
          sim.groundPos(sim.player.pos.x + 1.5 + index * 0.25, sim.player.pos.z),
        );
        mob.aiState = 'chase';
        mob.aggroTargetId = sim.playerId;
        mob.inCombat = true;
        mob.swingTimer = 0;
        addThreat(mob, sim.playerId, 1);
        sim.addEntity(mob);
      }
      const draws = vi.spyOn(sim.rng, 'next');
      for (let tick = 0; tick < 45; tick += 1) sim.tick();
      const result = {
        hp: sim.player.hp,
        maxHp: sim.player.maxHp,
        dead: sim.player.dead,
        draws: draws.mock.results.map((entry) => entry.value),
      };
      draws.mockRestore();
      return result;
    };

    const result = run();
    expect(result.dead).toBe(false);
    expect(result.hp).toBeLessThan(result.maxHp);
    expect(result.draws.length).toBeGreaterThanOrEqual(6);
    expect(run()).toEqual(result);
  });

  it('makes elites and guardians materially harder without one-shotting equal-level players', () => {
    const level = 100;
    const row = mir4LevelRow(1, level);
    if (!row) throw new Error(`missing level row ${level}`);
    const playerHp = Number(row[MIR4_LEVEL_COL.maxHp]);
    const playerDefense = Number(row[MIR4_LEVEL_COL.physicalDefense]);
    const normal = mir4MobStats(level, 'normal');
    const veteran = mir4MobStats(level, 'veteran');
    const guardian = mir4MobStats(level, 'guardian');
    const guardianHit = mir4ResolveDamage({
      rawDamage: guardian.attack,
      attacker: { accuracy: mir4MobAccuracy(level) },
      defender: { physicalDefense: playerDefense },
      targetKind: 'player',
      forceHit: true,
      forceCritical: false,
    });

    const effectiveHp = (hp: number, grade: 'normal' | 'veteran' | 'guardian') =>
      hp * (1 + mir4MobBuildDefenses(level, 'humanoid', grade).physicalDefense / 100);
    expect(effectiveHp(veteran.maxHp, 'veteran')).toBeGreaterThanOrEqual(
      effectiveHp(normal.maxHp, 'normal') * 2,
    );
    expect(effectiveHp(guardian.maxHp, 'guardian')).toBeGreaterThanOrEqual(
      effectiveHp(normal.maxHp, 'normal') * 7,
    );
    expect(veteran.attack).toBeGreaterThan(normal.attack);
    expect(guardian.attack).toBeGreaterThan(veteran.attack);
    expect(guardianHit.damage).toBeLessThan(playerHp * 0.2);
  });
});
