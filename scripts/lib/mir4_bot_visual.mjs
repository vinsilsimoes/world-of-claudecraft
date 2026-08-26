import {
  planMir4EscortIntervention,
  planMir4GrindingEngagement,
  planMir4ProgressionActions,
  planMir4ThreatBattleMode,
  planMir4ThreatIntervention,
  planMir4TutorialEngagement,
  planMir4VendorRestock,
} from './mir4_bot_playtest.mjs';

const MIR4_NATIVE_WEAPON_CANDIDATES = Object.freeze({
  1: Object.freeze(['worn_sword']),
  2: Object.freeze(['gnarled_staff']),
  3: Object.freeze(['rusty_dagger', 'gnarled_staff']),
  4: Object.freeze(['rusty_hatchet']),
  5: Object.freeze(['ironbark_boar_spear', 'training_mace']),
});
const MIR4_HEALING_VENDOR_RANGE = 7;

function finiteNumber(value, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function inventoryHas(self, itemId) {
  return (
    self?.inv?.some?.((slot) => slot?.itemId === itemId && finiteNumber(slot.count) > 0) === true
  );
}

function planMir4NativeEquipment(self, rosterEntry) {
  if (self?.dead === true || self?.gh === true || finiteNumber(self?.hp, 1) <= 0) return [];
  const classId = Math.floor(finiteNumber(self?.mir4?.classId, rosterEntry?.classId));
  const candidates = MIR4_NATIVE_WEAPON_CANDIDATES[classId] ?? [];
  if (candidates.includes(self?.eq?.mainhand)) return [];
  const item = candidates.find((itemId) => inventoryHas(self, itemId));
  if (!item) return [];
  return [{ cmd: 'equip', item }];
}

function planMir4HealingVendorApproach(self, entities) {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const entity of entities?.values?.() ?? []) {
    if (entity?.kind !== 'npc' || !entity?.vendorItems?.includes?.('minor_healing_potion')) {
      continue;
    }
    const dx = finiteNumber(entity.x) - finiteNumber(self?.x);
    const dz = finiteNumber(entity.z) - finiteNumber(self?.z);
    const distance = Math.hypot(dx, dz);
    if (
      distance < nearestDistance ||
      (distance === nearestDistance && finiteNumber(entity.id) < finiteNumber(nearest?.id))
    ) {
      nearest = entity;
      nearestDistance = distance;
    }
  }
  if (!nearest || nearestDistance <= MIR4_HEALING_VENDOR_RANGE) return [];
  return [
    {
      t: 'input',
      mi: { f: 1 },
      facing: Math.atan2(
        finiteNumber(nearest.x) - finiteNumber(self?.x),
        finiteNumber(nearest.z) - finiteNumber(self?.z),
      ),
    },
  ];
}

function planMir4RecoveryActions(self, entities, rosterEntry) {
  const actions = [];
  if (self?.mir4?.mir4AutoQuest) actions.push({ cmd: 'mir4', m: 'quest', on: false });
  const maxHp = finiteNumber(self?.mhp ?? self?.maxHp);
  const lowHealth = maxHp > 0 && finiteNumber(self?.hp) / maxHp < 0.7;
  if (lowHealth) {
    if (self?.mir4?.autoBattle?.mode === 'battle') {
      actions.push({ cmd: 'mir4', m: 'auto', on: false });
    }
    const restockActions = planMir4VendorRestock(self, entities);
    actions.push(...planMir4NativeEquipment(self, rosterEntry), ...restockActions);
    if (inventoryHas(self, 'minor_healing_potion') && finiteNumber(self?.pcd) <= 0) {
      actions.push({ cmd: 'use', item: 'minor_healing_potion' });
    } else if (
      self?.combat !== true &&
      self?.eating !== true &&
      inventoryHas(self, 'baked_bread')
    ) {
      actions.push({ cmd: 'use', item: 'baked_bread' });
    } else if (restockActions.length === 0) {
      const vendorApproach = planMir4HealingVendorApproach(self, entities);
      if (vendorApproach.length > 0) {
        actions.push(...vendorApproach);
        return actions;
      }
    }
    actions.push({ t: 'input', mi: {} });
    return actions;
  }

  actions.push(
    ...planMir4NativeEquipment(self, rosterEntry),
    ...planMir4VendorRestock(self, entities),
  );
  if (self?.mir4?.autoBattle?.mode !== 'battle') {
    actions.push({ cmd: 'mir4', m: 'auto', on: true });
  }
  actions.push(...planMir4GrindingEngagement(self, entities, 30));
  return actions;
}

