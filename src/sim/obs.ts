import { AFFLICTION_DOOM_MAX, doomValue } from './combat/affliction';
import { ruinAmount } from './combat/destruction';
import { soulFragmentCount } from './combat/necromancy';
import {
  dominionCompositionMaskForOwner,
  dominionSummonBlockFromMask,
  dominionTemplateForAbility,
} from './combat/necromancy_dominion';
import { canUseForbiddenReflection } from './combat/warlock_talents';
import { MIR4_MAX_LEVEL, type Mir4ClassId, mir4LevelRow, mir4SkillsForClass } from './content/mir4';
import { MIR4_QUESTS_MAIN } from './content/mir4/arc_campaign';
import { noticeboardDefByEntityId } from './content/noticeboards';
import { corpseInteractionAvailability } from './corpse_interaction';
import { corpseInteractionPresent } from './corpse_presence';
import {
  CLASSES,
  ITEMS,
  QUEST_ORDER,
  QUESTS,
  STRIP_MAX_X,
  STRIP_MIN_X,
  WORLD_MAX_X,
  WORLD_MAX_Z,
  WORLD_MIN_X,
  WORLD_MIN_Z,
} from './data';
import { MIR4_GAME_PROFILE } from './game_profile';
import { mir4ArcStageGoal, mir4QuestCurrentStage } from './mir4/arc_quests';
import { mir4SkillUnlockLevel } from './mir4/skill_progression';
import {
  ASCENSION_CHARGES,
  ASCENSION_DURATION,
  canActivateDivineAscension,
  hasDevotion,
  MAX_DEVOTION,
} from './paladin_devotion';
import type { Sim } from './sim';
import {
  angleTo,
  dist2d,
  type Entity,
  GCD,
  INTERACT_RANGE,
  MAX_LEVEL,
  normAngle,
  questObjectiveRequired,
  xpForLevel,
} from './types';
import { worldContentBounds } from './world_content_bounds';

// ---------------------------------------------------------------------------
// Discrete action space for RL agents.
// Movement actions are "held" for the duration of one env step (frame-skip).
// ---------------------------------------------------------------------------

// Ability slots must cover the largest class kit so the RL agent can observe
// and cast every ability a player can learn. Derived from CLASSES (not a fixed
// constant) so adding abilities to any class can never silently leave high
// learn-order slots unreachable. See abilitiesKnownAt(): one entry per ability.
const ABILITY_SLOTS = Math.max(...Object.values(CLASSES).map((c) => c.abilities.length));

export const ACTIONS = [
  'noop', // 0
  'forward', // 1
  'back', // 2
  'turn_left', // 3
  'turn_right', // 4
  'strafe_left', // 5
  'strafe_right', // 6
  'jump', // 7  (forward+jump)
  'target_nearest', // 8
  'attack', // 9  start auto-attack on current target
  // abilities index the learned list in learn order: ability_1 .. ability_N
  ...Array.from({ length: ABILITY_SLOTS }, (_, i) => `ability_${i + 1}`),
  'interact', // loot corpse / pick up object / talk to quest npc
  'stop', // stop moving + stop attacking
  'eat_drink', // consume best food (or water for mana classes) from bags
  'claim_achievement_20101', // MIR4 player-level achievement grade 1
  'claim_achievement_20102', // MIR4 player-level achievement grade 2
  'craft_knowledge_common',
  'craft_knowledge_rare',
  'craft_knowledge_epic',
  'craft_knowledge_legendary',
  'upgrade_skill_1',
  'upgrade_skill_2',
  'upgrade_skill_3',
  'upgrade_skill_4',
  'upgrade_skill_5',
] as const;

export const NUM_ACTIONS = ACTIONS.length;

