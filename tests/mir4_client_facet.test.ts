import { describe, expect, it } from 'vitest';
import { Mir4ClientFacet, Mir4ClientWorldBase } from '../src/net/mir4_client_facet';
import { createPlayer } from '../src/sim/entity';
import type { ClientCommand } from '../src/world_api';

describe('MIR4 online client facet', () => {
  it('lazily restores the facet for constructor-free ClientWorld fixtures', () => {
    class ConstructorFreeWorld extends Mir4ClientWorldBase {
      protected sendMir4Command(): void {}
      protected async sendMir4CommandWithOutcome(): Promise<boolean> {
        return false;
      }
    }

    const world = Object.create(ConstructorFreeWorld.prototype) as ConstructorFreeWorld;
    expect(world.mir4PlayerState()).toBeNull();
    expect(world.mir4AutoBattleActive()).toBe(false);
  });

  it('keeps reads authoritative while forwarding commands through the shared envelope', () => {
    const sent: Array<{ cmd: ClientCommand } & Record<string, unknown>> = [];
    const outcomes: Array<{ cmd: ClientCommand } & Record<string, unknown>> = [];
    const facet = new Mir4ClientFacet(
      (payload) => sent.push(payload),
      async (payload) => {
        outcomes.push(payload);
        return true;
      },
    );
    facet.setMir4AutoBattle(true);
    facet.setMir4AutoQuest(true, 'M08-S01');
    facet.mir4SkipNarrativeDialogue('M01-Q01:accept:-1:17');
    facet.mir4CastSkill(2101, 17);
    facet.mir4BasicAttack(18);
    facet.mir4EquipStarterWeapon();
    facet.mir4UnequipWeapon();
    facet.mir4EquipItem(991010101);
    facet.mir4UpgradeSkill(2101, 1);
    expect(facet.mir4ClaimAchievement(20101)).resolves.toBe(true);

    expect(sent).toEqual([
      { cmd: 'mir4', m: 'auto', on: true },
      { cmd: 'mir4', m: 'quest', on: true, questId: 'M08-S01' },
      { cmd: 'mir4', m: 'skipDialogue', dialogueId: 'M01-Q01:accept:-1:17' },
      { cmd: 'mir4', m: 'cast', skill: 2101, target: 17 },
      { cmd: 'mir4', m: 'basic', target: 18 },
      { cmd: 'mir4', m: 'equip' },
      { cmd: 'mir4', m: 'unequip' },
      { cmd: 'mir4', m: 'equipItem', itemId: 991010101 },
      { cmd: 'mir4', m: 'upgradeSkill', skillId: 2101, expectedCurrentLevel: 1 },
    ]);
    expect(facet.mir4AutoBattleActive()).toBe(false);
    expect(outcomes).toEqual([{ cmd: 'mir4', m: 'claimAchievement', achievementId: 20101 }]);

    const player = createPlayer(1, 'warrior', { x: 0, y: 0, z: 0 }, 'Elyra');
    facet.applySnapshot(
      {
        classId: 2,
        ultimateGauge: 73,
        autoBattle: {
          mode: 'battle',
          anchorX: 0,
          anchorZ: 0,
          acquireRadiusYards: 36,
          suspended: false,
        },
      },
      player,
    );

    expect(facet.mir4AutoBattleActive()).toBe(true);
    expect(facet.mir4PlayerState()).toMatchObject({ classId: 2, ultimateGauge: 73 });
    expect(player.mir4UltGauge).toBe(73);
    expect(facet.actionAbilities('mir4-gameplay-port', 1)?.[0]?.def.id).toBe('mir4_skill_2101');
    expect(facet.actionAbilities('woc-classic', 1)).toBeNull();
  });
});
