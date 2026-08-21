// Server-owned gameplay receipts that may satisfy campaign tutorial stages.
// Only concrete runtime verbs call these helpers; unknown lessons fail closed.

import type { PlayerMeta } from '../sim';
import {
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

export function creditMir4ArcTutorialReceipt(
  meta: PlayerMeta,
  receipt: Mir4ArcTutorialReceipt,
): boolean {
  for (const progress of mir4OrderedArcProgress(meta.mir4ArcQuests)) {
    const stage = mir4QuestCurrentStage(progress);
    if (!stage || stage.kind !== 'system-tutorial' || typeof stage.lesson !== 'string') continue;
    const satisfied =
      (receipt.kind === 'use-health-potion' && /poções|consumíveis/.test(stage.lesson)) ||
      (receipt.kind === 'enhance-item' &&
        /aprimor|progressão|readiness/.test(stage.lesson) &&
        receipt.level >= Number(stage.lesson.match(/\+(\d+)/)?.[1] ?? 1)) ||
      (receipt.kind === 'equip-item' && /equipar, comparar durabilidade/.test(stage.lesson)) ||
      (receipt.kind === 'craft-item' &&
        /primeiro craft|craft avançado|recraft/.test(stage.lesson)) ||
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
  return false;
}
