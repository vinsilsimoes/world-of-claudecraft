// Two-browser multiplayer E2E: register two accounts, create two characters,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, condition, extra = '') {
  if (condition) {
    pass += 1;
    console.log(`OK   ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}${extra ? ` ${extra}` : ''}`);
  }
}

async function launchBrowser(label) {
  return puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    protocolTimeout: 180000,
    userDataDir: `tmp/mp-browser-${label}-${uniq}`,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1280,760',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
    ],
    defaultViewport: { width: 1280, height: 760 },
  });
}

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
  await page.evaluateOnNewDocument(() => {
    try {
      const key = 'woc_settings';
      const current = JSON.parse(localStorage.getItem(key) ?? '{}') ?? {};
      localStorage.setItem(
        key,
        JSON.stringify({
          ...current,
          graphicsPreset: 1,
          graphicsDefaultApplied: true,
          browserEffects: 3,
          fullscreen: 0,
          reduceMotion: true,
          weather: false,
        }),
      );
    } catch {
      // A denied storage write is diagnosable below; it must not invent a
      // separate boot path from the one real players use.
    }
  });
  let navigationError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      navigationError = undefined;
      break;
    } catch (error) {
      navigationError = error;
      await sleep(1000);
    }
  }
  if (navigationError) throw navigationError;
  await page.waitForSelector('#btn-online', { timeout: 30000 });
  await sleep(1000);
  step('loaded');
  // evaluate-based DOM interaction (page.click can stall on this page under swiftshader)
  await page.waitForFunction(
    () => {
      const loginPanel = document.querySelector('#login-panel');
      if (loginPanel && !loginPanel.hasAttribute('hidden')) return true;
      document.querySelector('#btn-online')?.click();
      return false;
    },
    { timeout: 45000, polling: 500 },
  );
  await page.waitForSelector('#login-user', { visible: true, timeout: 45000 });
  let submitted = false;
  for (let attempt = 0; attempt < 6 && !submitted; attempt++) {
    submitted = await page.evaluate(
      (user, pass, email, register) => {
        const form = document.querySelector('#login-panel');
        const userInput = document.querySelector('#login-user');
        const passInput = document.querySelector('#login-pass');
        const toggle = document.querySelector('#btn-auth-toggle');
        const submit = document.querySelector('#btn-login');
        if (!form || !userInput || !passInput || !toggle || !submit) return false;

        const desiredMode = register ? 'register' : 'login';
        if (form.dataset.authMode !== desiredMode) toggle.click();
        const emailInput = document.querySelector('#login-email');
        userInput.value = user;
        passInput.value = pass;
        if (register && emailInput) emailInput.value = email;
        submit.click();
        return true;
      },
      username,
      password,
      `${username}@example.com`,
      fresh,
    );
    if (!submitted) await sleep(400);
  }
  if (!submitted) throw new Error('login form never stabilized');

  await page.waitForSelector('#realm-list .realm-row', { timeout: 15000 });
  await page.evaluate(() => {
    const row = document.querySelector('#realm-list .realm-row');
    (row instanceof HTMLElement ? row : null)?.click();
  });
  await page.waitForFunction(
    () =>
      !document.querySelector('#charcreate-panel')?.hasAttribute('hidden') ||
      !document.querySelector('#charselect-panel')?.hasAttribute('hidden'),
    { timeout: 15000, polling: 200 },
  );

  const createPanelVisible = await page.evaluate(
    () => !document.querySelector('#charcreate-panel')?.hasAttribute('hidden'),
  );
  if (!createPanelVisible) {
    await page.evaluate(() => document.querySelector('#btn-new-character')?.click());
    await page.waitForFunction(
      () => !document.querySelector('#charcreate-panel')?.hasAttribute('hidden'),
      { timeout: 10000, polling: 200 },
    );
  }
  step('character create');
  await page.evaluate(
    (name, cls) => {
      document.querySelector('#new-char-name').value = name;
      document.querySelector(`#charcreate-panel .mini-class[data-class="${cls}"]`)?.click();
      document.querySelector('#btn-create-char').click();
    },
    charName,
    cls,
  );
  await page.waitForFunction(
    (name) => {
      if (document.querySelector('#charselect-panel')?.hasAttribute('hidden')) return false;
      return [...document.querySelectorAll('#char-list .char-row')].some(
        (row) => row.querySelector('.char-name')?.textContent?.trim() === name,
      );
    },
    { timeout: 20000, polling: 200 },
    charName,
  );
  step('character created');

  const entryAction = await page.evaluate((name) => {
    window.confirm = () => true;
    const rows = [...document.querySelectorAll('#char-list .char-row')];
    const row = rows.find(
      (candidate) => candidate.querySelector('.char-name')?.textContent?.trim() === name,
    );
    if (!(row instanceof HTMLElement)) return 'missing-row';
    row.click();
    const shared = document.querySelector('#btn-charselect-enter');
    const button =
      shared instanceof HTMLButtonElement && !shared.disabled
        ? shared
        : (row.querySelector('.enter-world-btn') ?? row.querySelector('.take-over-btn'));
    if (!(button instanceof HTMLButtonElement)) return 'missing-button';
    button.click();
    return button.id || button.className;
  }, charName);
  if (entryAction === 'missing-row' || entryAction === 'missing-button') {
    throw new Error(`${charName} could not start entry: ${entryAction}`);
  }

  await page.waitForFunction(
    () => {
      const preflight = document.querySelector('#mobile-preflight');
      if (preflight?.classList.contains('visible')) {
        document.querySelector('#mobile-preflight-continue')?.click();
      }
      return (
        document.querySelector('#start-screen')?.style.display === 'none' ||
        document.querySelector('#disconnect-overlay') !== null ||
        typeof window.__game !== 'undefined'
      );
    },
    { timeout: 30000, polling: 250 },
  );
  step('entering world...');
  try {
    await page.waitForFunction(
      () =>
        window.__game?.world?.entities?.size >= 1 ||
        document.querySelector('#disconnect-overlay') !== null,
      {
        timeout: 120000,
        polling: 500,
      },
    );
    const disconnect = await page.evaluate(
      () => document.querySelector('#disconnect-overlay')?.textContent?.trim() ?? null,
    );
    if (disconnect) throw new Error(`world entry rejected: ${disconnect}`);
    await page.waitForFunction(() => window.__game?.world?.entities?.size >= 1, {
      timeout: 10000,
      polling: 500,
    });
  } catch (error) {
    const diagnostics = await page
      .evaluate(() => ({
        url: location.href,
        startPanel: document.body.dataset.startPanel ?? null,
        startDisplay: document.querySelector('#start-screen')?.style.display ?? null,
        loadingVisible: document.querySelector('#loading-screen')?.classList.contains('visible'),
        loadingStatus: document.querySelector('#ls-status')?.textContent?.trim() ?? null,
        disconnect: document.querySelector('#disconnect-overlay')?.textContent?.trim() ?? null,
        charselectError: document.querySelector('#charselect-error')?.textContent?.trim() ?? null,
        hasGame: typeof window.__game !== 'undefined',
      }))
      .catch((diagnosticError) => ({ diagnosticError: String(diagnosticError) }));
    console.error(`ENTRY DIAGNOSTICS ${charName}: ${JSON.stringify(diagnostics)}`);
    console.error(
      `PAGE ERRORS ${charName}: ${JSON.stringify(errors.filter((x) => x.includes(charName)))}`,
    );
    await page
      .screenshot({ path: `tmp/mp_failure_${GAME_PROFILE}_${charName}.png` })
      .catch(() => {});
    throw error;
  }
  await sleep(1200);
  await page.evaluate(() => document.querySelector('button.tut-skip')?.click()).catch(() => {});
  step('in world');
}

// A live 3D page can starve a sibling page when both share one headless
// SwiftShader process. Separate processes keep each client's render loop and
// Puppeteer protocol responsive while both remain on the same game server.
const browserA = await launchBrowser('a');
const browserB = await launchBrowser('b');
const pageA = await browserA.newPage();
const pageB = await browserB.newPage();

console.log('logging in A...');
await loginAndEnter(pageA, `duo_${uniq}`, 'hunter22', NAME_A, SCENARIO.primary.classKey, true);
console.log('logging in B (independent multiplayer account)...');
await loginAndEnter(pageB, `duob_${uniq}`, 'hunter22', NAME_B, SCENARIO.secondary.classKey, true);

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
await Promise.all([browserA.close(), browserB.close()]);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail > 0 ? 1 : 0;
