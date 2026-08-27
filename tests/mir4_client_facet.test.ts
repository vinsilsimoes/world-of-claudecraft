import { describe, expect, it } from 'vitest';
import {
  Mir4ClientFacet,
  Mir4ClientWorldBase,
  type Mir4CommandPayload,
} from '../src/net/mir4_client_facet';
import { createPlayer } from '../src/sim/entity';
import type { ClientCommand } from '../src/world_api';

describe('MIR4 online client facet', () => {
  it('lazily restores the facet for constructor-free ClientWorld fixtures', () => {
    const sent: Mir4CommandPayload[] = [];
    class ConstructorFreeWorld extends Mir4ClientWorldBase {
      protected sendMir4Command(payload: Mir4CommandPayload): void {
        sent.push(payload);
      }
      protected async sendMir4CommandWithOutcome(): Promise<boolean> {
        return false;
      }
    }

    const world = Object.create(ConstructorFreeWorld.prototype) as ConstructorFreeWorld;
    expect(world.mir4PlayerState()).toBeNull();
    expect(world.mir4AutoBattleActive()).toBe(false);
    world.setMir4AutoSkillEnabled(1102, false);
    expect(sent).toEqual([{ cmd: 'mir4', m: 'autoSkill', skillId: 1102, enabled: false }]);
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
    facet.cancelMir4AutoRetaliation();
    facet.setMir4AutoQuest(true, 'M08-S01');
    facet.mir4SkipNarrativeDialogue('M01-Q01:accept:-1:17');
    facet.mir4CastSkill(2101, 17);
    facet.mir4BasicAttack(18);
    facet.mir4EquipStarterWeapon();
    facet.mir4UnequipWeapon();
    facet.mir4EquipItem(991010101);
    facet.mir4BuyVillageEquipment(77, 991010101);
    facet.mir4UpgradeSkill(2101, 1);
    facet.mir4TrainConstitution(3, 0);
    facet.mir4TrainInnerForce(2, 0);
    facet.mir4TrainSolitude(8, 4);
    facet.mir4RegisterCodex('field-notes', 'knowledge-fragment', 1, 0);
    facet.mir4RegisterAllCodex('field-notes');
    expect(facet.mir4ClaimAchievement(20101)).resolves.toBe(true);

    expect(sent).toEqual([
      { cmd: 'mir4', m: 'auto', on: true },
      { cmd: 'mir4', m: 'cancelRetaliation' },
      { cmd: 'mir4', m: 'quest', on: true, questId: 'M08-S01' },
      { cmd: 'mir4', m: 'skipDialogue', dialogueId: 'M01-Q01:accept:-1:17' },
      { cmd: 'mir4', m: 'cast', skill: 2101, target: 17 },
      { cmd: 'mir4', m: 'basic', target: 18 },
      { cmd: 'mir4', m: 'equip' },
      { cmd: 'mir4', m: 'unequip' },
      { cmd: 'mir4', m: 'equipItem', itemId: 991010101 },
      { cmd: 'mir4', m: 'buyVillageEquipment', npcId: 77, itemId: 991010101 },
      { cmd: 'mir4', m: 'upgradeSkill', skillId: 2101, expectedCurrentLevel: 1 },
      { cmd: 'mir4', m: 'trainConstitution', branchId: 3, expectedCurrentLevel: 0 },
      { cmd: 'mir4', m: 'trainInnerForce', branchId: 2, expectedCurrentLevel: 0 },
      { cmd: 'mir4', m: 'trainSolitude', branchId: 8, expectedCurrentLevel: 4 },
      {
        cmd: 'mir4',
        m: 'registerCodex',
        collectionId: 'field-notes',
        requirementId: 'knowledge-fragment',
        count: 1,
        expectedRegistered: 0,
      },
      { cmd: 'mir4', m: 'registerAllCodex', collectionId: 'field-notes' },
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
      {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 3 } },
      },
    );

    expect(facet.mir4AutoBattleActive()).toBe(true);
    expect(facet.mir4PlayerState()).toMatchObject({
      classId: 2,
      ultimateGauge: 73,
      mir4Codex: {
        version: 1,
        registered: { 'field-notes': { 'knowledge-fragment': 3 } },
      },
    });
    expect(player.mir4UltGauge).toBe(73);
    expect(facet.actionAbilities('mir4-gameplay-port', 1)?.[0]?.def.id).toBe('mir4_skill_2101');
    expect(facet.actionAbilities('woc-classic', 1)).toBeNull();
  });

  it('recalculates derived stats when the dedicated Codex delta is applied or cleared', () => {
    const facet = new Mir4ClientFacet(
      () => undefined,
      async () => false,
    );
    const player = createPlayer(1, 'warrior', { x: 0, y: 0, z: 0 }, 'Codex Wire');
    player.level = 12;
    facet.applySnapshot({ classId: 1, ultimateGauge: 0 }, player, null);
    const baselineMaxHp = player.maxHp;

    facet.applySnapshot(undefined, player, {
      version: 1,
      registered: { 'field-notes': { 'knowledge-fragment': 25 } },
    });
    expect(player.maxHp).toBe(baselineMaxHp + 100);

    facet.applySnapshot(undefined, player, null);
    expect(player.maxHp).toBe(baselineMaxHp);
  });
});
