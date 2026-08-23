// IWorldMir4: the mir4-gameplay-port profile surface (auto battle, the
// auto-quest journey, manual casts, and the slice equipment verbs). The
// offline Sim implements these directly; ClientWorld mirrors them over the
// single 'mir4' wire command (sub-action envelope, see server/
// mir4_commands.ts). Client reads come from the authoritative self-snapshot;
// the server re-validates every verb through the sim's own admission gates.

import type { Mir4AchievementClaimResult } from '../sim/mir4/achievements';
import type { Mir4LayerKind } from '../sim/mir4/affixes';
import type { Mir4CastResult } from '../sim/mir4/combat';
import type { Mir4QuestTrackerEntry } from '../sim/mir4/quest_tracker';
import type { Mir4PlayerUiState } from '../sim/mir4/ui_state';

export interface IWorldMir4 {
  /** Authoritative profile state consumed by the shared Character/Bags providers. */
  mir4PlayerState(): Readonly<Mir4PlayerUiState> | null;
  /** Authoritative auto-battle read. */
  mir4AutoBattleActive(): boolean;
  setMir4AutoBattle(on: boolean): void;
  /** Authoritative auto-quest journey read. */
  mir4AutoQuestActive(): boolean;
  setMir4AutoQuest(on: boolean, questId?: string): void;
  /** English status line for the tracker (localized by the HUD domain). */
  mir4QuestStatusText(): string;
  /** Authoritative profile projection consumed by the existing quest tracker. */
  mir4QuestTrackerEntries(): readonly Mir4QuestTrackerEntry[];
  /** Confirm that the player opened the highlighted existing window for an
   * informational campaign lesson. Gameplay lessons still require their
   * concrete server-owned action receipt. */
  mir4AcknowledgeTutorial(questId: string): void;
  /** Skip the currently visible authoritative Auto Mission conversation. */
  mir4SkipNarrativeDialogue(dialogueId: string): void;
  mir4CastSkill(skillId: number, targetId?: number): Mir4CastResult;
  /** Request a revision-guarded skill rank transition; the server remains authoritative. */
  mir4UpgradeSkill(skillId: number, expectedCurrentLevel: number): void;
  /**
   * Claim one source-backed MIR4 achievement reward. Offline returns the authoritative result immediately. Online resolves the
   * command-outcome acknowledgement, so a dropped transport never leaves the
   * existing Deeds claim control permanently pending.
   */
  mir4ClaimAchievement(achievementId: number): Mir4AchievementClaimResult | Promise<boolean>;
  mir4BasicAttack(targetId?: number): Mir4CastResult;
  mir4EquipStarterWeapon(): string;
  mir4UnequipWeapon(): string;
  mir4EquipItem(itemId: number): string;
  mir4UnequipSlot(equipSlot: number): string;
  mir4EnhanceItem(itemId: number): void;
  mir4RollItemLayer(itemId: number, layer: Mir4LayerKind): void;
  mir4ResolveItemLayer(itemId: number, layer: Mir4LayerKind, rollId: string, accept: boolean): void;
  mir4CraftMaterial(recipeId: string): void;
  /** Exchange a campaign collection ticket for a native WoC runtime collectible. */
  mir4RedeemTicket(ticketId: string): void;
  mir4ConfirmMount(pendingId: string): void;
  mir4EquipMount(mountId: string | null): void;
  mir4CombineMounts(grade: number): void;
  mir4ConfirmSpirit(pendingId: string): void;
  mir4EquipSpirit(spiritId: string | null): void;
  mir4CombineSpirits(grade: number): void;
  mir4CampaignProfession(): void;
}
