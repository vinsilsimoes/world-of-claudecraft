import { afterAll, describe, expect, it } from 'vitest';
import { MIR4_SLICE_WORLD } from '../../src/sim/content/mir4/world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  mir4NativeResolveHitRageGain,
  mir4NativeRuntimeHitRagePolicy,
} from '../../src/sim/mir4/native_skill_rage';
import { updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { Sim } from '../../src/sim/sim';
import { DUNGEON_X_THRESHOLD } from '../../src/sim/data';

function makeDuel(): { sim: Sim; attackerId: number; targetId: number } {
  setActiveWorldContent(MIR4_SLICE_WORLD);
  const sim = new Sim({
    seed: 924,
    noPlayer: true,
    playerClass: 'warrior',
    gameProfile: 'mir4-gameplay-port',
    world: MIR4_SLICE_WORLD,
  });
  const attackerId = sim.addPlayer('warrior', 'Native Hit Rage Attacker');
  const targetId = sim.addPlayer('warrior', 'Native Hit Rage Target');
  const attacker = sim.entities.get(attackerId);
  const target = sim.entities.get(targetId);
  if (!attacker?.mir4 || !target?.mir4) throw new Error('MIR4 duel roster is missing');
  sim.setPlayerLevel(20, attackerId);
  sim.setPlayerLevel(20, targetId);
  attacker.pos = sim.groundPos(DUNGEON_X_THRESHOLD + 100, 1_000);
  attacker.prevPos = { ...attacker.pos };
  target.pos = sim.groundPos(attacker.pos.x + 3, attacker.pos.z);
  target.prevPos = { ...target.pos };
  attacker.mir4.accuracy = 10_000;
  attacker.mir4.critical = 0;
  target.mir4.dodge = 0;
  target.mir4.avoidCritical = 10_000;
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.mir4UltGauge = 0;
  const duel = { a: attackerId, b: targetId, state: 'active' as const, timer: 0 };
  sim.duels.set(attackerId, duel);
  sim.duels.set(targetId, duel);
  return { sim, attackerId, targetId };
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 native HitRagePoint runtime', () => {
  it('preserves the setup row but admits rage only for landed damage contacts', () => {
    expect(mir4NativeRuntimeHitRagePolicy(1102, 110201)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    for (const attackId of [110202, 110203, 110204]) {
      expect(mir4NativeRuntimeHitRagePolicy(1102, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeResolveHitRageGain(1102, attackId)).toEqual({
        nativePoints: 240,
        gaugePercent: 0.24,
      });
    }
    expect(mir4NativeResolveHitRageGain(1102, 110201)).toBeNull();
    expect(mir4NativeRuntimeHitRagePolicy(1103, 110105)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    for (const attackId of [110106, 110107]) {
      expect(mir4NativeRuntimeHitRagePolicy(1103, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeResolveHitRageGain(1103, attackId)).toEqual({
        nativePoints: 240,
        gaugePercent: 0.24,
      });
    }
    expect(mir4NativeRuntimeHitRagePolicy(1104, 110401)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1104, 110402)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: true,
    });
    expect(mir4NativeResolveHitRageGain(1104, 110401)).toBeNull();
    expect(mir4NativeResolveHitRageGain(1104, 110402)).toEqual({
      nativePoints: 240,
      gaugePercent: 0.24,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1304, 130401)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1304, 130402)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: true,
    });
    expect(mir4NativeResolveHitRageGain(1304, 130401)).toBeNull();
    expect(mir4NativeResolveHitRageGain(1304, 130402)).toEqual({
      nativePoints: 240,
      gaugePercent: 0.24,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1401, 140101)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: false,
    });
    expect(mir4NativeRuntimeHitRagePolicy(1401, 140102)).toEqual({
      nativePoints: 240,
      appliesOnLandedPlayerHit: true,
    });
    expect(mir4NativeResolveHitRageGain(1401, 140101)).toBeNull();
    expect(mir4NativeResolveHitRageGain(1401, 140102)).toEqual({
      nativePoints: 240,
      gaugePercent: 0.24,
    });
    for (const attackId of [150101, 150102, 150103, 150104, 150105]) {
      expect(mir4NativeRuntimeHitRagePolicy(1501, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeResolveHitRageGain(1501, attackId)).toEqual({
        nativePoints: 240,
        gaugePercent: 0.24,
      });
    }
    for (const attackId of [310101, 310102, 310103, 310104]) {
      expect(mir4NativeRuntimeHitRagePolicy(3101, attackId)).toEqual({
        nativePoints: 240,
        appliesOnLandedPlayerHit: true,
      });
      expect(mir4NativeResolveHitRageGain(3101, attackId)).toEqual({
        nativePoints: 240,
        gaugePercent: 0.24,
      });
    }
  });

  it('implements the native flat-then-rate formula before converting to the 0..100 gauge', () => {
    expect(
      mir4NativeResolveHitRageGain(1102, 110202, {
        flatAdd: 20,
        flatReduction: 10,
        generalRateAdd: 1_000,
        skillRateAdd: 500,
        skillRateReduction: 250,
      }),
    ).toEqual({
      nativePoints: 281,
      gaugePercent: 0.281,
    });
  });

  it('adds 0.24 gauge to a surviving player for each landed 1102 contact', () => {
    const { sim, attackerId, targetId } = makeDuel();
    const attacker = sim.entities.get(attackerId)!;
    const target = sim.entities.get(targetId)!;

    expect(sim.mir4CastSkill(1102, targetId, attackerId)).toEqual({ ok: true });
    for (const impact of attacker.mir4PendingImpacts ?? []) impact.dueAt = sim.ctx.time;
    updateMir4PendingImpacts(sim.ctx);

    expect(target.mir4UltGauge).toBeCloseTo(0.72, 6);
  });
});