export function applyAction(sim: Sim, action: number): void {
  const inp = sim.moveInput;
  inp.forward = false;
  inp.back = false;
  inp.turnLeft = false;
  inp.turnRight = false;
  inp.strafeLeft = false;
  inp.strafeRight = false;
  inp.jump = false;
  const name = ACTIONS[action] ?? 'noop';
  switch (name) {
    case 'forward':
      inp.forward = true;
      break;
    case 'back':
      inp.back = true;
      break;
    case 'turn_left':
      inp.turnLeft = true;
      inp.forward = true;
      break;
    case 'turn_right':
      inp.turnRight = true;
      inp.forward = true;
      break;
    case 'strafe_left':
      inp.strafeLeft = true;
      break;
    case 'strafe_right':
      inp.strafeRight = true;
      break;
    case 'jump':
      inp.jump = true;
      inp.forward = true;
      break;
    case 'target_nearest':
      sim.targetNearestEnemy();
      break;
    case 'attack':
      sim.startAutoAttack();
      break;
    case 'interact':
      sim.interact();
      break;
    case 'stop':
      sim.stopAutoAttack();
      break;
    case 'eat_drink': {
      const p = sim.player;
      const wantMana = p.resourceType === 'mana' && p.resource < p.maxResource * 0.5;
      const wantHp = p.hp < p.maxHp * 0.6;
      for (const s of sim.inventory) {
        const def = ITEMS[s.itemId];
        if (!def) continue;
        if (wantMana && def.kind === 'drink') {
          sim.useItem(s.itemId);
          break;
        }
        if (wantHp && def.kind === 'food') {
          sim.useItem(s.itemId);
          break;
        }
      }
      break;
    }
    case 'claim_achievement_20101':
      sim.mir4ClaimAchievement(20101);
      break;
    case 'claim_achievement_20102':
      sim.mir4ClaimAchievement(20102);
      break;
    case 'craft_knowledge_common':
      sim.mir4CraftMaterial('knowledge-tome-common');
      break;
    case 'craft_knowledge_rare':
      sim.mir4CraftMaterial('knowledge-tome-rare');
      break;
    case 'craft_knowledge_epic':
      sim.mir4CraftMaterial('knowledge-tome-epic');
      break;
    case 'craft_knowledge_legendary':
      sim.mir4CraftMaterial('knowledge-tome-legendary');
      break;
    case 'noop':
      break;
    default: {
      if (name.startsWith('ability_')) {
        sim.castAbilityBySlot(parseInt(name.slice(8), 10) - 1);
      } else if (name.startsWith('upgrade_skill_') && sim.player.mir4) {
        const slot = Number.parseInt(name.slice('upgrade_skill_'.length), 10);
        const skill = mir4SkillsForClass(sim.player.mir4.classId as Mir4ClassId).find(
          (candidate) => candidate.slot === slot,
        );
        if (skill) {
          const current = sim.players.get(sim.playerId)?.mir4SkillLevels?.[skill.skillId] ?? 1;
          sim.mir4UpgradeSkill(skill.skillId, current);
        }
      }
    }
  }
  // If the player is dead, any action releases the spirit and resurrects at the
  // graveyard's Spirit Healer. An RL bot has no corpse-run policy, so the in-place
  // Spirit Healer resurrect (with Resurrection Sickness at level 10+) is what keeps
  // the episode going; without the resurrect the bot would be stuck a permanent ghost
  // (releaseSpirit now raises a ghost rather than instantly respawning).
  if (sim.player.dead) {
    sim.releaseSpirit();
    sim.resurrectAtSpiritHealer();
  }
}

// ---------------------------------------------------------------------------
// Observation vector
// ---------------------------------------------------------------------------

const NEARBY_MOBS = 5;

export function obsSize(): number {
  return 16 + ABILITY_SLOTS * 2 + 9 + NEARBY_MOBS * 6 + 5 + QUEST_ORDER.length * 2 + 3 + 3 + 1 + 10;
}

