import {
  MIR4_QUESTS_CITYPROFESSION,
  MIR4_QUESTS_MAIN,
  MIR4_QUESTS_REPEATABLE,
  MIR4_QUESTS_SIDE,
} from '../sim/content/mir4/arc_campaign';
import { MIR4_CLASSES } from '../sim/content/mir4/classes';
import { MIR4_CODEX_COLLECTIONS, MIR4_CODEX_UNLOCK_LEVEL } from '../sim/content/mir4/codex';
import { MIR4_EQUIPMENT_CATALOG } from '../sim/content/mir4/equipment_catalog';
import { MIR4_ITEM_PROGRESSION_RANKS } from '../sim/content/mir4/item_progression';
import { MIR4_MOUNTS_CATALOG } from '../sim/content/mir4/mounts_catalog';
import { MIR4_SKILLS } from '../sim/content/mir4/skills_runtime';
import { MIR4_SPIRITS_CATALOG } from '../sim/content/mir4/spirits_catalog';
import { MIR4_WORLD_ARC } from '../sim/content/mir4/world_arc';
import { DUNGEONS } from '../sim/data';
import {
  MIR4_DUNGEON_TICKET_POLICY,
  MIR4_TICKETED_DUNGEON_CATALOG,
  WOC_OPEN_DUNGEON_IDS,
} from '../sim/mir4/dungeon_access_policy';
import { MIR4_EQUIPMENT_MINING_DISTRICTS } from '../sim/mir4/equipment_mining';

export const AELDRUNE_CLASSES = MIR4_CLASSES.map((classDef) => ({
  ...classDef,
  skills: MIR4_SKILLS.filter((skill) => skill.classId === classDef.classId),
}));

export const AELDRUNE_MAPS = MIR4_WORLD_ARC;
export const AELDRUNE_QUESTS = [
  ...MIR4_QUESTS_MAIN,
  ...MIR4_QUESTS_SIDE,
  ...MIR4_QUESTS_REPEATABLE,
  ...MIR4_QUESTS_CITYPROFESSION,
];

export const AELDRUNE_QUEST_GROUPS = Object.freeze([
  { id: 'main', labelKey: 'quests.groupMain', count: MIR4_QUESTS_MAIN.length },
  { id: 'side', labelKey: 'quests.groupSide', count: MIR4_QUESTS_SIDE.length },
  { id: 'repeatable', labelKey: 'quests.groupRepeatable', count: MIR4_QUESTS_REPEATABLE.length },
  {
    id: 'cityProfession',
    labelKey: 'quests.groupCityProfession',
    count: MIR4_QUESTS_CITYPROFESSION.length,
  },
]);

export const AELDRUNE_OPEN_DUNGEONS = WOC_OPEN_DUNGEON_IDS.map((id) => ({
  id,
  name: DUNGEONS[id].name,
}));

export const AELDRUNE_TICKET_DUNGEONS = MIR4_TICKETED_DUNGEON_CATALOG;

export const AELDRUNE_PUBLIC_FACTS = Object.freeze({
  classCount: AELDRUNE_CLASSES.length,
  classNames: AELDRUNE_CLASSES.map((entry) => entry.name),
  mapCount: AELDRUNE_MAPS.length,
  questCount: AELDRUNE_QUESTS.length,
  mainQuestCount: MIR4_QUESTS_MAIN.length,
  sideQuestCount: MIR4_QUESTS_SIDE.length,
  repeatableQuestCount: MIR4_QUESTS_REPEATABLE.length,
  cityProfessionQuestCount: MIR4_QUESTS_CITYPROFESSION.length,
  levelCap: Math.max(...AELDRUNE_MAPS.map((map) => map.levelMax)),
  spiritCount: MIR4_SPIRITS_CATALOG.length,
  mountCount: MIR4_MOUNTS_CATALOG.length,
  equipmentCount: MIR4_EQUIPMENT_CATALOG.length,
  equipmentRankCount: MIR4_ITEM_PROGRESSION_RANKS.length,
  codexCollectionCount: MIR4_CODEX_COLLECTIONS.length,
  codexUnlockLevel: MIR4_CODEX_UNLOCK_LEVEL,
  openDungeonCount: AELDRUNE_OPEN_DUNGEONS.length,
  ticketDungeonCount: AELDRUNE_TICKET_DUNGEONS.length,
  dungeonTicketCost: MIR4_DUNGEON_TICKET_POLICY.ticketCost,
  dungeonTicketCap: MIR4_DUNGEON_TICKET_POLICY.defaultMax,
  dungeonResetHour: MIR4_DUNGEON_TICKET_POLICY.resetHour,
});

export const AELDRUNE_EQUIPMENT = MIR4_EQUIPMENT_CATALOG;
export const AELDRUNE_ITEM_RANKS = MIR4_ITEM_PROGRESSION_RANKS;
export const AELDRUNE_MINING_DISTRICTS = MIR4_EQUIPMENT_MINING_DISTRICTS;
export const AELDRUNE_SPIRITS = MIR4_SPIRITS_CATALOG;
export const AELDRUNE_MOUNTS = MIR4_MOUNTS_CATALOG;
export const AELDRUNE_CODEX_COLLECTIONS = MIR4_CODEX_COLLECTIONS;
