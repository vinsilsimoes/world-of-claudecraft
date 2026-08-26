// Real-browser MIR4 feature proof over the existing World of ClaudeCraft UI.
// Fixture setup may seed authoritative Sim state, but every operation under
// proof is initiated through the same DOM controls a player uses.

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH } from './browser_path.mjs';
import { enterOfflineGame } from './enter_offline_game.mjs';
import { isExpectedOfflineDevResponse } from './lib/browser_dev_response_allowlist.mjs';
import { suppressGpuNotice } from './lib/gpu_notice_suppress.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const GAME_ORIGIN = new globalThis.URL(URL).origin;
const PROFILE = process.env.GAME_PROFILE ?? process.env.VITE_GAME_PROFILE;
if (PROFILE !== 'mir4-gameplay-port') {
  throw new Error(`mir4_feature_browser requires mir4-gameplay-port, received ${String(PROFILE)}`);
}

const CLASS_ROWS = [
  ['elementalist', 2],
  ['taoist', 3],
  ['arbalist', 4],
  ['lancer', 5],
  ['warrior', 1],
];
const FEATURE_ITEM_ID = 991010101;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];
const errors = [];
let passed = 0;

fs.mkdirSync('tmp', { recursive: true });

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`OK   ${name}`);
    return;
  }
  failures.push(`${name}${extra ? `: ${extra}` : ''}`);
  console.log(`FAIL ${name}${extra ? ` ${extra}` : ''}`);
}

async function domClick(page, selector) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.waitForSelector(selector, { visible: true, timeout: 15000 });
    try {
      await page.click(selector);
      return;
    } catch (error) {
      lastError = error;
      if (!String(error).includes('detached from document')) throw error;
      await sleep(100);
    }
  }
  throw lastError;
}

async function openHudWindow(page, launcher, windowSelector) {
  await domClick(page, launcher);
  await page.waitForSelector(windowSelector, { visible: true, timeout: 15000 });
}

async function attackOneHitTarget(page, entityId) {
  await page.evaluate((id) => {
    const { sim } = window.__game;
    const target = sim.entities.get(id);
    if (!target) throw new Error(`Missing target ${id}`);
    const player = sim.player;
    target.dead = false;
    target.hp = 1;
    target.maxHp = Math.max(1, target.maxHp);
    target.pos = sim.groundPos(player.pos.x + 2, player.pos.z);
    target.prevPos = { ...target.pos };
    sim.rebucket(target);
    sim.targetEntity(id);
    player.facing = Math.atan2(target.pos.x - player.pos.x, target.pos.z - player.pos.z);
    player.resource = Math.max(player.resource, player.maxResource ?? 100);
  }, entityId);
  for (let attempt = 0; attempt < 12; attempt++) {
    await domClick(page, '#actionbar .action-btn[data-hotbar-slot="0"]');
    await sleep(250);
    const dead = await page.evaluate((id) => {
      const target = window.__game.sim.entities.get(id);
      return !target || target.dead === true;
    }, entityId);
    if (dead) return true;
  }
  return false;
}

const browser = await puppeteer.launch({
  executablePath: BROWSER_PATH,
  headless: 'new',
  protocolTimeout: 180000,
  userDataDir: `tmp/mir4-feature-browser-${Date.now().toString(36)}`,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1440,900',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
  defaultViewport: { width: 1440, height: 900 },
});

