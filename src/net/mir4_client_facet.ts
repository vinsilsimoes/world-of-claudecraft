import type { GameProfile } from '../game_profile';
import { mir4AutoQuestStatus } from '../sim/auto_quest/core';
import type { KnownAbility } from '../sim/content/classes';
import type { Mir4LayerKind } from '../sim/mir4/affixes';
import type { Mir4CastResult } from '../sim/mir4/combat';
import { mir4QuestTrackerEntries as buildMir4QuestTrackerEntries } from '../sim/mir4/quest_tracker';
import type { Entity } from '../sim/types';
import type { ClientCommand } from '../world_api';
import type { IWorldMir4 } from '../world_api/mir4';
import {
  applyMir4SnapshotDelta,
  type Mir4SnapshotState,
  mir4SnapshotActionAbilities,
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

  applySnapshot(value: unknown, entity: Entity): void {
    this.snapshot = applyMir4SnapshotDelta(value, entity, this.snapshot);
  }

  actionAbilities(profile: GameProfile | undefined, level: number): KnownAbility[] | null {
    return mir4SnapshotActionAbilities(profile, this.snapshot, level);
  }

  readonly mir4PlayerState = (): Readonly<Mir4SnapshotState> | null => this.snapshot;
  readonly mir4AutoBattleActive = (): boolean => this.snapshot?.autoBattle?.mode === 'battle';
  readonly setMir4AutoBattle = (on: boolean): void => this.send({ cmd: 'mir4', m: 'auto', on });
  readonly mir4AutoQuestActive = (): boolean => this.snapshot?.mir4AutoQuest !== undefined;
  readonly setMir4AutoQuest = (on: boolean): void => this.send({ cmd: 'mir4', m: 'quest', on });
  readonly mir4QuestStatusText = (): string => mir4AutoQuestStatus(this.snapshot ?? {});
  readonly mir4QuestTrackerEntries = () => buildMir4QuestTrackerEntries(this.snapshot ?? {});
  readonly mir4CastSkill = (skillId: number, targetId?: number): Mir4CastResult => {
    this.send({ cmd: 'mir4', m: 'cast', skill: skillId, target: targetId });
    return { ok: true };
  };
  readonly mir4UpgradeSkill = (skillId: number, expectedCurrentLevel: number): void =>
    this.send({ cmd: 'mir4', m: 'upgradeSkill', skillId, expectedCurrentLevel });
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
  readonly mir4RedeemTicket = (ticketId: string): void =>
    this.send({ cmd: 'mir4', m: 'redeemTicket', ticketId });
  readonly mir4ConfirmMount = (pendingId: string): void =>
    this.send({ cmd: 'mir4', m: 'confirmMount', pendingId });
  readonly mir4EquipMount = (mountId: string | null): void =>
    this.send({ cmd: 'mir4', m: 'equipMount', mountId });
  readonly mir4CombineMounts = (grade: number): void =>
    this.send({ cmd: 'mir4', m: 'combineMounts', grade });
  readonly mir4ConfirmSpirit = (pendingId: string): void =>
    this.send({ cmd: 'mir4', m: 'confirmSpirit', pendingId });
  readonly mir4EquipSpirit = (spiritId: string | null): void =>
    this.send({ cmd: 'mir4', m: 'equipSpirit', spiritId });
  readonly mir4CombineSpirits = (grade: number): void =>
    this.send({ cmd: 'mir4', m: 'combineSpirits', grade });
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

  protected applyMir4Snapshot(value: unknown, entity: Entity): void {
    this.ensureMir4Facet().applySnapshot(value, entity);
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
  mir4AutoQuestActive(): boolean {
    return this.ensureMir4Facet().mir4AutoQuestActive();
  }
  setMir4AutoQuest(on: boolean): void {
    this.ensureMir4Facet().setMir4AutoQuest(on);
  }
  mir4QuestStatusText(): string {
    return this.ensureMir4Facet().mir4QuestStatusText();
  }
  mir4QuestTrackerEntries() {
    return this.ensureMir4Facet().mir4QuestTrackerEntries();
  }
  mir4CastSkill(skillId: number, targetId?: number): Mir4CastResult {
    return this.ensureMir4Facet().mir4CastSkill(skillId, targetId);
  }
  mir4UpgradeSkill(skillId: number, expectedCurrentLevel: number): void {
    this.ensureMir4Facet().mir4UpgradeSkill(skillId, expectedCurrentLevel);
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
  mir4RedeemTicket(ticketId: string): void {
    this.ensureMir4Facet().mir4RedeemTicket(ticketId);
  }
  mir4ConfirmMount(pendingId: string): void {
    this.ensureMir4Facet().mir4ConfirmMount(pendingId);
  }
  mir4EquipMount(mountId: string | null): void {
    this.ensureMir4Facet().mir4EquipMount(mountId);
  }
  mir4CombineMounts(grade: number): void {
    this.ensureMir4Facet().mir4CombineMounts(grade);
  }
  mir4ConfirmSpirit(pendingId: string): void {
    this.ensureMir4Facet().mir4ConfirmSpirit(pendingId);
  }
  mir4EquipSpirit(spiritId: string | null): void {
    this.ensureMir4Facet().mir4EquipSpirit(spiritId);
  }
  mir4CombineSpirits(grade: number): void {
    this.ensureMir4Facet().mir4CombineSpirits(grade);
  }
  mir4CampaignProfession(): void {
    this.ensureMir4Facet().mir4CampaignProfession();
  }
}
