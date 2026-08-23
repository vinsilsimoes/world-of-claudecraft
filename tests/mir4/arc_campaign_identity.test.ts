import { describe, expect, it } from 'vitest';
import {
  MIR4_ARC_NPC_IDENTITIES,
  MIR4_QUESTS_ARC,
  MIR4_QUESTS_MAIN,
  mir4ArcNpcIdentity,
  mir4ArcQuest,
} from '../../src/sim/content/mir4/arc_campaign';
import { buildMir4ArcWorld, mir4ArcBands } from '../../src/sim/content/mir4/arc_world';
import { M03_BOSQUE_DO_VALE_BLUEPRINT } from '../../src/sim/content/mir4/m03_bosque_do_vale_world';
import { MIR4_QUESTS_ARC as SOURCE_QUESTS_ARC } from '../../src/sim/content/mir4/quests_arc';
import { MIR4_WORLD_ARC } from '../../src/sim/content/mir4/world_arc';
import {
  type Mir4ArcQuestEvidence,
  type Mir4ArcQuestProgress,
  mir4ApplyQuestEvidence,
  mir4ArcStageGoal,
} from '../../src/sim/mir4/arc_quests';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ROUTED_STAGE_KINDS,
} from '../../src/sim/mir4/arc_stage_kinds';
import { sanitizeMir4PlayerState } from '../../src/sim/mir4/persistence';

function stageTargets(stage: (typeof MIR4_QUESTS_ARC)[number]['stages'][number]): string[] {
  if (Array.isArray(stage.target)) return [...stage.target];
  return typeof stage.target === 'string' ? [stage.target] : [];
}

