// The mir4-gameplay-port WS dispatch delegate: the single 'mir4' envelope
// (m sub-action) routed from server/game.ts dispatchMessage, keeping that
// coordinator under its monolith ceiling. Every field is validated here and
// every verb re-runs through the sim's own admission gates (mp, cooldown,
// GCD, range, target life): the client's optimistic {ok:true} is never
// authority.

import { MIR4_GAME_PROFILE } from '../src/sim/game_profile';
import type { Sim } from '../src/sim/sim';

type Mir4WireMessage = Record<string, unknown> & { m?: unknown };
const isItemId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;
const isLayer = (value: unknown): value is 'enchantment' | 'blessing' =>
  value === 'enchantment' || value === 'blessing';
const isAchievementId = (value: unknown): value is 20101 | 20102 =>
  value === 20101 || value === 20102;
const isQuestId = (value: unknown): value is string =>
  typeof value === 'string' && /^M\d{2}-[PQRS]\d{2}$/.test(value);

export function handleMir4Command(
  sim: Sim,
  msg: Mir4WireMessage,
  pid: number,
): boolean | undefined {
  if (sim.cfg.gameProfile !== MIR4_GAME_PROFILE) {
    return msg.m === 'claimAchievement' ? false : undefined;
  }
  const action = typeof msg.m === 'string' ? msg.m : '';
  switch (action) {
    case 'auto':
      if (typeof msg.on === 'boolean') sim.setMir4AutoBattle(msg.on, pid);
      break;
    case 'quest':
      if (typeof msg.on === 'boolean' && (msg.questId === undefined || isQuestId(msg.questId))) {
        sim.setMir4AutoQuest(msg.on, msg.questId, pid);
      }
      break;
    case 'ackTutorial':
      if (typeof msg.questId === 'string' && /^M\d{2}-Q\d{2}$/.test(msg.questId)) {
        sim.mir4AcknowledgeTutorial(msg.questId, pid);
      }
      break;
    case 'skipDialogue':
      if (
        typeof msg.dialogueId === 'string' &&
        msg.dialogueId.length > 0 &&
        msg.dialogueId.length <= 160
      ) {
        sim.mir4SkipNarrativeDialogue(msg.dialogueId, pid);
      }
      break;
    case 'cast':
      if (isItemId(msg.skill) && (msg.target === undefined || isItemId(msg.target))) {
        sim.castMir4Skill(msg.skill, pid, msg.target);
      }
      break;
    case 'upgradeSkill':
      if (isItemId(msg.skillId) && isItemId(msg.expectedCurrentLevel)) {
        sim.mir4UpgradeSkill(msg.skillId, msg.expectedCurrentLevel, pid);
      }
      break;
    case 'claimAchievement':
      if (isAchievementId(msg.achievementId)) {
        return sim.mir4ClaimAchievement(msg.achievementId, pid).ok;
      }
      return false;
    case 'basic': {
      if (msg.target === undefined || isItemId(msg.target)) {
        sim.mir4BasicAttack(msg.target, pid);
      }
      break;
    }
    case 'equip':
      sim.mir4EquipStarterWeapon(pid);
      break;
    case 'unequip':
      sim.mir4UnequipWeapon(pid);
      break;
    case 'equipItem':
      if (isItemId(msg.itemId)) {
        sim.mir4EquipItem(Number(msg.itemId), pid);
      }
      break;
    case 'unequipSlot':
      if (
        Number.isSafeInteger(msg.equipSlot) &&
        Number(msg.equipSlot) >= 1 &&
        Number(msg.equipSlot) <= 8
      ) {
        sim.mir4UnequipSlot(Number(msg.equipSlot), pid);
      }
      break;
    case 'enhanceItem':
      if (isItemId(msg.itemId)) sim.mir4EnhanceItem(msg.itemId, pid);
      break;
    case 'rollLayer':
      if (isItemId(msg.itemId) && isLayer(msg.layer))
        sim.mir4RollItemLayer(msg.itemId, msg.layer, pid);
      break;
    case 'resolveLayer':
      if (
        isItemId(msg.itemId) &&
        isLayer(msg.layer) &&
        typeof msg.rollId === 'string' &&
        msg.rollId.length > 0 &&
        msg.rollId.length <= 128 &&
        typeof msg.accept === 'boolean'
      ) {
        sim.mir4ResolveItemLayer(msg.itemId, msg.layer, msg.rollId, msg.accept, pid);
      }
      break;
    case 'craftMaterial':
      if (msg.recipeId === 'solar-scroll' || msg.recipeId === 'lunar-seal') {
        sim.mir4CraftMaterial(msg.recipeId, pid);
      }
      break;
    case 'redeemTicket':
      if (
        msg.ticketId === 'mount-ticket-dawn' ||
        msg.ticketId === 'mount-ticket-twilight' ||
        msg.ticketId === 'spirit-ticket-dawn' ||
        msg.ticketId === 'spirit-ticket-sunset'
      ) {
        sim.mir4RedeemTicket(msg.ticketId, pid);
      }
      break;
    case 'confirmMount':
      if (typeof msg.pendingId === 'string' && /^mount-pending-\d+-\d+$/.test(msg.pendingId)) {
        sim.mir4ConfirmMount(msg.pendingId, pid);
      }
      break;
    case 'equipMount':
      if (
        msg.mountId === null ||
        (typeof msg.mountId === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(msg.mountId))
      ) {
        sim.mir4EquipMount(msg.mountId, pid);
      }
      break;
    case 'combineMounts':
      if (Number.isInteger(msg.grade) && Number(msg.grade) >= 1 && Number(msg.grade) <= 5) {
        sim.mir4CombineMounts(Number(msg.grade), pid);
      }
      break;
    case 'confirmSpirit':
      if (typeof msg.pendingId === 'string' && /^spirit-pending-\d+-\d+$/.test(msg.pendingId)) {
        sim.mir4ConfirmSpirit(msg.pendingId, pid);
      }
      break;
    case 'equipSpirit':
      if (
        msg.spiritId === null ||
        (typeof msg.spiritId === 'string' &&
          /^spirit-(?:common|uncommon|rare|epic|legendary|mythical)-\d{2}$/.test(msg.spiritId))
      ) {
        sim.mir4EquipSpirit(msg.spiritId, pid);
      }
      break;
    case 'combineSpirits':
      if (Number.isInteger(msg.grade) && Number(msg.grade) >= 1 && Number(msg.grade) <= 5) {
        sim.mir4CombineSpirits(Number(msg.grade), pid);
      }
      break;
    case 'campaignProfession':
      sim.mir4CampaignProfession(pid);
      break;
    default:
      break;
  }
  return undefined;
}
