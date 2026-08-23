export const MIR4_PLAYTEST_ROSTER = Object.freeze([
  Object.freeze({
    classKey: 'warrior',
    classId: 1,
    namePrefix: 'Aldric',
    initialSkillIds: Object.freeze([1102, 1104, 1304, 1401]),
  }),
  Object.freeze({
    classKey: 'elementalist',
    classId: 2,
    namePrefix: 'Elyra',
    initialSkillIds: Object.freeze([2101, 2111, 2501, 2301]),
  }),
  Object.freeze({
    classKey: 'taoist',
    classId: 3,
    namePrefix: 'Sora',
    initialSkillIds: Object.freeze([3506, 3101, 3301, 3104]),
  }),
  Object.freeze({
    classKey: 'arbalist',
    classId: 4,
    namePrefix: 'Mira',
    initialSkillIds: Object.freeze([4101, 4106, 4102, 4103]),
  }),
  Object.freeze({
    classKey: 'lancer',
    classId: 5,
    namePrefix: 'Kael',
    initialSkillIds: Object.freeze([5201, 5101, 5104, 5301]),
  }),
]);

export function selectMir4PlaytestRoster(selector) {
  if (selector === undefined || String(selector).trim() === '') return MIR4_PLAYTEST_ROSTER;
  const requested = String(selector)
    .split(',')
    .map((classKey) => classKey.trim().toLowerCase())
    .filter(Boolean);
  if (new Set(requested).size !== requested.length) {
    throw new Error('SOAK_CLASSES contains a duplicate class');
  }
  const byClass = new Map(MIR4_PLAYTEST_ROSTER.map((entry) => [entry.classKey, entry]));
  return Object.freeze(
    requested.map((classKey) => {
      const entry = byClass.get(classKey);
      if (!entry) throw new Error(`SOAK_CLASSES contains unknown class: ${classKey}`);
      return entry;
    }),
  );
}

// Kept runtime-local because this helper runs directly in Node without a
// TypeScript loader. A unit test pins it to the authoritative simulation list.
export const MIR4_BOT_UI_TUTORIAL_QUEST_IDS = Object.freeze([
  'M01-Q01',
  'M02-Q03',
  'M03-Q03',
  'M04-Q05',
  'M05-Q02',
  'M08-Q05',
  'M12-Q05',
  'M14-Q05',
  'M16-Q04',
  'M18-Q03',
  'M20-Q05',
  'M20-Q06',
]);

// Informational tutorials normally occupy the fourth authored stage. M05-Q02
// first performs a real selective hunt, so its party-finder lesson is one stage
// later. Keep this runtime-local beside the mirrored allowlist.
const MIR4_BOT_UI_TUTORIAL_STAGE_INDEX = Object.freeze({ 'M05-Q02': 4 });

// This helper runs in plain Node, so keep the two production WoC waypoint
// targets local and pin them against MIR4_WOC_TUTORIAL_PORTALS in the unit
// suite. They use the same portal runtime as the original Duskfall passage.
export const MIR4_BOT_PORTAL_TUTORIAL_TARGETS = Object.freeze({
  'M02-Q01': Object.freeze({ x: -400, z: 250 }),
  'M09-Q04': Object.freeze({ x: -55, z: 330 }),
});

function alphaFingerprint(value) {
  let hash = 2_166_136_261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16_777_619) >>> 0;
  }
  let out = '';
  for (let index = 0; index < 6; index += 1) {
    out += String.fromCharCode(97 + (hash % 26));
    hash = Math.floor(hash / 26);
  }
  return out;
}

export function mir4BotAccountIdentity(namespace, rosterEntry) {
  const cleanNamespace = String(namespace)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  if (cleanNamespace.length < 3)
    throw new Error('bot namespace needs at least 3 letters or digits');
  return {
    username: `m4${cleanNamespace}${rosterEntry.classId}`.slice(0, 24),
    characterName:
      `${rosterEntry.namePrefix}${alphaFingerprint(`${cleanNamespace}:${rosterEntry.classKey}`)}`.slice(
        0,
        16,
      ),
  };
}

