// Visible, browser-backed MIR4 playtest cohort. Every window is the shipped
// World of ClaudeCraft client: login, realm selection, character entry,
// ClientWorld snapshots and gameplay commands all cross the real local
// REST/PostgreSQL/WebSocket boundary. No replacement HUD is injected.

import { spawn } from 'node:child_process';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import puppeteer from 'puppeteer-core';

import { BROWSER_PATH } from './browser_path.mjs';
import { assertLoopbackUrl } from './lib/loopback_guard.mjs';
import {
  buildMir4PlaytestReport,
  createMir4BotTracker,
  MIR4_PLAYTEST_ROSTER,
  mir4BotAccountIdentity,
  recordMir4BotSnapshot,
} from './lib/mir4_bot_playtest.mjs';
import {
  applyMir4VisualAction,
  dismissMir4VisualObstructions,
  mir4VisualBotEntities,
  mir4VisualBotSnapshot,
  mir4VisualOnlineEntryState,
  mir4VisualRecordingOptions,
  mir4VisualWindowLayout,
  planMir4VisualPolicy,
  resumeMir4VisualCharacter,
  updateMir4VisualRecovery,
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
const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';
const RECORD_FPS = integer('RECORD_FPS', 30, 10, 60);
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

async function convertRecordingToMp4(recordingPath, videoPath) {
  await new Promise((resolveConvert, rejectConvert) => {
    const child = spawn(
      String(ffmpegPath),
      [
        '-loglevel',
        'error',
        '-y',
        '-i',
        recordingPath,
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '18',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        videoPath,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      if (stderr.length < 8_000) stderr += chunk.toString('utf8');
    });
    child.once('error', rejectConvert);
    child.once('exit', (code) => {
      if (code === 0) resolveConvert();
      else rejectConvert(new Error(`ffmpeg conversion failed (${code}): ${stderr.trim()}`));
    });
  });
}

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

async function waitForOnlineEntryState(page, characterName, excludedStates = []) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(mir4VisualOnlineEntryState, characterName, excludedStates);
    if (state) return state;
    await sleep(250);
  }
  const diagnostics = await page.evaluate(() => ({
    startPanel: document.body.dataset.startPanel,
    startScreen: document.querySelector('#start-screen')?.style.display,
    gameEntities: window.__game?.world?.entities?.size ?? null,
    loginHidden: document.querySelector('#login-panel')?.hasAttribute('hidden'),
    realmHidden: document.querySelector('#realm-panel')?.hasAttribute('hidden'),
    characterHidden: document.querySelector('#charselect-panel')?.hasAttribute('hidden'),
    realmRows: document.querySelectorAll('#realm-list .realm-row').length,
    characterNames: [...document.querySelectorAll('#char-list .char-name')].map((node) =>
      node.textContent?.trim(),
    ),
  }));
  throw new Error(`Online entry stalled: ${JSON.stringify(diagnostics)}`);
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

