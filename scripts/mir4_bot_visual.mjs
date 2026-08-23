// Visible, browser-backed MIR4 playtest cohort. Every window is the shipped
// World of ClaudeCraft client: login, realm selection, character entry,
// ClientWorld snapshots and gameplay commands all cross the real local
// REST/PostgreSQL/WebSocket boundary. No replacement HUD is injected.

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH } from './browser_path.mjs';
import { assertLoopbackUrl } from './lib/loopback_guard.mjs';
import {
  buildMir4PlaytestReport,
  createMir4BotTracker,
  MIR4_PLAYTEST_ROSTER,
  mir4BotAccountIdentity,
  planMir4ProgressionActions,
  planMir4TutorialEngagement,
  recordMir4BotSnapshot,
} from './lib/mir4_bot_playtest.mjs';
import {
  mir4VisualBotEntities,
  mir4VisualBotSnapshot,
  mir4VisualWindowLayout,
  visualBotCaption,
} from './lib/mir4_bot_visual.mjs';

const PROFILE = 'mir4-gameplay-port';
const BASE = process.env.SERVER_URL ?? 'http://127.0.0.1:8787';
const PASSWORD = process.env.BOT_PASSWORD ?? '';
const NAMESPACE = String(process.env.BOT_NAMESPACE ?? 'localalpha')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .slice(0, 10);
const DURATION_MS = seconds('DURATION_SECONDS', 1_800, 30, 86_400) * 1_000;
const STALL_MS = seconds('STALL_SECONDS', 90, 15, 3_600) * 1_000;
const POLICY_MS = seconds('POLICY_INTERVAL_SECONDS', 3, 1, 60) * 1_000;
const REPORT_MS = seconds('REPORT_INTERVAL_SECONDS', 10, 2, 300) * 1_000;
const CAPTURE_MS = seconds('CAPTURE_INTERVAL_SECONDS', 120, 15, 3_600) * 1_000;
const SCREEN_WIDTH = integer('BOT_SCREEN_WIDTH', 1920, 960, 7680);
const SCREEN_HEIGHT = integer('BOT_SCREEN_HEIGHT', 1080, 720, 4320);
const REPORT_DIR = resolve(process.env.REPORT_DIR ?? 'tmp/mir4-bot-playtests');
const REQUESTED_CLASSES = new Set(
  String(process.env.BOT_CLASSES ?? MIR4_PLAYTEST_ROSTER.map((entry) => entry.classKey).join(','))
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const ROSTER = MIR4_PLAYTEST_ROSTER.filter((entry) => REQUESTED_CLASSES.has(entry.classKey));

function seconds(name, fallback, min, max) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max} seconds`);
  }
  return value;
}

function integer(name, fallback, min, max) {
  const value = process.env[name] === undefined ? fallback : Number(process.env[name]);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}

const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

async function api(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, body: payload };
}

function expectStatus(result, statuses, operation) {
  if (statuses.includes(result.status)) return result.body;
  throw new Error(`${operation} failed (${result.status}): ${JSON.stringify(result.body)}`);
}

async function provision(entry) {
  const identity = mir4BotAccountIdentity(NAMESPACE, entry);
  let auth = await api('/api/login', {
    method: 'POST',
    body: { username: identity.username, password: PASSWORD },
  });
  if (auth.status === 401) {
    auth = await api('/api/register', {
      method: 'POST',
      body: {
        username: identity.username,
        password: PASSWORD,
        email: `${identity.username}@example.com`,
      },
    });
  }
  const token = expectStatus(auth, [200], `authenticate ${entry.classKey}`).token;
  const listed = expectStatus(await api('/api/characters', { token }), [200], 'list characters');
  let character = listed.characters?.find((candidate) => candidate.class === entry.classKey);
  if (!character) {
    character = expectStatus(
      await api('/api/characters', {
        method: 'POST',
        token,
        body: { name: identity.characterName, class: entry.classKey },
      }),
      [200],
      `create ${entry.classKey}`,
    );
  }
  if (character.online) {
    await api(`/api/characters/${character.id}/takeover`, { method: 'POST', token, body: {} });
  }
  return { ...identity, characterName: character.name };
}

async function launchVisibleClient(entry, identity, placement, startedAt, index) {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    `--window-position=${placement.x},${placement.y}`,
    `--window-size=${placement.width},${placement.height}`,
  ];
  if (process.env.BOT_SOFTWARE_GPU === '1') {
    args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  }
  const browser = await puppeteer.launch({
    executablePath: BROWSER_PATH,
    headless: false,
    protocolTimeout: 180_000,
    userDataDir: resolve('tmp', `mir4-visual-${NAMESPACE}-${entry.classKey}`),
    args,
    defaultViewport: { width: placement.width, height: Math.max(360, placement.height - 80) },
  });
  const pages = await browser.pages();
  const page = pages[0] ?? (await browser.newPage());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      errors.push(message.text());
    }
  });
  await page.evaluateOnNewDocument(() => {
    const current = JSON.parse(localStorage.getItem('woc_settings') ?? '{}') ?? {};
    localStorage.setItem(
      'woc_settings',
      JSON.stringify({
        ...current,
        graphicsPreset: 2,
        graphicsDefaultApplied: true,
        fullscreen: 0,
        mouseCamera: true,
      }),
    );
  });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('#btn-online', { timeout: 30_000 });
  await page.evaluate(() => document.querySelector('#btn-online')?.click());
  await page.waitForSelector('#login-user', { visible: true, timeout: 30_000 });
  await page.evaluate(
    (username, password) => {
      const panel = document.querySelector('#login-panel');
      const toggle = document.querySelector('#btn-auth-toggle');
      if (panel?.dataset.authMode !== 'login') toggle?.click();
      const user = document.querySelector('#login-user');
      const pass = document.querySelector('#login-pass');
      if (user) user.value = username;
      if (pass) pass.value = password;
      document.querySelector('#btn-login')?.click();
    },
    identity.username,
    PASSWORD,
  );
  await page.waitForSelector('#realm-list .realm-row', { timeout: 30_000 });
  await page.evaluate(() => document.querySelector('#realm-list .realm-row')?.click());
  await page.waitForFunction(
    (characterName) =>
      [...document.querySelectorAll('#char-list .char-row')].some(
        (row) => row.querySelector('.char-name')?.textContent?.trim() === characterName,
      ),
    { timeout: 30_000, polling: 250 },
    identity.characterName,
  );
  const entryResult = await page.evaluate((characterName) => {
    window.confirm = () => true;
    const row = [...document.querySelectorAll('#char-list .char-row')].find(
      (candidate) => candidate.querySelector('.char-name')?.textContent?.trim() === characterName,
    );
    if (!row) return false;
    row.click();
    const shared = document.querySelector('#btn-charselect-enter');
    const button =
      shared && !shared.disabled ? shared : row.querySelector('.enter-world-btn, .take-over-btn');
    button?.click();
    return Boolean(button);
  }, identity.characterName);
  if (!entryResult) throw new Error(`Could not enter world as ${identity.characterName}`);
  await page.waitForFunction(() => window.__game?.world?.entities?.size >= 1, {
    timeout: 120_000,
    polling: 500,
  });
  await page.evaluate(
    (caption) => {
      document.title = caption;
      document.querySelector('button.tut-skip')?.click();
    },
    visualBotCaption(entry, identity.characterName),
  );
  const tracker = createMir4BotTracker(entry, identity.characterName, startedAt);
  console.log(`[visual ${index + 1}/${ROSTER.length}] ${entry.classKey} entered the world`);
  return {
    entry,
    identity,
    browser,
    page,
    errors,
    tracker,
    entities: new Map(),
    tutorialSeeking: false,
    lastPolicyAt: 0,
  };
}

async function readSnapshot(client) {
  const snapshot = await client.page.evaluate(mir4VisualBotSnapshot);
  const entities = await client.page.evaluate(mir4VisualBotEntities);
  client.entities = new Map(entities.map((entity) => [entity.id, entity]));
  if (snapshot) recordMir4BotSnapshot(client.tracker, snapshot, Date.now());
  return snapshot;
}

async function applyVisualAction(page, action) {
  await page.evaluate(async (next) => {
    const game = window.__game;
    const world = game?.world;
    if (!world) return;
    if (next.t === 'input') {
      game.input?.setControllerMoveInput(next.mi, next.facing);
    } else if (next.cmd === 'mir4' && next.m === 'auto') {
      const button = document.querySelector('#actionbar .action-btn[data-hotbar-slot="0"]');
      if (!(button instanceof HTMLElement))
        throw new Error('Auto Battle action-bar button missing');
      button.click();
    } else if (next.cmd === 'mir4' && next.m === 'quest') {
      world.setMir4AutoQuest(next.on === true);
    } else if (next.cmd === 'mir4' && next.m === 'ackTutorial') {
      world.mir4AcknowledgeTutorial(next.questId);
    } else if (next.cmd === 'mir4' && next.m === 'equipItem') {
      world.mir4EquipItem(next.itemId);
    } else if (next.cmd === 'mir4' && next.m === 'claimAchievement') {
      await world.mir4ClaimAchievement(next.achievementId);
    } else if (next.cmd === 'mir4' && next.m === 'upgradeSkill') {
      world.mir4UpgradeSkill(next.skillId, next.expectedCurrentLevel);
    } else if (next.cmd === 'mir4' && next.m === 'confirmMount') {
      world.mir4ConfirmMount(next.pendingId);
    } else if (next.cmd === 'mir4' && next.m === 'confirmSpirit') {
      world.mir4ConfirmSpirit(next.pendingId);
    } else if (next.cmd === 'use') {
      world.useItem(next.item);
    } else if (next.cmd === 'release') {
      world.releaseSpirit();
    } else if (next.cmd === 'resurrect_healer') {
      await world.resurrectAtSpiritHealer();
    }
  }, action);
}

async function writeReport(path, report) {
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await rename(partial, path).catch(() => writeFile(path, `${JSON.stringify(report, null, 2)}\n`));
}

async function main() {
  assertLoopbackUrl(BASE, 'SERVER_URL');
  if (NAMESPACE.length < 3) throw new Error('BOT_NAMESPACE needs at least 3 letters or digits');
  if (PASSWORD.length < 12) throw new Error('BOT_PASSWORD must contain at least 12 characters');
  if (ROSTER.length === 0) throw new Error('BOT_CLASSES did not select a MIR4 class');
  const status = expectStatus(await api('/api/status'), [200], 'server status');
  if (status.gameProfile && status.gameProfile !== PROFILE) {
    throw new Error(`Server profile is ${status.gameProfile}, expected ${PROFILE}`);
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const startedAt = Date.now();
  const reportPath = join(REPORT_DIR, `${NAMESPACE}-visual-${startedAt}.json`);
  const captureDir = join(REPORT_DIR, `${NAMESPACE}-visual-${startedAt}`);
  await mkdir(captureDir, { recursive: true });
  const placements = mir4VisualWindowLayout(ROSTER.length, SCREEN_WIDTH, SCREEN_HEIGHT);
  const clients = [];
  let stopping = false;
  process.once('SIGINT', () => {
    stopping = true;
  });
  process.once('SIGTERM', () => {
    stopping = true;
  });

  try {
    const identities = [];
    for (const entry of ROSTER) identities.push(await provision(entry));
    for (let index = 0; index < ROSTER.length; index += 1) {
      clients.push(
        await launchVisibleClient(
          ROSTER[index],
          identities[index],
          placements[index],
          startedAt,
          index,
        ),
      );
    }
    console.log(`Visible MIR4 cohort running for ${Math.floor(DURATION_MS / 1_000)} seconds.`);
    console.log('Watch the existing WoC windows; press Ctrl+C in the launcher to stop and save.');
    console.log(`Report: ${reportPath}`);

    let lastReportAt = 0;
    let lastCaptureAt = 0;
    while (!stopping && Date.now() - startedAt < DURATION_MS) {
      const now = Date.now();
      for (const client of clients) {
        const snapshot = await readSnapshot(client);
        if (snapshot && now - client.lastPolicyAt >= POLICY_MS) {
          client.lastPolicyAt = now;
          const tutorialActions = planMir4TutorialEngagement(
            snapshot,
            client.entities,
            client.entry,
          );
          if (tutorialActions.length > 0) {
            client.tutorialSeeking = true;
            for (const action of tutorialActions) {
              await applyVisualAction(client.page, action);
            }
          } else {
            if (client.tutorialSeeking) {
              await client.page.evaluate(() => window.__game?.input?.clearControllerMoveInput());
              client.tutorialSeeking = false;
            }
            for (const action of planMir4ProgressionActions(snapshot, client.entry)) {
              await applyVisualAction(client.page, action);
            }
          }
        }
      }
      if (now - lastCaptureAt >= CAPTURE_MS) {
        lastCaptureAt = now;
        for (const client of clients) {
          const file = join(captureDir, `${now}-${client.entry.classKey}.png`);
          await client.page.screenshot({ path: file }).catch(() => {});
        }
      }
      if (now - lastReportAt >= REPORT_MS) {
        lastReportAt = now;
        const report = buildMir4PlaytestReport({
          namespace: `${NAMESPACE}-visual`,
          trackers: clients.map((client) => client.tracker),
          startedAt,
          endedAt: now,
          stallThresholdMs: STALL_MS,
        });
        report.runtime = {
          mode: 'visible-browser',
          serverUrl: BASE,
          screenshots: captureDir,
          pageErrors: Object.fromEntries(
            clients.map((client) => [client.entry.classKey, client.errors.slice(0, 50)]),
          ),
        };
        await writeReport(reportPath, report);
        console.log(
          `[${Math.floor((now - startedAt) / 1_000)}s] ${report.bots
            .map(
              (bot) =>
                `${bot.identity.classKey}:L${bot.latest?.level ?? '?'} Q${bot.progress.questAdvances}`,
            )
            .join(' | ')}`,
        );
      }
      await sleep(500);
    }
  } finally {
    const endedAt = Date.now();
    const report = buildMir4PlaytestReport({
      namespace: `${NAMESPACE}-visual`,
      trackers: clients.map((client) => client.tracker),
      startedAt,
      endedAt,
      stallThresholdMs: STALL_MS,
    });
    report.runtime = {
      mode: 'visible-browser',
      serverUrl: BASE,
      interrupted: stopping,
      screenshots: captureDir,
      pageErrors: Object.fromEntries(
        clients.map((client) => [client.entry.classKey, client.errors.slice(0, 50)]),
      ),
    };
    await writeReport(reportPath, report);
    for (const client of clients) await client.browser.close().catch(() => {});
    console.log(`Final visible report written to ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