const emptyProgress = () => ({
  levelDelta: 0,
  xpEvents: 0,
  xpEarned: 0,
  copperDelta: 0,
  questAdvances: 0,
  questsCompleted: 0,
  equipmentEnhancements: 0,
  lootEvents: 0,
  deaths: 0,
  recoveries: 0,
  errorEvents: 0,
});

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function planMir4PvpChallenge(challenger, defender) {
  const dx = finiteNumber(defender?.x) - finiteNumber(challenger?.x);
  const dz = finiteNumber(defender?.z) - finiteNumber(challenger?.z);
  const facing = Math.atan2(dx, dz);
  return {
    ready: Math.hypot(dx, dz) <= 20,
    facing,
    move: Math.hypot(dx, dz) <= 20 ? {} : { f: 1 },
  };
}

export function mir4BotHasDuelRequest(events, challengerPid) {
  return (
    Number.isSafeInteger(challengerPid) &&
    events?.some?.((event) => event?.type === 'duelRequest' && event.fromPid === challengerPid) ===
      true
  );
}

function levelOf(self) {
  return Math.max(1, Math.floor(finiteNumber(self?.lv ?? self?.level, 1)));
}

function questFingerprint(progress) {
  return `${progress?.state ?? 'unknown'}:${finiteNumber(progress?.stageIndex)}:${finiteNumber(progress?.stageProgress)}`;
}

function equipmentEnhancements(mir4) {
  const result = new Map();
  for (const [itemId, instance] of Object.entries(mir4?.mir4EquipmentInstances ?? {})) {
    result.set(itemId, Math.max(0, Math.floor(finiteNumber(instance?.enhancement))));
  }
  return result;
}

function appendTimeline(tracker, atMs, kind, detail = {}) {
  tracker.timeline.push({ atMs, kind, ...detail });
  if (tracker.timeline.length > 2_000) tracker.timeline.shift();
}

function markProgress(tracker, atMs) {
  tracker.lastProgressAt = Math.max(tracker.lastProgressAt, atMs);
}

export function createMir4BotTracker(rosterEntry, characterName, startedAt) {
  return {
    identity: {
      classKey: rosterEntry.classKey,
      classId: rosterEntry.classId,
      characterName,
    },
    startedAt,
    firstSnapshotAt: null,
    lastSnapshotAt: null,
    lastProgressAt: startedAt,
    snapshots: 0,
    baseline: null,
    latest: null,
    progress: emptyProgress(),
    timeline: [],
    eventCounts: {},
    errors: [],
    questFingerprints: new Map(),
    equipmentEnhancements: new Map(),
    deathActive: false,
    playerId: null,
  };
}

export function recordMir4BotSnapshot(tracker, self, atMs) {
  if (!self || typeof self !== 'object') return tracker;
  if (Number.isSafeInteger(self.id) && self.id > 0) tracker.playerId = self.id;
  const level = levelOf(self);
  const xp = Math.max(0, Math.floor(finiteNumber(self.xp)));
  const copper = Math.max(0, Math.floor(finiteNumber(self.copper)));
  const hp = Math.max(0, finiteNumber(self.hp));
  const mir4 = self.mir4 ?? {};
  const first = tracker.baseline === null;
  if (first) {
    tracker.firstSnapshotAt = atMs;
    tracker.baseline = { level, xp, copper };
  }

  const previous = tracker.latest;
  tracker.snapshots += 1;
  tracker.lastSnapshotAt = atMs;
  tracker.latest = {
    level,
    xp,
    copper,
    hp,
    maxHp: Math.max(0, finiteNumber(self.mhp ?? self.maxHp)),
    dead: self.dead === true || hp <= 0,
    x: finiteNumber(self.x),
    z: finiteNumber(self.z),
    autoBattle: mir4.autoBattle?.mode ?? null,
    autoQuestId: mir4.mir4AutoQuest?.questId ?? null,
    autoQuestPhase: mir4.mir4AutoQuest?.phase ?? null,
    autoQuestSiteIndex: mir4.mir4AutoQuest?.siteIndex ?? null,
    autoQuestSuspended: mir4.mir4AutoQuest?.suspended === true,
  };
  tracker.progress.levelDelta = level - tracker.baseline.level;
  tracker.progress.copperDelta = copper - tracker.baseline.copper;
  if (previous && level > previous.level) {
    appendTimeline(tracker, atMs, 'level', { from: previous.level, to: level });
    markProgress(tracker, atMs);
  }

  const nextQuests = new Map();
  for (const [questId, progress] of Object.entries(mir4.mir4ArcQuests ?? {})) {
    const fingerprint = questFingerprint(progress);
    nextQuests.set(questId, fingerprint);
    const prior = tracker.questFingerprints.get(questId);
    if (!first && prior !== fingerprint) {
      tracker.progress.questAdvances += 1;
      if (progress?.state === 'done' && !prior?.startsWith('done:')) {
        tracker.progress.questsCompleted += 1;
      }
      appendTimeline(tracker, atMs, 'quest', {
        questId,
        state: progress?.state,
        stageIndex: progress?.stageIndex,
        stageProgress: progress?.stageProgress,
      });
      markProgress(tracker, atMs);
    }
  }
  tracker.questFingerprints = nextQuests;

  const nextEnhancements = equipmentEnhancements(mir4);
  if (!first) {
    for (const [itemId, levelNow] of nextEnhancements) {
      const prior = tracker.equipmentEnhancements.get(itemId);
      if (prior !== undefined && levelNow > prior) {
        tracker.progress.equipmentEnhancements += levelNow - prior;
        appendTimeline(tracker, atMs, 'equipment', { itemId, from: prior, to: levelNow });
        markProgress(tracker, atMs);
      }
    }
  }
  tracker.equipmentEnhancements = nextEnhancements;

  const dead = tracker.latest.dead;
  if (dead && !tracker.deathActive) {
    tracker.deathActive = true;
    tracker.progress.deaths += 1;
    appendTimeline(tracker, atMs, 'death');
  } else if (!dead && tracker.deathActive) {
    tracker.deathActive = false;
    tracker.progress.recoveries += 1;
    appendTimeline(tracker, atMs, 'recovery');
  }
  return tracker;
}

