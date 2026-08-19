// IWorldMir4: the mir4-gameplay-port profile surface (auto battle, the
// auto-quest journey, manual casts, and the slice equipment verbs). The
// offline Sim implements these directly; ClientWorld mirrors them over the
// single 'mir4' wire command (sub-action envelope, see server/
// mir4_commands.ts). Reads are optimistic on the client until the snapshot
// echo arm lands; the server re-validates every verb through the sim's own
// admission gates. English status strings become t() keys with the HUD
// domain that consumes this facet.

import type { Mir4CastResult } from '../sim/mir4/combat';

export interface IWorldMir4 {
  /** Auto battle read (client-side optimistic until the snapshot echo arm). */
  mir4AutoBattleActive(): boolean;
  setMir4AutoBattle(on: boolean): void;
  /** Auto-quest journey read (same optimism note). */
  mir4AutoQuestActive(): boolean;
  setMir4AutoQuest(on: boolean): void;
  /** English status line for the tracker (localized by the HUD domain). */
  mir4QuestStatusText(): string;
  mir4CastSkill(skillId: number, targetId?: number): Mir4CastResult;
  mir4BasicAttack(targetId?: number): Mir4CastResult;
  mir4EquipStarterWeapon(): string;
  mir4UnequipWeapon(): string;
}
