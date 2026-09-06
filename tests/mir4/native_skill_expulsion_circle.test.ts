import { describe, expect, it } from 'vitest';
import {
  mir4NativeExpulsionCirclePolicy,
  mir4NativeExpulsionCircleScheduledImpacts,
} from '../../src/sim/mir4/native_skill_expulsion_circle';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Expulsion Circle Policy QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, x: number): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

describe('MIR4 Taoist 3404 Expulsion Circle policy', () => {
  it('pins the extracted action and all four rank packages', () => {
    expect(mir4NativeExpulsionCirclePolicy(1)).toEqual({
      skillId: 3404,
      skillLevel: 1,
      partyBuffAttackId: 340401,
      partyBuffApplyAtMs: 564,
      partyRadiusYards: 15,
      partyHeightYards: 4,
      partyTargetCap: 5,
      baseSpellDefense: 25,
      baseDurationMs: 60_000,
      milestone: null,
      usableWhileSilenced: false,
      cleansesDebilitation: false,
      cleansesSilence: false,
      casterDebilitationResistanceBasisPoints: 0,
      casterSilenceResistanceBasisPoints: 0,
      partyDebilitationResistanceBasisPoints: 0,
      partySilenceResistanceBasisPoints: 0,
      resistanceDurationMs: 0,
    });
    expect(mir4NativeExpulsionCirclePolicy(5)).toMatchObject({
      baseSpellDefense: 45,
      milestone: {
        spellDefense: 50,
        bossDamageReductionBasisPoints: 1_000,
        skillDamageReductionPercentagePoints: 6,
        durationMs: 15_000,
        bossDurationMs: 20_000,
      },
    });
    expect(mir4NativeExpulsionCirclePolicy(8)).toMatchObject({
      baseSpellDefense: 60,
      milestone: {
        spellDefense: 100,
        bossDamageReductionBasisPoints: 1_500,
        skillDamageReductionPercentagePoints: 12,
        durationMs: 20_000,
        bossDurationMs: 30_000,
      },
      usableWhileSilenced: true,
      cleansesDebilitation: true,
      cleansesSilence: true,
      casterDebilitationResistanceBasisPoints: 1_000,
      casterSilenceResistanceBasisPoints: 1_000,
      partyDebilitationResistanceBasisPoints: 2_000,
      partySilenceResistanceBasisPoints: 2_000,
      resistanceDurationMs: 30_000,
    });
    expect(mir4NativeExpulsionCirclePolicy(10)).toMatchObject({
      baseSpellDefense: 70,
      milestone: {
        spellDefense: 150,
        bossDamageReductionBasisPoints: 2_000,
        skillDamageReductionPercentagePoints: 20,
        durationMs: 30_000,
        bossDurationMs: 60_000,
      },
      casterDebilitationResistanceBasisPoints: 5_000,
      casterSilenceResistanceBasisPoints: 7_000,
      partyDebilitationResistanceBasisPoints: 2_500,
      partySilenceResistanceBasisPoints: 3_500,
      resistanceDurationMs: 60_000,
    });
    expect(mir4NativeExpulsionCirclePolicy(15)).toMatchObject({
      skillLevel: 15,
      baseSpellDefense: 95,
      casterDebilitationResistanceBasisPoints: 5_000,
      casterSilenceResistanceBasisPoints: 7_000,
    });
  });

  it('snapshots the caster and four nearest party members inside the 15-yard envelope', () => {
    const sim = makeTaoist(34_041);
    const members = Array.from({ length: 5 }, (_, index) =>
      addPartyMember(sim, `Expulsion ${index}`, index + 1),
    );
    const impacts = mir4NativeExpulsionCircleScheduledImpacts(sim.ctx, sim.player, 8);

    expect(
      impacts.map((impact) => [impact.target.id, impact.dueOffsetMs, impact.nativeSetup]),
    ).toEqual(
      [sim.player, ...members.slice(0, 4)].map((target) => [
        target.id,
        564,
        'taoist-expulsion-circle-party-buffs',
      ]),
    );
    expect(impacts.some((impact) => impact.target.id === members[4]?.id)).toBe(false);
  });
});