export function recordMir4BotEvents(tracker, events, atMs) {
  for (const event of events ?? []) {
    if (!event || typeof event.type !== 'string') continue;
    tracker.eventCounts[event.type] = (tracker.eventCounts[event.type] ?? 0) + 1;
    if (event.type === 'xp') {
      tracker.progress.xpEvents += 1;
      tracker.progress.xpEarned += Math.max(0, finiteNumber(event.amount));
      markProgress(tracker, atMs);
    } else if (event.type === 'loot') {
      tracker.progress.lootEvents += 1;
    } else if (event.type === 'error') {
      tracker.progress.errorEvents += 1;
      if (tracker.errors.length < 50) tracker.errors.push(String(event.text ?? 'Unknown error'));
    } else if (
      event.type === 'death' &&
      event.entityId === tracker.playerId &&
      !tracker.deathActive
    ) {
      tracker.deathActive = true;
      tracker.progress.deaths += 1;
      appendTimeline(tracker, atMs, 'death', { killerId: event.killerId });
    }
  }
  return tracker;
}

function achievementClaimed(clears, achievementId) {
  return Object.hasOwn(clears ?? {}, achievementId);
}

const MIR4_CATALOG_REQUIRED_LEVEL = Object.freeze([0, 1, 10, 25, 40, 60, 80]);

function mir4CatalogIdentity(itemId) {
  const match = /^991(0[1-8])(0[1-5])(0[1-6])$/.exec(String(itemId));
  if (!match) return null;
  return { slot: Number(match[1]), classId: Number(match[2]), rank: Number(match[3]) };
}

function bestOwnedMir4Equipment(mir4, level) {
  const classId = finiteNumber(mir4?.classId);
  const bestBySlot = new Map();
  for (const [rawItemId, count] of Object.entries(mir4?.mir4ArcRewards?.items ?? {})) {
    if (finiteNumber(count) < 1) continue;
    const itemId = Number(rawItemId);
    const identity = mir4CatalogIdentity(itemId);
    if (
      !identity ||
      identity.classId !== classId ||
      level < (MIR4_CATALOG_REQUIRED_LEVEL[identity.rank] ?? Number.POSITIVE_INFINITY)
    ) {
      continue;
    }
    const current = bestBySlot.get(identity.slot);
    if (!current || identity.rank > current.rank)
      bestBySlot.set(identity.slot, { itemId, ...identity });
  }
  return [...bestBySlot.values()]
    .sort((left, right) => left.slot - right.slot)
    .filter((candidate) => {
      const currentItemId = mir4?.mir4Equipment?.[candidate.slot];
      if (currentItemId !== candidate.itemId) return true;
      const currentEnhancement = finiteNumber(
        mir4?.mir4EquipmentInstances?.[candidate.itemId]?.enhancement,
      );
      const inheritedEnhancement = Object.entries(mir4?.mir4EquipmentInstances ?? {}).reduce(
        (best, [sourceItemId, instance]) => {
          const source = mir4CatalogIdentity(sourceItemId);
          return source?.classId === classId && source.slot === candidate.slot
            ? Math.max(best, finiteNumber(instance?.enhancement))
            : best;
        },
        0,
      );
      return inheritedEnhancement > currentEnhancement;
    });
}

