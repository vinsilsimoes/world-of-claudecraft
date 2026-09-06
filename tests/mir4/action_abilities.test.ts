import { afterAll, describe, expect, it } from 'vitest';
import type { Mir4ClassId } from '../../src/sim/content/mir4/classes';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  mir4ActionAbilities,
  mir4ActionBurnTooltipDamage,
  mir4ActionId,
  mir4ActionRawDamage,
  mir4UltimateActionId,
} from '../../src/sim/mir4/action_abilities';
import { grantMir4Xp, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { updateMir4SkillActions } from '../../src/sim/mir4/skill_action_scheduler';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey, SimEvent } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS, TICK_RATE } from '../../src/sim/types';
import { abilityDamageBonus } from '../../src/ui/ability_damage';
import { abilityDisplayDescription, abilityEffectText } from '../../src/ui/ability_description';

function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`missing ${label}`);
  return value;
}

function makeSim(cls: Mir4ClassKey, seed = 901): Sim {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  return new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Action Test',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
}

function spawnTarget(sim: Sim): Entity {
  const player = required(sim.entities.get(sim.playerId), 'player');
  const target = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(player.pos.x + 2, player.pos.z),
  );
  sim.addEntity(target);
  player.targetId = target.id;
  return target;
}

function resolveMir4SkillTimeline(sim: Sim, elapsedSeconds = 3): SimEvent[] {
  sim.time += elapsedSeconds;
  sim.tickCount += Math.ceil(elapsedSeconds * TICK_RATE);
  updateMir4PendingImpacts(sim.ctx);
  updateMir4SkillActions(sim.ctx);
  return sim.drainEvents();
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 skills in the existing ability surface', () => {
  const officialEnglishNames = [
    [
      1,
      [
        [1102, 'Void Slash'],
        [1104, 'Splitting Slash'],
        [1304, 'Body Check'],
        [1401, 'Ground Smash'],
        [1501, 'Gale Slash'],
        [1302, "Lion's Roar"],
        [1301, 'Riposte'],
        [1201, 'Iron Shackle'],
        [1601, 'Crescent Strike'],
        [1101, 'Berserk'],
        [1103, 'Barbaric Charge'],
        [1502, 'Unbreakable Stance'],
      ],
      'Dragon Flame',
    ],
    [
      2,
      [
        [2101, 'Flame Orb'],
        [2111, 'Frost Orb'],
        [2501, 'Dark Vortex'],
        [2301, 'Thunderstorm'],
        [2503, 'Magic Shield'],
        [2203, 'Blizzard'],
        [2303, 'Chain Lightning'],
        [2201, 'Flame Strike'],
        [2502, 'Soul Devour'],
        [2103, 'Immolate'],
        [2204, 'Phoenix Embrace'],
        [2202, 'Frozen Block'],
      ],
      'Dragon Tornado',
    ],
    [
      3,
      [
        [3506, 'Moonlight Wave'],
        [3101, 'Sunbeam Sword'],
        [3301, 'Moonlight Orb'],
        [3104, 'Rain of Blades'],
        [3503, 'Heal'],
        [3103, 'Piercing Blades'],
        [3501, 'Guardian Circle'],
        [3201, 'Tai Chi'],
        [3505, 'Blasting Charm'],
        [3203, 'Soaring Slash'],
        [3404, 'Expulsion Circle'],
        [3504, 'Greater Heal'],
      ],
      'Ray of Light',
    ],
    [
      4,
      [
        [4101, 'Quick Shot'],
        [4106, 'Painstrike Gale'],
        [4102, 'Illusion Arrow'],
        [4103, 'Burst Shell'],
        [4107, 'Flash Arrow'],
        [4108, 'Heavenly Bow'],
        [4111, "Mind's Eye"],
        [4105, 'Ice Cage'],
        [4109, 'Obliterate Shell'],
        [4104, 'Venom Mist Shell'],
        [4110, 'Seeking Bolt'],
        [4112, 'Cloaking'],
      ],
      'Arrow Rain',
    ],
    [
      5,
      [
        [5201, 'Ravaging Blow'],
        [5101, 'Crescent Blade'],
        [5104, 'Nirvana Kick'],
        [5301, 'Double Strike'],
        [5401, 'Sweeping Storm'],
        [5102, 'Dragon Tail'],
        [5103, 'Ascending Dragon'],
        [5303, 'Crushing Blow'],
        [5403, 'Wind Wall'],
        [5205, 'Piercing Spear'],
        [5304, 'Absorption'],
        [5202, 'Blitz Strike'],
      ],
      'Dragon Spear',
    ],
  ] as const;

  it.each(officialEnglishNames)(
    'keeps the official English names for every class %i skill and Ultimate',
    (classId, skills, ultimateName) => {
      for (const [skillId, expectedName] of skills) {
        expect(
          required(
            mir4ActionAbilities(classId, 56, undefined, 204).find(
              (ability) => ability.def.id === mir4ActionId(skillId),
            ),
            `class ${classId} skill ${skillId}`,
          ).def.name,
        ).toBe(expectedName);
      }
      expect(
        required(
          mir4ActionAbilities(classId, 1, undefined, 204).find(
            (ability) => ability.def.id === mir4UltimateActionId(classId),
          ),
          `class ${classId} Ultimate`,
        ).def.name,
      ).toBe(ultimateName);
    },
  );

  const officialClassProgression = [
    [
      1,
      [1102, 1104, 1304, 1401],
      [
        [1501, 5],
        [1302, 8],
        [1301, 16],
        [1201, 24],
        [1601, 32],
        [1101, 40],
        [1103, 48],
        [1502, 56],
      ],
    ],
    [
      2,
      [2101, 2111, 2501, 2301],
      [
        [2503, 5],
        [2203, 8],
        [2303, 16],
        [2201, 24],
        [2502, 32],
        [2103, 40],
        [2204, 48],
        [2202, 56],
      ],
    ],
    [
      3,
      [3506, 3101, 3301, 3104],
      [
        [3503, 5],
        [3103, 8],
        [3501, 16],
        [3201, 24],
        [3505, 32],
        [3203, 40],
        [3404, 48],
        [3504, 56],
      ],
    ],
    [
      4,
      [4101, 4106, 4102, 4103],
      [
        [4107, 5],
        [4108, 8],
        [4111, 16],
        [4105, 24],
        [4109, 32],
        [4104, 40],
        [4110, 48],
        [4112, 56],
      ],
    ],
    [
      5,
      [5201, 5101, 5104, 5301],
      [
        [5401, 5],
        [5102, 8],
        [5103, 16],
        [5303, 24],
        [5403, 32],
        [5205, 40],
        [5304, 48],
        [5202, 56],
      ],
    ],
  ] as const satisfies readonly (readonly [
    Mir4ClassId,
    readonly number[],
    readonly (readonly [number, number])[],
  ])[];

  it('unlocks the Warrior kit at the official MIR4 levels', () => {
    const sim = makeSim('warrior');
    const activeIds = () =>
      sim.known
        .filter(
          (ability) =>
            ability.def.id.startsWith('mir4_skill_') || ability.def.id.startsWith('mir4_ultimate_'),
        )
        .map((ability) => ability.def.id);

    expect(activeIds()).toEqual([
      mir4ActionId(1102),
      mir4ActionId(1104),
      mir4ActionId(1304),
      mir4ActionId(1401),
      mir4UltimateActionId(1),
    ]);
    expect(sim.known.some((ability) => ability.def.id === 'heroic_strike')).toBe(false);
    for (const [level, count] of [
      [4, 5],
      [5, 6],
      [8, 7],
      [16, 8],
      [24, 9],
      [32, 10],
      [40, 11],
      [48, 12],
      [56, 13],
    ] as const) {
      sim.setPlayerLevel(level);
      expect(activeIds(), `warrior level ${level}`).toHaveLength(count);
    }
  });

  it.each(officialClassProgression)(
    'admits class %i skills at the exact original MIR4 levels',
    (classId, initialSkillIds, laterSkills) => {
      expect(
        mir4ActionAbilities(classId, 1, undefined, 204).map((ability) => ability.def.id),
      ).toEqual([...initialSkillIds.map(mir4ActionId), mir4UltimateActionId(classId)]);

      for (const [skillId, level] of laterSkills) {
        const actionId = mir4ActionId(skillId);
        expect(
          mir4ActionAbilities(classId, level - 1, undefined, 204).some(
            (ability) => ability.def.id === actionId,
          ),
          `class ${classId} skill ${skillId} before level ${level}`,
        ).toBe(false);
        expect(
          mir4ActionAbilities(classId, level, undefined, 204).some(
            (ability) => ability.def.id === actionId,
          ),
          `class ${classId} skill ${skillId} at level ${level}`,
        ).toBe(true);
      }
    },
  );

  it('refreshes the offline/headless action kit and reward counter after natural level-ups', () => {
    const sim = makeSim('warrior');
    const meta = sim.players.get(sim.playerId)!;
    sim.drainEvents();

    grantMir4Xp(sim.ctx, 1_000_000, meta);
    const learnedAbilityIds = sim
      .drainEvents()
      .filter((event) => event.type === 'learnAbility')
      .map((event) => event.abilityId);

    expect(sim.player.level).toBeGreaterThanOrEqual(20);
    expect(sim.known.some((ability) => ability.def.id === mir4ActionId(1301))).toBe(true);
    expect(sim.known.some((ability) => ability.def.passive)).toBe(false);
    expect(learnedAbilityIds).toContain(mir4ActionId(1302));
    expect(learnedAbilityIds).toContain(mir4ActionId(1301));
    expect(meta.counters.levelUps).toBe(sim.player.level - 1);
  });

  it('carries the authoritative cost, cooldown key and class range into the shared model', () => {
    const warrior = mir4ActionAbilities(1, 1, undefined, 204);
    const voidStrike = warrior.find((ability) => ability.def.id === mir4ActionId(1102));
    expect(voidStrike).toMatchObject({
      rank: 1,
      cost: 36,
      cooldown: 25,
      cooldownId: '1102',
    });
    expect(voidStrike?.def.range).toBe(6);
    expect(voidStrike?.def.name).toBe('Void Slash');
    expect(voidStrike?.def.description).toContain('$d');
  });

  it('does not synthesize legacy standalone passives for the MIR4 Warrior', () => {
    const warrior = mir4ActionAbilities(1, 120, undefined, 204);

    expect(warrior).toHaveLength(13);
    expect(warrior.some((ability) => ability.def.passive)).toBe(false);
    expect(warrior.some((ability) => ability.def.id.startsWith('mir4_passive_'))).toBe(false);
  });

  it('keeps rank-scaled support tooltips aligned with their live effects', () => {
    const shield = required(
      mir4ActionAbilities(2, 40, { 2503: 15 }, 204).find(
        (ability) => ability.def.id === mir4ActionId(2503),
      ),
      'rank-15 shield',
    );
    const heal = required(
      mir4ActionAbilities(3, 40, { 3503: 15 }, 204).find(
        (ability) => ability.def.id === mir4ActionId(3503),
      ),
      'rank-15 heal',
    );
    const piercingBlades = required(
      mir4ActionAbilities(3, 50, { 3103: 15 }, 204).find(
        (ability) => ability.def.id === mir4ActionId(3103),
      ),
      'rank-15 Piercing Blades',
    );

    expect(shield.def.description).toContain('80%');
    expect(shield.def.description).toContain('100000 damage');
    expect(shield.def.description).toContain('20 hits');
    expect(shield.def.description).toContain('57%');
    expect(heal.def.description).toContain('{healPerPulse}');
    expect(heal.def.description).toContain('40% and 50%');
    expect(heal.def.description).toContain('20% for 60 sec');
    expect(piercingBlades.def.description).toContain('5 sec');
    expect(piercingBlades.def.description).toContain('60% base chance to Stun players');
    expect(piercingBlades.def.description).toContain('20% Boss ATK DMG');
    expect(piercingBlades.def.description).toContain(
      '30% against monsters or 20% against players for 30 sec',
    );
    expect(piercingBlades.def.description).toContain('Chaos and Chill for 16 sec');
  });

  it('describes Body Check control and Burst Shell rank effects using their live mechanics', () => {
    const warrior = required(
      mir4ActionAbilities(1, 90, undefined, 204).find(
        (ability) => ability.def.id === mir4ActionId(1304),
      ),
      'Body Check skill',
    );
    const burstShellRank1 = required(
      mir4ActionAbilities(4, 30, undefined, 204).find(
        (ability) => ability.def.id === mir4ActionId(4103),
      ),
      'rank-1 Burst Shell',
    );
    const burstShellRank10 = required(
      mir4ActionAbilities(4, 30, { 4103: 10 }, 204).find(
        (ability) => ability.def.id === mir4ActionId(4103),
      ),
      'rank-10 Burst Shell',
    );

    expect(warrior.def.description).toContain(
      'Up to 7 other enemies in an 8-yard-long, 5-yard-wide frontal strip take 100% damage. Charges to the target. Knocks each enemy hit down for 3 sec.',
    );
    expect(burstShellRank1.def.description).toContain(
      'Enemies hit lose 50 Physical and Spell Defense for 10 sec.',
    );
    expect(burstShellRank1.def.description).not.toContain('Burn');
    expect(burstShellRank10.def.description).toContain(
      'Enemies hit lose 200 Physical and Spell Defense for 10 sec.',
    );
    expect(burstShellRank10.def.description).toContain(
      'They also burn for 20% of your Physical Attack each second for 10 sec and take 25% more damage, while this skill deals 12% more damage to monsters.',
    );
    for (const action of [warrior, burstShellRank1, burstShellRank10]) {
      expect(action.def.description).toContain(
        'The cooldown shown above is the base cooldown. Skill Cooldown Reduction can lower it by up to 40% in PvE or 30% in PvP.',
      );
    }
  });

  it.each([100, 255])(
    'keeps Flame Orb free of an invented Burn at %i Spell Power',
    (spellPower) => {
      const sim = makeSim('elementalist', 911 + spellPower);
      sim.setPlayerLevel(30);
      const player = required(sim.entities.get(sim.playerId), 'player');
      const target = spawnTarget(sim);
      target.maxHp = 100_000;
      target.hp = target.maxHp;
      player.spellPower = spellPower;
      if (!player.mir4) throw new Error('missing MIR4 player stats');
      player.mir4.accuracy = 10_000;
      player.mir4.critical = 0;
      const action = required(
        sim.known.find((ability) => ability.def.id === mir4ActionId(2101)),
        'Flame Orb action',
      );
      const scaling = {
        attackPower: player.attackPower,
        spellPower: player.spellPower,
        rangedPower: player.rangedPower,
      };

      sim.castAbility(action.def.id);
      resolveMir4SkillTimeline(sim, 2);

      const tooltip = abilityDisplayDescription(
        action,
        abilityEffectText(action, scaling),
        scaling,
      );

      expect(target.mir4Effects?.active.some((effect) => effect.kind === 'burn')).toBe(false);
      expect(mir4ActionBurnTooltipDamage(action.def.id, spellPower)).toBeNull();
      expect(tooltip).not.toContain('Burn');
      expect(tooltip).toContain(
        'The cooldown shown above is the base cooldown. Skill Cooldown Reduction can lower it by up to 40% in PvE or 30% in PvP.',
      );
    },
  );

  it('keeps the MIR4 Burn resolver closed to non-MIR4 and non-Burn actions', () => {
    expect(mir4ActionBurnTooltipDamage('classic_fixture', 100)).toBeNull();
    expect(mir4ActionBurnTooltipDamage(mir4ActionId(1102), 100)).toBeNull();
  });

  it('casts through the ordinary action-bar command and uses the MIR4 cooldown/resource keys', () => {
    const sim = makeSim('warrior');
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const hp = target.hp;
    const mp = player.resource;

    sim.drainEvents();
    sim.castAbility(mir4ActionId(1102));
    const events = sim.drainEvents();

    expect(target.hp).toBe(hp);
    expect(player.resource).toBe(mp - 36);
    expect(player.cooldowns.get('1102')).toBe(25);
    expect(player.cooldowns.has(mir4ActionId(1102))).toBe(false);
    expect(
      (player.mir4PendingImpacts ?? []).filter((impact) => impact.attackKind === 'skill'),
    ).toHaveLength(3);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4AttackStart',
        action: 'skill',
        ability: 'mir4_skill_1102',
        durationMs: 1500,
      }),
    );
    const spellfx = events.find(
      (event) =>
        event.type === 'spellfx' && event.sourceId === player.id && event.targetId === target.id,
    );
    expect(spellfx).toBeDefined();
    expect(spellfx).toMatchObject({
      impactDelayMs: 900,
      attackAnimationStarted: true,
    });
    expect(events.some((event) => event.type === 'damage')).toBe(false);

    const impactEvents = resolveMir4SkillTimeline(sim, 1);
    expect(target.hp).toBeLessThan(hp);
    expect(player.mir4PendingImpacts).toEqual([]);
    const damageEvents = impactEvents.filter(
      (event): event is Extract<SimEvent, { type: 'damage' }> =>
        event.type === 'damage' && event.sourceId === player.id,
    );
    expect(damageEvents).toHaveLength(3);
    expect(damageEvents.every((event) => event.attackAnimationStarted === true)).toBe(true);
  });

  it('marks Frost Orb generic spell VFX as owned by its native presentation', () => {
    const sim = makeSim('elementalist');
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const hp = target.hp;

    sim.drainEvents();
    sim.castAbility(mir4ActionId(2111));
    const events = sim.drainEvents();

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'mir4SkillPresentation',
        skillId: 2111,
        profile: 'sorcerer-frost-orb',
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'spellfx',
        ability: 'frostbolt',
        fx: 'projectile',
        impactDelayMs: 824,
        nativePresentationOwned: true,
      }),
    );
    expect(target.hp).toBe(hp);

    resolveMir4SkillTimeline(sim, 0.823);
    expect(target.hp).toBe(hp);
    resolveMir4SkillTimeline(sim, 0.001);
    expect(target.hp).toBeLessThan(hp);
  });

  it('resolves delayed skill contacts once without repeating them on later ticks', () => {
    const sim = makeSim('warrior');
    const target = spawnTarget(sim);
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const hp = target.hp;

    sim.castAbility(mir4ActionId(1102));
    expect(target.hp).toBe(hp);
    sim.drainEvents();

    const laterEvents = Array.from({ length: 40 }, () => sim.tick()).flat();

    expect(
      laterEvents.filter((event) => event.type === 'damage' && event.ability === 'Corte do Vazio'),
    ).toHaveLength(3);
    expect(target.hp).toBeLessThan(hp);
    expect(
      (sim.player.mir4PendingImpacts ?? []).filter(
        (impact) => impact.attackKind === 'skill' && impact.skillId === 1102,
      ),
    ).toHaveLength(0);
  });

  it('keeps an admitted PvE skill committed after line of sight changes during its windup', () => {
    const sim = makeSim('warrior');
    const target = spawnTarget(sim);
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const hp = target.hp;

    sim.castAbility(mir4ActionId(1102));
    expect(target.hp).toBe(hp);
    sim.ctx.hasLineOfSight = () => false;
    for (let tick = 0; tick < 40; tick++) sim.tick();

    expect(target.hp).toBeLessThan(hp);
  });

  it('drops one cumulative Knowledge Fragment per XP-bearing kill and none from zero-XP mobs', () => {
    const sim = makeSim('warrior');
    const first = spawnTarget(sim);
    first.hp = 1;

    sim.castAbility(mir4ActionId(1102));
    resolveMir4SkillTimeline(sim, 1.3);
    expect(sim.players.get(sim.playerId)?.mir4Materials?.knowledgeFragment).toBe(1);

    sim.player.cooldowns.clear();
    sim.player.gcdRemaining = 0;
    const second = spawnTarget(sim);
    second.hp = 1;
    sim.castAbility(mir4ActionId(1102));
    resolveMir4SkillTimeline(sim, 1.3);
    expect(sim.players.get(sim.playerId)?.mir4Materials?.knowledgeFragment).toBe(2);

    sim.player.cooldowns.clear();
    sim.player.gcdRemaining = 0;
    const zeroXp = spawnTarget(sim);
    zeroXp.templateId = 'knowledge_fragment_zero_xp_fixture';
    zeroXp.hp = 1;
    sim.castAbility(mir4ActionId(1102));
    resolveMir4SkillTimeline(sim, 1.3);

    expect(sim.players.get(sim.playerId)?.mir4Materials?.knowledgeFragment).toBe(2);
  });

  it('rejects classic talents and abilities without corrupting the MIR4 kit or stats', () => {
    const sim = makeSim('warrior');
    sim.setPlayerLevel(20);
    const before = {
      maxHp: sim.player.maxHp,
      known: sim.known.map((ability) => ability.def.id),
    };

    expect(sim.setSpec('arms')).toBe(false);
    sim.castAbility('battle_shout');

    expect(sim.player.maxHp).toBe(before.maxHp);
    expect(sim.known.map((ability) => ability.def.id)).toEqual(before.known);
    expect(sim.player.auras.some((aura) => aura.id === 'battle_shout')).toBe(false);
  });

  it('casts Ultimate through the ordinary action-bar command and spends its gauge', () => {
    const sim = makeSim('warrior');
    sim.setPlayerLevel(50);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    player.mir4UltGauge = 100;
    player.hp = player.maxHp - 1_000;
    const hpBefore = player.hp;
    const dragonFlame = required(
      sim.known.find((ability) => ability.def.id === mir4UltimateActionId(1)),
      'Dragon Flame action',
    );

    sim.castAbility(mir4UltimateActionId(1));

    expect(dragonFlame.def.name).toBe('Dragon Flame');
    expect(dragonFlame.def.description).toContain('over 4 impacts');
    expect(dragonFlame.def.description).not.toContain('Restores');
    expect(player.hp).toBe(hpBefore);
    expect(player.mir4UltGauge).toBe(0);
    expect(player.cooldowns.get('mir4_ult')).toBe(10);
    expect(mir4ActionRawDamage(mir4UltimateActionId(1), 1, 100, 0)).toBe(660);
    expect(target.hp).toBeGreaterThan(0); // authored impacts resolve on their delayed offsets
  });

  it('keeps ordinary Attack independent from the Auto Battle tool', () => {
    const sim = makeSim('warrior');
    const player = sim.entities.get(sim.playerId);
    if (!player) throw new Error('missing player');
    spawnTarget(sim);

    sim.startAutoAttack();
    expect(sim.mir4AutoBattleActive()).toBe(false);
    expect(player.autoAttack).toBe(true);

    sim.setMir4AutoBattle(true);
    sim.stopAutoAttack();
    expect(sim.mir4AutoBattleActive()).toBe(true);
    expect(player.autoAttack).toBe(false);
  });

  it('reports Gale Slash raw total while its landed contacts benefit from the native defense debuff', () => {
    const sim = makeSim('warrior');
    sim.setPlayerLevel(60);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    const action = required(
      sim.known.find((ability) => ability.def.id === mir4ActionId(1501)),
      'Gale Slash action',
    );
    const effect = required(action.effects[0], 'Gale Slash damage');
    if (!player.mir4) throw new Error('missing MIR4 player stats');
    player.attackPower = 1_000;
    player.mir4.accuracy = 0;
    player.mir4.critical = 0;
    player.mir4.skillDamageBps = 0;
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const scaling = {
      attackPower: player.attackPower,
      spellPower: player.spellPower,
      rangedPower: player.rangedPower,
      mir4SkillDamageBps: player.mir4.skillDamageBps,
    };
    const displayedDamage = abilityDamageBonus(action, effect, scaling);
    const hpBefore = target.hp;

    sim.castAbility(mir4ActionId(1501));
    const scheduledRawDamage = (player.mir4PendingImpacts ?? [])
      .filter((impact) => impact.skillId === 1501 && !impact.effectOnly)
      .reduce((total, impact) => total + impact.rawDamage, 0);
    resolveMir4SkillTimeline(sim, 2);

    expect(displayedDamage).toBe(3_800);
    expect(scheduledRawDamage).toBe(displayedDamage);
    expect(hpBefore - target.hp).toBeGreaterThan(displayedDamage);
    expect(abilityEffectText(action, scaling)).toBe('3,800');
    expect(action.def.description).toContain(
      'Strike enemies around you 9 times for $d total damage.',
    );
    expect(
      abilityDisplayDescription(action, abilityEffectText(action, scaling), scaling),
    ).toContain('Strike enemies around you 9 times for 3,800 total damage.');
    expect(
      abilityDisplayDescription(action, abilityEffectText(action, scaling), scaling),
    ).toContain(
      'You are immune to control effects for 2 sec. Each contact reduces the Physical Defense of enemies hit by 25% for 5 sec.',
    );
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({
        kind: 'physical-defense-reduction',
        magnitude: 0.25,
        duration: 5,
      }),
    );
  });

  it('shows the same raw damage formula at different stats and for a hybrid action', () => {
    expect(mir4ActionRawDamage(mir4ActionId(1102), 1, 1000, 0)).toBe(2500);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 1, 1000, 0, 100)).toBe(2525);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 2, 1000, 0)).toBe(2550);
    expect(mir4ActionRawDamage(mir4ActionId(5201), 1, 50, 50)).toBe(137);
    expect(mir4ActionRawDamage(mir4ActionId(5201), 15, 50, 50)).toBeGreaterThan(137);

    const hybrid = required(
      mir4ActionAbilities(5, 1, undefined, 204).find(
        (ability) => ability.def.id === mir4ActionId(5201),
      ),
      'hybrid action',
    );
    const effect = required(hybrid.effects[0], 'hybrid effect');
    expect(
      abilityDamageBonus(hybrid, effect, {
        attackPower: 100,
        spellPower: 200,
        rangedPower: 0,
        mir4SkillDamageBps: 100,
      }),
    ).toBe(440);
    expect(
      abilityEffectText(hybrid, {
        attackPower: 100,
        spellPower: 200,
        rangedPower: 0,
      }),
    ).toBe('439');
  });

  it('keeps the live tooltip equal to combat after STATUS 44 skill-damage scaling', () => {
    const sim = makeSim('warrior', 907);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    const action = required(
      sim.known.find((ability) => ability.def.id === mir4ActionId(1102)),
      'Void Slash action',
    );
    const effect = required(action.effects[0], 'Void Slash damage');
    if (!player.mir4) throw new Error('missing MIR4 player stats');
    player.attackPower = 1_000;
    player.mir4.accuracy = 0;
    player.mir4.critical = 0;
    player.mir4.skillDamageBps = 100;
    target.maxHp = 10_000;
    target.hp = target.maxHp;
    const scaling = {
      attackPower: player.attackPower,
      spellPower: player.spellPower,
      rangedPower: player.rangedPower,
      mir4SkillDamageBps: player.mir4.skillDamageBps,
    };
    const displayedDamage = abilityDamageBonus(action, effect, scaling);
    const hpBefore = target.hp;

    sim.castAbility(mir4ActionId(1102));
    resolveMir4SkillTimeline(sim, 1);

    expect(displayedDamage).toBe(2_525);
    expect(hpBefore - target.hp).toBe(displayedDamage);
    expect(abilityEffectText(action, scaling)).toBe('2,525');
  });

  it('applies STATUS 41 and the regional reduction only to an explicit MIR4 boss', () => {
    const damageAgainst = (boss: boolean): number => {
      const sim = makeSim('warrior', 908);
      sim.setPlayerLevel(10);
      const player = required(sim.entities.get(sim.playerId), 'player');
      const template = {
        ...MIR4_MOBS.mir4_forest_wolf,
        id: boss ? 'mir4_regional_boss' : 'mir4_regular_monster',
        boss,
        elite: !boss,
        mir4BossDamageReductionBps: boss ? 250 : 0,
      };
      const target = createMob(
        sim.nextId++,
        template as never,
        1,
        sim.groundPos(player.pos.x + 2, player.pos.z),
      );
      sim.mir4RuntimeMobTemplates.set(template.id, template as never);
      target.maxHp = 10_000;
      target.hp = target.maxHp;
      sim.addEntity(target);
      player.targetId = target.id;
      player.attackPower = 1_000;
      if (!player.mir4) throw new Error('missing MIR4 player stats');
      player.mir4.accuracy = 10_000;
      player.mir4.critical = 0;
      player.mir4.skillDamageBps = 0;
      const before = target.hp;

      sim.castAbility(mir4ActionId(1102));
      resolveMir4SkillTimeline(sim, 1);

      return before - target.hp;
    };

    expect(damageAgainst(false)).toBe(2_500);
    // The two defensive sources now share the explicit additive reduction
    // bucket before defense, rather than rounding separate hidden factors.
    expect(damageAgainst(true)).toBe(2_444);
  });
});
