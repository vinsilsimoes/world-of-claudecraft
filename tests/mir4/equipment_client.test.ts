import { describe, expect, it } from 'vitest';
import { bareClient } from '../helpers/bare_client';

describe('MIR4 equipment client commands', () => {
  it('uses the existing MIR4 envelope without mutating local equipment state', async () => {
    const sent: unknown[] = [];
    const client = bareClient(1, {
      cmd: (payload: unknown) => sent.push(payload),
      cmdWithOutcome: (payload: unknown) => {
        sent.push(payload);
        return Promise.resolve(true);
      },
    });

    expect(client.mir4EquipItem(991010101)).toBe('Equipment requested.');
    expect(client.mir4UnequipSlot(6)).toBe('Unequip requested.');
    client.mir4EnhanceItem(991010101);
    client.mir4RollItemLayer(991010101, 'enchantment');
    client.mir4ResolveItemLayer(991010101, 'enchantment', 'roll-1', true);
    client.mir4CraftMaterial('solar-scroll');
    client.mir4RedeemTicket('mount-ticket-dawn');
    client.mir4ConfirmMount('mount-1');
    client.mir4EquipMount('meadow-courser');
    client.mir4CombineMounts(1);
    client.mir4ConfirmSpirit('spirit-1');
    client.mir4EquipSpirit('ember-wisp');
    client.mir4CombineSpirits(1);
    client.mir4CampaignProfession();
    client.mir4AcknowledgeTutorial('M01-Q01');
    client.mir4UpgradeSkill(1102, 1);
    await expect(client.mir4ClaimAchievement(20102)).resolves.toBe(true);
    expect(sent).toEqual([
      { cmd: 'mir4', m: 'equipItem', itemId: 991010101 },
      { cmd: 'mir4', m: 'unequipSlot', equipSlot: 6 },
      { cmd: 'mir4', m: 'enhanceItem', itemId: 991010101 },
      { cmd: 'mir4', m: 'rollLayer', itemId: 991010101, layer: 'enchantment' },
      {
        cmd: 'mir4',
        m: 'resolveLayer',
        itemId: 991010101,
        layer: 'enchantment',
        rollId: 'roll-1',
        accept: true,
      },
      { cmd: 'mir4', m: 'craftMaterial', recipeId: 'solar-scroll' },
      { cmd: 'mir4', m: 'redeemTicket', ticketId: 'mount-ticket-dawn' },
      { cmd: 'mir4', m: 'confirmMount', pendingId: 'mount-1' },
      { cmd: 'mir4', m: 'equipMount', mountId: 'meadow-courser' },
      { cmd: 'mir4', m: 'combineMounts', grade: 1 },
      { cmd: 'mir4', m: 'confirmSpirit', pendingId: 'spirit-1' },
      { cmd: 'mir4', m: 'equipSpirit', spiritId: 'ember-wisp' },
      { cmd: 'mir4', m: 'combineSpirits', grade: 1 },
      { cmd: 'mir4', m: 'campaignProfession' },
      { cmd: 'mir4', m: 'ackTutorial', questId: 'M01-Q01' },
      { cmd: 'mir4', m: 'upgradeSkill', skillId: 1102, expectedCurrentLevel: 1 },
      { cmd: 'mir4', m: 'claimAchievement', achievementId: 20102 },
    ]);
    expect(client.mir4PlayerState()).toBeNull();
  });
});