export function updateMir4VisualRecovery(recoveryLevel, observedDeaths, deathCount, level) {
  const knownDeaths = Math.max(0, Math.floor(finiteNumber(observedDeaths)));
  const currentDeaths = Math.max(knownDeaths, Math.floor(finiteNumber(deathCount)));
  const currentLevel = Math.max(1, Math.floor(finiteNumber(level, 1)));
  if (currentDeaths > knownDeaths) {
    return {
      recoveryLevel: Math.max(finiteNumber(recoveryLevel), currentLevel + 1),
      observedDeaths: currentDeaths,
      started: true,
      completed: false,
    };
  }
  if (Number.isFinite(recoveryLevel) && currentLevel >= recoveryLevel) {
    return {
      recoveryLevel: null,
      observedDeaths: currentDeaths,
      started: false,
      completed: true,
    };
  }
  return {
    recoveryLevel: Number.isFinite(recoveryLevel) ? recoveryLevel : null,
    observedDeaths: currentDeaths,
    started: false,
    completed: false,
  };
}

export function mir4VisualWindowLayout(count, screenWidth = 1920, screenHeight = 1080) {
  if (!Number.isSafeInteger(count) || count < 1 || count > 12) {
    throw new Error('visual bot count must be between 1 and 12');
  }
  const columns = count <= 2 ? count : Math.min(3, count);
  const rows = Math.ceil(count / columns);
  const width = Math.max(480, Math.floor(screenWidth / columns));
  const height = Math.max(360, Math.floor(screenHeight / rows));
  return Array.from({ length: count }, (_, index) => ({
    x: (index % columns) * width,
    y: Math.floor(index / columns) * height,
    width,
    height,
  }));
}

export function mir4VisualBotSnapshot(
  world = globalThis.window?.__game?.world ?? globalThis.__game?.world,
) {
  const player = world?.player;
  if (!player) return null;
  const mir4 = world.mir4PlayerState?.() ?? null;
  return {
    id: player.id,
    lv: player.level,
    xp: world.xp,
    copper: world.copper,
    hp: player.hp,
    mhp: player.maxHp,
    dead: player.dead === true,
    gh: player.ghost === true,
    combat: player.inCombat === true,
    eating: player.eating !== null && player.eating !== undefined,
    x: player.pos?.x,
    z: player.pos?.z,
    pcd: player.potionCdRemaining,
    inv: world.inventory,
    eq: world.equipment,
    mir4,
  };
}

export function mir4VisualBotEntities(
  world = globalThis.window?.__game?.world ?? globalThis.__game?.world,
) {
  return [...(world?.entities?.values?.() ?? [])].map((entity) => ({
    id: entity.id,
    kind: entity.kind,
    hp: entity.hp,
    dead: entity.dead === true,
    hostile: entity.hostile,
    targetId: entity.targetId,
    aggroTargetId: entity.aggroTargetId,
    runScoped: entity.runScoped === true,
    summonedAdd: entity.summonedAdd === true,
    vendorItems: entity.vendorItems,
    x: entity.pos?.x,
    z: entity.pos?.z,
  }));
}

export function mir4VisualRecordingOptions(path, ffmpegPath, fps = 30) {
  return {
    path,
    format: 'webm',
    fps,
    ffmpegPath,
    overwrite: true,
  };
}

export function dismissMir4VisualObstructions(documentLike = globalThis.document) {
  let dismissed = 0;
  for (const selector of [
    '#gpu-notice .gpu-notice-dismiss',
    '#perf-nudge .perf-nudge-dismiss',
    '.store-promo-card .store-promo-card-close',
  ]) {
    const button = documentLike?.querySelector?.(selector);
    if (!button || typeof button.click !== 'function') continue;
    button.click();
    dismissed += 1;
  }
  return dismissed;
}

/**
 * Character selection can disappear because the client resumed the persisted
 * play marker while the launcher was waiting for the roster. Return a truthy
 * state for either legitimate outcome so the browser harness cannot time out
 * after it has already entered the world.
 */
export function mir4VisualCharacterEntryState(
  characterName,
  documentLike = globalThis.document,
  game = globalThis.window?.__game ?? globalThis.__game,
) {
  const startScreen = documentLike?.querySelector?.('#start-screen');
  const startScreenHidden = startScreen?.hidden === true || startScreen?.style?.display === 'none';
  if (startScreenHidden && (game?.world?.entities?.size ?? 0) >= 1) return 'world';
  const hasCharacter = [...(documentLike?.querySelectorAll?.('#char-list .char-row') ?? [])].some(
    (candidate) => candidate.querySelector?.('.char-name')?.textContent?.trim() === characterName,
  );
  return hasCharacter ? 'select' : false;
}