export function planMir4ProgressionActions(self, rosterEntry) {
  if (!self || typeof self !== 'object') return [];
  if (self.gh) return [{ cmd: 'resurrect_healer' }];
  if (self.dead === true || finiteNumber(self.hp, 1) <= 0) return [{ cmd: 'release' }];
  const mir4 = self.mir4;
  if (!mir4 || typeof mir4 !== 'object') return [];
  const actions = [];
  if (mir4.autoBattle?.mode !== 'battle') actions.push({ cmd: 'mir4', m: 'auto', on: true });
  if (!mir4.mir4AutoQuest) actions.push({ cmd: 'mir4', m: 'quest', on: true });

  // Every regional side profession follows the authored S01 receipt shape:
  // gather four materials, then use the existing Crafting-window action.
  const regionalProfession = Object.entries(mir4.mir4ArcQuests ?? {}).find(
    ([questId, progress]) =>
      /^M\d{2}-S01$/.test(questId) && progress?.state === 'active' && progress.stageIndex === 2,
  );
  if (regionalProfession) actions.push({ cmd: 'mir4', m: 'campaignProfession' });

  for (const equipment of bestOwnedMir4Equipment(mir4, levelOf(self))) {
    actions.push({ cmd: 'mir4', m: 'equipItem', itemId: equipment.itemId });
  }

  for (const questId of MIR4_BOT_UI_TUTORIAL_QUEST_IDS) {
    const tutorial = mir4.mir4ArcQuests?.[questId];
    const stageIndex = MIR4_BOT_UI_TUTORIAL_STAGE_INDEX[questId] ?? 3;
    if (tutorial?.state === 'active' && tutorial.stageIndex === stageIndex) {
      actions.push({ cmd: 'mir4', m: 'ackTutorial', questId });
    }
  }

  const level = levelOf(self);
  if (level >= 5 && !achievementClaimed(mir4.mir4AchievementClears, 20101)) {
    actions.push({ cmd: 'mir4', m: 'claimAchievement', achievementId: 20101 });
  }
  if (level >= 10 && !achievementClaimed(mir4.mir4AchievementClears, 20102)) {
    actions.push({ cmd: 'mir4', m: 'claimAchievement', achievementId: 20102 });
  }

  const equipmentTutorial = mir4.mir4ArcQuests?.['M01-Q03'];
  if (equipmentTutorial?.state === 'active' && equipmentTutorial.stageIndex === 3) {
    const earnedItemId = Object.entries(mir4.mir4ArcRewards?.items ?? {}).find(
      ([itemId, count]) => {
        const identity = mir4CatalogIdentity(itemId);
        return (
          finiteNumber(count) > 0 &&
          identity?.slot === 1 &&
          identity.classId === finiteNumber(mir4.classId)
        );
      },
    )?.[0];
    if (
      earnedItemId &&
      !actions.some((action) => action.m === 'equipItem' && action.itemId === Number(earnedItemId))
    ) {
      actions.push({ cmd: 'mir4', m: 'equipItem', itemId: Number(earnedItemId) });
    }
  }

  const firstCraftTutorial = ['M01-Q04', 'M13-Q03']
    .map((questId) => mir4.mir4ArcQuests?.[questId])
    .find((progress) => progress?.state === 'active' && progress.stageIndex === 3);
  if (
    firstCraftTutorial &&
    finiteNumber(mir4.mir4Materials?.sunStone) >= 1 &&
    finiteNumber(self.copper) >= 5_000
  ) {
    actions.push({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'solar-scroll' });
  }

  const weaponEnhancementTutorial = [
    { questId: 'M01-Q06', stageIndex: 3, targetLevel: 2 },
    { questId: 'M04-Q03', stageIndex: 3, targetLevel: 5 },
    { questId: 'M07-Q05', stageIndex: 3, targetLevel: 6 },
    { questId: 'M11-Q05', stageIndex: 3, targetLevel: 7 },
    { questId: 'M15-Q05', stageIndex: 3, targetLevel: 8 },
    { questId: 'M17-Q06', stageIndex: 3, targetLevel: 9 },
    { questId: 'M19-Q06', stageIndex: 3, targetLevel: 10 },
  ].find(({ questId, stageIndex }) => {
    const progress = mir4.mir4ArcQuests?.[questId];
    return progress?.state === 'active' && progress.stageIndex === stageIndex;
  });
  if (weaponEnhancementTutorial) {
    const equippedWeaponId = mir4.mir4Equipment?.[1];
    const weaponEnhancement = Number.isSafeInteger(equippedWeaponId)
      ? finiteNumber(mir4.mir4EquipmentInstances?.[equippedWeaponId]?.enhancement)
      : 0;
    const enhancementsRemaining = Math.max(
      0,
      weaponEnhancementTutorial.targetLevel - weaponEnhancement,
    );
    const solarScrolls = finiteNumber(mir4.mir4Materials?.solarScroll);
    const protectedAttempt =
      weaponEnhancementTutorial.targetLevel <= 5 ||
      finiteNumber(mir4.mir4Materials?.solarWard) >= 1 ||
      finiteNumber(mir4.mir4ArcRewards?.guarantees?.['tutorial-first-plus-six']) >= 1 ||
      finiteNumber(
        mir4.mir4ArcRewards?.guarantees?.[
          `tutorial-guided-plus-${weaponEnhancementTutorial.targetLevel}`
        ],
      ) >= 1;
    if (
      enhancementsRemaining > solarScrolls &&
      finiteNumber(mir4.mir4Materials?.sunStone) >= 1 &&
      finiteNumber(self.copper) >= 5_000
    ) {
      actions.push({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'solar-scroll' });
    } else if (
      Number.isSafeInteger(equippedWeaponId) &&
      weaponEnhancement < weaponEnhancementTutorial.targetLevel &&
      solarScrolls >= 1 &&
      protectedAttempt
    ) {
      actions.push({ cmd: 'mir4', m: 'enhanceItem', itemId: equippedWeaponId });
    }
  }

  const spiritFusionTutorial = mir4.mir4ArcQuests?.['M10-Q03'];
  if (spiritFusionTutorial?.state === 'active' && spiritFusionTutorial.stageIndex === 4) {
    const gradeNames = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    const combinableGrade = gradeNames.findIndex((gradeName) =>
      Object.entries(mir4.mir4Spirits?.owned ?? {}).some(
        ([spiritId, count]) => spiritId.includes(`-${gradeName}-`) && finiteNumber(count) >= 4,
      ),
    );
    const replicaCount = finiteNumber(mir4.mir4ArcRewards?.items?.['bound-spirit-replica']);
    if (replicaCount >= 4 || combinableGrade >= 0) {
      actions.push({
        cmd: 'mir4',
        m: 'combineSpirits',
        grade: combinableGrade >= 0 ? combinableGrade + 1 : 1,
      });
    }
  }

  const firstSpiritTutorial = mir4.mir4ArcQuests?.['M02-Q04'];
  if (firstSpiritTutorial?.state === 'active' && firstSpiritTutorial.stageIndex === 3) {
    if (finiteNumber(mir4.mir4ArcRewards?.tickets?.['spirit-ticket-dawn']) >= 1) {
      actions.push({ cmd: 'mir4', m: 'redeemTicket', ticketId: 'spirit-ticket-dawn' });
    } else if (!mir4.mir4Spirits?.pending?.length) {
      const ownedSpiritId = Object.entries(mir4.mir4Spirits?.owned ?? {})
        .filter(([, count]) => finiteNumber(count) >= 1)
        .map(([spiritId]) => spiritId)
        .sort()[0];
      if (ownedSpiritId && mir4.mir4Spirits?.equippedSpiritId !== ownedSpiritId) {
        actions.push({ cmd: 'mir4', m: 'equipSpirit', spiritId: ownedSpiritId });
      }
    }
  }

  const firstEnchantmentTutorial = mir4.mir4ArcQuests?.['M03-Q01'];
  if (firstEnchantmentTutorial?.state === 'active' && firstEnchantmentTutorial.stageIndex === 3) {
    const equippedWeaponId = mir4.mir4Equipment?.[1];
    const instance = Number.isSafeInteger(equippedWeaponId)
      ? mir4.mir4EquipmentInstances?.[equippedWeaponId]
      : null;
    const pending = instance?.pendingRoll;
    if (
      Number.isSafeInteger(equippedWeaponId) &&
      pending?.layer === 'enchantment' &&
      typeof pending.rollId === 'string'
    ) {
      actions.push({
        cmd: 'mir4',
        m: 'resolveLayer',
        itemId: equippedWeaponId,
        layer: 'enchantment',
        rollId: pending.rollId,
        accept: true,
      });
    } else if (
      Number.isSafeInteger(equippedWeaponId) &&
      finiteNumber(mir4.mir4Materials?.lunarSeal) >= 1
    ) {
      actions.push({
        cmd: 'mir4',
        m: 'rollLayer',
        itemId: equippedWeaponId,
        layer: 'enchantment',
      });
    } else if (finiteNumber(mir4.mir4Materials?.moonStone) >= 5) {
      actions.push({ cmd: 'mir4', m: 'craftMaterial', recipeId: 'lunar-seal' });
    }
  }

  const firstBlessingTutorial = mir4.mir4ArcQuests?.['M04-Q04'];
  if (firstBlessingTutorial?.state === 'active' && firstBlessingTutorial.stageIndex === 3) {
    const equippedWeaponId = mir4.mir4Equipment?.[1];
    const instance = Number.isSafeInteger(equippedWeaponId)
      ? mir4.mir4EquipmentInstances?.[equippedWeaponId]
      : null;
    const pending = instance?.pendingRoll;
    if (
      Number.isSafeInteger(equippedWeaponId) &&
      pending?.layer === 'blessing' &&
      typeof pending.rollId === 'string'
    ) {
      actions.push({
        cmd: 'mir4',
        m: 'resolveLayer',
        itemId: equippedWeaponId,
        layer: 'blessing',
        rollId: pending.rollId,
        accept: true,
      });
    } else if (
      Number.isSafeInteger(equippedWeaponId) &&
      finiteNumber(mir4.mir4Materials?.dawnTear) >= 1
    ) {
      actions.push({
        cmd: 'mir4',
        m: 'rollLayer',
        itemId: equippedWeaponId,
        layer: 'blessing',
      });
    }
  }

  const firstMountTutorial = mir4.mir4ArcQuests?.['M03-Q04'];
  if (firstMountTutorial?.state === 'active' && firstMountTutorial.stageIndex === 4) {
    if (finiteNumber(mir4.mir4ArcRewards?.tickets?.['mount-ticket-dawn']) >= 1) {
      actions.push({ cmd: 'mir4', m: 'redeemTicket', ticketId: 'mount-ticket-dawn' });
    } else if (!mir4.mir4Mounts?.pending?.length) {
      const ownedMountId = Object.entries(mir4.mir4Mounts?.owned ?? {})
        .filter(([, count]) => finiteNumber(count) >= 1)
        .map(([mountId]) => mountId)
        .sort()[0];
      if (ownedMountId && mir4.mir4Mounts?.equippedMountId !== ownedMountId) {
        actions.push({ cmd: 'mir4', m: 'equipMount', mountId: ownedMountId });
      }
    }
  }

  const healingPotion = self.inv?.find?.(
    (slot) => slot?.itemId === 'minor_healing_potion' && finiteNumber(slot.count) > 0,
  );
  const potionTutorial = mir4.mir4ArcQuests?.['M01-Q02'];
  const potionLessonAvailable =
    potionTutorial?.state !== 'active' || finiteNumber(potionTutorial.stageIndex) >= 3;
  if (
    healingPotion &&
    potionLessonAvailable &&
    finiteNumber(self.pcd) <= 0 &&
    finiteNumber(self.hp) < finiteNumber(self.mhp ?? self.maxHp)
  ) {
    actions.push({ cmd: 'use', item: 'minor_healing_potion' });
  }

  const firstSkill = rosterEntry?.initialSkillIds?.[0];
  const currentSkillLevel = firstSkill ? (mir4.mir4SkillLevels?.[firstSkill] ?? 1) : 0;
  const resources = mir4.mir4SkillResources;
  if (
    firstSkill &&
    currentSkillLevel === 1 &&
    finiteNumber(self.copper) >= 3_200 &&
    finiteNumber(resources?.effectPoints) >= 400 &&
    finiteNumber(resources?.skillTomes) >= 3
  ) {
    actions.push({
      cmd: 'mir4',
      m: 'upgradeSkill',
      skillId: firstSkill,
      expectedCurrentLevel: 1,
    });
  }

  const mountPending = mir4.mir4Mounts?.pending?.[0]?.id;
  if (typeof mountPending === 'string') {
    actions.push({ cmd: 'mir4', m: 'confirmMount', pendingId: mountPending });
  }
  const spiritPending = mir4.mir4Spirits?.pending?.[0]?.id;
  if (typeof spiritPending === 'string') {
    actions.push({ cmd: 'mir4', m: 'confirmSpirit', pendingId: spiritPending });
  }
  return actions;
}