export function encodeObs(sim: Sim): number[] {
  const p = sim.player;
  const obs: number[] = [];
  const isMir4 = sim.cfg.gameProfile === MIR4_GAME_PROFILE;
  const authoredBounds = sim.cfg.world
    ? worldContentBounds(sim.cfg.world, STRIP_MIN_X, STRIP_MAX_X)
    : null;
  const minX = authoredBounds?.minX ?? WORLD_MIN_X;
  const maxX = authoredBounds?.maxX ?? WORLD_MAX_X;
  const minZ = authoredBounds?.minZ ?? WORLD_MIN_Z;
  const maxZ = authoredBounds?.maxZ ?? WORLD_MAX_Z;
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const halfWidth = Math.max(1, (maxX - minX) / 2);
  const halfDepth = Math.max(1, (maxZ - minZ) / 2);
  let observedX = clamp((p.pos.x - centerX) / halfWidth, -1, 1);
  let observedZ = clamp((p.pos.z - centerZ) / halfDepth, -1, 1);
  if (isMir4 && sim.cfg.world && sim.cfg.world.zones.length > 0) {
    const zones = sim.cfg.world.zones;
    let zoneIndex = zones.findIndex(
      (zone) =>
        p.pos.x >= (zone.xMin ?? STRIP_MIN_X) &&
        p.pos.x < (zone.xMax ?? STRIP_MAX_X) &&
        p.pos.z >= zone.zMin &&
        p.pos.z < zone.zMax,
    );
    if (zoneIndex < 0) {
      let nearest = Infinity;
      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index]!;
        const dx = Math.max(
          (zone.xMin ?? STRIP_MIN_X) - p.pos.x,
          0,
          p.pos.x - (zone.xMax ?? STRIP_MAX_X),
        );
        const dz = Math.max(zone.zMin - p.pos.z, 0, p.pos.z - zone.zMax);
        const distance = dx * dx + dz * dz;
        if (distance < nearest) {
          nearest = distance;
          zoneIndex = index;
        }
      }
    }
    const zone = zones[Math.max(0, zoneIndex)]!;
    const zoneMinX = zone.xMin ?? STRIP_MIN_X;
    const zoneMaxX = zone.xMax ?? STRIP_MAX_X;
    observedX = clamp(((p.pos.x - zoneMinX) / Math.max(1, zoneMaxX - zoneMinX)) * 2 - 1, -1, 1);
    const localZ = clamp((p.pos.z - zone.zMin) / Math.max(1, zone.zMax - zone.zMin), 0, 1);
    // The campaign bends in world X/Z, so global Z is no longer progression.
    // Fold map ordinal and local north/south position into one continuous axis:
    // bots retain local navigation while later maps always observe later values.
    observedZ = clamp(((Math.max(0, zoneIndex) + localZ) / zones.length) * 2 - 1, -1, 1);
  }

  // --- self (16) ---
  obs.push(p.hp / Math.max(1, p.maxHp));
  obs.push(p.resource / Math.max(1, p.maxResource));
  const levelCap = isMir4 ? MIR4_MAX_LEVEL : MAX_LEVEL;
  obs.push(p.level / levelCap);
  const mir4RequiredXp = isMir4 ? Number(mir4LevelRow(p.mir4?.classId ?? 1, p.level)?.[2] ?? 0) : 0;
  obs.push(
    p.level >= levelCap
      ? 1
      : isMir4
        ? sim.xp / Math.max(1, mir4RequiredXp)
        : sim.xp / xpForLevel(p.level),
  );
  obs.push(observedX);
  obs.push(observedZ);
  obs.push(Math.sin(p.facing));
  obs.push(Math.cos(p.facing));
  obs.push(p.gcdRemaining / GCD);
  obs.push(p.castTotal > 0 && p.castingAbility ? p.castRemaining / p.castTotal : 0);
  obs.push(p.dead ? 1 : 0);
  obs.push(p.inCombat ? 1 : 0);
  obs.push(p.autoAttack ? 1 : 0);
  const destructionRuin = sim.talentSpec === 'destruction' ? ruinAmount(p) : 0;
  const specializationResource =
    sim.talentSpec === 'affliction'
      ? doomValue(p) / AFFLICTION_DOOM_MAX
      : sim.talentSpec === 'demonology'
        ? soulFragmentCount(p) / 5
        : sim.talentSpec === 'destruction'
          ? destructionRuin / 5
          : p.comboPoints / 5;
  obs.push(specializationResource);
  obs.push(p.sitting || p.eating || p.drinking ? 1 : 0);
  obs.push(sim.time > p.overpowerUntil ? 0 : 1); // dodge proc available

  // --- abilities (10 x 2 = 20) ---
  const selectedTarget = p.targetId !== null ? (sim.entities.get(p.targetId) ?? null) : null;
  let dominionComposition: number | null = null;
  for (let i = 0; i < ABILITY_SLOTS; i++) {
    const known = sim.known[i];
    if (!known) {
      obs.push(0, 0);
      continue;
    }
    const cooldownKey = known.cooldownId ?? known.def.id;
    const cd = canUseForbiddenReflection(p, known.def.id) ? 0 : (p.cooldowns.get(cooldownKey) ?? 0);
    const requiredAuraReady =
      !known.def.requiresAuraKind ||
      p.auras.some(
        (aura) =>
          aura.kind === known.def.requiresAuraKind &&
          (aura.stacks ?? 1) >= (known.def.requiresAuraStacks ?? 1),
      );
    const requiresPrimaryEye =
      known.def.id === 'sentence' ||
      known.def.id === 'coven' ||
      known.def.id === 'possess_evil_eye' ||
      known.def.id === 'hour_of_judgment';
    const afflictionEyeReady =
      !requiresPrimaryEye ||
      !!selectedTarget?.auras.some(
        (aura) => aura.sourceId === p.id && aura.kind === 'affliction_eye',
      );
    const dominionTemplateId = dominionTemplateForAbility(known.def.id);
    let dominionReady = true;
    if (dominionTemplateId !== null) {
      if (dominionComposition === null) {
        dominionComposition = dominionCompositionMaskForOwner(sim.entities.values(), p.id);
      }
      dominionReady = dominionSummonBlockFromMask(dominionComposition, dominionTemplateId) === null;
    }
    const devotionReady =
      known.def.id === 'divine_ascension'
        ? canActivateDivineAscension(p)
        : !known.def.devotionCost || hasDevotion(p, known.def.devotionCost);
    const ready =
      cd <= 0 &&
      devotionReady &&
      p.resource >= known.cost &&
      destructionRuin >= (known.def.ruinCost ?? 0) &&
      soulFragmentCount(p) >= (known.def.soulFragmentCost ?? 0) &&
      requiredAuraReady &&
      afflictionEyeReady &&
      dominionReady &&
      (known.def.offGcd || p.gcdRemaining <= 0);
    obs.push(ready ? 1 : 0);
    obs.push(known.def.cooldown > 0 ? cd / known.def.cooldown : 0);
  }

  // --- target (9) ---
  const target = selectedTarget;
  if (target && (!target.dead || corpseInteractionPresent(target))) {
    const d = dist2d(p.pos, target.pos);
    const rel = normAngle(angleTo(p.pos, target.pos) - p.facing);
    obs.push(1);
    obs.push(target.hp / Math.max(1, target.maxHp));
    obs.push(clamp((target.level - p.level) / 5, -1, 1));
    // distance shares the d/40 scale used for nearby mobs and the interactable
    // below; clamp to the same 1.5 ceiling (the 60-unit observation radius) so a
    // target beyond 40 units stays distinguishable instead of saturating at 1
    obs.push(clamp(d / 40, 0, 1.5));
    obs.push(Math.sin(rel));
    obs.push(Math.cos(rel));
    obs.push(target.hostile ? 1 : 0);
    obs.push(target.dead && corpseInteractionPresent(target) ? 1 : 0);
    obs.push(target.aggroTargetId === p.id ? 1 : 0);
  } else {
    obs.push(0, 0, 0, 0, 0, 0, 0, 0, 0);
  }

  // --- nearest mobs (5 x 6 = 30) ---
  const mobs: { e: Entity; d: number }[] = [];
  for (const e of sim.entities.values()) {
    if (e.kind !== 'mob' || e.dead || !e.hostile) continue;
    const d = dist2d(p.pos, e.pos);
    if (d < 60) mobs.push({ e, d });
  }
  mobs.sort((a, b) => a.d - b.d);
  for (let i = 0; i < NEARBY_MOBS; i++) {
    if (i < mobs.length) {
      const { e, d } = mobs[i];
      const rel = normAngle(angleTo(p.pos, e.pos) - p.facing);
      obs.push(clamp(d / 40, 0, 1.5));
      obs.push(Math.sin(rel));
      obs.push(Math.cos(rel));
      obs.push(e.hp / Math.max(1, e.maxHp));
      obs.push(clamp((e.level - p.level) / 5, -1, 1));
      obs.push(e.aggroTargetId === p.id ? 1 : 0);
    } else {
      obs.push(1.5, 0, 0, 0, 0, 0);
    }
  }

  // --- proximity interactable (5): corpse, ground object, or quest npc ---
  // Match the no-target Sim.interact path: only advertise entities the interact
  // action can select now, and preserve its corpse, object, then quest-NPC priority.
  // Noticeboards own a narrower authored radius; ordinary objects keep the shared
  // five-yard interaction range.
  type Interactable = { e: Entity; d2: number; type: number };
  let bestCorpse: Interactable | null = null;
  let bestCorpseD2 = INTERACT_RANGE * INTERACT_RANGE;
  let bestObject: Interactable | null = null;
  let bestObjectD2 = INTERACT_RANGE * INTERACT_RANGE;
  let bestQuestEntity: Interactable | null = null;
  let bestQuestEntityD2 = INTERACT_RANGE * INTERACT_RANGE;
  sim.grid.forEachInRadius(p.pos.x, p.pos.z, INTERACT_RANGE, (e, d2) => {
    if (
      corpseInteractionPresent(e) &&
      corpseInteractionAvailability(sim.ctx, e, p.id, true).canInteract &&
      d2 < bestCorpseD2
    ) {
      bestCorpse = { e, d2, type: 0.33 };
      bestCorpseD2 = d2;
    }
    if (e.kind === 'object' && e.lootable && d2 < bestObjectD2) {
      const noticeboardDef = noticeboardDefByEntityId(sim.noticeboardDefinitions, e.id);
      if (!noticeboardDef || d2 <= noticeboardDef.interactionRadius ** 2) {
        bestObject = { e, d2, type: 0.66 };
        bestObjectD2 = d2;
      }
    }
    const questEntity =
      e.kind === 'npc' || (e.kind === 'mob' && !e.hostile && !e.dead && e.questIds.length > 0);
    if (questEntity && d2 < bestQuestEntityD2) {
      bestQuestEntity = { e, d2, type: 1 };
      bestQuestEntityD2 = d2;
    }
  });
  // Re-read through wider types: TypeScript cannot see the closure assignments above.
  const best =
    (bestCorpse as Interactable | null) ??
    (bestObject as Interactable | null) ??
    (bestQuestEntity as Interactable | null);
  if (best) {
    const d = Math.sqrt(best.d2);
    const rel = normAngle(angleTo(p.pos, best.e.pos) - p.facing);
    obs.push(1, clamp(d / 40, 0, 1.5), Math.sin(rel), Math.cos(rel), best.type);
  } else {
    obs.push(0, 1.5, 0, 0, 0);
  }

  // --- quests (stable classic-sized window x 2) ---
  if (isMir4) {
    const progressById = sim.players.get(sim.playerId)?.mir4ArcQuests ?? {};
    const firstIncomplete = MIR4_QUESTS_MAIN.findIndex(
      (quest) => progressById[quest.questId]?.state !== 'done',
    );
    const start =
      firstIncomplete >= 0
        ? firstIncomplete
        : Math.max(0, MIR4_QUESTS_MAIN.length - QUEST_ORDER.length);
    for (let offset = 0; offset < QUEST_ORDER.length; offset++) {
      const quest = MIR4_QUESTS_MAIN[start + offset];
      const progress = quest ? progressById[quest.questId] : undefined;
      const state = progress?.state;
      obs.push(state === 'done' ? 1 : state === 'ready' ? 0.66 : state === 'active' ? 0.33 : 0);
      if (!progress || !quest) {
        obs.push(0);
        continue;
      }
      if (state === 'done' || state === 'ready') {
        obs.push(1);
        continue;
      }
      const stageCount = Math.max(1, progress.selectedStageIndexes?.length ?? quest.stages.length);
      const stage = mir4QuestCurrentStage(progress);
      const withinStage = stage ? Math.min(1, progress.stageProgress / mir4ArcStageGoal(stage)) : 0;
      obs.push(Math.min(1, (progress.stageIndex + withinStage) / stageCount));
    }
  } else {
    for (const qid of QUEST_ORDER) {
      const state = sim.questState(qid);
      obs.push(state === 'done' ? 1 : state === 'ready' ? 0.66 : state === 'active' ? 0.33 : 0);
      const qp = sim.questLog.get(qid);
      if (qp) {
        const quest = QUESTS[qid];
        let total = 0,
          have = 0;
        quest.objectives.forEach((_objective, i) => {
          const required = questObjectiveRequired(quest, qp, i);
          total += required;
          have += Math.min(qp.counts[i], required);
        });
        obs.push(total > 0 ? have / total : 0);
      } else {
        obs.push(state === 'done' ? 1 : 0);
      }
    }
  }

  // --- Paladin class resource (3), appended to preserve every existing index ---
  // MIR4 level-achievement progress and its source-backed currencies. Keep the
  // three values profile-neutral in shape and bounded to the Python Box(-2, 2).
  const mir4Meta = isMir4 ? sim.players.get(sim.playerId) : undefined;
  obs.push(
    isMir4 ? clamp((mir4Meta?.mir4AchievementClears?.[201] ?? 0) / 2, 0, 1) : 0,
    isMir4 ? clamp((mir4Meta?.mir4Currencies?.darksteel ?? 0) / 1_000, 0, 2) : 0,
    isMir4 ? clamp((mir4Meta?.mir4SkillResources?.effectPoints ?? 0) / 500, 0, 2) : 0,
  );

  // Non-Paladins emit zeros so the cross-class observation shape stays fixed.
  const devotion = p.paladinDevotion;
  obs.push(devotion ? devotion.value / MAX_DEVOTION : 0);
  obs.push(devotion ? devotion.ascensionCharges / ASCENSION_CHARGES : 0);
  obs.push(devotion ? devotion.ascensionRemaining / ASCENSION_DURATION : 0);

  // The retired Skill Tome wallet stays in its original observation slot so
  // trained consumers keep all prior indices. New progression uses the
  // crafted knowledge-tome fields below; this legacy slot normally stays 0.
  obs.push(isMir4 ? clamp((mir4Meta?.mir4SkillResources?.skillTomes ?? 0) / 3, 0, 2) : 0);

  // Current skill-progression economy, appended so existing observation
  // indices stay stable: fragment + four tome balances, then ranks for the
  // five regular class skills (locked skills remain zero).
  const materials = mir4Meta?.mir4Materials;
  obs.push(
    isMir4 ? clamp((materials?.knowledgeFragment ?? 0) / 5, 0, 2) : 0,
    isMir4 ? clamp((materials?.knowledgeTomeCommon ?? 0) / 10, 0, 2) : 0,
    isMir4 ? clamp((materials?.knowledgeTomeRare ?? 0) / 10, 0, 2) : 0,
    isMir4 ? clamp((materials?.knowledgeTomeEpic ?? 0) / 10, 0, 2) : 0,
    isMir4 ? clamp((materials?.knowledgeTomeLegendary ?? 0) / 10, 0, 2) : 0,
  );
  const mir4Skills = p.mir4 ? mir4SkillsForClass(p.mir4.classId as Mir4ClassId) : [];
  for (let slot = 1; slot <= 5; slot++) {
    const skill = mir4Skills.find((candidate) => candidate.slot === slot);
    const unlocked = !!skill && p.level >= mir4SkillUnlockLevel(slot);
    const rank = unlocked && skill ? (mir4Meta?.mir4SkillLevels?.[skill.skillId] ?? 1) : 0;
    obs.push(clamp(rank / 15, 0, 1));
  }

  return obs;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
