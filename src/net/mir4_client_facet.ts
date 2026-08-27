import type { GameProfile } from '../game_profile';
import {
  type Mir4AutoPotionKind,
  type Mir4AutoPotionThresholds,
  resolveMir4AutoPotionThresholds,
} from '../sim/auto_battle/potion_thresholds';
import { mir4AutoQuestStatus } from '../sim/auto_quest/core';
import type { KnownAbility } from '../sim/content/classes';
import type { Mir4LayerKind } from '../sim/mir4/affixes';
import type { Mir4CastResult } from '../sim/mir4/combat';
import { mir4QuestTrackerEntries as buildMir4QuestTrackerEntries } from '../sim/mir4/quest_tracker';
import type { Entity } from '../sim/types';
import type { ClientCommand } from '../world_api';
import type { IWorldMir4 } from '../world_api/mir4';
import {
  applyMir4CodexSnapshotDelta,
  applyMir4SnapshotDelta,
  type Mir4SnapshotState,
  mir4SnapshotActionAbilities,
  recalcMir4SnapshotPlayerStats,
} from './mir4_snapshot_wire';

export type Mir4CommandPayload = { cmd: ClientCommand } & Record<string, unknown>;
type SendCommand = (payload: Mir4CommandPayload) => void;
type SendCommandWithOutcome = (payload: Mir4CommandPayload) => Promise<boolean>;

/** Online implementation of the MIR4 world facet, backed only by authoritative snapshots. */
export class Mir4ClientFacet implements IWorldMir4 {
  private snapshot: Mir4SnapshotState | null = null;

  constructor(
    private readonly send: SendCommand,
    private readonly sendWithOutcome: SendCommandWithOutcome,
  ) {}

  applySnapshot(value: unknown, entity: Entity, codexValue?: unknown): void {
    this.snapshot = applyMir4SnapshotDelta(value, entity, this.snapshot);
    if (this.snapshot) {
      const mir4Codex = applyMir4CodexSnapshotDelta(codexValue, this.snapshot.mir4Codex);
      if (mir4Codex) this.snapshot = { ...this.snapshot, mir4Codex };
      else if (codexValue === null) {
        const { mir4Codex: _removed, ...withoutCodex } = this.snapshot;
        this.snapshot = withoutCodex;
      }
      // Codex is a separate low-frequency delta and is merged after the combat
      // payload. Recalculate only when that delta is present so its permanent
      // bonuses are reflected immediately without adding work to normal frames.
      if (codexValue !== undefined) recalcMir4SnapshotPlayerStats(entity, this.snapshot);
    }
  }

  actionAbilities(profile: GameProfile | undefined, level: number): KnownAbility[] | null {
    return mir4SnapshotActionAbilities(profile, this.snapshot, level);
  }