export function planMir4TutorialEngagement(self, entities, rosterEntry) {
  const portalTutorialQuestId = Object.keys(MIR4_BOT_PORTAL_TUTORIAL_TARGETS).find((questId) => {
    const progress = self?.mir4?.mir4ArcQuests?.[questId];
    return progress?.state === 'active' && progress.stageIndex === 3;
  });
  if (portalTutorialQuestId) {
    const x = finiteNumber(self?.x);
    const z = finiteNumber(self?.z);
    const portal = MIR4_BOT_PORTAL_TUTORIAL_TARGETS[portalTutorialQuestId];
    return [
      {
        t: 'input',
        mi: { f: 1 },
        facing: Math.atan2(portal.x - x, portal.z - z),
      },
    ];
  }

  const progress = self?.mir4?.mir4ArcQuests?.['M01-Q02'];
  const maxHp = finiteNumber(self?.mhp ?? self?.maxHp);
  if (
    progress?.state !== 'active' ||
    progress?.stageIndex !== 3 ||
    finiteNumber(self?.hp) < maxHp ||
    maxHp <= 0
  ) {
    return [];
  }
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const entity of entities?.values?.() ?? []) {
    if (
      (entity?.kind ?? entity?.k) !== 'mob' ||
      entity.dead === true ||
      finiteNumber(entity.hp) <= 0 ||
      !Number.isSafeInteger(entity.id)
    ) {
      continue;
    }
    const dx = finiteNumber(entity.x) - finiteNumber(self.x);
    const dz = finiteNumber(entity.z) - finiteNumber(self.z);
    const distance = Math.hypot(dx, dz);
    if (distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  if (!nearest) return [];
  const dx = finiteNumber(nearest.x) - finiteNumber(self.x);
  const dz = finiteNumber(nearest.z) - finiteNumber(self.z);
  const facing = Math.atan2(dx, dz);
  if (nearestDistance > 2.5) return [{ t: 'input', mi: { f: 1 }, facing }];
  return [
    { t: 'input', mi: {}, facing },
    { cmd: 'mir4', m: 'cast', skill: rosterEntry.initialSkillIds[0], target: nearest.id },
    { cmd: 'mir4', m: 'basic', target: nearest.id },
  ];
}

export function planMir4GrindingEngagement(self, entities, acquireRadiusYards = 30) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const entity of entities?.values?.() ?? []) {
    if (
      (entity?.kind ?? entity?.k) !== 'mob' ||
      entity.dead === true ||
      finiteNumber(entity.hp) <= 0 ||
      entity.hostile === false ||
      entity.runScoped === true ||
      entity.summonedAdd === true ||
      !Number.isSafeInteger(entity.id)
    ) {
      continue;
    }
    const distance = Math.hypot(
      finiteNumber(entity.x) - finiteNumber(self?.x),
      finiteNumber(entity.z) - finiteNumber(self?.z),
    );
    if (distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  if (!nearest) return [];
  const facing = Math.atan2(
    finiteNumber(nearest.x) - finiteNumber(self?.x),
    finiteNumber(nearest.z) - finiteNumber(self?.z),
  );
  if (nearestDistance <= Math.max(0, finiteNumber(acquireRadiusYards, 30))) return [];
  return [{ t: 'input', mi: nearestDistance > 4 ? { f: 1 } : {}, facing }];
}

/**
 * Model the player's required intervention around a collection objective.
 * Auto Mission remains passive: the bot itself clears a nearby threat with
 * ordinary skill/basic commands, then leaves the five-second cast alone.
 */
export function planMir4ThreatIntervention(self, entities, rosterEntry, dangerRadiusYards = 14) {
  if (self?.castingAbility) return [];
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const entity of entities?.values?.() ?? []) {
    if (
      (entity?.kind ?? entity?.k) !== 'mob' ||
      entity.dead === true ||
      finiteNumber(entity.hp) <= 0 ||
      entity.hostile === false ||
      entity.runScoped === true ||
      entity.summonedAdd === true ||
      !Number.isSafeInteger(entity.id)
    ) {
      continue;
    }
    const distance = Math.hypot(
      finiteNumber(entity.x) - finiteNumber(self?.x),
      finiteNumber(entity.z) - finiteNumber(self?.z),
    );
    const attackingPlayer = entity.targetId === self?.id;
    if (!attackingPlayer && distance > Math.max(0, finiteNumber(dangerRadiusYards, 14))) continue;
    if (distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  if (!nearest) return [];
  const facing = Math.atan2(
    finiteNumber(nearest.x) - finiteNumber(self?.x),
    finiteNumber(nearest.z) - finiteNumber(self?.z),
  );
  if (nearestDistance > 4) return [{ t: 'input', mi: { f: 1 }, facing }];
  return [
    { t: 'input', mi: {}, facing },
    { cmd: 'mir4', m: 'cast', skill: rosterEntry.initialSkillIds[0], target: nearest.id },
    { cmd: 'mir4', m: 'basic', target: nearest.id },
  ];
}

function progressionScore(tracker) {
  return (
    tracker.progress.levelDelta * 100 +
    tracker.progress.questAdvances * 25 +
    tracker.progress.questsCompleted * 100 +
    tracker.progress.equipmentEnhancements * 20 +
    Math.min(100, Math.floor(tracker.progress.xpEarned / 10))
  );
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function publicTracker(tracker, endedAt) {
  return {
    identity: tracker.identity,
    snapshots: tracker.snapshots,
    firstSnapshotAt: tracker.firstSnapshotAt,
    lastSnapshotAt: tracker.lastSnapshotAt,
    secondsSinceProgress: Math.max(0, (endedAt - tracker.lastProgressAt) / 1_000),
    baseline: tracker.baseline,
    latest: tracker.latest,
    progress: tracker.progress,
    eventCounts: tracker.eventCounts,
    errors: tracker.errors,
    timeline: tracker.timeline,
    progressionScore: progressionScore(tracker),
  };
}

export function buildMir4PlaytestReport({
  namespace,
  trackers,
  startedAt,
  endedAt,
  stallThresholdMs,
  pvp = null,
}) {
  const bots = trackers.map((tracker) => publicTracker(tracker, endedAt));
  const scores = bots.map((bot) => bot.progressionScore);
  const medianScore = median(scores);
  const findings = [];
  for (const bot of bots) {
    const classKey = bot.identity.classKey;
    if (bot.snapshots === 0) {
      findings.push({ severity: 'critical', code: 'no-authoritative-snapshots', classKey });
      continue;
    }
    if (bot.secondsSinceProgress * 1_000 >= stallThresholdMs) {
      findings.push({
        severity: 'high',
        code: 'progression-stalled',
        classKey,
        secondsSinceProgress: bot.secondsSinceProgress,
        lastPosition: bot.latest ? { x: bot.latest.x, z: bot.latest.z } : null,
        autoQuestId: bot.latest?.autoQuestId ?? null,
        autoQuestPhase: bot.latest?.autoQuestPhase ?? null,
        autoQuestSiteIndex: bot.latest?.autoQuestSiteIndex ?? null,
        autoQuestSuspended: bot.latest?.autoQuestSuspended ?? null,
      });
    }
    if (medianScore > 0 && bot.progressionScore < medianScore * 0.5) {
      findings.push({
        severity: 'high',
        code: 'class-progression-outlier',
        classKey,
        score: bot.progressionScore,
        cohortMedianScore: medianScore,
      });
    }
    if (bot.progress.deaths >= 3 && bot.progress.recoveries < bot.progress.deaths) {
      findings.push({
        severity: 'high',
        code: 'death-recovery-loop',
        classKey,
        deaths: bot.progress.deaths,
        recoveries: bot.progress.recoveries,
      });
    }
    if (bot.progress.errorEvents >= 5) {
      findings.push({
        severity: 'medium',
        code: 'repeated-player-errors',
        classKey,
        count: bot.progress.errorEvents,
        samples: bot.errors.slice(0, 5),
      });
    }
  }
  if (pvp && pvp.status !== 'completed') {
    findings.push({ severity: 'high', code: 'pvp-did-not-complete', status: pvp.status });
  }
  return {
    schemaVersion: 1,
    profile: 'mir4-gameplay-port',
    namespace,
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, (endedAt - startedAt) / 1_000),
    summary: {
      bots: bots.length,
      classesRepresented: new Set(bots.map((bot) => bot.identity.classKey)).size,
      pvpCompleted: pvp?.status === 'completed',
      medianProgressionScore: medianScore,
      findings: findings.length,
    },
    pvp,
    bots,
    findings,
  };
}
