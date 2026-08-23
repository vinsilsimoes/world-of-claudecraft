// Server-owned gameplay receipts that may satisfy campaign tutorial stages.
// Only concrete runtime verbs call these helpers; unknown lessons fail closed.

import type { PlayerMeta } from '../sim';
import {
  type Mir4ArcQuestProgress,
  mir4ApplyPlayerQuestEvidence,
  mir4OrderedArcProgress,
  mir4QuestCurrentStage,
} from './arc_quests';
import { markMir4WireDirty } from './wire_revision';

export type Mir4ArcTutorialReceipt =
  | { kind: 'use-health-potion' }
  | { kind: 'enhance-item'; level: number }
  | { kind: 'equip-item' }
  | { kind: 'craft-item' }
  | { kind: 'portal-travel' }
  | { kind: 'equip-spirit' }
  | { kind: 'combine-spirit' }
  | { kind: 'resolve-enchantment' }
  | { kind: 'resolve-blessing' }
  | { kind: 'summon-mount' };

export const MIR4_ARC_UI_ACKNOWLEDGEMENT_TUTORIALS = [
  'M01-Q01',
  'M02-Q03',
  'M03-Q03',
  'M04-Q05',
  'M05-Q02',
  'M08-Q05',
  'M12-Q05',
  'M14-Q05',
  'M16-Q04',
  'M18-Q03',
  'M20-Q05',
  'M20-Q06',
] as const;

const UI_ACKNOWLEDGEMENT_TUTORIALS = new Set<string>(MIR4_ARC_UI_ACKNOWLEDGEMENT_TUTORIALS);

function advanceTutorial(meta: PlayerMeta, progress: Mir4ArcQuestProgress): boolean {
  const stage = mir4QuestCurrentStage(progress);
  if (stage?.kind !== 'system-tutorial') return false;
  const target = Array.isArray(stage.target) ? stage.target[0] : stage.target;
  const result = mir4ApplyPlayerQuestEvidence(meta, progress, {
    kind: 'stage',
    stageKind: stage.kind,
    ...(typeof target === 'string' ? { target } : {}),
  });
  if (result === 'blocked') return false;
  markMir4WireDirty(meta);
  return true;
}

/** Acknowledges informational lessons only after the player opens their
 * existing destination window. Lessons backed by gameplay verbs deliberately
 * reject this shortcut and wait for their authoritative receipt instead. */
export function acknowledgeMir4ArcTutorial(meta: PlayerMeta, questId: string): boolean {
  if (!UI_ACKNOWLEDGEMENT_TUTORIALS.has(questId)) return false;
  const progress = meta.mir4ArcQuests?.[questId];
  if (!progress) return false;
  return advanceTutorial(meta, progress);
}

export function creditMir4ArcTutorialReceipt(
  meta: PlayerMeta,
  receipt: Mir4ArcTutorialReceipt,
): boolean {
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (stage?.kind !== 'system-tutorial' || typeof stage.lesson !== 'string') continue;
    const satisfied =
      (receipt.kind === 'use-health-potion' && /poções|consumíveis/.test(stage.lesson)) ||
      (receipt.kind === 'enhance-item' &&
        /aprimor|progressão|readiness/.test(stage.lesson) &&
        receipt.level >= Number(stage.lesson.match(/\+(\d+)/)?.[1] ?? 1)) ||
      (receipt.kind === 'equip-item' && /equipar o item inicial recuperado/.test(stage.lesson)) ||
      (receipt.kind === 'craft-item' &&
        /primeiro craft de material|craft avançado|recraft/.test(stage.lesson)) ||
      (receipt.kind === 'portal-travel' &&
        /teleporte|rede de waypoints|retorno regional/.test(stage.lesson)) ||
      (receipt.kind === 'equip-spirit' &&
        /invocar, equipar e usar um Espírito/.test(stage.lesson)) ||
      (receipt.kind === 'combine-spirit' && /fusão 4→1/.test(stage.lesson)) ||
      (receipt.kind === 'resolve-enchantment' && /Selo Lunar e encantamento/.test(stage.lesson)) ||
      (receipt.kind === 'resolve-blessing' && /Bênção/.test(stage.lesson)) ||
      (receipt.kind === 'summon-mount' &&
        /invocar, equipar e conduzir uma Montaria/.test(stage.lesson));
    if (!satisfied) continue;
    return advanceTutorial(meta, progress);
  }
  return false;
}
