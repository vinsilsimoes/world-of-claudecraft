import { describe, expect, it } from 'vitest';

import { MIR4_QUESTS_ARC } from '../../src/sim/content/mir4/arc_campaign';
import { mir4ApplyQuestEvidence, mir4ArcStageGoal } from '../../src/sim/mir4/arc_quests';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
  MIR4_ARC_POSITION_STAGE_KINDS,
  MIR4_ARC_RECEIPT_STAGE_KINDS,
  MIR4_ARC_ROUTED_STAGE_KINDS,
  MIR4_ARC_TALK_STAGE_KINDS,
} from '../../src/sim/mir4/arc_stage_kinds';

const EXPECTED_BUCKETS = {
  talk: ['deliver', 'talk'],
  position: ['survive-zone', 'travel'],
  escort: ['escort-entity', 'escort-supply-run'],
  combat: [
    'collect-quest-wallet',
    'defend-anchor',
    'defend-random-landmark',
    'guardian-resolution',
    'inspect-and-resolve-elite',
    'interrupt-ritual',
    'optional-elite-resolution',
    'selective-hunt',
    'short-dungeon-clear',
    'short-dungeon-or-public-event-contribution',
  ],
  interact: [
    'accept-board-order',
    'activate-sequence',
    'certify-network',
    'discover-shortcut',
    'discover-waypoint',
    'explore-landmarks',
    'gather-resource-patches',
    'inspect-clues',
    'inspect-service-stations',
    'lore-resolution',
    'prepare-civilians',
    'reconstruct-evidence',
    'repair-public-anchor',
    'track-signs',
  ],
  receipt: [
    'craft-receipt',
    'deliver-local-materials',
    'refine-receipt',
    'salvage-receipt',
    'system-tutorial',
  ],
} as const;

function canonicalEvidence(
  questId: string,
  stage: (typeof MIR4_QUESTS_ARC)[number]['stages'][number],
) {
  const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
  if (MIR4_ARC_TALK_STAGE_KINDS.has(stage.kind)) {
    return { kind: 'talk' as const, target: target ?? '' };
  }
  if (stage.kind === 'travel') {
    return { kind: 'travel' as const, target: target ?? '' };
  }
  if (MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) {
    return {
      kind: 'kill' as const,
      target:
        target ??
        stage.sources?.[0] ??
        stage.guardian ??
        `mir4_quest_${questId.toLowerCase()}_test`,
      amount: mir4ArcStageGoal(stage),
    };
  }
  return {
    kind: 'stage' as const,
    stageKind: stage.kind,
    ...(target ? { target } : {}),
    amount: mir4ArcStageGoal(stage),
  };
}

describe('MIR4 campaign stage routing', () => {
  it('routes every authored stage kind to an authoritative runtime evidence source', () => {
    const authored = [
      ...new Set(MIR4_QUESTS_ARC.flatMap((quest) => quest.stages.map((stage) => stage.kind))),
    ].sort();
    expect(authored).toHaveLength(35);
    expect(authored.filter((kind) => !MIR4_ARC_ROUTED_STAGE_KINDS.has(kind))).toEqual([]);
    expect([...MIR4_ARC_ROUTED_STAGE_KINDS].filter((kind) => !authored.includes(kind))).toEqual([]);
  });

  it('pins each kind to its intended evidence bucket instead of only comparing the union', () => {
    expect([...MIR4_ARC_TALK_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.talk);
    expect([...MIR4_ARC_POSITION_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.position);
    expect([...MIR4_ARC_ESCORT_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.escort);
    expect([...MIR4_ARC_COMBAT_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.combat);
    expect([...MIR4_ARC_INTERACT_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.interact);
    expect([...MIR4_ARC_RECEIPT_STAGE_KINDS].sort()).toEqual(EXPECTED_BUCKETS.receipt);
  });

  it('accepts the canonical evidence shape for every one of the 35 authored kinds', () => {
    const firstByKind = new Map<string, { questId: string; stageIndex: number }>();
    for (const quest of MIR4_QUESTS_ARC) {
      quest.stages.forEach((stage, stageIndex) => {
        if (!firstByKind.has(stage.kind))
          firstByKind.set(stage.kind, { questId: quest.questId, stageIndex });
      });
    }
    for (const [kind, location] of firstByKind) {
      const quest = MIR4_QUESTS_ARC.find((candidate) => candidate.questId === location.questId)!;
      const stage = quest.stages[location.stageIndex]!;
      const progress = {
        questId: quest.questId,
        stageIndex: 0,
        stageProgress: 0,
        state: 'active' as const,
        selectedStageIndexes: [location.stageIndex],
      };
      const result = mir4ApplyQuestEvidence(progress, canonicalEvidence(quest.questId, stage));
      expect(result, `${quest.questId} stage ${location.stageIndex} (${kind})`).not.toBe('blocked');
    }
    expect(firstByKind.size).toBe(35);
  });

  it('advances every authored stage in every campaign quest through its complete sequence', () => {
    for (const quest of MIR4_QUESTS_ARC) {
      const progress = {
        questId: quest.questId,
        stageIndex: 0,
        stageProgress: 0,
        state: 'active' as 'active' | 'ready',
      };
      for (let stageIndex = 0; stageIndex < quest.stages.length; stageIndex++) {
        const stage = quest.stages[stageIndex]!;
        const result = mir4ApplyQuestEvidence(progress, canonicalEvidence(quest.questId, stage));
        expect(result, `${quest.questId} stage ${stageIndex} (${stage.kind})`).toBe(
          stageIndex === quest.stages.length - 1 ? 'ready' : 'advanced',
        );
      }
      expect(progress.state, quest.questId).toBe('ready');
      expect(progress.stageIndex, quest.questId).toBe(quest.stages.length);
    }
  });

  it('accepts every authored objective-pool stage when selected independently', () => {
    for (const quest of MIR4_QUESTS_ARC) {
      for (let authoredIndex = 0; authoredIndex < quest.stages.length; authoredIndex++) {
        const stage = quest.stages[authoredIndex]!;
        const progress = {
          questId: quest.questId,
          stageIndex: 0,
          stageProgress: 0,
          state: 'active' as const,
          selectedStageIndexes: [authoredIndex],
        };
        const result = mir4ApplyQuestEvidence(progress, canonicalEvidence(quest.questId, stage));
        expect(result, `${quest.questId} selected stage ${authoredIndex} (${stage.kind})`).toBe(
          'ready',
        );
      }
    }
  });
});
