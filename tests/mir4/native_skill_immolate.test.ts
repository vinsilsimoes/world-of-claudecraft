import { describe, expect, it } from 'vitest';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { mir4NativeSkillActionById } from '../../src/sim/content/mir4/native_skill_actions';
import { createMob } from '../../src/sim/entity';
import { castMir4Skill, updateMir4PendingImpacts } from '../../src/sim/mir4/combat';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import {
  mir4NativeImmolatePeriodicBuffMatchesRow,
  mir4NativeRuntimeImmolatePolicy,
} from '../../src/sim/mir4/native_skill_immolate';
import { mir4RuntimeSkillExecutionAuthority } from '../../src/sim/mir4/runtime_skill_execution';
import { Sim } from '../../src/sim/sim';
import type { Entity } from '../../src/sim/types';
import { placePlayerInOpenField } from '../helpers/open_field';
import { EMPTY_TEST_WORLD } from '../sim_shared';

function makeSorcerer(seed: number): Sim {
  const sim = new Sim({
    seed,
    playerClass: 'mage',
    playerClassMir4: 'elementalist',
    playerName: 'Immolate Runtime QA',
    gameProfile: 'mir4-gameplay-port',
    world: EMPTY_TEST_WORLD,
  });
  placePlayerInOpenField(sim);
  sim.setPlayerLevel(120);
  // The extracted skill cost is 7,000 MP. Keep this focused runtime fixture
  // independent from class-level resource tuning.
  sim.player.resource = 100_000;
  sim.player.spellPower = 10_000;
  if (!sim.player.mir4) throw new Error('missing MIR4 player stats');
  sim.player.mir4.accuracy = 10_000;
  sim.player.mir4.critical = 0;
  sim.drainEvents();
  return sim;
}

function spawnTarget(sim: Sim, x: number, suffix: string): Entity {
  const template = {
    ...MIR4_MOBS.mir4_forest_wolf,
    id: `immolate_target_${suffix}`,
    hpBase: 1_000_000,
    hpPerLevel: 0,
    dmgBase: 0,
    dmgPerLevel: 0,
    moveSpeed: 0,
    aggroRadius: 0,
  };
  sim.mir4RuntimeMobTemplates.set(template.id, template);
  const target = createMob(
    sim.nextId++,
    template,
    1,
    sim.groundPos(sim.player.pos.x + x, sim.player.pos.z),
  );
  target.pos.y = sim.player.pos.y;
  target.prevPos = { ...target.pos };
  target.spawnPos = { ...target.pos };
  target.maxHp = 1_000_000;
  target.hp = target.maxHp;
  target.wanderTimer = Number.POSITIVE_INFINITY;
  sim.addEntity(target);
  return target;
}

function forceImmolateHits(sim: Sim): void {
  for (const impact of sim.player.mir4PendingImpacts ?? []) {
    if (impact.skillId !== 2_103) continue;
    impact.forceHit = true;
    impact.forceCritical = false;
  }
}

describe('MIR4 Sorcerer 2103 Immolate', () => {
  it('seals the exact ProductType 4 five-row laser contract', () => {
    const action = mir4NativeSkillActionById(2_103);
    if (!action) throw new Error('missing native 2103 action');

    expect(mir4NativeRuntimeImmolatePolicy(2_103)).toEqual({
      skillId: 2_103,
      productType: 4,
      selectedTargetRequired: true,
      periodicAttackId: 210_302,
      periodicBuffId: 20_012,
    });
    expect(mir4NativeImmolatePeriodicBuffMatchesRow(action.rows[1])).toBe(true);
    expect(mir4NativeImmolatePeriodicBuffMatchesRow(action.rows[0])).toBe(false);
    expect(mir4RuntimeSkillExecutionAuthority(2_103)?.issues).toEqual([]);
    expect(mir4NativeSkillAssetPresentationEvidence(2_103)).toMatchObject({
      skillId: 2_103,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Laser',
        sha256: '9A4599973645C7DB26D067364B776C1B2C0A532C96DDC624A03B8D2360090992',
        sizeBytes: 65_319,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Laser',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
    expect(mir4RuntimeSkillExecutionAuthority(2_103)?.plan?.presentation).toEqual(
      mir4NativeSkillAssetPresentationEvidence(2_103)?.presentation,
    );

    expect(
      mir4RuntimeSkillExecutionAuthority(2_103)?.plan?.rows.flatMap((row) =>
        row.contacts.map((contact) => [
          row.attackId,
          contact.offsetMs,
          contact.damage.coefficient,
          contact.damage.componentImpactCount,
        ]),
      ),
    ).toEqual([
      [210_301, 665, 7_000, 2],
      [210_301, 765, 7_000, 2],
      [210_302, 965, 7_000, 2],
      [210_302, 1_065, 7_000, 2],
      [210_303, 1_315, 8_000, 2],
      [210_303, 1_415, 8_000, 2],
      [210_304, 1_665, 8_000, 2],
      [210_304, 1_765, 8_000, 2],
      [210_305, 2_015, 10_000, 2],
      [210_305, 2_115, 10_000, 2],
    ]);
  });

  it('keeps all ten contacts on the selected target and applies Quell then Fire Flare', () => {
    const sim = makeSorcerer(21_030);
    const nearerDecoy = spawnTarget(sim, 2, 'decoy');
    const selected = spawnTarget(sim, 8, 'selected');
    sim.player.targetId = selected.id;

    expect(castMir4Skill(sim.ctx, sim.playerId, 2_103, selected.id)).toEqual({ ok: true });
    forceImmolateHits(sim);
    expect(
      (sim.player.mir4PendingImpacts ?? []).map((impact) => [
        impact.targetId,
        impact.attackId,
        Math.round((impact.dueAt - sim.time) * 1_000),
        impact.rawDamage,
      ]),
    ).toEqual([
      [selected.id, 210_301, 665, 3_500],
      [selected.id, 210_301, 765, 3_500],
      [selected.id, 210_302, 965, 3_500],
      [selected.id, 210_302, 1_065, 3_500],
      [selected.id, 210_303, 1_315, 4_000],
      [selected.id, 210_303, 1_415, 4_000],
      [selected.id, 210_304, 1_665, 4_000],
      [selected.id, 210_304, 1_765, 4_000],
      [selected.id, 210_305, 2_015, 5_000],
      [selected.id, 210_305, 2_115, 5_000],
    ]);

    sim.time = 0.665;
    updateMir4PendingImpacts(sim.ctx);
    expect(selected.mir4Effects?.active).toContainEqual(
      expect.objectContaining({ effectId: 'mir4_native_buff_30010' }),
    );
    expect(selected.mir4NativePeriodicDamage).toBeUndefined();

    sim.time = 0.965;
    updateMir4PendingImpacts(sim.ctx);
    expect(selected.mir4NativePeriodicDamage).toContainEqual(
      expect.objectContaining({
        buffId: 20_012,
        sourceId: sim.playerId,
        skillId: 2_103,
        attackId: 210_302,
        expiresAt: 5.965,
        entries: [{ buffIndex: 2_004, channel: 'magic', rawDamage: 6_000 }],
      }),
    );

    sim.time = 2.115;
    updateMir4PendingImpacts(sim.ctx);
    expect(nearerDecoy.hp).toBe(nearerDecoy.maxHp);
    expect(selected.hp).toBeLessThan(selected.maxHp);
  });
});