/**
 * Resolve the online start-screen step without assuming that a persisted
 * browser session always returns to the login form.
 */
export function mir4VisualOnlineEntryState(
  characterName,
  excludedStates = [],
  documentLike = globalThis.document,
  game = globalThis.window?.__game ?? globalThis.__game,
) {
  const excluded = new Set(excludedStates);
  const startScreen = documentLike?.querySelector?.('#start-screen');
  if (
    (startScreen?.hidden === true || startScreen?.style?.display === 'none') &&
    (game?.world?.entities?.size ?? 0) >= 1
  ) {
    return excluded.has('world') ? false : 'world';
  }
  const panelVisible = (selector) => {
    const panel = documentLike?.querySelector?.(selector);
    return !!panel && panel.hidden !== true && panel.hasAttribute?.('hidden') !== true;
  };
  if (panelVisible('#charselect-panel')) {
    const hasCharacter = [...(documentLike?.querySelectorAll?.('#char-list .char-row') ?? [])].some(
      (candidate) => candidate.querySelector?.('.char-name')?.textContent?.trim() === characterName,
    );
    if (hasCharacter) return excluded.has('select') ? false : 'select';
  }
  if (
    panelVisible('#realm-panel') &&
    (documentLike?.querySelectorAll?.('#realm-list .realm-row')?.length ?? 0) > 0
  ) {
    return excluded.has('realm') ? false : 'realm';
  }
  if (panelVisible('#login-panel')) return excluded.has('login') ? false : 'login';
  return false;
}

/**
 * Re-enter the bot's character after a development-server restart returns the
 * browser to character select. The visibility guard is load-bearing because
 * character rows remain mounted behind the in-world canvas.
 */
export function resumeMir4VisualCharacter(characterName, documentLike = globalThis.document) {
  const startScreen = documentLike?.querySelector?.('#start-screen');
  if (!startScreen || startScreen.hidden === true || startScreen.style?.display === 'none') {
    return false;
  }
  const panel = documentLike?.querySelector?.('#charselect-panel');
  if (panel?.hidden !== false) return false;
  const row = [...(documentLike.querySelectorAll?.('#char-list .char-row') ?? [])].find(
    (candidate) => candidate.querySelector?.('.char-name')?.textContent?.trim() === characterName,
  );
  if (!row) return false;
  const view = documentLike.defaultView ?? globalThis.window;
  if (view) view.confirm = () => true;
  row.click?.();
  const shared = documentLike.querySelector?.('#btn-charselect-enter');
  const button =
    shared && shared.disabled !== true
      ? shared
      : row.querySelector?.('.enter-world-btn, .take-over-btn');
  if (!button || button.disabled === true || typeof button.click !== 'function') return false;
  button.click();
  return true;
}

/**
 * Dispatch one policy action through the real client facade. Kept closure-free
 * so Puppeteer can serialize this exact function into the visible page.
 */
