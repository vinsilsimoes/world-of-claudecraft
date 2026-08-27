// MIR4 commands exposed directly by Sim. The simulation keeps this facade on
// its prototype so offline, headless and server callers retain the established
// IWorld method names while the profile-specific orchestration stays out of the
// central Sim class.

import {
  mir4AutoPotionThresholds,
  setMir4AutoBattleMode,
  setMir4AutoPotionThreshold,
} from '../auto_battle/core';
import type {
  Mir4AutoPotionKind,
  Mir4AutoPotionThresholds,
} from '../auto_battle/potion_thresholds';
import {
  mir4AutoQuestStatus,
  mir4FullCampaignAvailable,
  setMir4AutoQuest,
} from '../auto_quest/core';
import type { SimContext } from '../sim_context';
import { claimMir4Achievement, type Mir4AchievementClaimResult } from './achievements';
import { type Mir4LayerKind, mir4ResolveLayer, mir4RollLayer } from './affixes';
import { mir4CampaignProfessionAction } from './arc_professions';
import { acknowledgeMir4ArcTutorial } from './arc_receipts';
import { setMir4AutoSkillEnabled } from './auto_skills';
import { mir4CampaignMapIdsForWorld } from './campaign_availability';
import { registerAllMir4Codex, registerMir4Codex } from './codex';
import {
  combineAllMir4Mounts,
  combineAllMir4Spirits,
  combineMir4Mounts,
  combineMir4Spirits,
  confirmAllMir4Mounts,
  confirmAllMir4Spirits,
  confirmMir4Mount,
  confirmMir4Spirit,
  equipMir4Mount,
  equipMir4Spirit,
  isMir4MountTicketId,
  redeemMir4CollectionTicket,
} from './collection_tickets';
import { castMir4Skill, type Mir4CastResult, mir4BasicAttack, mir4Ultimate } from './combat';
import { mir4Craft } from './crafting';
import {
  MIR4_ENHANCEMENT_SUCCESS_BPS,
  mir4Enhance,
  mir4EquipItem,
  mir4EquipStarterWeapon,
  mir4UnequipSlot,
  mir4UnequipWeapon,
} from './equipment';
import { MIR4_MOUNT_PENDING_LIMIT } from './mounts';
import { skipMir4NarrativeDialogue } from './narrative_dialogue';
import { mir4QuestTrackerEntries, mir4TalkOrInspect } from './quest';
import type { Mir4QuestTrackerEntry } from './quest_tracker';
import { type Mir4SkillUpgradeResult, upgradeMir4Skill } from './skill_evolution';
import { type Mir4SolitudeTrainingResult, trainMir4Solitude } from './solitude_training_commands';
import { isMir4SpiritTicketId, MIR4_SPIRIT_PENDING_LIMIT } from './spirits';
import { mir4BuyVillageEquipment } from './starter_vendor';
import {
  type Mir4TrainingResult,
  trainMir4Constitution,
  trainMir4InnerForce,
} from './training_commands';
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
  setMir4AutoQuest(on: boolean, questId?: string, pid?: number): void;
  mir4AutoBattleActive(pid?: number): boolean;
  mir4AutoPotionThresholds(pid?: number): Mir4AutoPotionThresholds;
  setMir4AutoPotionThreshold(kind: Mir4AutoPotionKind, percent: number, pid?: number): void;
  mir4PlayerState(pid?: number): Mir4PlayerUiState | null;
  setMir4AutoBattle(on: boolean, pid?: number): void;
  setMir4AutoSkillEnabled(skillId: number, enabled: boolean, pid?: number): boolean;
  mir4AutoQuestActive(pid?: number): boolean;
  mir4QuestStatusText(pid?: number): string;
  mir4QuestTrackerEntries(pid?: number): readonly Mir4QuestTrackerEntry[];
  mir4AcknowledgeTutorial(questId: string, pid?: number): void;
  mir4SkipNarrativeDialogue(dialogueId: string, pid?: number): void;
  mir4CastSkill(skillId: number, targetId?: number, pid?: number): Mir4CastResult;
  mir4UpgradeSkill(
    skillId: number,
    expectedCurrentLevel: number,
    pid?: number,
  ): Mir4SkillUpgradeResult;
  mir4TrainConstitution(
    branchId: number,
    expectedCurrentLevel: number,
    pid?: number,
  ): Mir4TrainingResult;
  mir4TrainInnerForce(
    branchId: number,
    expectedCurrentLevel: number,
    pid?: number,
  ): Mir4TrainingResult;
  mir4TrainSolitude(
    branchId: number,
    expectedCurrentLevel: number,
    pid?: number,
  ): Mir4SolitudeTrainingResult;
  mir4ClaimAchievement(achievementId: number, pid?: number): Mir4AchievementClaimResult;
  mir4EquipStarterWeapon(pid?: number): string;
  mir4UnequipWeapon(pid?: number): string;
  mir4EquipItem(itemId: number, pid?: number): string;
  mir4BuyVillageEquipment(npcId: number, itemId: number, pid?: number): string;
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
  mir4RegisterCodex(
    collectionId: string,
    requirementId: string,
    count: number,
    expectedRegistered: number,
    pid?: number,
  ): void;
  mir4RegisterAllCodex(collectionId: string, pid?: number): void;
  mir4RedeemTicket(ticketId: string, count?: number, pid?: number): void;
  mir4ConfirmMount(pendingId: string, pid?: number): void;
  mir4ConfirmAllMounts(pid?: number): void;
  mir4EquipMount(mountId: string | null, pid?: number): void;
  mir4CombineMounts(grade: number, all?: boolean, pid?: number): void;
  mir4ConfirmSpirit(pendingId: string, pid?: number): void;
  mir4ConfirmAllSpirits(pid?: number): void;
  mir4EquipSpirit(spiritId: string | null, pid?: number): void;
  mir4CombineSpirits(grade: number, all?: boolean, pid?: number): void;
  mir4CampaignProfession(pid?: number): void;
  mir4UltimateCast(targetId?: number, pid?: number): Mir4CastResult;
}

