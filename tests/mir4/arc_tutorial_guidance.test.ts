import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIR4_QUESTS_MAIN } from '../../src/sim/content/mir4/arc_campaign';
import {
  MIR4_ARC_TUTORIAL_GUIDANCE,
  mir4ArcTutorialGuidance,
} from '../../src/sim/content/mir4/arc_tutorial_guidance';
import { MIR4_MATERIAL_IDS } from '../../src/sim/mir4/equipment';

describe('MIR4 campaign tutorial guidance', () => {
  it('pins the exact existing destination, tab and requirement contract for all 30 lessons', () => {
    const expected = `
M01-Q01|mm-map|map|-|action:discover-waypoint:1
M01-Q02|mm-bag|bags|-|material:minorHealthPotion:20
M01-Q03|mm-bag|bags|-|equipment:starterWeapon:1
M01-Q04|mm-crafting|crafting|crafting|material:sunStone:1,material:solarScroll:1
M01-Q06|mm-crafting|crafting|refinement|material:sunStone:2,material:solarScroll:2,enhancement:weapon:2
M02-Q01|mm-map|map|-|action:portalTravel:1
M02-Q03|mm-quest|questlog|-|action:memoryRite:4
M02-Q04|mm-bag|bags|-|material:spirit-ticket-dawn:1
M03-Q01|mm-crafting|crafting|enchantment|material:moonStone:5,material:lunarSeal:1
M03-Q03|mm-quest|questlog|-|action:stableBell:1
M03-Q04|mm-mount-codex|mounts|-|material:mount-ticket-dawn:1,action:mountedCheckpoint:3
M04-Q03|mm-crafting|crafting|refinement|material:solarScroll:3,enhancement:weapon:5
M04-Q04|mm-crafting|crafting|blessing|material:dawnTear:1
M04-Q05|mm-dfinder|dfinder|-|action:dungeonSeal:3
M05-Q02|mm-dfinder|dfinder|-|party:partyMember:2
M07-Q05|mm-crafting|crafting|refinement|material:sunStone:1,material:solarScroll:1,material:solarWard:1,enhancement:weapon:6
M08-Q05|mm-dfinder|dfinder|-|action:trueNameBinding:1
M09-Q04|mm-map|map|-|action:portalTravel:1
M10-Q03|mm-bag|bags|-|material:boundSpiritReplica:4
M11-Q05|mm-crafting|crafting|refinement|enhancement:mainEquipment:7
M12-Q05|mm-dfinder|dfinder|-|action:palaceEvidence:3
M13-Q03|mm-crafting|crafting|crafting|equipment:rank8ClassItem:1
M14-Q05|mm-crafting|crafting|blessing|material:dawnTear:1
M15-Q05|mm-crafting|crafting|refinement|enhancement:weapon:8
M16-Q04|mm-dfinder|dfinder|-|action:solarMold:1
M17-Q06|mm-crafting|crafting|refinement|enhancement:mainEquipment:9
M18-Q03|mm-dfinder|dfinder|-|party:roleResponsibility:1
M19-Q06|mm-crafting|crafting|refinement|enhancement:mainEquipment:10
M20-Q05|mm-dfinder|dfinder|-|party:finalDungeonParty:1
M20-Q06|mm-char|char|-|power:finalReadiness:1,enhancement:recommendedEquipment:12
`
      .trim()
      .split('\n');
    expect(
      MIR4_ARC_TUTORIAL_GUIDANCE.map((entry) =>
        [
          entry.questId,
          entry.launcherId,
          entry.shortcutAction,
          entry.tab ?? '-',
          entry.requirements
            .map((requirement) =>
              [requirement.kind, requirement.id, requirement.quantity].join(':'),
            )
            .join(','),
        ].join('|'),
      ),
    ).toEqual(expected);
  });

  it('covers every authored system tutorial with concrete steps and an existing launcher', () => {
    const indexHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const tutorials = MIR4_QUESTS_MAIN.flatMap((quest) =>
      quest.stages
        .filter((stage) => stage.kind === 'system-tutorial')
        .map((stage) => ({ quest, stage })),
    );
    expect(MIR4_ARC_TUTORIAL_GUIDANCE).toHaveLength(tutorials.length);
    expect(new Set(MIR4_ARC_TUTORIAL_GUIDANCE.map((guide) => guide.questId)).size).toBe(
      tutorials.length,
    );
    for (const { quest } of tutorials) {
      const guide = mir4ArcTutorialGuidance(quest.questId);
      expect(guide, quest.questId).not.toBeNull();
      expect(guide?.steps.length, quest.questId).toBeGreaterThanOrEqual(2);
      if (guide?.launcherId) {
        expect(indexHtml, `${quest.questId} #${guide.launcherId}`).toContain(
          `id="${guide.launcherId}"`,
        );
      }
    }
  });

  it('tells the first enhancement tutorial exactly where to go and what it consumes', () => {
    expect(mir4ArcTutorialGuidance('M01-Q06')).toMatchObject({
      launcherId: 'mm-crafting',
      shortcutAction: 'crafting',
      tab: 'refinement',
      requirements: [
        { kind: 'material', id: 'sunStone', quantity: 2 },
        { kind: 'material', id: 'solarScroll', quantity: 2 },
        { kind: 'enhancement', id: 'weapon', quantity: 2 },
      ],
    });
    const quest = MIR4_QUESTS_MAIN.find((candidate) => candidate.questId === 'M01-Q06')!;
    expect(quest.onAcceptGrants.items).toContainEqual(
      expect.objectContaining({
        itemId: MIR4_MATERIAL_IDS.sunStone,
        quantity: 2,
      }),
    );
  });

  it('keeps inventory lessons in Bags and routes the Mount lesson to its system window', () => {
    for (const questId of ['M01-Q03', 'M02-Q04']) {
      expect(mir4ArcTutorialGuidance(questId), questId).toMatchObject({
        launcherId: 'mm-bag',
        shortcutAction: 'bags',
      });
    }
    expect(mir4ArcTutorialGuidance('M03-Q04')).toMatchObject({
      launcherId: 'mm-mount-codex',
      shortcutAction: 'mounts',
      steps: [
        expect.stringContaining('Santuário de Montarias'),
        expect.stringContaining('Equipe a montaria'),
      ],
    });
  });

  it('aligns the first equipment and craft lessons with native runtime verbs and grants', () => {
    expect(mir4ArcTutorialGuidance('M01-Q03')).toMatchObject({
      launcherId: 'mm-bag',
      requirements: [{ kind: 'equipment', id: 'starterWeapon', quantity: 1 }],
    });
    expect(mir4ArcTutorialGuidance('M01-Q04')).toMatchObject({
      launcherId: 'mm-crafting',
      tab: 'crafting',
      requirements: [
        { kind: 'material', id: 'sunStone', quantity: 1 },
        { kind: 'material', id: 'solarScroll', quantity: 1 },
      ],
    });
    const quest = MIR4_QUESTS_MAIN.find((candidate) => candidate.questId === 'M01-Q04')!;
    expect(quest.onAcceptGrants.items).toContainEqual(
      expect.objectContaining({ itemId: MIR4_MATERIAL_IDS.sunStone, quantity: 1 }),
    );
    expect(quest.onAcceptGrants.currencies).toContainEqual(
      expect.objectContaining({ moneyId: 2, quantity: 5_000 }),
    );
  });

  it('gives every mandatory late-campaign lesson the exact consumable inputs it needs', () => {
    const quest = (questId: string) =>
      MIR4_QUESTS_MAIN.find((candidate) => candidate.questId === questId)!;
    expect(quest('M10-Q03').onAcceptGrants.items).toContainEqual(
      expect.objectContaining({ itemId: 'bound-spirit-replica', quantity: 4 }),
    );
    expect(quest('M13-Q03').onAcceptGrants.items).toContainEqual(
      expect.objectContaining({ itemId: MIR4_MATERIAL_IDS.sunStone, quantity: 1 }),
    );
    expect(quest('M13-Q03').onAcceptGrants.currencies).toContainEqual(
      expect.objectContaining({ moneyId: 2, quantity: 5_000 }),
    );

    for (const [questId, targetLevel] of [
      ['M11-Q05', 7],
      ['M15-Q05', 8],
      ['M17-Q06', 9],
      ['M19-Q06', 10],
    ] as const) {
      expect(quest(questId).onAcceptGrants.items, questId).toContainEqual(
        expect.objectContaining({ itemId: MIR4_MATERIAL_IDS.sunStone, quantity: 1 }),
      );
      expect(quest(questId).onAcceptGrants.currencies, questId).toContainEqual(
        expect.objectContaining({ moneyId: 2, quantity: 5_000 }),
      );
      expect(quest(questId).onAcceptGrants.guarantees, questId).toContainEqual(
        expect.objectContaining({
          guaranteeId: `tutorial-guided-plus-${targetLevel}`,
          uses: 1,
        }),
      );
    }
  });
});