function sourceNpcName(sourceNpcId: string): string {
  const connectors = new Set(['a', 'da', 'das', 'de', 'do', 'dos', 'e']);
  return sourceNpcId
    .split('-')
    .map((part, index) =>
      index > 0 && connectors.has(part)
        ? part
        : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`,
    )
    .join(' ');
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function evidenceFor(
  questId: string,
  stage: (typeof MIR4_QUESTS_ARC)[number]['stages'][number],
): Mir4ArcQuestEvidence {
  const target = stageTargets(stage)[0];
  if (stage.kind === 'talk' || stage.kind === 'deliver') {
    if (!target) throw new Error(`${questId}:${stage.kind} has no NPC target`);
    return { kind: 'talk', target };
  }
  if (stage.kind === 'travel') {
    if (!target) throw new Error(`${questId}:travel has no target`);
    return { kind: 'travel', target };
  }
  if (MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) {
    const combatTarget = target ?? stage.sources?.[0] ?? stage.guardian;
    return {
      kind: 'kill',
      target: combatTarget ? `mir4_${combatTarget}` : `mir4_quest_${questId.toLowerCase()}_target`,
    };
  }
  return {
    kind: 'stage',
    stageKind: stage.kind,
    ...(target ? { target } : {}),
  };
}

describe('canonical MIR4 campaign NPC identity', () => {
  it('gives every physical campaign NPC a globally unique non-empty id and name', () => {
    expect(MIR4_ARC_NPC_IDENTITIES).toHaveLength(80);
    expect(new Set(MIR4_ARC_NPC_IDENTITIES.map((npc) => npc.id)).size).toBe(80);
    expect(new Set(MIR4_ARC_NPC_IDENTITIES.map((npc) => npc.name)).size).toBe(80);
    expect(MIR4_ARC_NPC_IDENTITIES.every((npc) => npc.id.length > 0 && npc.name.length > 0)).toBe(
      true,
    );
  });

  it('replaces recurring source identities with distinct local characters', () => {
    const ilyras = MIR4_ARC_NPC_IDENTITIES.filter((npc) => npc.sourceNpcId === 'ilyra-da-centelha');
    expect(ilyras).toHaveLength(14);
    expect(new Set(ilyras.map((npc) => npc.id)).size).toBe(14);
    expect(new Set(ilyras.map((npc) => npc.name)).size).toBe(14);
    expect(ilyras.filter((npc) => npc.name === 'Ilyra da Centelha')).toHaveLength(1);
  });

  it('rewrites every giver, turn-in and NPC stage reference to the map identity', () => {
    const known = new Set(MIR4_ARC_NPC_IDENTITIES.map((npc) => npc.id));
    for (const quest of MIR4_QUESTS_ARC) {
      if (quest.group === 'repeatable') {
        expect(quest.giverNpcId, `${quest.questId} board giver`).toBe('');
        expect(quest.turnInNpcId, `${quest.questId} board turn-in`).toBe('');
      } else {
        expect(known.has(quest.giverNpcId), `${quest.questId} giver ${quest.giverNpcId}`).toBe(
          true,
        );
        expect(known.has(quest.turnInNpcId), `${quest.questId} turn-in ${quest.turnInNpcId}`).toBe(
          true,
        );
      }
      for (const stage of quest.stages) {
        if (stage.kind !== 'talk' && stage.kind !== 'deliver') continue;
        for (const target of stageTargets(stage)) {
          expect(known.has(target), `${quest.questId}:${stage.kind} target ${target}`).toBe(true);
          expect(mir4ArcNpcIdentity(target)?.mapId).toBe(quest.mapId);
        }
      }
    }
  });

  it('removes obsolete duplicate names from the complete canonical script', () => {
    for (const npc of MIR4_ARC_NPC_IDENTITIES) {
      if (npc.id === `${npc.mapId}-${npc.sourceNpcId}`) continue;
      const mapScript = JSON.stringify(
        MIR4_QUESTS_ARC.filter((quest) => quest.mapId === npc.mapId),
      );
      expect(normalizeSearch(mapScript), `${npc.mapId}:${npc.sourceNpcId}`).not.toContain(
        normalizeSearch(sourceNpcName(npc.sourceNpcId)),
      );
      expect(mapScript, npc.id).toContain(npc.name);
    }
  });

  it('places campaign contacts in each authored layout or unfinished scaffold', () => {
    const world = buildMir4ArcWorld(20);
    const bands = new Map(mir4ArcBands().map((band) => [band.mapId, band] as const));
    expect(Object.keys(world.npcs)).toHaveLength(107);
    expect(new Set(Object.values(world.npcs).map((npc) => npc.id)).size).toBe(107);
    expect(new Set(Object.values(world.npcs).map((npc) => npc.name)).size).toBe(107);
    for (const map of MIR4_WORLD_ARC) {
      const band = bands.get(map.mapId);
      if (!band) throw new Error(`missing band ${map.mapId}`);
      const zone = world.zones.find((candidate) => candidate.id === `mir4_${map.mapId}`);
      if (!zone) throw new Error(`missing zone ${map.mapId}`);
      const rows = Object.entries(world.npcs)
        .filter(([npcId]) => npcId.startsWith(`${map.mapId}-`))
        .map(([, npc]) => npc);
      expect(rows, map.mapId).toHaveLength(map.sequence <= 3 ? 9 : map.sequence === 4 ? 16 : 4);
      for (let npcIndex = 0; npcIndex < rows.length; npcIndex += 1) {
        const npc = rows[npcIndex];
        if (!npc) throw new Error(`missing NPC ${map.mapId}:${npcIndex}`);
        expect(Number.isFinite(npc.pos.x), npc.id).toBe(true);
        expect(Number.isFinite(npc.pos.z), npc.id).toBe(true);
        expect(npc.pos.z, npc.id).toBeGreaterThan(band.zMin);
        expect(npc.pos.z, npc.id).toBeLessThan(band.zMax);
        if (map.sequence === 3) {
          expect(npc.pos, npc.id).toEqual(
            M03_BOSQUE_DO_VALE_BLUEPRINT.npcPlacements.find(
              (placement) => placement.name === npc.name,
            )?.pos,
          );
          continue;
        }
        if (map.sequence === 4) {
          expect(Math.hypot(npc.pos.x - band.hub.x, npc.pos.z - band.hub.z), npc.id).toBeLessThan(
            zone.hub.radius + 10,
          );
          continue;
        }
        const anchorSite = npcIndex === 2 ? band.sites[0] : band.sites[3];
        const anchor = map.sequence <= 3 || npcIndex < 2 ? band.hub : anchorSite?.pos;
        if (!anchor) throw new Error(`missing NPC anchor ${map.mapId}:${npcIndex}`);
        expect(Math.hypot(npc.pos.x - anchor.x, npc.pos.z - anchor.z), npc.id).toBeLessThan(
          map.sequence <= 3 ? zone.hub.radius + 10 : 20,
        );
        if (map.sequence > 3) {
          expect(
            Math.abs(npc.pos.x - anchor.x),
            `${npc.id} blocks its local road`,
          ).toBeGreaterThanOrEqual(7);
        }
      }
    }
  });
});

describe('complete canonical MIR4 questline', () => {
  it('keeps all 230 quest ids and the complete 120-step main chain save-compatible', () => {
    expect(MIR4_QUESTS_ARC).toHaveLength(230);
    expect(MIR4_QUESTS_MAIN).toHaveLength(120);
    expect(new Set(MIR4_QUESTS_ARC.map((quest) => quest.questId)).size).toBe(230);
    expect(MIR4_QUESTS_MAIN.map((quest) => quest.questId)).toEqual(
      Array.from({ length: 20 }, (_, mapIndex) =>
        Array.from(
          { length: 6 },
          (_, questIndex) =>
            `M${String(mapIndex + 1).padStart(2, '0')}-Q${String(questIndex + 1).padStart(2, '0')}`,
        ),
      ).flat(),
    );
  });

  it('preserves every source quest key, stage index meaning and objective selection shape', () => {
    expect(MIR4_QUESTS_ARC.map((quest) => quest.questId)).toEqual(
      SOURCE_QUESTS_ARC.map((quest) => quest.questId),
    );
    for (let index = 0; index < SOURCE_QUESTS_ARC.length; index++) {
      const source = SOURCE_QUESTS_ARC[index]!;
      const canonical = MIR4_QUESTS_ARC[index]!;
      expect(
        {
          questId: canonical.questId,
          group: canonical.group,
          chainId: canonical.chainId,
          order: canonical.order,
          mapId: canonical.mapId,
          zoneId: canonical.zoneId,
          nextQuestId: canonical.nextQuestId,
          prerequisiteFor: canonical.prerequisiteFor,
          objectivePoolSelection: canonical.objectivePoolSelection,
          stageKinds: canonical.stages.map((stage) => stage.kind),
        },
        canonical.questId,
      ).toEqual({
        questId: source.questId,
        group: source.group,
        chainId: source.chainId,
        order: source.order,
        mapId: source.mapId,
        zoneId: source.zoneId,
        nextQuestId: source.nextQuestId,
        prerequisiteFor: source.prerequisiteFor,
        objectivePoolSelection: source.objectivePoolSelection,
        stageKinds: source.stages.map((stage) => stage.kind),
      });
    }
  });

  it('sanitizes active progress for all 230 stable quest ids without dropping a save', () => {
    const progress = Object.fromEntries(
      MIR4_QUESTS_ARC.map((quest) => [
        quest.questId,
        {
          questId: quest.questId,
          stageIndex: 0,
          stageProgress: 0,
          state: 'active',
          ...(quest.objectivePoolSelection
            ? {
                selectedStageIndexes: Array.from(
                  { length: quest.objectivePoolSelection },
                  (_, index) => index,
                ),
              }
            : {}),
        },
      ]),
    );
    const sanitized = sanitizeMir4PlayerState({ mir4ArcQuests: progress }, 1);
    expect(Object.keys(sanitized.mir4ArcQuests ?? {})).toEqual(
      MIR4_QUESTS_ARC.map((quest) => quest.questId),
    );
  });

  it('has no broken next-main link and every routed stage reaches ready deterministically', () => {
    for (const quest of MIR4_QUESTS_ARC) {
      if (quest.nextQuestId) expect(mir4ArcQuest(quest.nextQuestId), quest.questId).not.toBeNull();
      const progress: Mir4ArcQuestProgress = {
        questId: quest.questId,
        stageIndex: 0,
        stageProgress: 0,
        state: quest.stages.length === 0 ? 'ready' : 'active',
      };
      for (const stage of quest.stages) {
        expect(MIR4_ARC_ROUTED_STAGE_KINDS.has(stage.kind), `${quest.questId}:${stage.kind}`).toBe(
          true,
        );
        const evidence = evidenceFor(quest.questId, stage);
        for (let amount = 0; amount < mir4ArcStageGoal(stage); amount++) {
          expect(
            mir4ApplyQuestEvidence(progress, evidence),
            `${quest.questId}:${stage.kind}`,
          ).not.toBe('blocked');
        }
      }
      expect(progress.state, quest.questId).toBe('ready');
    }
  });
});