export async function applyMir4VisualAction(
  next,
  game = globalThis.window?.__game ?? globalThis.__game,
) {
  const world = game?.world;
  if (!world) return;
  if (next.t === 'input') {
    game.input?.setControllerMoveInput(next.mi, next.facing);
  } else if (next.cmd === 'equip') {
    world.equipItem(next.item);
  } else if (next.cmd === 'mir4' && next.m === 'auto') {
    world.setMir4AutoBattle(next.on === true);
  } else if (next.cmd === 'mir4' && next.m === 'quest') {
    world.setMir4AutoQuest(next.on === true, next.questId);
  } else if (next.cmd === 'mir4' && next.m === 'cast') {
    world.mir4CastSkill(next.skill, next.target);
  } else if (next.cmd === 'mir4' && next.m === 'basic') {
    world.mir4BasicAttack(next.target);
  } else if (next.cmd === 'mir4' && next.m === 'ackTutorial') {
    world.mir4AcknowledgeTutorial(next.questId);
  } else if (next.cmd === 'mir4' && next.m === 'equipItem') {
    world.mir4EquipItem(next.itemId);
  } else if (next.cmd === 'mir4' && next.m === 'claimAchievement') {
    await world.mir4ClaimAchievement(next.achievementId);
  } else if (next.cmd === 'mir4' && next.m === 'upgradeSkill') {
    world.mir4UpgradeSkill(next.skillId, next.expectedCurrentLevel);
  } else if (next.cmd === 'mir4' && next.m === 'campaignProfession') {
    world.mir4CampaignProfession();
  } else if (next.cmd === 'mir4' && next.m === 'craftMaterial') {
    world.mir4CraftMaterial(next.recipeId);
  } else if (next.cmd === 'mir4' && next.m === 'enhanceItem') {
    world.mir4EnhanceItem(next.itemId);
  } else if (next.cmd === 'mir4' && next.m === 'combineSpirits') {
    world.mir4CombineSpirits(next.grade, next.all === true);
  } else if (next.cmd === 'mir4' && next.m === 'redeemTicket') {
    world.mir4RedeemTicket(next.ticketId, next.count);
  } else if (next.cmd === 'mir4' && next.m === 'equipSpirit') {
    world.mir4EquipSpirit(next.spiritId);
  } else if (next.cmd === 'mir4' && next.m === 'rollLayer') {
    world.mir4RollItemLayer(next.itemId, next.layer);
  } else if (next.cmd === 'mir4' && next.m === 'resolveLayer') {
    world.mir4ResolveItemLayer(next.itemId, next.layer, next.rollId, next.accept === true);
  } else if (next.cmd === 'mir4' && next.m === 'equipMount') {
    world.mir4EquipMount(next.mountId);
  } else if (next.cmd === 'mir4' && next.m === 'confirmMount') {
    world.mir4ConfirmMount(next.pendingId);
  } else if (next.cmd === 'mir4' && next.m === 'confirmSpirit') {
    world.mir4ConfirmSpirit(next.pendingId);
  } else if (next.cmd === 'buy') {
    world.buyItem(next.npcId, next.item, { count: next.count });
  } else if (next.cmd === 'use') {
    world.useItem(next.item);
  } else if (next.cmd === 'release') {
    world.releaseSpirit();
  } else if (next.cmd === 'resurrect_healer') {
    await world.resurrectAtSpiritHealer();
  }
}

/** The visible bot uses the same explicit intervention policy as the soak bot. */
export function planMir4VisualPolicy({
  self,
  entities,
  rosterEntry,
  tutorialSeeking,
  recoveryLevel = null,
}) {
  if (self?.gh === true || self?.dead === true || finiteNumber(self?.hp, 1) <= 0) {
    return {
      tutorialSeeking: false,
      actions: planMir4ProgressionActions(self, rosterEntry),
    };
  }

  const recovering =
    Number.isFinite(recoveryLevel) && finiteNumber(self?.lv ?? self?.level, 1) < recoveryLevel;
  if (recovering) {
    if (self?.combat === true) {
      const questThreatActions = planMir4EscortIntervention(self, entities, rosterEntry);
      if (questThreatActions.length > 0) {
        return { tutorialSeeking: false, actions: questThreatActions };
      }
      const threatActions = planMir4ThreatIntervention(self, entities, rosterEntry, 30);
      if (threatActions.length > 0) {
        return {
          tutorialSeeking: false,
          actions: [...planMir4ThreatBattleMode(self, true), ...threatActions],
        };
      }
    }
    return {
      tutorialSeeking: false,
      actions: planMir4RecoveryActions(self, entities, rosterEntry),
    };
  }

  const questThreatActions = planMir4EscortIntervention(self, entities, rosterEntry);
  if (questThreatActions.length > 0) {
    return { tutorialSeeking: false, actions: questThreatActions };
  }

  const threatActions = planMir4ThreatIntervention(self, entities, rosterEntry, 30);
  if (threatActions.length > 0) {
    return {
      tutorialSeeking: false,
      actions: [...planMir4ThreatBattleMode(self, true), ...threatActions],
    };
  }

  const tutorialActions = planMir4TutorialEngagement(self, entities, rosterEntry);
  if (tutorialActions.length > 0) {
    return { tutorialSeeking: true, actions: tutorialActions };
  }

  const preparationActions = [
    ...planMir4NativeEquipment(self, rosterEntry),
    ...planMir4VendorRestock(self, entities),
  ];
  if (preparationActions.length > 0) {
    return { tutorialSeeking: false, actions: preparationActions };
  }

  return {
    tutorialSeeking: false,
    actions: [
      ...(tutorialSeeking ? [{ t: 'input', mi: {} }] : []),
      ...planMir4ProgressionActions(self, rosterEntry),
    ],
  };
}

export function visualBotCaption(rosterEntry, characterName) {
  return `MIR4 BOT · ${String(rosterEntry.classKey).toUpperCase()} · ${characterName}`;
}
