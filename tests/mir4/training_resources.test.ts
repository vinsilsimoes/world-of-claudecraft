import { describe, expect, it } from 'vitest';
import { GATHER_NODES } from '../../src/sim/content/gather_nodes';
import { MIR4_MOBS } from '../../src/sim/content/mir4/mobs';
import { createMob } from '../../src/sim/entity';
import { MIR4_EMPTY_MATERIALS } from '../../src/sim/mir4/equipment';
import {
  grantMir4GatherProgressionReward,
  grantMir4TrainingCombatMaterial,
  MIR4_DARKSTEEL_MINING_ZONES,
  MIR4_HERBALISM_AREAS,
  MIR4_SOLITUDE_HERBALISM_AREAS,
} from '../../src/sim/mir4/training_resources';
import { Sim } from '../../src/sim/sim';
import { placeAtHarvestSpot } from '../helpers/harvest_spot';

function completeGatherNow(sim: Sim, pid: number): void {
  const entity = sim.entities.get(pid);
  const meta = sim.players.get(pid);
  if (!entity || !meta) throw new Error('missing gather test player');
  entity.castingAbility = null;
  entity.castRemaining = 0;
  sim.ctx.completeGatherCast(entity, meta);
}

describe('MIR4 Training resource loop on WoC world surfaces', () => {
  it('authors distinct herbalism districts instead of one generic herb reward', () => {
    expect(MIR4_HERBALISM_AREAS.map((area) => area.material)).toEqual([
      'herbLeaf',
      'reishi',
      'herbRoot',
      'flowerOil',
      'centuryFruit',
    ]);
    expect(MIR4_HERBALISM_AREAS.map((area) => area.rarity)).toEqual([
      'common',
      'common',
      'uncommon',
      'rare',
      'epic',
    ]);
  });

  it('backs every authored resource district with physical WoC map nodes', () => {
    for (const area of MIR4_HERBALISM_AREAS) {
      for (const zoneId of area.zoneIds) {
        expect(
          GATHER_NODES.some((node) => node.zoneId === zoneId && node.type === 'herb'),
          `${area.id} must contain a physical herb node in ${zoneId}`,
        ).toBe(true);
      }
    }
    for (const area of MIR4_SOLITUDE_HERBALISM_AREAS) {
      for (const zoneId of area.zoneIds) {
        expect(
          GATHER_NODES.some((node) => node.zoneId === zoneId && node.type === 'herb'),
          `Solitude Training district ${zoneId} must contain a physical herb node`,
        ).toBe(true);
      }
    }
    for (const zoneId of MIR4_DARKSTEEL_MINING_ZONES) {
      expect(
        GATHER_NODES.some((node) => node.zoneId === zoneId && node.type === 'ore'),
        `Darksteel district ${zoneId} must contain a physical ore node`,
      ).toBe(true);
    }
  });

  it('credits a Training plant only after a successful native herb harvest', () => {
    const target = { mir4Materials: { ...MIR4_EMPTY_MATERIALS } };
    expect(
      grantMir4GatherProgressionReward(
        target,
        { type: 'herb', zoneId: 'mirefen_marsh' },
        'epic',
        3,
      ),
    ).toEqual({ material: 'reishi', amount: 4, darksteel: 0 });
    expect(target.mir4Materials.reishi).toBe(4);
    expect(target.mir4Materials.herbLeaf).toBe(0);
  });

  it('credits ranked Solitude herbs from the matching physical districts', () => {
    const target = { mir4Materials: { ...MIR4_EMPTY_MATERIALS } };
    grantMir4GatherProgressionReward(
      target,
      { type: 'herb', zoneId: 'nightbloom' },
      'legendary',
      2,
    );
    grantMir4GatherProgressionReward(target, { type: 'herb', zoneId: 'amberfall' }, 'epic', 1);
    expect(target.mir4Materials).toMatchObject({
      noirsoulHerbLegendary: 2,
      flowerOilEpic: 1,
    });
  });

  it('routes a real WoC herb cast into the MIR4 Training wallet', () => {
    const sim = new Sim({
      seed: 73,
      playerClass: 'warrior',
      noPlayer: true,
      gameProfile: 'mir4-gameplay-port',
    });
    const pid = sim.addPlayer('warrior', 'Herbalist');
    sim.addItem('gathering_sickle', 1, pid);
    placeAtHarvestSpot(sim, pid, 'herb_eastbrook_1');

    expect(sim.harvestNode('herb_eastbrook_1', undefined, pid)).toBe(true);
    completeGatherNow(sim, pid);
    expect(sim.players.get(pid)?.mir4Materials?.herbLeaf).toBeGreaterThan(0);
  });

  it('turns ore in authored danger districts into status-scaled Darksteel', () => {
    expect(MIR4_DARKSTEEL_MINING_ZONES).toContain('veiled_hollow');
    const target = {
      mir4Currencies: { darksteel: 5, energy: 7 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS },
    };
    expect(
      grantMir4GatherProgressionReward(
        target,
        { type: 'ore', zoneId: 'veiled_hollow' },
        'rare',
        2,
        { 87: 2_000 },
      ),
    ).toEqual({ amount: 0, darksteel: 960 });
    expect(target.mir4Currencies).toEqual({ darksteel: 965, energy: 7 });
  });

  it('keeps the first Solitude attempt inside a bounded same-zone mining loop', () => {
    const target = {
      mir4Currencies: { darksteel: 0, energy: 0 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS },
    };

    for (let harvest = 0; harvest < 10; harvest += 1) {
      grantMir4GatherProgressionReward(
        target,
        { type: 'ore', zoneId: 'nightbloom' },
        'common',
        1,
      );
    }

    expect(target.mir4Currencies.darksteel).toBe(1_000);
  });

  it('routes a real WoC ore cast in a danger district into Darksteel', () => {
    const sim = new Sim({
      seed: 74,
      playerClass: 'warrior',
      noPlayer: true,
      gameProfile: 'mir4-gameplay-port',
    });
    const pid = sim.addPlayer('warrior', 'Miner');
    const meta = sim.players.get(pid);
    if (!meta) throw new Error('missing miner meta');
    meta.mir4Currencies = { darksteel: 0, energy: 100 };
    sim.addItem('copper_mining_pick', 1, pid);
    placeAtHarvestSpot(sim, pid, 'ore_veiled_hollow_1');

    expect(sim.harvestNode('ore_veiled_hollow_1', undefined, pid)).toBe(true);
    completeGatherNow(sim, pid);
    expect(meta.mir4Currencies.darksteel).toBeGreaterThan(0);
  });

  it('maps monster ecology to deterministic hunting materials for pill crafting', () => {
    const target = { mir4Materials: { ...MIR4_EMPTY_MATERIALS } };
    expect(grantMir4TrainingCombatMaterial(target, { family: 'beast' })).toBe('unihornSlice');
    expect(grantMir4TrainingCombatMaterial(target, { family: 'undead' })).toBe('etherealShard');
    expect(grantMir4TrainingCombatMaterial(target, { family: 'elemental' })).toBe('solarShard');
    expect(grantMir4TrainingCombatMaterial(target, { family: 'humanoid' })).toBe('lunarShard');
    expect(grantMir4TrainingCombatMaterial(target, { family: 'beast', elite: true })).toBe(
      'boundlessShard',
    );
    expect(target.mir4Materials).toMatchObject({
      unihornSlice: 1,
      etherealShard: 1,
      solarShard: 1,
      lunarShard: 1,
      boundlessShard: 1,
      unihornRare: 1,
    });
  });

  it('raises Unihorn rarity with dangerous beast level and rank', () => {
    const target = { mir4Materials: { ...MIR4_EMPTY_MATERIALS } };
    grantMir4TrainingCombatMaterial(target, { family: 'beast', level: 95 });
    grantMir4TrainingCombatMaterial(target, { family: 'dragonkin', boss: true, level: 110 });
    expect(target.mir4Materials).toMatchObject({ unihornEpic: 1, unihornLegendary: 1 });
  });

  it('routes an XP-bearing beast kill through the real damage funnel into the wallet', () => {
    const sim = new Sim({
      seed: 75,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
    });
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('missing hunting test player');
    const beast = createMob(
      sim.nextId++,
      MIR4_MOBS.mir4_forest_wolf as never,
      1,
      sim.groundPos(sim.player.pos.x + 2, sim.player.pos.z),
    );
    sim.addEntity(beast);

    sim.dealDamage(sim.player, beast, beast.hp + 1, false, 'physical', null, 'hit');

    expect(meta.mir4Materials?.unihornSlice).toBe(1);
    expect(meta.mir4Materials?.unihornRare).toBe(1);
  });
});
