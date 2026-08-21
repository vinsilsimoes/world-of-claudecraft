// Two-browser multiplayer E2E: register an account, create two characters,
// log both into the world via the real UI, verify they see each other, chat,
// and screenshot both perspectives.

import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH as EDGE } from './browser_path.mjs';
import { multiplayerScenarioForProfile } from './lib/mp_profile_scenario.mjs';
import { requireGameProfile } from './lib/world_auth.mjs';

const URL = process.env.GAME_URL ?? 'http://localhost:5173';
const GAME_PROFILE = requireGameProfile(process.env.GAME_PROFILE);
const SCENARIO = multiplayerScenarioForProfile(GAME_PROFILE);
const IS_MIR4 = GAME_PROFILE === 'mir4-gameplay-port';
fs.mkdirSync('tmp', { recursive: true });

const uniq = Date.now().toString(36).slice(-5);
// character names must be letters only and are globally unique
const alpha = uniq.replace(/[0-9]/g, (d) => 'abcdefghij'[Number(d)]);
const NAME_A = `${SCENARIO.primary.namePrefix}${alpha}`;
const NAME_B = `${SCENARIO.secondary.namePrefix}${alpha}`;
const errors = [];
let pass = 0;
let fail = 0;

function check(name, condition, extra = '') {
  if (condition) {
    pass += 1;
    console.log(`OK   ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${extra ? ` ${extra}` : ''}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  protocolTimeout: 60000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1280,760',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
  defaultViewport: { width: 1280, height: 760 },
});

async function loginAndEnter(page, username, password, charName, cls, fresh) {
  page.on('pageerror', (e) => errors.push(`[${charName}] ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${charName}] console: ${m.text()}`);
  });
  page.on('dialog', (d) => {
    errors.push(`[${charName}] dialog: ${d.message()}`);
    void d.dismiss();
  });
  const step = (s) => console.log(`  [${charName}] ${s}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 800));
  step('loaded');
  // evaluate-based DOM interaction (page.click can stall on this page under swiftshader)
  await page.evaluate(
    (u, p, fresh) => {
      document.querySelector('#btn-online').click();
      document.querySelector('#login-user').value = u;
      document.querySelector('#login-pass').value = p;
      document.querySelector(fresh ? '#btn-register' : '#btn-login').click();
    },
    username,
    password,
    fresh,
  );
  await page.waitForFunction(
    () => document.querySelector('#charselect-panel')?.style.display === 'block',
    { timeout: 8000, polling: 200 },
  );
  step('char select');
  await page.evaluate(
    (name, cls) => {
      document.querySelector('#new-char-name').value = name;
      document.querySelector(`#charselect-panel .mini-class[data-class="${cls}"]`).click();
      document.querySelector('#btn-create-char').click();
    },
    charName,
    cls,
  );
  await new Promise((r) => setTimeout(r, 700));
  step('character created');
  const entered = await page.evaluate((name) => {
    const rows = [...document.querySelectorAll('.char-row')];
    const row = rows.find((r) => r.querySelector('.char-name')?.textContent === name);
    if (!row) return false;
    row.querySelector('.enter-world-btn').click();
    return true;
  }, charName);
  if (!entered) throw new Error(`could not enter world as ${charName}`);
  step('entering world...');
  await page.waitForFunction(
    () => {
      const g = window.__game;
      return g?.world && g.world.entities.size > 5;
    },
    { timeout: 20000, polling: 500 },
  );
  step('in world');
}

const pageA = await browser.newPage();
const pageB = await browser.newPage();

console.log('logging in A...');
await loginAndEnter(pageA, `duo_${uniq}`, 'hunter22', NAME_A, SCENARIO.primary.classKey, true);
console.log('logging in B (same account, second character)...');
await loginAndEnter(pageB, `duo_${uniq}`, 'hunter22', NAME_B, SCENARIO.secondary.classKey, false);

await new Promise((r) => setTimeout(r, 1500));

// each should see the other player entity
const aSees = await pageA.evaluate(() => {
  const w = window.__game.world;
  return [...w.entities.values()].filter((e) => e.kind === 'player').map((e) => e.name);
});
const bSees = await pageB.evaluate(() => {
  const w = window.__game.world;
  return [...w.entities.values()].filter((e) => e.kind === 'player').map((e) => e.name);
});
check('A sees B through the real client', aSees.includes(NAME_B), JSON.stringify(aSees));
check('B sees A through the real client', bSees.includes(NAME_A), JSON.stringify(bSees));