let featurePage;
try {
  for (const [classKey, classId] of CLASS_ROWS) {
    const page = await browser.newPage();
    page.on('pageerror', (error) => errors.push(`[${classKey}] ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
        errors.push(`[${classKey}] console: ${message.text()}`);
      }
    });
    page.on('response', (response) => {
      if (
        response.status() >= 400 &&
        new globalThis.URL(response.url()).origin === GAME_ORIGIN &&
        !isExpectedOfflineDevResponse(response.status(), response.url(), GAME_ORIGIN)
      ) {
        errors.push(`[${classKey}] response ${response.status()}: ${response.url()}`);
      }
    });
    await suppressGpuNotice(page);
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem(
        'woc_settings',
        JSON.stringify({
          graphicsPreset: 1,
          graphicsDefaultApplied: true,
          browserEffects: 3,
          fullscreen: 0,
          reduceMotion: true,
          weather: false,
          mouseCamera: true,
        }),
      );
    });
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const booted = await enterOfflineGame(page, {
      charClass: classKey,
      charName: `Proof${classKey.slice(0, 4)}`,
      settleMs: 800,
      gameBootTimeoutMs: 60000,
    });
    check(`${classKey} boots through the existing entry shell`, booted);
    if (!booted) {
      const diagnostics = await page.evaluate(() => ({
        loading: document.querySelector('#loading-status')?.textContent,
        error: document.querySelector('#offline-error')?.textContent,
        panel: document.querySelector('#offline-panel')?.textContent,
      }));
      throw new Error(`${classKey} did not boot: ${JSON.stringify(diagnostics)}`);
    }
    const classState = await page.evaluate(() => ({
      profile: window.__game.sim.cfg.gameProfile,
      classId: window.__game.sim.player.mir4?.classId,
      known: window.__game.sim.known.map((known) => known.def.id),
      actionButtons: document.querySelectorAll('#actionbar .action-btn.ability').length,
      cameraChooser: document.querySelector('.camera-prompt-backdrop') !== null,
    }));
    check(
      `${classKey} resolves its MIR4 class id`,
      classState.classId === classId,
      JSON.stringify(classState),
    );
    check(
      `${classKey} exposes only MIR4 actions`,
      classState.known.length >= 5 && classState.known.every((id) => id.startsWith('mir4_')),
      JSON.stringify(classState.known),
    );
    check(`${classKey} paints the shared WoC action bar`, classState.actionButtons >= 5);
    check(`${classKey} has no camera-mode chooser`, !classState.cameraChooser);
    if (classKey === 'warrior') featurePage = page;
    else await page.close();
  }

  if (!featurePage) throw new Error('Warrior feature page did not boot');
  const page = featurePage;

  await page.evaluate((itemId) => {
    const { sim } = window.__game;
    const meta = sim.players.get(sim.playerId);
    if (!meta) throw new Error('Missing player metadata');
    sim.setPlayerLevel(250);
    meta.copper = 100_000;
    meta.mir4SkillResources = { effectPoints: 800, skillTomes: 0 };
    meta.mir4Materials = {
      sunStone: 20,
      moonStone: 20,
      solarScroll: 20,
      lunarSeal: 20,
      dawnTear: 20,
      solarWard: 20,
      knowledgeFragment: 0,
      knowledgeTomeCommon: 1,
      knowledgeTomeRare: 0,
      knowledgeTomeEpic: 0,
      knowledgeTomeLegendary: 0,
    };
    meta.mir4ArcRewards = {
      items: { [String(itemId)]: 1 },
      systems: ['mount-summon', 'spirit-summon'],
      tickets: { 'mount-ticket-dawn': 1, 'spirit-ticket-dawn': 1 },
    };
    sim.mir4EquipItem(itemId);
  }, FEATURE_ITEM_ID);

  await openHudWindow(page, '#mm-spell', '#spellbook');
  await domClick(page, '.spell-row[data-ability-id="mir4_skill_1102"] .spell-upgrade-btn');
  const skillState = await page.evaluate(() => {
    const { sim } = window.__game;
    const meta = sim.players.get(sim.playerId);
    return {
      rank: meta?.mir4SkillLevels?.[1102],
      copper: meta?.copper,
      effectPoints: meta?.mir4SkillResources?.effectPoints,
      skillTomes: meta?.mir4SkillResources?.skillTomes,
      knowledgeTomeCommon: meta?.mir4Materials?.knowledgeTomeCommon,
    };
  });
  check(
    'Spellbook upgrades skill 1102 through IWorldMir4',
    skillState.rank === 2,
    JSON.stringify(skillState),
  );
  check(
    'skill evolution spends one crafted common knowledge tome',
    skillState.copper === 100_000 &&
      skillState.effectPoints === 800 &&
      skillState.skillTomes === 0 &&
      skillState.knowledgeTomeCommon === 0,
    JSON.stringify(skillState),
  );
  await domClick(page, '#mm-spell');

  await openHudWindow(page, '#mm-crafting', '#crafting-window');
  await domClick(page, `[data-enhance="${FEATURE_ITEM_ID}"]`);
  await domClick(page, '[data-tab="enchantment"]');
  await domClick(page, `[data-roll="${FEATURE_ITEM_ID}"]`);
  await domClick(page, '[data-resolve="accept"]');
  await domClick(page, '[data-tab="blessing"]');
  await domClick(page, `[data-roll="${FEATURE_ITEM_ID}"]`);
  await domClick(page, '[data-resolve="accept"]');
  await domClick(page, '[data-tab="crafting"]');
  await domClick(page, '[data-recipe="solar-scroll"]');
  const progression = await page.evaluate((itemId) => {
    const { sim } = window.__game;
    const meta = sim.players.get(sim.playerId);
    const instance = meta?.mir4EquipmentInstances?.[itemId];
    return {
      enhancement: instance?.enhancement,
      enchantment: instance?.affixes?.enchantment?.length,
      blessing: instance?.affixes?.blessing?.length,
      sunStone: meta?.mir4Materials?.sunStone,
      solarScroll: meta?.mir4Materials?.solarScroll,
    };
  }, FEATURE_ITEM_ID);
  check(
    'Crafting window refines native WoC equipment',
    progression.enhancement === 1,
    JSON.stringify(progression),
  );
  check(
    'Crafting window accepts a two-affix enchantment',
    progression.enchantment === 2,
    JSON.stringify(progression),
  );
  check(
    'Crafting window accepts a three-affix blessing',
    progression.blessing === 3,
    JSON.stringify(progression),
  );
  check(
    'Crafting window converts materials through the authoritative recipe',
    progression.sunStone === 19 && progression.solarScroll === 20,
    JSON.stringify(progression),
  );
  await page.screenshot({ path: 'tmp/mir4_feature_progression.png' });
  await domClick(page, '#mm-crafting');

  await openHudWindow(page, '#mm-bag', '#bags');
  await domClick(page, '[data-focus-key="mir4-ticket:mount-ticket-dawn"]');
  const pendingMount = await page.$('[data-focus-key^="mir4-mount-pending:"]');
  if (pendingMount) await domClick(page, '[data-focus-key^="mir4-mount-pending:"]');
  await domClick(page, '[data-focus-key^="mir4-mount:"]');
  await domClick(page, '[data-focus-key="mir4-ticket:spirit-ticket-dawn"]');
  const pendingSpirit = await page.$('[data-focus-key^="mir4-spirit-pending:"]');
  if (pendingSpirit) await domClick(page, '[data-focus-key^="mir4-spirit-pending:"]');
  await domClick(page, '[data-focus-key^="mir4-spirit:"]');
  await page
    .waitForFunction(() => window.__game.sim.player.mountKey !== '', { timeout: 5000 })
    .catch(() => {});
  const collections = await page.evaluate(() => {
    const { sim } = window.__game;
    const meta = sim.players.get(sim.playerId);
    return {
      mount: meta?.mir4Mounts?.equippedMountId,
      mountKey: sim.player.mountKey,
      spirit: meta?.mir4Spirits?.equippedSpiritId,
      mountTicket: meta?.mir4ArcRewards?.tickets?.['mount-ticket-dawn'] ?? 0,
      spiritTicket: meta?.mir4ArcRewards?.tickets?.['spirit-ticket-dawn'] ?? 0,
    };
  });
  check(
    'Bags redeems and equips a logical Mount with a native runtime model',
    Boolean(collections.mount && collections.mountKey) && collections.mountTicket === 0,
    JSON.stringify(collections),
  );
  check(
    'Bags redeems and equips a Spirit',
    Boolean(collections.spirit) && collections.spiritTicket === 0,
    JSON.stringify(collections),
  );
  await page.screenshot({ path: 'tmp/mir4_feature_collections.png' });
  await domClick(page, '#mm-bag');

  await openHudWindow(page, '#mm-char', '#char-window');
  const characterSheet = await page.evaluate(() => ({
    slots: document.querySelectorAll('#char-window .equip-slot').length,
    text: document.querySelector('#char-window')?.textContent ?? '',
  }));
  check('Character window reuses all eight WoC equipment slots', characterSheet.slots === 8);
  check(
    'Character window presents Combat Power, Mount, and Spirit state',
    /Combat Power/.test(characterSheet.text) &&
      /Mount/.test(characterSheet.text) &&
      /Spirit/.test(characterSheet.text),
  );
  await domClick(page, '#mm-char');

  const dungeonSetup = await page.evaluate(() => {
    const { sim } = window.__game;
    const meta = sim.players.get(sim.playerId);
    meta.mir4ArcQuests = {
      'M04-Q05': {
        questId: 'M04-Q05',
        stageIndex: 5,
        stageProgress: 0,
        state: 'active',
      },
    };
    for (const x of [-8, 0, 8]) {
      for (let z = 680; z <= 780; z += 4) {
        sim.player.pos = sim.groundPos(x, z);
        sim.player.prevPos = { ...sim.player.pos };
        sim.rebucket(sim.player);
        sim.tick();
        if (sim.mir4ArcDungeonRuns.size > 0) {
          const run = [...sim.mir4ArcDungeonRuns.values()][0];
          return {
            entered: true,
            guardIds: [...run.guardIds],
            instanceSlot: run.instanceSlot,
          };
        }
      }
    }
    return { entered: false, guardIds: [], instanceSlot: null };
  });
  check(
    'campaign stage enters an isolated short-dungeon room',
    dungeonSetup.entered,
    JSON.stringify(dungeonSetup),
  );

  await openHudWindow(page, '#mm-quest', '#quest-log-window');
  const questText = await page.$eval('#quest-log-window', (root) => root.textContent ?? '');
  check('Quest Log presents the armed M04 dungeon stage', /M04-Q05/.test(questText));
  await domClick(page, '#mm-quest');

  for (const guardId of dungeonSetup.guardIds) {
    check(
      `action bar defeats dungeon guardian ${guardId}`,
      await attackOneHitTarget(page, guardId),
    );
  }
  const bossId = await page.evaluate(() => {
    const { sim } = window.__game;
    for (let attempt = 0; attempt < 5; attempt++) sim.tick();
    return [...sim.mir4ArcDungeonRuns.values()][0]?.bossId ?? null;
  });
  check(
    'short-dungeon boss materializes after the three seals',
    Number.isInteger(bossId),
    String(bossId),
  );
  if (Number.isInteger(bossId))
    check('action bar defeats the short-dungeon boss', await attackOneHitTarget(page, bossId));
  const dungeonResult = await page.evaluate(() => {
    const { sim } = window.__game;
    for (let attempt = 0; attempt < 8; attempt++) sim.tick();
    const progress = sim.players.get(sim.playerId)?.mir4ArcQuests?.['M04-Q05'];
    return {
      stageIndex: progress?.stageIndex,
      runs: sim.mir4ArcDungeonRuns.size,
      z: sim.player.pos.z,
    };
  });
  check(
    'dungeon completion advances the quest and returns to the campaign map',
    dungeonResult.stageIndex === 6 &&
      dungeonResult.runs === 0 &&
      dungeonResult.z >= 600 &&
      dungeonResult.z < 800,
    JSON.stringify(dungeonResult),
  );
  await page.screenshot({ path: 'tmp/mir4_feature_dungeon_return.png' });
} finally {
  await browser.close();
}

for (const error of errors.slice(0, 20)) console.log(`PAGE ${error}`);
check(
  'browser produced no page or console errors',
  errors.length === 0,
  errors.slice(0, 4).join(' | '),
);
console.log(`MIR4 feature browser proof: ${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.log(`FAILURE ${failure}`);
  process.exitCode = 1;
}
