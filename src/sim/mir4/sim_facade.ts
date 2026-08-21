// MIR4 commands exposed directly by Sim. The simulation keeps this facade on
// its prototype so offline, headless and server callers retain the established
// IWorld method names while the profile-specific orchestration stays out of the
// central Sim class.

import { setMir4AutoBattleMode } from '../auto_battle/core';
import { mir4AutoQuestStatus, setMir4AutoQuest } from '../auto_quest/core';
import type { SimContext } from '../sim_context';
import { claimMir4Achievement, type Mir4AchievementClaimResult } from './achievements';
import { type Mir4LayerKind, mir4ResolveLayer, mir4RollLayer } from './affixes';
import { mir4CampaignProfessionAction } from './arc_professions';
import {
  combineMir4Mounts,
  combineMir4Spirits,
  confirmMir4Mount,
  confirmMir4Spirit,
  equipMir4Mount,
  equipMir4Spirit,
  redeemMir4CollectionTicket,
} from './collection_tickets';
import { castMir4Skill, type Mir4CastResult, mir4BasicAttack, mir4Ultimate } from './combat';
import { mir4Craft } from './crafting';
import {
  mir4Enhance,
  mir4EquipItem,
  mir4EquipStarterWeapon,
  mir4UnequipSlot,
  mir4UnequipWeapon,
} from './equipment';
import { mir4QuestTrackerEntries, mir4TalkOrInspect } from './quest';
import type { Mir4QuestTrackerEntry } from './quest_tracker';
import { type Mir4SkillUpgradeResult, upgradeMir4Skill } from './skill_evolution';
import { type Mir4PlayerUiState, projectMir4PlayerUiState } from './ui_state';

interface Mir4SimFacadeHost {
  readonly ctx: SimContext;
  readonly playerId: number;
}

export interface Mir4SimFacade {
  castMir4Skill(skillId: number, pid?: number, targetId?: number): Mir4CastResult;
  mir4BasicAttack(targetId?: number, pid?: number): Mir4CastResult;
  setMir4AutoBattleMode(mode: 'off' | 'battle', pid?: number): void;
  mir4TalkOrInspect(pid?: number): string;
  setMir4AutoQuest(on: boolean, pid?: number): void;
  mir4AutoBattleActive(pid?: number): boolean;
  mir4PlayerState(pid?: number): Mir4PlayerUiState | null;
  setMir4AutoBattle(on: boolean, pid?: number): void;
  mir4AutoQuestActive(pid?: number): boolean;
  mir4QuestStatusText(pid?: number): string;
  mir4QuestTrackerEntries(pid?: number): readonly Mir4QuestTrackerEntry[];
  mir4CastSkill(skillId: number, targetId?: number, pid?: number): Mir4CastResult;
  mir4UpgradeSkill(
    skillId: number,
    expectedCurrentLevel: number,
    pid?: number,
  ): Mir4SkillUpgradeResult;
  mir4ClaimAchievement(achievementId: number, pid?: number): Mir4AchievementClaimResult;
  mir4EquipStarterWeapon(pid?: number): string;
  mir4UnequipWeapon(pid?: number): string;
  mir4EquipItem(itemId: number, pid?: number): string;
  mir4UnequipSlot(equipSlot: number, pid?: number): string;
  mir4EnhanceItem(itemId: number, pid?: number): void;
  mir4RollItemLayer(itemId: number, layer: Mir4LayerKind, pid?: number): void;
  mir4ResolveItemLayer(
    itemId: number,
    layer: Mir4LayerKind,
    rollId: string,
    accept: boolean,
    pid?: number,
  ): void;
  mir4CraftMaterial(recipeId: string, pid?: number): void;
  mir4RedeemTicket(ticketId: string, pid?: number): void;
  mir4ConfirmMount(pendingId: string, pid?: number): void;
  mir4EquipMount(mountId: string | null, pid?: number): void;
  mir4CombineMounts(grade: number, pid?: number): void;
  mir4ConfirmSpirit(pendingId: string, pid?: number): void;
  mir4EquipSpirit(spiritId: string | null, pid?: number): void;
  mir4CombineSpirits(grade: number, pid?: number): void;
  mir4CampaignProfession(pid?: number): void;
  mir4UltimateCast(targetId?: number, pid?: number): Mir4CastResult;
}

function defineMir4SimFacade(methods: Mir4SimFacade & ThisType<Mir4SimFacadeHost>): Mir4SimFacade {
  return methods;
}

