import { describe, expect, it } from 'vitest';
import {
  mir4NativeGuardianCirclePolicy,
  mir4NativeGuardianCircleScheduledImpacts,
} from '../../src/sim/mir4/native_skill_guardian_circle';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeTaoist(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'shaman',
    playerClassMir4: 'taoist',
    playerName: 'Guardian Circle Policy QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  sim.drainEvents();
  return sim;
}

function addPartyMember(sim: Sim, name: string, x: number, hp = 1_000): Entity {
  const memberId = sim.addPlayer('warrior', name);
  const member = sim.entities.get(memberId);
  if (!member) throw new Error(`missing party member ${memberId}`);
  member.pos = sim.groundPos(sim.player.pos.x + x, sim.player.pos.z);
  member.pos.y = sim.player.pos.y;
  member.prevPos = { ...member.pos };
  member.maxHp = 10_000;
  member.hp = hp;
  sim.partyInvite(memberId, sim.playerId);
  sim.partyAccept(memberId);
  return member;
}

describe('MIR4 Taoist 3501 Guardian Circle policy', () => {
  it('pins the extracted base action and rank-scaled party buffs', () => {
    expect(mir4NativeGuardianCirclePolicy(1)).toEqual({
      skillId: 3501,
      skillLevel: 1,
      setupAttackId: 350101,
      setupApplyAtMs: 20,
      damageAttackId: 350102,
      damageApplyAtMs: 400,
      partyBuffAttackId: 350103,
      partyBuffApplyAtMs: 550,
      damageSpellAttackBasisPoints: 6_000,
      damageRadiusYards: 6,
      damageHeightYards: 4,
      damageTargetCap: 5,
      partyRadiusYards: 15,
      partyHeightYards: 4,
      partyTargetCap: 5,
      basePhysicalDefense: 25,
      baseBashDamageReductionBasisPoints: 1_000,
      baseDurationMs: 60_000,
      milestone: null,
      usableWhileStunned: false,
      removesStun: false,
      casterStunResistanceBasisPoints: 0,
      partyStunResistanceBasisPoints: 0,
      stunResistanceDurationMs: 0,
      mpPotionRecoveryBasisPoints: 0,
      mpPotionRecoveryDurationMs: 0,
      lowestHealthAllDamageReductionBasisPoints: 0,
      lowestHealthAllDamageReductionDurationMs: 0,
    });
    expect(mir4NativeGuardianCirclePolicy(5)).toMatchObject({
      damageSpellAttackBasisPoints: 6_400,
      basePhysicalDefense: 45,
      baseBashDamageReductionBasisPoints: 1_800,
      milestone: {
        physicalDefense: 50,
        monsterDamageReductionBasisPoints: 1_000,
        bashDamageReductionBasisPoints: 1_000,
        criticalDamageReductionBasisPoints: 0,
        durationMs: 15_000,
      },
    });
    expect(mir4NativeGuardianCirclePolicy(8)).toMatchObject({
      damageSpellAttackBasisPoints: 6_700,
      basePhysicalDefense: 60,
      baseBashDamageReductionBasisPoints: 2_400,
      milestone: {
        physicalDefense: 100,
        monsterDamageReductionBasisPoints: 1_500,
        bashDamageReductionBasisPoints: 2_000,
        criticalDamageReductionBasisPoints: 1_500,
        durationMs: 20_000,
      },
      usableWhileStunned: true,
      removesStun: true,
      casterStunResistanceBasisPoints: 2_000,
      partyStunResistanceBasisPoints: 2_000,
      stunResistanceDurationMs: 30_000,
      mpPotionRecoveryBasisPoints: 1_000,
      mpPotionRecoveryDurationMs: 20_000,
    });
    expect(mir4NativeGuardianCirclePolicy(10)).toMatchObject({
      damageSpellAttackBasisPoints: 6_900,
      basePhysicalDefense: 70,
      baseBashDamageReductionBasisPoints: 2_800,
      milestone: {
        physicalDefense: 150,
        monsterDamageReductionBasisPoints: 2_000,
        bashDamageReductionBasisPoints: 4_000,
        criticalDamageReductionBasisPoints: 3_000,
        durationMs: 30_000,
      },
      casterStunResistanceBasisPoints: 5_000,
      partyStunResistanceBasisPoints: 2_000,
      stunResistanceDurationMs: 60_000,
      mpPotionRecoveryBasisPoints: 1_500,
      mpPotionRecoveryDurationMs: 30_000,
      lowestHealthAllDamageReductionBasisPoints: 3_000,
      lowestHealthAllDamageReductionDurationMs: 15_000,
    });
    expect(mir4NativeGuardianCirclePolicy(15)).toMatchObject({
      skillLevel: 15,
      damageSpellAttackBasisPoints: 7_400,
      basePhysicalDefense: 95,
      baseBashDamageReductionBasisPoints: 3_800,
      casterStunResistanceBasisPoints: 5_000,
      lowestHealthAllDamageReductionBasisPoints: 3_000,
    });
  });

  it('snapshots five party targets and selects the lowest health ratio at rank 10', () => {
    const sim = makeTaoist(35_011);
    const members = [
      addPartyMember(sim, 'Guardian One', 1, 8_000),
      addPartyMember(sim, 'Guardian Two', 2, 4_000),
      addPartyMember(sim, 'Guardian Three', 3, 2_000),
      addPartyMember(sim, 'Guardian Four', 4, 7_000),
      addPartyMember(sim, 'Guardian Excluded', 5, 100),
    ];
    const [one, two, three, four, excluded] = members;
    if (!one || !two || !three || !four || !excluded) {
      throw new Error('missing Guardian Circle party fixture');
    }
    sim.player.maxHp = 10_000;
    sim.player.hp = 9_000;

    const impacts = mir4NativeGuardianCircleScheduledImpacts(sim.ctx, sim.player, 10);
    const targetsAt550 = impacts
      .filter((impact) => impact.dueOffsetMs === 550)
      .map((impact) => [impact.nativeSetup, impact.target.id]);

    expect(
      impacts
        .filter((impact) => impact.nativeSetup === 'taoist-guardian-circle-stun-removal')
        .map((impact) => impact.target.id),
    ).toEqual([sim.playerId, ...members.slice(0, 4).map((member) => member.id)]);
    expect(targetsAt550).toEqual([
      ['taoist-guardian-circle-party-buffs', sim.playerId],
      ['taoist-guardian-circle-party-buffs', one.id],
      ['taoist-guardian-circle-party-buffs', two.id],
      ['taoist-guardian-circle-party-buffs', three.id],
      ['taoist-guardian-circle-party-buffs', four.id],
      ['taoist-guardian-circle-lowest-health-buff', three.id],
    ]);
    expect(impacts.some((impact) => impact.target.id === excluded.id)).toBe(false);
  });
});
