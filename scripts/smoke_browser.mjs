// Browser smoke test: boots the game in headless Edge, plays a little,
// and saves screenshots to tmp/ for visual inspection.

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';
import { enterOfflineGame } from './enter_offline_game.mjs';
import { isExpectedOfflineDevResponse } from './lib/browser_dev_response_allowlist.mjs';
import { browserSmokeScenarioForProfile } from './lib/browser_smoke_scenario.mjs';
import { suppressGpuNotice } from './lib/gpu_notice_suppress.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const GAME_ORIGIN = new globalThis.URL(URL).origin;
const PROFILE = process.env.GAME_PROFILE ?? process.env.VITE_GAME_PROFILE ?? 'woc-classic';
const scenario = browserSmokeScenarioForProfile(PROFILE);
fs.mkdirSync('tmp', { recursive: true });

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--window-size=1600,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
const errors = [];
const failures = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource:')) {
    errors.push(`CONSOLE: ${msg.text()}`);
  }
});
page.on('response', (response) => {
  if (
    response.status() >= 400 &&
    new globalThis.URL(response.url()).origin === GAME_ORIGIN &&
    !isExpectedOfflineDevResponse(response.status(), response.url(), GAME_ORIGIN)
  ) {
    errors.push(`RESPONSE ${response.status()}: ${response.url()}`);
  }
});

await suppressGpuNotice(page);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.screenshot({ path: 'tmp/01_start.png' });
const booted = await enterOfflineGame(page, {
  charClass: scenario.classKey,
  charName: 'Adventurer',
  settleMs: 800,
  gameBootTimeoutMs: 60000,
});
if (!booted) throw new Error('Browser smoke did not reach the offline game world');
await page.screenshot({ path: 'tmp/02_spawn.png' });

const state0 = await page.evaluate(() => {
  const g = window.__game;
  const p = g.sim.player;
  return {
    profile: g.sim.cfg.gameProfile,
    x: p.pos.x,
    z: p.pos.z,
    hp: p.hp,
    maxHp: p.maxHp,
    level: p.level,
    entities: g.sim.entities.size,
  };
});
console.log('spawn state:', JSON.stringify(state0));
if (state0.profile !== scenario.profile) {
  failures.push(`PROFILE: expected ${scenario.profile}, received ${String(state0.profile)}`);
}

// run forward for 3 seconds
await page.evaluate(() => document.activeElement?.blur());
await page.click('#game-canvas');
for (let attempt = 0; attempt < 3; attempt++) {
  const suspended = await page.evaluate(() => window.__game.input.debugState().suspendMovement);
  if (!suspended) break;
  await page.keyboard.press('Escape');
  await new Promise((r) => setTimeout(r, 250));
}
await page.waitForFunction(() => !window.__game.input.debugState().suspendMovement, {
  timeout: 15000,
});
await page.evaluate(() => document.activeElement?.blur());
await page.click('#game-canvas');
await page.keyboard.down(scenario.movementKey);
await new Promise((r) => setTimeout(r, 3000));
await page.keyboard.up(scenario.movementKey);
await page.screenshot({ path: 'tmp/03_ran_forward.png' });
const state1 = await page.evaluate(() => {
  const p = window.__game.sim.player;
  return { x: p.pos.x, z: p.pos.z, input: window.__game.input.debugState() };
});
console.log('after running:', JSON.stringify(state1));
const moved = Math.hypot(state1.x - state0.x, state1.z - state0.z);
console.log('moved distance:', moved.toFixed(1), moved > 10 ? 'OK' : 'FAIL');
if (moved <= 10)
  failures.push(`MOVEMENT: expected more than 10 units, received ${moved.toFixed(1)}`);

// turn for a second, then jump
await page.keyboard.down('a');
await new Promise((r) => setTimeout(r, 700));
await page.keyboard.up('a');
await page.keyboard.press('Space');
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: 'tmp/04_turned.png' });

// Teleport near the profile's first tutorial hostile, target it, and fight it.
const fight = await page.evaluate((targetSelector) => {
  const g = window.__game;
  const sim = g.sim;
  const p = sim.player;
  let target = null,
    d = 1e9;
  for (const e of sim.entities.values()) {
    const matches = targetSelector.exactTemplateId
      ? e.templateId === targetSelector.exactTemplateId
      : e.templateId.startsWith(targetSelector.templatePrefix);
    if (matches && !e.dead) {
      const dd = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (dd < d) {
        d = dd;
        target = e;
      }
    }
  }
  if (!target) throw new Error(`No smoke target matched ${JSON.stringify(targetSelector)}`);
  p.pos.x = target.pos.x + 3;
  p.pos.z = target.pos.z;
  sim.targetEntity(target.id);
  return { targetId: target.id, targetHp: target.hp, targetLevel: target.level };
}, scenario.target);
console.log('fight setup:', JSON.stringify(fight));
await new Promise((r) => setTimeout(r, 300));
// face it and attack
await page.evaluate(
  ({ id, combatMode }) => {
    const g = window.__game;
    const p = g.sim.player;
    g.sim.targetEntity(id);
    const t = g.sim.entities.get(id);
    p.facing = Math.atan2(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
    g.input.camYaw = p.facing;
    if (combatMode === 'mir4') g.sim.setMir4AutoBattle(true);
    else g.sim.startAutoAttack();
  },
  { id: fight.targetId, combatMode: scenario.combatMode },
);
await new Promise((r) => setTimeout(r, 1000));
await page.keyboard.press('1');
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: 'tmp/05_combat.png' });