declare module '../sim' {
  interface Sim {
    mir4RegisterCodex: Mir4SimFacade['mir4RegisterCodex'];
    mir4RegisterAllCodex: Mir4SimFacade['mir4RegisterAllCodex'];
  }
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
  setMir4AutoQuest(this: Mir4SimFacadeHost, on, questId, pid = this.playerId) {
    setMir4AutoQuest(this.ctx, pid, on, questId);
  },
  mir4AutoBattleActive(this: Mir4SimFacadeHost, pid = this.playerId) {
    return this.ctx.players.get(pid)?.autoBattle?.mode === 'battle';
  },
  mir4AutoPotionThresholds(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4AutoPotionThresholds(this.ctx, pid);
  },
  setMir4AutoPotionThreshold(this: Mir4SimFacadeHost, kind, percent, pid = this.playerId) {
    setMir4AutoPotionThreshold(this.ctx, pid, kind, percent);
  },
  mir4PlayerState(this: Mir4SimFacadeHost, pid = this.playerId) {
    const player = this.ctx.entities.get(pid);
    return projectMir4PlayerUiState(
      this.ctx.gameProfile,
      this.ctx.players.get(pid),
      player?.mir4,
      player?.level,
      mir4FullCampaignAvailable(this.ctx),
      player?.mir4UltGauge,
      mir4CampaignMapIdsForWorld(this.ctx.worldContent),
    );
  },
  setMir4AutoBattle(this: Mir4SimFacadeHost, on, pid = this.playerId) {
    setMir4AutoBattleMode(this.ctx, pid, on ? 'battle' : 'off');
  },
  setMir4AutoSkillEnabled(this: Mir4SimFacadeHost, skillId, enabled, pid = this.playerId) {
    return setMir4AutoSkillEnabled(this.ctx, pid, skillId, enabled);
  },
  mir4AutoQuestActive(this: Mir4SimFacadeHost, pid = this.playerId) {
    return this.ctx.players.get(pid)?.mir4AutoQuest !== undefined;
  },
  mir4QuestStatusText(this: Mir4SimFacadeHost, pid = this.playerId) {
    return mir4AutoQuestStatus(this.ctx.players.get(pid) ?? {});
  },
  mir4QuestTrackerEntries(this: Mir4SimFacadeHost, pid = this.playerId) {
    const meta = this.ctx.players.get(pid);
    return mir4QuestTrackerEntries({
      playerLevel: this.ctx.entities.get(pid)?.level,
      fullCampaignAvailable: mir4FullCampaignAvailable(this.ctx),
      campaignMapIds: mir4CampaignMapIdsForWorld(this.ctx.worldContent),
      mir4Quests: meta?.mir4Quests,
      mir4ArcQuests: meta?.mir4ArcQuests,
      mir4AutoQuest: meta?.mir4AutoQuest,
    });
  },
  mir4AcknowledgeTutorial(this: Mir4SimFacadeHost, questId, pid = this.playerId) {
    const meta = this.ctx.players.get(pid);
    if (meta) acknowledgeMir4ArcTutorial(meta, questId);
  },
  mir4SkipNarrativeDialogue(this: Mir4SimFacadeHost, dialogueId, pid = this.playerId) {
    skipMir4NarrativeDialogue(this.ctx, pid, dialogueId);
  },
  mir4CastSkill(this: Mir4SimFacadeHost, skillId, targetId, pid = this.playerId) {
    return castMir4Skill(this.ctx, pid, skillId, targetId);
  },
  mir4UpgradeSkill(this: Mir4SimFacadeHost, skillId, expectedCurrentLevel, pid = this.playerId) {
    return upgradeMir4Skill(this.ctx, pid, skillId, expectedCurrentLevel);
  },
  mir4TrainConstitution(
    this: Mir4SimFacadeHost,
    branchId,
    expectedCurrentLevel,
    pid = this.playerId,
  ) {
    return trainMir4Constitution(this.ctx, pid, branchId, expectedCurrentLevel);
  },
  mir4TrainInnerForce(
    this: Mir4SimFacadeHost,
    branchId,
    expectedCurrentLevel,
    pid = this.playerId,
  ) {
    return trainMir4InnerForce(this.ctx, pid, branchId, expectedCurrentLevel);
  },
  mir4TrainSolitude(this: Mir4SimFacadeHost, branchId, expectedCurrentLevel, pid = this.playerId) {
    return trainMir4Solitude(this.ctx, pid, branchId, expectedCurrentLevel);
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
  mir4BuyVillageEquipment(this: Mir4SimFacadeHost, npcId, itemId, pid = this.playerId) {
    return mir4BuyVillageEquipment(this.ctx, pid, npcId, itemId);
  },
  mir4UnequipSlot(this: Mir4SimFacadeHost, equipSlot, pid = this.playerId) {
    return mir4UnequipSlot(this.ctx, pid, equipSlot);
  },
  mir4EnhanceItem(this: Mir4SimFacadeHost, itemId, pid = this.playerId) {
    const instance = this.ctx.players.get(pid)?.mir4EquipmentInstances?.[itemId];
    const previousLevel = instance?.enhancement ?? 0;
    const targetLevel = previousLevel + 1;
    const chanceBps = MIR4_ENHANCEMENT_SUCCESS_BPS[targetLevel] ?? 100_000;
    const result = mir4Enhance(this.ctx, pid, itemId);
    const outcome = !result.ok
      ? 'denied'
      : result.destroyed
        ? 'destroyed'
        : result.protected
          ? 'protected'
          : result.level > previousLevel
            ? 'success'
            : 'failure';
    this.ctx.emit({
      type: 'mir4EnhancementResult',
      pid,
      itemId,
      outcome,
      previousLevel,
      targetLevel,
      level: result.ok ? result.level : previousLevel,
      chanceBps: result.ok ? result.effectiveChanceBps : chanceBps,
      ...(!result.ok ? { reason: result.code } : {}),
    });
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
  mir4RegisterCodex(
    this: Mir4SimFacadeHost,
    collectionId,
    requirementId,
    count,
    expectedRegistered,
    pid = this.playerId,
  ) {
    registerMir4Codex(this.ctx, pid, collectionId, requirementId, count, expectedRegistered);
  },
  mir4RegisterAllCodex(this: Mir4SimFacadeHost, collectionId, pid = this.playerId) {
    registerAllMir4Codex(this.ctx, pid, collectionId);
  },
  mir4RedeemTicket(this: Mir4SimFacadeHost, ticketId, count = 1, pid = this.playerId) {
    if (count !== 1 && count !== 10 && count !== 100) return;
    const meta = this.ctx.players.get(pid);
    const spiritTicket = isMir4SpiritTicketId(ticketId);
    const mountTicket = isMir4MountTicketId(ticketId);
    if (!spiritTicket && !mountTicket) return;
    const balance = meta?.mir4ArcRewards?.tickets?.[ticketId] ?? 0;
    if (balance < count) return;
    if (
      ticketId === 'spirit-ticket-sunset' &&
      (meta?.mir4Spirits?.pending?.length ?? 0) + count > MIR4_SPIRIT_PENDING_LIMIT
    ) {
      return;
    }
    if (
      ticketId === 'mount-ticket-twilight' &&
      (meta?.mir4Mounts?.pending?.length ?? 0) + count > MIR4_MOUNT_PENDING_LIMIT
    ) {
      return;
    }

    let best:
      | {
          collection: 'spirit' | 'mount';
          collectionId: string;
          grade: number;
          status: 'owned' | 'pending-confirmation';
        }
      | undefined;
    const gradeCounts: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
    for (let index = 0; index < count; index += 1) {
      const result = redeemMir4CollectionTicket(this.ctx, pid, ticketId);
      if (!result.ok) break;
      if (result.grade !== undefined && result.grade >= 1 && result.grade <= gradeCounts.length) {
        gradeCounts[result.grade - 1] += 1;
      }
      const candidate =
        isMir4SpiritTicketId(ticketId) &&
        'spiritId' in result &&
        result.spiritId &&
        result.grade !== undefined &&
        (result.status === 'owned' || result.status === 'pending-confirmation')
          ? {
              collection: 'spirit' as const,
              collectionId: result.spiritId,
              grade: result.grade,
              status: result.status,
            }
          : isMir4MountTicketId(ticketId) &&
              'mountId' in result &&
              result.mountId &&
              result.grade !== undefined &&
              (result.status === 'owned' || result.status === 'pending-confirmation')
            ? {
                collection: 'mount' as const,
                collectionId: result.mountId,
                grade: result.grade,
                status: result.status,
              }
            : undefined;
      if (candidate && (!best || candidate.grade > best.grade)) best = candidate;
    }
    if (!best) return;
    this.ctx.emit({
      type: 'mir4CollectionResult',
      pid,
      collection: best.collection,
      ticketId,
      collectionId: best.collectionId,
      grade: best.grade,
      status: best.status,
      ...(count === 10 || count === 100 ? { batchCount: count, gradeCounts } : {}),
    });
  },
  mir4ConfirmMount(this: Mir4SimFacadeHost, pendingId, pid = this.playerId) {
    confirmMir4Mount(this.ctx, pid, pendingId);
  },
  mir4ConfirmAllMounts(this: Mir4SimFacadeHost, pid = this.playerId) {
    confirmAllMir4Mounts(this.ctx, pid);
  },
  mir4EquipMount(this: Mir4SimFacadeHost, mountId, pid = this.playerId) {
    equipMir4Mount(this.ctx, pid, mountId);
  },
  mir4CombineMounts(this: Mir4SimFacadeHost, grade, all = false, pid = this.playerId) {
    const result = all
      ? combineAllMir4Mounts(this.ctx, pid, grade)
      : combineMir4Mounts(this.ctx, pid, grade);
    if (
      result.ok &&
      result.outcome &&
      (result.status === 'owned' || result.status === 'pending-confirmation')
    ) {
      this.ctx.emit({
        type: 'mir4CombinationResult',
        pid,
        collection: 'mount',
        sourceGrade: grade,
        outcome: result.outcome,
        status: result.status,
        ...(result.mountId ? { collectionId: result.mountId } : {}),
        ...(result.grade !== undefined ? { grade: result.grade } : {}),
        ...(result.batchCount !== undefined ? { batchCount: result.batchCount } : {}),
        ...(result.successCount !== undefined ? { successCount: result.successCount } : {}),
        ...(result.failureCount !== undefined ? { failureCount: result.failureCount } : {}),
      });
    }
  },
  mir4ConfirmSpirit(this: Mir4SimFacadeHost, pendingId, pid = this.playerId) {
    confirmMir4Spirit(this.ctx, pid, pendingId);
  },
  mir4ConfirmAllSpirits(this: Mir4SimFacadeHost, pid = this.playerId) {
    confirmAllMir4Spirits(this.ctx, pid);
  },
  mir4EquipSpirit(this: Mir4SimFacadeHost, spiritId, pid = this.playerId) {
    equipMir4Spirit(this.ctx, pid, spiritId);
  },
  mir4CombineSpirits(this: Mir4SimFacadeHost, grade, all = false, pid = this.playerId) {
    const result = all
      ? combineAllMir4Spirits(this.ctx, pid, grade)
      : combineMir4Spirits(this.ctx, pid, grade);
    if (
      result.ok &&
      result.outcome &&
      (result.status === 'owned' ||
        result.status === 'pending-confirmation' ||
        result.status === 'tutorial-fusion')
    ) {
      this.ctx.emit({
        type: 'mir4CombinationResult',
        pid,
        collection: 'spirit',
        sourceGrade: grade,
        outcome: result.outcome,
        status: result.status,
        ...(result.spiritId ? { collectionId: result.spiritId } : {}),
        ...(result.grade !== undefined ? { grade: result.grade } : {}),
        ...(result.batchCount !== undefined ? { batchCount: result.batchCount } : {}),
        ...(result.successCount !== undefined ? { successCount: result.successCount } : {}),
        ...(result.failureCount !== undefined ? { failureCount: result.failureCount } : {}),
      });
    }
  },
  mir4CampaignProfession(this: Mir4SimFacadeHost, pid = this.playerId) {
    mir4CampaignProfessionAction(this.ctx, pid);
  },
  mir4UltimateCast(this: Mir4SimFacadeHost, targetId, pid = this.playerId) {
    return mir4Ultimate(this.ctx, pid, targetId);
  },
});
