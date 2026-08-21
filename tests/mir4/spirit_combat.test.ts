import { describe, expect, it, vi } from 'vitest';

import { resolveMir4PlayerDamageWithSpirit } from '../../src/sim/mir4/spirit_combat';
import { mir4SpiritSpecialSkill } from '../../src/sim/mir4/spirits';
import { Sim } from '../../src/sim/sim';

function harness(spiritId: string, seed = 1_001) {
  const sim = new Sim({
    seed,
    playerClass: 'warrior',
    playerClassMir4: 'warrior',
    playerName: 'Spirit Combat',
    gameProfile: 'mir4-gameplay-port',
  });
  const meta = sim.players.get(sim.playerId)!;
  meta.mir4Spirits = {
    owned: { [spiritId]: 1 },
    discovered: [spiritId],
    equippedSpiritId: spiritId,
  };
  const target = [...sim.entities.values()].find((entity) => entity.kind === 'mob')!;
  target.hp = target.maxHp;
  return { sim, meta, player: sim.player, target };
}

function resolve(h: ReturnType<typeof harness>, allowSpiritProc = true) {
  return resolveMir4PlayerDamageWithSpirit(h.sim.ctx, h.player, h.target, {
    rawDamage: 1_000,
    channel: 'physical',
    attacker: { accuracy: 10_000, critical: 0, criticalOutcome: 10, penetrationBps: 0 },
    defender: { dodge: 0, avoidCritical: 0, physicalDefense: 0 },
    hitRoll: 0,
    criticalRoll: 9_999,
    allowSpiritProc,
  });
}

describe('MIR4 Spirit special skills', () => {
  it('pins the exact grade-derived special skill formulas', () => {
    expect(mir4SpiritSpecialSkill('spirit-common-01')).toMatchObject({
      kind: 'bonus-damage',
      chanceBps: 1_200,
      cooldownMs: 6_550,
      bonusDamageBps: 350,
    });
    expect(mir4SpiritSpecialSkill('spirit-epic-05')).toMatchObject({
      kind: 'armor-rend',
      chanceBps: 1_800,
      cooldownMs: 5_200,
      penetrationBps: 950,
    });
    expect(mir4SpiritSpecialSkill('spirit-mythical-06')).toMatchObject({
      kind: 'critical-focus',
      chanceBps: 2_300,
      cooldownMs: 4_300,
      forceCritical: true,
    });
  });

  it('modifies the same triggering hit and arms the exact cooldown', () => {
    const h = harness('spirit-common-01');
    const next = vi.spyOn(h.sim.rng, 'next').mockReturnValue(0);

    const result = resolve(h);

    expect(result.triggered).toBe(true);
    expect(result.resolved.rawDamage).toBe(1_035);
    expect(h.meta.mir4SpiritSkillReadyAt).toBeCloseTo(h.sim.time + 6.55);
    expect(next).toHaveBeenCalledOnce();
    expect(resolve(h).triggered).toBe(false);
    expect(next).toHaveBeenCalledOnce();
  });

  it('enforces the execute health threshold before drawing proc chance', () => {
    const h = harness('spirit-common-02', 1_002);
    const next = vi.spyOn(h.sim.rng, 'next').mockReturnValue(0);
    h.target.maxHp = 1_000;
    h.target.hp = 310;
    expect(resolve(h).triggered).toBe(false);
    expect(next).not.toHaveBeenCalled();
    h.target.hp = 300;
    expect(resolve(h).resolved.rawDamage).toBe(1_060);
    expect(next).toHaveBeenCalledOnce();
  });

  it('restores health and mana through their exact max-resource effects', () => {
    const life = harness('spirit-common-03', 1_003);
    life.player.hp = Math.floor(life.player.maxHp / 2);
    vi.spyOn(life.sim.rng, 'next').mockReturnValue(0);
    expect(resolve(life).healthRestored).toBe(Math.floor(life.player.maxHp * 0.008));

    const mana = harness('spirit-common-04', 1_004);
    mana.player.resource = 0;
    vi.spyOn(mana.sim.rng, 'next').mockReturnValue(0);
    expect(resolve(mana).manaRestored).toBe(Math.floor(mana.player.maxResource * 0.01));
  });

  it('forces a critical hit even when the player has zero critical chance', () => {
    const h = harness('spirit-epic-06', 1_005);
    vi.spyOn(h.sim.rng, 'next').mockReturnValue(0);
    expect(resolve(h).resolved.critical).toBe(true);
  });

  it('does not attempt a proc on misses or secondary impacts', () => {
    const h = harness('spirit-common-01', 1_006);
    const next = vi.spyOn(h.sim.rng, 'next').mockReturnValue(0);
    expect(resolve(h, false)).toMatchObject({ attempted: false, triggered: false });
    expect(next).not.toHaveBeenCalled();
  });
});