// wait for kill (up to 30s)
let killed = false;
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const s = await page.evaluate(
    ({ id, combatMode }) => {
      const g = window.__game;
      const target = g.sim.entities.get(id);
      const p = g.sim.player;
      if (!target.dead) {
        if (p.targetId !== id) g.sim.targetEntity(id);
        p.facing = Math.atan2(target.pos.x - p.pos.x, target.pos.z - p.pos.z);
        if (combatMode === 'mir4') {
          if (!g.sim.mir4AutoBattleActive()) g.sim.setMir4AutoBattle(true);
          g.sim.mir4BasicAttack(id);
        } else {
          if (!p.autoAttack) g.sim.startAutoAttack();
          if (p.resource >= 15 && !p.queuedOnSwing) g.sim.castAbility('heroic_strike');
        }
      }
      return {
        targetDead: target.dead,
        targetHp: target.hp,
        playerHp: p.hp,
        resource: p.resource,
        xp: g.sim.xp,
        auto: combatMode === 'mir4' ? g.sim.mir4AutoBattleActive() : p.autoAttack,
      };
    },
    { id: fight.targetId, combatMode: scenario.combatMode },
  );
  if (i % 5 === 0) console.log('combat:', JSON.stringify(s));
  if (s.targetDead) {
    killed = true;
    break;
  }
}
console.log('target killed:', killed ? 'OK' : 'FAIL');
if (!killed) failures.push('COMBAT: target survived the 30 second smoke window');
await page.screenshot({ path: 'tmp/06_killed.png' });

// loot it
const loot = await page.evaluate((id) => {
  const g = window.__game;
  const w = g.sim.entities.get(id);
  const p = g.sim.player;
  p.pos.x = w.pos.x + 1;
  p.pos.z = w.pos.z;
  g.sim.lootCorpse(id);
  return {
    copper: g.sim.copper,
    inv: g.sim.inventory.map((s) => s.itemId),
    xp: g.sim.xp,
    level: p.level,
  };
}, fight.targetId);
console.log('loot:', JSON.stringify(loot));
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: 'tmp/07_looted.png' });

let questAction = false;
if (scenario.questMode === 'tracker') {
  const questSetup = await page.evaluate(() => {
    const sim = window.__game.sim;
    const npc = [...sim.entities.values()].find(
      (entity) => entity.templateId === 'mir4_tarek_duas_pontes',
    );
    if (!npc) return { accepted: false, npcId: null };
    const player = sim.player;
    player.pos.x = npc.pos.x + 1;
    player.pos.z = npc.pos.z;
    sim.talkToNpc(npc.id);
    return { accepted: sim.mir4QuestTrackerEntries().length > 0, npcId: npc.id };
  });
  console.log('quest setup:', JSON.stringify(questSetup));
  await page.waitForFunction(() => window.__game.sim.mir4QuestTrackerEntries().length > 0, {
    timeout: 5000,
  });
  await page.waitForSelector('#quest-tracker .qt-title[data-quest="M01-Q01"]', {
    timeout: 5000,
  });
  const trackerResult = await page.evaluate(() => {
    const entries = window.__game.sim.mir4QuestTrackerEntries();
    const row = document.querySelector('#quest-tracker .qt-title[data-quest]');
    if (!row) return { active: false, entries, rowQuestId: null };
    row.click();
    return {
      active: window.__game.sim.mir4AutoQuestActive(),
      entries,
      rowQuestId: row.getAttribute('data-quest'),
    };
  });
  questAction = trackerResult.active;
  console.log('quest tracker:', JSON.stringify(trackerResult));
  console.log('auto journey started:', questAction ? 'OK' : 'FAIL');
} else {
  // Classic quest dialog: teleport to the marshal and press F.
  await page.evaluate(() => {
    const g = window.__game;
    g.sim.player.pos.x = 4;
    g.sim.player.pos.z = 3;
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.press('f');
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: 'tmp/08_quest_dialog.png' });
  questAction = await page.evaluate(async () => {
    const first = document.querySelector('#quest-dialog .qd-list-item');
    if (!first) return false;
    first.click();
    await new Promise((r) => setTimeout(r, 150));
    const btns = [...document.querySelectorAll('#quest-dialog .btn')];
    const accept = btns.find((b) => b.textContent === 'Accept');
    if (accept) {
      accept.click();
      return true;
    }
    return false;
  });
  console.log('quest accepted:', questAction ? 'OK' : 'FAIL');
}
if (!questAction) failures.push(`QUEST: ${scenario.questMode} action failed`);
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'tmp/09_quest_tracker.png' });

// bags
await page.keyboard.press('b');
await new Promise((r) => setTimeout(r, 300));
await page.screenshot({ path: 'tmp/10_bags.png' });

const final = await page.evaluate((questMode) => {
  const g = window.__game;
  return {
    quests:
      questMode === 'tracker'
        ? g.sim.mir4QuestTrackerEntries().map((quest) => quest.id)
        : [...g.sim.questLog.keys()],
    fps_entities: g.sim.entities.size,
  };
}, scenario.questMode);
console.log('final:', JSON.stringify(final));

if (errors.length) {
  console.log('\n=== PAGE ERRORS ===');
  for (const e of errors.slice(0, 20)) console.log(e);
  failures.push(`BROWSER: ${errors.length} page, console, or same-origin response errors`);
} else {
  console.log('no page errors');
}
if (failures.length) {
  console.log('\n=== SMOKE FAILURES ===');
  for (const failure of failures) console.log(failure);
}
await browser.close();
if (failures.length) process.exitCode = 1;