  readonly mir4PlayerState = (): Readonly<Mir4SnapshotState> | null => this.snapshot;
  readonly mir4AutoBattleActive = (): boolean => this.snapshot?.autoBattle?.mode === 'battle';
  readonly setMir4AutoBattle = (on: boolean): void => this.send({ cmd: 'mir4', m: 'auto', on });
  readonly mir4AutoPotionThresholds = (): Mir4AutoPotionThresholds =>
    resolveMir4AutoPotionThresholds(this.snapshot?.mir4AutoPotion);
  readonly setMir4AutoPotionThreshold = (kind: Mir4AutoPotionKind, percent: number): void =>
    this.send({ cmd: 'mir4', m: 'autoPotion', kind, percent });
  readonly setMir4AutoSkillEnabled = (skillId: number, enabled: boolean): void =>
    this.send({ cmd: 'mir4', m: 'autoSkill', skillId, enabled });
  readonly mir4AutoQuestActive = (): boolean => this.snapshot?.mir4AutoQuest !== undefined;
  readonly setMir4AutoQuest = (on: boolean, questId?: string): void =>
    this.send({ cmd: 'mir4', m: 'quest', on, ...(questId ? { questId } : {}) });
  readonly mir4QuestStatusText = (): string => mir4AutoQuestStatus(this.snapshot ?? {});
  readonly mir4QuestTrackerEntries = () => buildMir4QuestTrackerEntries(this.snapshot ?? {});
  readonly mir4AcknowledgeTutorial = (questId: string): void =>
    this.send({ cmd: 'mir4', m: 'ackTutorial', questId });
  readonly mir4SkipNarrativeDialogue = (dialogueId: string): void =>
    this.send({ cmd: 'mir4', m: 'skipDialogue', dialogueId });
  readonly mir4CastSkill = (skillId: number, targetId?: number): Mir4CastResult => {
    this.send({ cmd: 'mir4', m: 'cast', skill: skillId, target: targetId });
    return { ok: true };
  };
  readonly mir4UpgradeSkill = (skillId: number, expectedCurrentLevel: number): void =>
    this.send({ cmd: 'mir4', m: 'upgradeSkill', skillId, expectedCurrentLevel });
  readonly mir4TrainConstitution = (branchId: number, expectedCurrentLevel: number): void =>
    this.send({ cmd: 'mir4', m: 'trainConstitution', branchId, expectedCurrentLevel });
  readonly mir4TrainInnerForce = (branchId: number, expectedCurrentLevel: number): void =>
    this.send({ cmd: 'mir4', m: 'trainInnerForce', branchId, expectedCurrentLevel });
  readonly mir4TrainSolitude = (branchId: number, expectedCurrentLevel: number): void =>
    this.send({ cmd: 'mir4', m: 'trainSolitude', branchId, expectedCurrentLevel });
  readonly mir4ClaimAchievement = (achievementId: number): Promise<boolean> =>
    this.sendWithOutcome({ cmd: 'mir4', m: 'claimAchievement', achievementId });
  readonly mir4BasicAttack = (targetId?: number): Mir4CastResult => {
    this.send({ cmd: 'mir4', m: 'basic', target: targetId });
    return { ok: true };
  };
  readonly mir4EquipStarterWeapon = (): string => {
    this.send({ cmd: 'mir4', m: 'equip' });
    return 'Starter weapon equipped.';
  };
  readonly mir4UnequipWeapon = (): string => {
    this.send({ cmd: 'mir4', m: 'unequip' });
    return 'Weapon unequipped.';
  };
  readonly mir4EquipItem = (itemId: number): string => {
    this.send({ cmd: 'mir4', m: 'equipItem', itemId });
    return 'Equipment requested.';
  };
  readonly mir4BuyVillageEquipment = (npcId: number, itemId: number): string => {
    this.send({ cmd: 'mir4', m: 'buyVillageEquipment', npcId, itemId });
    return 'Purchase requested.';
  };
  readonly mir4UnequipSlot = (equipSlot: number): string => {
    this.send({ cmd: 'mir4', m: 'unequipSlot', equipSlot });
    return 'Unequip requested.';
  };
  readonly mir4EnhanceItem = (itemId: number): void =>
    this.send({ cmd: 'mir4', m: 'enhanceItem', itemId });
  readonly mir4RollItemLayer = (itemId: number, layer: Mir4LayerKind): void =>
    this.send({ cmd: 'mir4', m: 'rollLayer', itemId, layer });
  readonly mir4ResolveItemLayer = (
    itemId: number,
    layer: Mir4LayerKind,
    rollId: string,
    accept: boolean,
  ): void => this.send({ cmd: 'mir4', m: 'resolveLayer', itemId, layer, rollId, accept });
  readonly mir4CraftMaterial = (recipeId: string): void =>
    this.send({ cmd: 'mir4', m: 'craftMaterial', recipeId });
  readonly mir4RegisterCodex = (
    collectionId: string,
    requirementId: string,
    count: number,
    expectedRegistered: number,
  ): void =>
    this.send({
      cmd: 'mir4',
      m: 'registerCodex',
      collectionId,
      requirementId,
      count,
      expectedRegistered,
    });
  readonly mir4RegisterAllCodex = (collectionId: string): void =>
    this.send({ cmd: 'mir4', m: 'registerAllCodex', collectionId });
  readonly mir4RedeemTicket = (ticketId: string, count = 1): void =>
    this.send({
      cmd: 'mir4',
      m: 'redeemTicket',
      ticketId,
      ...(count === 1 ? {} : { count }),
    });
  readonly mir4ConfirmMount = (pendingId: string): void =>
    this.send({ cmd: 'mir4', m: 'confirmMount', pendingId });
  readonly mir4ConfirmAllMounts = (): void => this.send({ cmd: 'mir4', m: 'confirmAllMounts' });
  readonly mir4EquipMount = (mountId: string | null): void =>
    this.send({ cmd: 'mir4', m: 'equipMount', mountId });
  readonly mir4CombineMounts = (grade: number, all = false): void =>
    this.send({ cmd: 'mir4', m: 'combineMounts', grade, ...(all ? { all: true } : {}) });
  readonly mir4ConfirmSpirit = (pendingId: string): void =>
    this.send({ cmd: 'mir4', m: 'confirmSpirit', pendingId });
  readonly mir4ConfirmAllSpirits = (): void => this.send({ cmd: 'mir4', m: 'confirmAllSpirits' });
  readonly mir4EquipSpirit = (spiritId: string | null): void =>
    this.send({ cmd: 'mir4', m: 'equipSpirit', spiritId });
  readonly mir4CombineSpirits = (grade: number, all = false): void =>
    this.send({ cmd: 'mir4', m: 'combineSpirits', grade, ...(all ? { all: true } : {}) });
  readonly mir4CampaignProfession = (): void => this.send({ cmd: 'mir4', m: 'campaignProfession' });
}

