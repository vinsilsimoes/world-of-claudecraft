import { MIR4_QUESTS_MAIN, mir4ArcQuest } from '../content/mir4/arc_campaign';
import { MIR4_WORLD_ARC } from '../content/mir4/world_arc';
import type { Mir4ArcQuestProgress } from './arc_quests';

export type Mir4PortalDirection = 'a-to-b' | 'b-to-a';

function mapIdForChapter(chapter: string): string | null {
  return MIR4_WORLD_ARC.find((map) => map.mapId.startsWith(`${chapter}-`))?.mapId ?? null;
}

/** A map becomes available as soon as the campaign offers a main quest that points at it. */
export function isMir4CampaignMapUnlocked(
  mapId: string,
  quests: Readonly<Record<string, Mir4ArcQuestProgress>> | undefined,
): boolean {
  if (mapId === MIR4_WORLD_ARC[0]?.mapId) return true;

  const completedMainQuestIds = new Set<string>();
  for (const [storedQuestId, progress] of Object.entries(quests ?? {})) {
    const questId = /^M\d{2}-Q\d{2}$/.test(progress.questId) ? progress.questId : storedQuestId;
    if (!/^M\d{2}-Q\d{2}$/.test(questId)) continue;
    const quest = mir4ArcQuest(questId);
    if (quest?.mapId === mapId) return true;
    if (quest?.group === 'main' && progress.state === 'done') {
      completedMainQuestIds.add(questId);
    }
  }

  const offeredMainQuest = MIR4_QUESTS_MAIN.find(
    (quest) => !completedMainQuestIds.has(quest.questId),
  );
  return offeredMainQuest?.mapId === mapId;
}

/** Resolve the campaign map reached by crossing one physical portal side. */
export function mir4PortalDestinationMapId(
  portalId: string,
  direction: Mir4PortalDirection,
): string | null {
  const native = /^mir4_(m\d{2}-.+)_to_(m\d{2}-.+)$/.exec(portalId);
  if (native) {
    const [, fromMapId, toMapId] = native;
    if (!fromMapId || !toMapId) return null;
    return direction === 'a-to-b' ? toMapId : fromMapId;
  }

  const campaign = /^mir4_woc_(m\d{2})_(m\d{2})_/.exec(portalId);
  if (campaign) {
    const [, fromChapter, toChapter] = campaign;
    const chapter = direction === 'a-to-b' ? toChapter : fromChapter;
    return chapter ? mapIdForChapter(chapter) : null;
  }

  const tutorial = /^mir4_woc_tutorial_(m\d{2})_/.exec(portalId);
  if (tutorial) {
    return direction === 'a-to-b'
      ? (MIR4_WORLD_ARC[0]?.mapId ?? null)
      : tutorial[1]
        ? mapIdForChapter(tutorial[1])
        : null;
  }
  return null;
}
