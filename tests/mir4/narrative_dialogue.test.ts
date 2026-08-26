import { afterAll, describe, expect, it } from 'vitest';
import { mir4ArcNpcTemplateId, mir4ArcQuest } from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../../src/sim/data';
import {
  MIR4_DIALOGUE_MAX_SECONDS,
  MIR4_DIALOGUE_MIN_SECONDS,
  mir4DialogueReadingSeconds,
  mir4NarrativeDialogueLines,
} from '../../src/sim/mir4/narrative_dialogue';
import { Sim } from '../../src/sim/sim';

function makeSim(): Sim {
  const world = buildMir4ArcWorld(1);
  setActiveWorldContent(world);
  return new Sim({
    seed: 9041,
    playerClass: 'warrior',
    playerName: 'Leitora',
    gameProfile: 'mir4-gameplay-port',
    world,
  });
}

afterAll(() => setActiveWorldContent(null));

describe('MIR4 narrative dialogue gate', () => {
  it('extracts and canonicalizes speakers embedded in legacy side-quest dialogue', () => {
    const quest = mir4ArcQuest('M01-S02');
    if (!quest) throw new Error('M01-S02 not found');

    expect(mir4NarrativeDialogueLines(quest, 'accept', quest.title, 'Tarek Duas Pontes')).toEqual([
      {
        speaker: 'Tarek Duas Pontes',
        text: 'Monstros voltam. Uma rota salva fica. Desenhe algo que sobreviva a nós.',
      },
      {
        speaker: 'Ilyra da Centelha',
        text: 'O mapa preserva espaços; a Rede preserva o significado deles.',
      },
    ]);
  });

  it('uses the interacting NPC when a legacy dialogue line has no speaker prefix', () => {
    const authoredQuest = mir4ArcQuest('M01-S02');
    if (!authoredQuest) throw new Error('M01-S02 not found');
    const quest = {
      ...authoredQuest,
      dialogue: ['Uma fala sem identificação explícita.'],
    };

    expect(mir4NarrativeDialogueLines(quest, 'accept', quest.title, 'Tarek Duas Pontes')).toEqual([
      { speaker: 'Tarek Duas Pontes', text: 'Uma fala sem identificação explícita.' },
    ]);
  });

  it('derives a bounded reading window from the authored dialogue', () => {
    const short = mir4DialogueReadingSeconds([{ speaker: 'Llyra', text: 'Venha comigo.' }]);
    const long = mir4DialogueReadingSeconds([
      {
        speaker: 'Llyra',
        text: 'Os rastros atravessam a margem, somem entre os juncos e reaparecem perto das ruínas. Observe cada marca antes de seguir.',
      },
    ]);

    const capped = mir4DialogueReadingSeconds([
      { speaker: 'Llyra', text: Array.from({ length: 200 }, () => 'segredo').join(' ') },
    ]);

    expect(MIR4_DIALOGUE_MIN_SECONDS).toBe(6);
    expect(MIR4_DIALOGUE_MAX_SECONDS).toBe(18);
    expect(short).toBe(6);
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThanOrEqual(MIR4_DIALOGUE_MAX_SECONDS);
    expect(capped).toBe(18);
  });

  it('pauses Auto Mission at the NPC until the player skips the visible story', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q01')!;
    const giver = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    expect(giver).toBeDefined();
    if (!giver) return;
    sim.player.pos = { ...giver.pos };
    sim.player.prevPos = { ...giver.pos };

    sim.setMir4AutoQuest(true, 'M01-Q01');
    sim.tick();

    const dialogue = meta.mir4NarrativeDialogue;
    expect(dialogue).toMatchObject({
      questId: 'M01-Q01',
      npcEntityId: giver.id,
      action: 'accept',
    });
    expect(meta.mir4ArcQuests?.['M01-Q01']).toBeUndefined();

    // Clicking/interacting with the NPC again cannot bypass the reading gate.
    sim.talkToNpc(giver.id);
    expect(meta.mir4NarrativeDialogue?.id).toBe(dialogue?.id);
    expect(meta.mir4ArcQuests?.['M01-Q01']).toBeUndefined();

    sim.mir4SkipNarrativeDialogue(dialogue!.id);

    expect(meta.mir4NarrativeDialogue).toBeUndefined();
    expect(meta.mir4ArcQuests?.['M01-Q01']).toMatchObject({
      questId: 'M01-Q01',
      stageIndex: 1,
      state: 'active',
    });
  });

  it('continues automatically only after the authored reading window expires', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q01')!;
    const giver = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    expect(giver).toBeDefined();
    if (!giver) return;
    sim.player.pos = { ...giver.pos };
    sim.player.prevPos = { ...giver.pos };
    sim.setMir4AutoQuest(true, quest.questId);
    sim.tick();

    const duration = meta.mir4NarrativeDialogue!.durationSeconds;
    for (let tick = 0; tick < duration * 20 - 1; tick++) sim.tick();
    expect(meta.mir4ArcQuests?.[quest.questId]).toBeUndefined();

    sim.tick();
    expect(meta.mir4NarrativeDialogue).toBeUndefined();
    expect(meta.mir4ArcQuests?.[quest.questId]).toMatchObject({ state: 'active' });
  });

  it('resolves the exact optional quest shown when its NPC also offers the main quest', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-S02')!;
    const giver = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    if (!giver) throw new Error('shared campaign NPC not found');
    sim.player.pos = { ...giver.pos };
    sim.player.prevPos = { ...giver.pos };

    sim.setMir4AutoQuest(true, quest.questId);
    sim.tick();
    const dialogue = meta.mir4NarrativeDialogue;
    expect(dialogue).toMatchObject({ questId: 'M01-S02', action: 'accept' });

    sim.mir4SkipNarrativeDialogue(dialogue!.id);

    expect(meta.mir4ArcQuests?.['M01-S02']).toMatchObject({ stageIndex: 1, state: 'active' });
    expect(meta.mir4ArcQuests?.['M01-Q01']).toBeUndefined();
  });

  it('cancels the pending story when Auto Mission is disabled', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q01')!;
    const giver = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    if (!giver) throw new Error('campaign NPC not found');
    sim.player.pos = { ...giver.pos };
    sim.player.prevPos = { ...giver.pos };
    sim.setMir4AutoQuest(true, quest.questId);
    sim.tick();
    expect(meta.mir4NarrativeDialogue).toBeDefined();

    sim.setMir4AutoQuest(false);
    for (let tick = 0; tick < 400; tick++) sim.tick();

    expect(meta.mir4AutoQuest).toBeUndefined();
    expect(meta.mir4NarrativeDialogue).toBeUndefined();
    expect(meta.mir4ArcQuests?.[quest.questId]).toBeUndefined();
  });

  it('rejects forged and out-of-range skips without granting quest progress', () => {
    const sim = makeSim();
    const meta = sim.players.get(sim.playerId)!;
    const quest = mir4ArcQuest('M01-Q01')!;
    const giver = [...sim.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.giverNpcId),
    );
    if (!giver) throw new Error('campaign NPC not found');
    sim.player.pos = { ...giver.pos };
    sim.player.prevPos = { ...giver.pos };
    sim.setMir4AutoQuest(true, quest.questId);
    sim.tick();
    const dialogueId = meta.mir4NarrativeDialogue!.id;

    sim.mir4SkipNarrativeDialogue(`${dialogueId}:forged`);
    expect(meta.mir4NarrativeDialogue?.id).toBe(dialogueId);
    expect(meta.mir4ArcQuests?.[quest.questId]).toBeUndefined();

    sim.player.pos.x += 100;
    sim.mir4SkipNarrativeDialogue(dialogueId);
    sim.mir4SkipNarrativeDialogue(dialogueId);
    expect(meta.mir4NarrativeDialogue).toBeUndefined();
    expect(meta.mir4ArcQuests?.[quest.questId]).toBeUndefined();
  });

  it('gates both an active NPC stage and a ready turn-in before changing progress', () => {
    const quest = mir4ArcQuest('M01-Q01')!;

    const advancing = makeSim();
    const advanceMeta = advancing.players.get(advancing.playerId)!;
    const contact = [...advancing.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.turnInNpcId),
    );
    if (!contact) throw new Error('campaign NPC not found');
    advancing.player.pos = { ...contact.pos };
    advancing.player.prevPos = { ...contact.pos };
    advanceMeta.mir4ArcQuests = {
      [quest.questId]: {
        questId: quest.questId,
        stageIndex: 6,
        stageProgress: 0,
        state: 'active',
      },
    };
    advanceMeta.mir4AutoQuest = {
      questId: quest.questId,
      phase: 'to-site',
      siteIndex: 6,
      suspended: false,
    };
    advancing.tick();
    expect(advanceMeta.mir4NarrativeDialogue).toMatchObject({ action: 'advance' });
    expect(advanceMeta.mir4ArcQuests[quest.questId]?.state).toBe('active');
    advancing.mir4SkipNarrativeDialogue(advanceMeta.mir4NarrativeDialogue!.id);
    expect(advanceMeta.mir4ArcQuests[quest.questId]?.state).toBe('done');

    const completing = makeSim();
    const completeMeta = completing.players.get(completing.playerId)!;
    const turnIn = [...completing.entities.values()].find(
      (entity) =>
        entity.kind === 'npc' && entity.templateId === mir4ArcNpcTemplateId(quest.turnInNpcId),
    );
    if (!turnIn) throw new Error('campaign NPC not found');
    completing.player.pos = { ...turnIn.pos };
    completing.player.prevPos = { ...turnIn.pos };
    completeMeta.mir4ArcQuests = {
      [quest.questId]: {
        questId: quest.questId,
        stageIndex: quest.stages.length,
        stageProgress: 0,
        state: 'ready',
      },
    };
    completeMeta.mir4AutoQuest = {
      questId: quest.questId,
      phase: 'return',
      siteIndex: quest.stages.length,
      suspended: false,
    };
    completing.tick();
    expect(completeMeta.mir4NarrativeDialogue).toMatchObject({ action: 'complete' });
    expect(completeMeta.mir4ArcQuests[quest.questId]?.state).toBe('ready');
    completing.mir4SkipNarrativeDialogue(completeMeta.mir4NarrativeDialogue!.id);
    expect(completeMeta.mir4ArcQuests[quest.questId]?.state).toBe('done');
  });
});