export const mir4SimFacade = defineMir4SimFacade({
  castMir4Skill(this: Mir4SimFacadeHost, skillId, pid = this.playerId, targetId) {
    return castMir4Skill(this.ctx, pid, skillId, targetId);
  },
  mir4BasicAttack(this: Mir4SimFacadeHost, targetId, pid = this.playerId) {
    return mir4BasicAttack(this.ctx, pid, targetId);
  },
  setMir4AutoBattleMode(this: Mir4SimFacadeHost, mode, pid = this.playerId) {
    setMir4AutoBattleMode(this.ctx, pid, mode);
  },
  mir4TalkOrInspect(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4TalkOrInspect(this.ctx, pid);
  },
  setMir4AutoQuest(this: Mir4SimFacadeHost, on, pid = this.playerId) {
    setMir4AutoQuest(this.ctx, pid, on);
  },
  mir4AutoBattleActive(this: Mir4SimFacadeHost, pid = this.playerId) {
    return this.ctx.players.get(pid)?.autoBattle?.mode === 'battle';
  },
  mir4PlayerState(this: Mir4SimFacadeHost, pid = this.playerId) {
    const player = this.ctx.entities.get(pid);
    return projectMir4PlayerUiState(
      this.ctx.gameProfile,
      this.ctx.players.get(pid),
      player?.mir4,
      player?.mir4UltGauge,
    );
  },
  setMir4AutoBattle(this: Mir4SimFacadeHost, on, pid = this.playerId) {
    setMir4AutoBattleMode(this.ctx, pid, on ? 'battle' : 'off');
  },
  mir4AutoQuestActive(this: Mir4SimFacadeHost, pid = this.playerId) {
    return this.ctx.players.get(pid)?.mir4AutoQuest !== undefined;
  },
  mir4QuestStatusText(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4AutoQuestStatus(this.ctx.players.get(pid) ?? {});
  },
  mir4QuestTrackerEntries(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4QuestTrackerEntries(this.ctx.players.get(pid) ?? {});
  },
  mir4CastSkill(this: Mir4SimFacadeHost, skillId, targetId, pid = this.playerId) {
    return castMir4Skill(this.ctx, pid, skillId, targetId);
  },
  mir4UpgradeSkill(this: Mir4SimFacadeHost, skillId, expectedCurrentLevel, pid = this.playerId) {
    return upgradeMir4Skill(this.ctx, pid, skillId, expectedCurrentLevel);
  },
  mir4ClaimAchievement(this: Mir4SimFacadeHost, achievementId, pid = this.playerId) {
    return claimMir4Achievement(this.ctx, pid, achievementId);
  },
  mir4EquipStarterWeapon(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4EquipStarterWeapon(this.ctx, pid);
  },
  mir4UnequipWeapon(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4UnequipWeapon(this.ctx, pid);
  },
  mir4EquipItem(this: Mir4SimFacadeHost, itemId, pid = this.playerId) {
    return mir4EquipItem(this.ctx, pid, itemId);
  },
  mir4UnequipSlot(this: Mir4SimFacadeHost, equipSlot, pid = this.playerId) {
    return mir4UnequipSlot(this.ctx, pid, equipSlot);
  },
  mir4EnhanceItem(this: Mir4SimFacadeHost, itemId, pid = this.playerId) {
    mir4Enhance(this.ctx, pid, itemId);
  },
  mir4RollItemLayer(this: Mir4SimFacadeHost, itemId, layer, pid = this.playerId) {
    mir4RollLayer(this.ctx, pid, itemId, layer);
  },
  mir4ResolveItemLayer(
    this: Mir4SimFacadeHost,
    itemId,
    layer,
    rollId,
    accept,
    pid = this.playerId,
  ) {
    mir4ResolveLayer(this.ctx, pid, itemId, layer, rollId, accept);
  },
  mir4CraftMaterial(this: Mir4SimFacadeHost, recipeId, pid = this.playerId) {
    mir4Craft(this.ctx, pid, recipeId);
  },
  mir4RedeemTicket(this: Mir4SimFacadeHost, ticketId, pid = this.playerId) {
    redeemMir4CollectionTicket(this.ctx, pid, ticketId);
  },
  mir4ConfirmMount(this: Mir4SimFacadeHost, pendingId, pid = this.playerId) {
    confirmMir4Mount(this.ctx, pid, pendingId);
  },
  mir4EquipMount(this: Mir4SimFacadeHost, mountId, pid = this.playerId) {
    equipMir4Mount(this.ctx, pid, mountId);
  },
  mir4CombineMounts(this: Mir4SimFacadeHost, grade, pid = this.playerId) {
    combineMir4Mounts(this.ctx, pid, grade);
  },
  mir4ConfirmSpirit(this: Mir4SimFacadeHost, pendingId, pid = this.playerId) {
    confirmMir4Spirit(this.ctx, pid, pendingId);
  },
  mir4EquipSpirit(this: Mir4SimFacadeHost, spiritId, pid = this.playerId) {
    equipMir4Spirit(this.ctx, pid, spiritId);
  },
  mir4CombineSpirits(this: Mir4SimFacadeHost, grade, pid = this.playerId) {
    combineMir4Spirits(this.ctx, pid, grade);
  },
  mir4CampaignProfession(this: Mir4SimFacadeHost, pid = this.playerId) {
    mir4CampaignProfessionAction(this.ctx, pid);
  },
  mir4UltimateCast(this: Mir4SimFacadeHost, targetId, pid = this.playerId) {
    return mir4Ultimate(this.ctx, pid, targetId);
  },
});
