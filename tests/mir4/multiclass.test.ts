import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { mir4ShellClassFor } from '../../src/sim/mir4/stats';
import { Sim } from '../../src/sim/sim';
import type { Entity, Mir4ClassKey } from '../../src/sim/types';
import { PLAYER_INTEREST_DROP_RADIUS } from '../../src/sim/types';

// Phase 3.3 (decision D1): the four mir4-only class keys host on the warrior
// SHELL through every classic derivation, with the true identity on
// Entity.mir4.classId, their own level-table stats, their own basic spec and
// kit, and the classic tables/roster untouched.

function makeClassSim(cls: Mir4ClassKey, seed = 81): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: cls,
    playerName: 'Teste',
    gameProfile: 'mir4-gameplay-port',
    idleMobTickRadius: PLAYER_INTEREST_DROP_RADIUS,
    world: MIR4_SLICE_WORLD,
  });
  sim.mir4UnequipSlot(1);
  sim.mir4UnequipSlot(5);
  return sim;
}

function spawnWolf(sim: Sim): Entity {
  const p = sim.entities.get(sim.playerId)!;
  const wolf = createMob(
    sim.nextId++,
    MIR4_MOBS.mir4_forest_wolf as never,
    1,
    sim.groundPos(p.pos.x + 2, p.pos.z),
  );
  sim.addEntity(wolf);
  return wolf;
}

afterAll(() => {
  setActiveWorldContent(null);
});

describe('D1: hosting the mir4 roster', () => {
  it('every key maps to its classId; classic keys pass through; classic profile fails closed', () => {
    expect(mir4ShellClassFor('taoist', 'mir4-gameplay-port')).toBe('warrior');
    expect(mir4ShellClassFor('mage', 'mir4-gameplay-port')).toBe('mage');
    expect(() => mir4ShellClassFor('taoist', 'woc-classic')).toThrow();
  });

  it('the taoist derives from its own table row and casts its own kit', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const sim = makeClassSim('taoist');
    const p = sim.entities.get(sim.playerId)!;
    expect(p.mir4?.classId).toBe(3);
    expect(p.templateId).toBe('warrior'); // the shell
    expect(p.maxHp).toBe(4000);
    expect(p.attackPower).toBe(50); // taoist L1: PA 50 AND MA 50
    expect(p.spellPower).toBe(50);
    const wolf = spawnWolf(sim);
    const hp = wolf.hp;
    expect(sim.mir4CastSkill(3101, wolf.id)).toEqual({ ok: true });
    expect(hp - wolf.hp).toBe(97); // the row-total-impact-vector split
    expect(sim.mir4CastSkill(1102, wolf.id)).toEqual({ ok: false, reason: 'wrong-class' });
    // The taoist basic (4600): floor(50*4600/10000) = 23 at its offset.
    expect(sim.mir4BasicAttack(wolf.id)).toEqual({ ok: true });
    expect(wolf.hp).toBe(hp - 97); // scheduled, lands after the offset
    for (let t = 0; t < 9; t++) sim.tick();
    expect(
      wolf.mir4Effects?.active.some((f) => f.kind === 'defense-break' && f.magnitude === 0.1),
    ).toBe(true);
    expect(wolf.hp).toBe(hp - 97 - 25); // 3101's own +10% taken buffs the basic: floor(23*1.1)=25
  });

  it('the arbalist and lancer derive their rows and basics', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const arb = makeClassSim('arbalist', 82);
    const ap = arb.entities.get(arb.playerId)!;
    expect(ap.mir4?.classId).toBe(4);
    expect(ap.spellPower).toBe(0); // arbalist L1: PA 50, MA 0
    const lan = makeClassSim('lancer', 83);
    const lp = lan.entities.get(lan.playerId)!;
    expect(lp.mir4?.classId).toBe(5);
    expect(lp.spellPower).toBe(50); // lancer L1: PA 50 AND MA 50
    expect(lp.maxResource).toBe(600);
  });

  it('the classic roster and profile stay untouched', () => {
    setActiveWorldContent(MIR4_SLICE_WORLD);
    const classic = new Sim({ seed: 5, playerClass: 'mage', playerName: 'C' });
    const cp = classic.entities.get(classic.playerId)!;
    expect(cp.mir4).toBeUndefined();
    expect(cp.resourceType).toBe('mana');
  });
});

describe('MIR4 resurrection profile', () => {
  it.each(['warrior', 'elementalist', 'taoist', 'arbalist', 'lancer'] as const)(
    'preserves the %s class pools when the shared revive funnel raises the player',
    (cls) => {
      const sim = makeClassSim(cls);
      const player = sim.player;
      const maxHp = player.maxHp;
      const maxResource = player.maxResource;

      player.dead = true;
      player.hp = 0;
      player.resource = 0;
      sim.releaseSpirit();

      expect(player.maxHp).toBe(maxHp);
      expect(player.maxResource).toBe(maxResource);

      sim.revivePlayerAt(player.id, player.pos, 0.5);

      expect(player.dead).toBe(false);
      expect(player.maxHp).toBe(maxHp);
      expect(player.maxResource).toBe(maxResource);
      expect(player.hp).toBe(Math.max(1, Math.round(maxHp * 0.5)));
      expect(player.resource).toBe(Math.round(maxResource * 0.5));
    },
  );
});