/**
 * Prototype-owned IWorldMir4 delegation for ClientWorld.
 *
 * Keeping these methods on a small base class makes the public IWorld shape a
 * real prototype contract while the snapshot mirror and command encoding stay
 * inside Mir4ClientFacet. The lazy accessor preserves the sanctioned
 * Object.create(ClientWorld.prototype) fixture used by server-focused tests.
 */
export abstract class Mir4ClientWorldBase implements IWorldMir4 {
  private mir4Facet = new Mir4ClientFacet(
    (payload) => this.sendMir4Command(payload),
    (payload) => this.sendMir4CommandWithOutcome(payload),
  );

  protected abstract sendMir4Command(payload: Mir4CommandPayload): void;
  protected abstract sendMir4CommandWithOutcome(payload: Mir4CommandPayload): Promise<boolean>;

  private ensureMir4Facet(): Mir4ClientFacet {
    if (!this.mir4Facet) {
      this.mir4Facet = new Mir4ClientFacet(
        (payload) => this.sendMir4Command(payload),
        (payload) => this.sendMir4CommandWithOutcome(payload),
      );
    }
    return this.mir4Facet;
  }

  protected applyMir4Snapshot(value: unknown, entity: Entity, codexValue?: unknown): void {
    this.ensureMir4Facet().applySnapshot(value, entity, codexValue);
  }

  protected mir4ActionAbilities(
    profile: GameProfile | undefined,
    level: number,
  ): KnownAbility[] | null {
    return this.ensureMir4Facet().actionAbilities(profile, level);
  }