if (IS_MIR4) {
  const uiState = await pageA.evaluate(() => {
    const game = window.__game;
    const attackLabel = document.querySelector(
      '#actionbar .action-btn[data-hotbar-slot="0"] .icon-label',
    )?.textContent;
    const talents = document.querySelector('#mm-talents');
    return {
      classId: game.world.mir4PlayerState()?.classId ?? null,
      attackLabel,
      talentsHidden: talents ? getComputedStyle(talents).display === 'none' : false,
    };
  });
  check(
    'existing HUD presents the authoritative MIR4 class',
    uiState.classId === SCENARIO.primary.mir4ClassId,
    JSON.stringify(uiState),
  );
  check('existing action bar presents Auto Battle', uiState.attackLabel === 'Auto Battle');
  check('classic Talents launcher is hidden', uiState.talentsHidden);

  await pageA.evaluate(() => {
    document
      .querySelector('#actionbar .action-btn[data-hotbar-slot="0"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 500));
  check(
    'existing action bar enables authoritative Auto Battle',
    await pageA.evaluate(() => window.__game.world.mir4AutoBattleActive()),
  );
  await pageA.evaluate(() => {
    document
      .querySelector('#actionbar .action-btn[data-hotbar-slot="0"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await new Promise((r) => setTimeout(r, 500));
  check(
    'existing action bar disables authoritative Auto Battle',
    !(await pageA.evaluate(() => window.__game.world.mir4AutoBattleActive())),
  );
}

// A runs forward; B should observe A's position change
// B drains snapshots on rAF, which only runs foregrounded — so foreground B
// around each position read, and A while it moves.
await pageB.bringToFront();
await new Promise((r) => setTimeout(r, 400));
const before = await pageB.evaluate((name) => {
  const w = window.__game.world;
  const a = [...w.entities.values()].find((e) => e.name === name);
  return a ? { x: a.pos.x, z: a.pos.z } : null;
}, NAME_A);
// rAF (and therefore the input mirror) only runs in the foreground tab.
// Settle after the foreground switch: the blur from the previous switch can
// otherwise land after keydown, and the game clears held keys on blur.
await pageA.bringToFront();
await new Promise((r) => setTimeout(r, 400));
await pageA.keyboard.down('w');
await new Promise((r) => setTimeout(r, 2500));
await pageA.keyboard.up('w');
await pageB.bringToFront();
await new Promise((r) => setTimeout(r, 500));
const after = await pageB.evaluate((name) => {
  const w = window.__game.world;
  const a = [...w.entities.values()].find((e) => e.name === name);
  return a ? { x: a.pos.x, z: a.pos.z } : null;
}, NAME_A);
const moved = before && after ? Math.hypot(after.x - before.x, after.z - before.z) : 0;
check('B watched A move', moved > 4, `${moved.toFixed(1)} yd`);

// chat from A (through the real chat input flow), read on B
await pageA.bringToFront();
await new Promise((r) => setTimeout(r, 600));
await pageA.evaluate(() => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
  const input = document.querySelector('#chat-input');
  input.value = 'Together online!';
  input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', bubbles: true }));
});
// Allow WebSocket frame to flush before bringing B to front
await new Promise((r) => setTimeout(r, 800));
// B's HUD drains network events on rAF, which only runs while foregrounded
await pageB.bringToFront();
await new Promise((r) => setTimeout(r, 1200));
const bGotChat = await pageB.evaluate(() =>
  [...document.querySelectorAll('#chatlog div, #combatlog div')].some((d) =>
    d.textContent.includes('Together online!'),
  ),
);
check('chat A -> B', bGotChat);

// point B's camera at A and screenshot both perspectives
await pageA.bringToFront();
await new Promise((r) => setTimeout(r, 600));
await pageA.screenshot({ path: `tmp/mp_view_${GAME_PROFILE}_A.png` });
await pageB.bringToFront();
await pageB.evaluate((name) => {
  const w = window.__game.world;
  const a = [...w.entities.values()].find((e) => e.name === name);
  if (a)
    window.__game.input.camYaw = Math.atan2(a.pos.x - w.player.pos.x, a.pos.z - w.player.pos.z);
}, NAME_A);
await new Promise((r) => setTimeout(r, 800));
await pageB.screenshot({ path: `tmp/mp_view_${GAME_PROFILE}_B.png` });

check('no page errors', errors.length === 0, errors.slice(0, 10).join('\n'));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail > 0 ? 1 : 0;