async function launchVisibleClient(entry, identity, placement, startedAt, index, captureDir) {
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
    defaultViewport: {
      width: placement.width,
      // Investor footage keeps a standard full-frame viewport. Ordinary watch
      // mode leaves room for the native browser chrome on the physical screen.
      height: RECORD_VIDEO ? placement.height : Math.max(360, placement.height - 80),
    },
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
  let entryState = await waitForOnlineEntryState(page, identity.characterName);
  if (entryState === 'login') {
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
    entryState = await waitForOnlineEntryState(page, identity.characterName, ['login']);
  }
  if (entryState === 'realm') {
    await page.evaluate(() => document.querySelector('#realm-list .realm-row')?.click());
    entryState = await waitForOnlineEntryState(page, identity.characterName, ['login', 'realm']);
  }
  const entryResult =
    entryState === 'world' ||
    (await page.evaluate((characterName) => {
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
    }, identity.characterName));
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
  await page.evaluate(dismissMir4VisualObstructions);
  const recordingPath = RECORD_VIDEO
    ? join(captureDir, `${entry.classKey}-${startedAt}.webm`)
    : null;
  const videoPath = recordingPath?.replace(/\.webm$/i, '.mp4') ?? null;
  const recorder = recordingPath
    ? await page.screencast(
        mir4VisualRecordingOptions(recordingPath, String(ffmpegPath), RECORD_FPS),
      )
    : null;
  const tracker = createMir4BotTracker(entry, identity.characterName, startedAt);
  console.log(`[visual ${index + 1}/${ROSTER.length}] ${entry.classKey} entered the world`);
  if (videoPath) console.log(`[recording] ${videoPath}`);
  return {
    entry,
    identity,
    browser,
    page,
    errors,
    tracker,
    recorder,
    recordingPath,
    videoPath,
    entities: new Map(),
    tutorialSeeking: false,
    recoveryLevel: null,
    observedDeaths: 0,
    lastPolicyAt: 0,
    lastResumeAt: 0,
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
  await page.evaluate(applyMir4VisualAction, action);
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
  if (RECORD_VIDEO && !ffmpegPath) {
    throw new Error('RECORD_VIDEO requires the bundled ffmpeg-static executable');
  }
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
          captureDir,
        ),
      );
    }
    console.log(`Visible MIR4 cohort running for ${Math.floor(DURATION_MS / 1_000)} seconds.`);
    console.log('Watch the existing WoC windows; press Ctrl+C in the launcher to stop and save.');
    console.log(`Report: ${reportPath}`);

    // Provisioning, login and initial asset loading can take over a minute on a
    // cold local runtime. DURATION_SECONDS describes playable footage, so its
    // clock begins only after every visible client has entered the world.
    const runningStartedAt = Date.now();
    let lastReportAt = 0;
    let lastCaptureAt = 0;
    while (!stopping && Date.now() - runningStartedAt < DURATION_MS) {
      const now = Date.now();
      for (const client of clients) {
        await client.page.evaluate(dismissMir4VisualObstructions).catch(() => {});
        if (now - client.lastResumeAt >= 5_000) {
          const resumed = await client.page
            .evaluate(resumeMir4VisualCharacter, client.identity.characterName)
            .catch(() => false);
          if (resumed) {
            client.lastResumeAt = now;
            console.log(`[resume] ${client.entry.classKey} re-entering the world`);
            await client.page
              .waitForFunction(
                () =>
                  document.querySelector('#start-screen')?.style.display === 'none' &&
                  window.__game?.world?.entities?.size >= 1,
                { timeout: 120_000, polling: 500 },
              )
              .catch((error) => {
                client.errors.push(
                  `world resume: ${error instanceof Error ? error.message : String(error)}`,
                );
              });
          }
        }
        const snapshot = await readSnapshot(client);
        if (snapshot) {
          const recovery = updateMir4VisualRecovery(
            client.recoveryLevel,
            client.observedDeaths,
            client.tracker.progress.deaths,
            snapshot.lv,
          );
          if (recovery.started) {
            console.log(
              `[recovery] ${client.entry.classKey} pausing campaign until level ${recovery.recoveryLevel}`,
            );
          } else if (recovery.completed) {
            console.log(`[recovery] ${client.entry.classKey} resuming campaign`);
          }
          client.recoveryLevel = recovery.recoveryLevel;
          client.observedDeaths = recovery.observedDeaths;
        }
        if (snapshot && now - client.lastPolicyAt >= POLICY_MS) {
          client.lastPolicyAt = now;
          const policy = planMir4VisualPolicy({
            self: snapshot,
            entities: client.entities,
            rosterEntry: client.entry,
            tutorialSeeking: client.tutorialSeeking,
            recoveryLevel: client.recoveryLevel,
          });
          client.tutorialSeeking = policy.tutorialSeeking;
          for (const action of policy.actions) {
            await applyVisualAction(client.page, action);
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
          videos: Object.fromEntries(
            clients
              .filter((client) => client.videoPath)
              .map((client) => [client.entry.classKey, client.videoPath]),
          ),
          pageErrors: Object.fromEntries(
            clients.map((client) => [client.entry.classKey, client.errors.slice(0, 50)]),
          ),
        };
        await writeReport(reportPath, report);
        console.log(
          `[${Math.floor((now - runningStartedAt) / 1_000)}s] ${report.bots
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
    // Freeze playtest time before video encoding. MP4 conversion can take over
    // a minute and must not be misreported as stalled in-world progression.
    const endedAt = Date.now();
    for (const client of clients) {
      await client.recorder?.stop().catch((error) => {
        client.errors.push(`video recorder: ${error instanceof Error ? error.message : error}`);
      });
      client.recorder = null;
      if (client.recordingPath && client.videoPath) {
        await convertRecordingToMp4(client.recordingPath, client.videoPath).catch((error) => {
          client.errors.push(`video conversion: ${error instanceof Error ? error.message : error}`);
        });
      }
    }
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
      videos: Object.fromEntries(
        clients
          .filter((client) => client.videoPath)
          .map((client) => [client.entry.classKey, client.videoPath]),
      ),
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