  mir4PlayerState() {
    return this.ensureMir4Facet().mir4PlayerState();
  }
  mir4AutoBattleActive(): boolean {
    return this.ensureMir4Facet().mir4AutoBattleActive();
  }
  setMir4AutoBattle(on: boolean): void {
    this.ensureMir4Facet().setMir4AutoBattle(on);
  }
  mir4AutoPotionThresholds(): Mir4AutoPotionThresholds {
    return this.ensureMir4Facet().mir4AutoPotionThresholds();
  }
  setMir4AutoPotionThreshold(kind: Mir4AutoPotionKind, percent: number): void {
    this.ensureMir4Facet().setMir4AutoPotionThreshold(kind, percent);
  }
  setMir4AutoSkillEnabled(skillId: number, enabled: boolean): void {
    this.ensureMir4Facet().setMir4AutoSkillEnabled(skillId, enabled);
  }
  mir4AutoQuestActive(): boolean {
    return this.ensureMir4Facet().mir4AutoQuestActive();
  }
  setMir4AutoQuest(on: boolean, questId?: string): void {
    this.ensureMir4Facet().setMir4AutoQuest(on, questId);
  }
  mir4QuestStatusText(): string {
    return this.ensureMir4Facet().mir4QuestStatusText();
  }
  mir4QuestTrackerEntries() {
    return this.ensureMir4Facet().mir4QuestTrackerEntries();
  }
  mir4AcknowledgeTutorial(questId: string): void {
    this.ensureMir4Facet().mir4AcknowledgeTutorial(questId);
  }
  mir4SkipNarrativeDialogue(dialogueId: string): void {
    this.ensureMir4Facet().mir4SkipNarrativeDialogue(dialogueId);
  }
  mir4CastSkill(skillId: number, targetId?: number): Mir4CastResult {
    return this.ensureMir4Facet().mir4CastSkill(skillId, targetId);
  }
  mir4UpgradeSkill(skillId: number, expectedCurrentLevel: number): void {
    this.ensureMir4Facet().mir4UpgradeSkill(skillId, expectedCurrentLevel);
  }
  mir4TrainConstitution(branchId: number, expectedCurrentLevel: number): void {
    this.ensureMir4Facet().mir4TrainConstitution(branchId, expectedCurrentLevel);
  }
  mir4TrainInnerForce(branchId: number, expectedCurrentLevel: number): void {
    this.ensureMir4Facet().mir4TrainInnerForce(branchId, expectedCurrentLevel);
  }
  mir4TrainSolitude(branchId: number, expectedCurrentLevel: number): void {
    this.ensureMir4Facet().mir4TrainSolitude(branchId, expectedCurrentLevel);
  }
  mir4ClaimAchievement(achievementId: number): Promise<boolean> {
    return this.ensureMir4Facet().mir4ClaimAchievement(achievementId);
  }
  mir4BasicAttack(targetId?: number): Mir4CastResult {
    return this.ensureMir4Facet().mir4BasicAttack(targetId);
  }
  mir4EquipStarterWeapon(): string {
    return this.ensureMir4Facet().mir4EquipStarterWeapon();
  }
  mir4UnequipWeapon(): string {
    return this.ensureMir4Facet().mir4UnequipWeapon();
  }
  mir4EquipItem(itemId: number): string {
    return this.ensureMir4Facet().mir4EquipItem(itemId);
  }
  mir4BuyVillageEquipment(npcId: number, itemId: number): string {
    return this.ensureMir4Facet().mir4BuyVillageEquipment(npcId, itemId);
  }
  mir4UnequipSlot(equipSlot: number): string {
    return this.ensureMir4Facet().mir4UnequipSlot(equipSlot);
  }
  mir4EnhanceItem(itemId: number): void {
    this.ensureMir4Facet().mir4EnhanceItem(itemId);
  }
  mir4RollItemLayer(itemId: number, layer: Mir4LayerKind): void {
    this.ensureMir4Facet().mir4RollItemLayer(itemId, layer);
  }
  mir4ResolveItemLayer(
    itemId: number,
    layer: Mir4LayerKind,
    rollId: string,
    accept: boolean,
  ): void {
    this.ensureMir4Facet().mir4ResolveItemLayer(itemId, layer, rollId, accept);
  }
  mir4CraftMaterial(recipeId: string): void {
    this.ensureMir4Facet().mir4CraftMaterial(recipeId);
  }
  mir4RegisterCodex(
    collectionId: string,
    requirementId: string,
    count: number,
    expectedRegistered: number,
  ): void {
    this.ensureMir4Facet().mir4RegisterCodex(
      collectionId,
      requirementId,
      count,
      expectedRegistered,
    );
  }
  mir4RegisterAllCodex(collectionId: string): void {
    this.ensureMir4Facet().mir4RegisterAllCodex(collectionId);
  }
  mir4RedeemTicket(ticketId: string, count?: number): void {
    this.ensureMir4Facet().mir4RedeemTicket(ticketId, count);
  }
  mir4ConfirmMount(pendingId: string): void {
    this.ensureMir4Facet().mir4ConfirmMount(pendingId);
  }
  mir4ConfirmAllMounts(): void {
    this.ensureMir4Facet().mir4ConfirmAllMounts();
  }
  mir4EquipMount(mountId: string | null): void {
    this.ensureMir4Facet().mir4EquipMount(mountId);
  }
  mir4CombineMounts(grade: number, all?: boolean): void {
    this.ensureMir4Facet().mir4CombineMounts(grade, all);
  }
  mir4ConfirmSpirit(pendingId: string): void {
    this.ensureMir4Facet().mir4ConfirmSpirit(pendingId);
  }
  mir4ConfirmAllSpirits(): void {
    this.ensureMir4Facet().mir4ConfirmAllSpirits();
  }
  mir4EquipSpirit(spiritId: string | null): void {
    this.ensureMir4Facet().mir4EquipSpirit(spiritId);
  }
  mir4CombineSpirits(grade: number, all?: boolean): void {
    this.ensureMir4Facet().mir4CombineSpirits(grade, all);
  }
  mir4CampaignProfession(): void {
    this.ensureMir4Facet().mir4CampaignProfession();
  }
}
