import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import {
  mir4ActionAbilities,
  mir4ActionId,
  mir4ActionRawDamage,
  mir4UltimateActionId,
} from '../../src/sim/mir4/action_abilities';
import { grantMir4Xp } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';
import { abilityDamageBonus } from '../../src/ui/ability_damage';
import { abilityEffectText } from '../../src/ui/ability_description';
import { isAbilityActionBarEligible } from '../../src/ui/hud/action_bar/hotbar';

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

afterAll(() => setActiveWorldContent(null));

describe('MIR4 skills in the existing ability surface', () => {
  it('replaces the classic Warrior kit with four native skills plus Ultimate', () => {
    for (const cls of ['warrior', 'elementalist', 'taoist', 'arbalist', 'lancer'] as const) {
      const sim = makeSim(cls);
      expect(sim.known).toHaveLength(5);
      expect(
        sim.known.every(
          (ability) =>
            ability.def.id.startsWith('mir4_skill_') || ability.def.id.startsWith('mir4_ultimate_'),
        ),
      ).toBe(true);
      expect(sim.known.some((ability) => ability.def.id === 'heroic_strike')).toBe(false);
      sim.setPlayerLevel(5);
      expect(sim.known).toHaveLength(6);
    }
  });

  it('refreshes the offline/headless action kit and reward counter after natural level-ups', () => {
    const sim = makeSim('warrior');
    const meta = sim.players.get(sim.playerId)!;

    grantMir4Xp(sim.ctx, 1_000_000, meta);

    expect(sim.player.level).toBeGreaterThanOrEqual(20);
    expect(sim.known.some((ability) => ability.def.id === mir4ActionId(1501))).toBe(true);
    expect(sim.known.some((ability) => ability.def.passive)).toBe(true);
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
    expect(voidStrike?.def.range).toBe(4);
    expect(voidStrike?.def.description).toContain('$d');
  });

  it('shows unlocked passives as informational spellbook rows, never bar actions', () => {
    const warrior = mir4ActionAbilities(1, 20, undefined, 204);
    const passive = required(
      warrior.find((ability) => ability.def.id === 'mir4_passive_warrior-heavy-armor'),
      'level-20 passive',
    );

    expect(passive.def).toMatchObject({
      name: 'Heavy Armor',
      learnLevel: 20,
      passive: true,
      description: 'Increases maximum health by 8%.',
    });
    expect(isAbilityActionBarEligible(passive.def)).toBe(false);
    expect(mir4ActionAbilities(1, 19, undefined, 204)).not.toContainEqual(passive);
  });

  it('casts through the ordinary action-bar command and uses the MIR4 cooldown/resource keys', () => {
    const sim = makeSim('warrior');
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    const hp = target.hp;
    const mp = player.resource;

    sim.castAbility(mir4ActionId(1102));

    expect(target.hp).toBeLessThan(hp);
    expect(player.resource).toBe(mp - 36);
    expect(player.cooldowns.get('1102')).toBe(25);
    expect(player.cooldowns.has(mir4ActionId(1102))).toBe(false);
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
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    player.mir4UltGauge = 100;

    sim.castAbility(mir4UltimateActionId(1));

    expect(player.mir4UltGauge).toBe(0);
    expect(player.cooldowns.get('mir4_ult')).toBe(30);
    expect(mir4ActionRawDamage(mir4UltimateActionId(1), 1, 100, 0)).toBe(360);
    expect(target.hp).toBeGreaterThan(0); // authored impacts resolve on their delayed offsets
  });

  it('reuses the fixed Attack slot as the authoritative auto-battle toggle', () => {
    const sim = makeSim('warrior');
    const player = sim.entities.get(sim.playerId);
    if (!player) throw new Error('missing player');

    sim.startAutoAttack();
    expect(sim.mir4AutoBattleActive()).toBe(true);
    expect(player.autoAttack).toBe(true);

    sim.stopAutoAttack();
    expect(sim.mir4AutoBattleActive()).toBe(false);
    expect(player.autoAttack).toBe(false);
  });

  it('lets control-only supplemental actions apply their real effect', () => {
    const sim = makeSim('warrior');
    sim.setPlayerLevel(5);
    const target = spawnTarget(sim);
    sim.castAbility(mir4ActionId(1501));
    expect(target.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ kind: 'slow', magnitude: 0.35, duration: 3.2 }),
    );
  });

  it('shows the same raw damage formula at different stats and for a hybrid action', () => {
    expect(mir4ActionRawDamage(mir4ActionId(1102), 1, 1000, 0)).toBe(2500);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 1, 1000, 0, 100)).toBe(2525);
    expect(mir4ActionRawDamage(mir4ActionId(1102), 2, 1000, 0)).toBe(2550);
    expect(mir4ActionRawDamage(mir4ActionId(5201), 1, 50, 50)).toBe(120);

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
    ).toBe(383);
    expect(abilityEffectText(hybrid, { attackPower: 100, spellPower: 200, rangedPower: 0 })).toBe(
      '380',
    );
  });

  it('keeps the live tooltip equal to combat after STATUS 44 skill-damage scaling', () => {
    const sim = makeSim('warrior', 907);
    const player = required(sim.entities.get(sim.playerId), 'player');
    const target = spawnTarget(sim);
    const action = required(
      sim.known.find((ability) => ability.def.id === mir4ActionId(1102)),
      'Void Strike action',
    );
    const effect = required(action.effects[0], 'Void Strike damage');
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

      return before - target.hp;
    };

    expect(damageAgainst(false)).toBe(2_500);
    expect(damageAgainst(true)).toBe(2_447);
  });
});
