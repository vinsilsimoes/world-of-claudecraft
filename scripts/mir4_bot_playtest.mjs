// Persistent MIR4 artificial playtest cohort against the real local product
// boundary. Accounts, characters, snapshots and commands all travel through
// the same REST and WebSocket paths as a player. This script never seeds the
// database, invokes a dev command or mutates Sim state directly.

import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import WebSocket from 'ws';
import { assertLoopbackUrl } from './lib/loopback_guard.mjs';
import {
  buildMir4PlaytestReport,
  createMir4BotTracker,
  MIR4_PLAYTEST_ROSTER,
  mir4BotAccountIdentity,
  mir4BotHasDuelRequest,
  planMir4ProgressionActions,
  planMir4PvpChallenge,
  planMir4TutorialEngagement,
  recordMir4BotEvents,
  recordMir4BotSnapshot,
} from './lib/mir4_bot_playtest.mjs';
import { mergeEntitySnapshot, mergeSelfSnapshot } from './lib/mp_snapshot_merge.mjs';
import { worldAuthMessage } from './lib/world_auth.mjs';

const PROFILE = 'mir4-gameplay-port';
const BASE = process.env.SERVER_URL ?? 'http://127.0.0.1:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
const PASSWORD = process.env.BOT_PASSWORD ?? '';
const NAMESPACE = sanitizeNamespace(process.env.BOT_NAMESPACE ?? 'localalpha');
const DURATION_MS = boundedSeconds('DURATION_SECONDS', 600, 30, 86_400) * 1_000;
const STALL_MS = boundedSeconds('STALL_SECONDS', 90, 15, 3_600) * 1_000;
const PVP_TIMEOUT_MS = boundedSeconds('PVP_TIMEOUT_SECONDS', 60, 15, 600) * 1_000;
const POLICY_INTERVAL_MS = boundedSeconds('POLICY_INTERVAL_SECONDS', 3, 1, 60) * 1_000;
const REPORT_INTERVAL_MS = boundedSeconds('REPORT_INTERVAL_SECONDS', 10, 2, 300) * 1_000;
const REPORT_DIR = resolve(process.env.REPORT_DIR ?? 'tmp/mir4-bot-playtests');
const REQUESTED_CLASSES = new Set(
  String(process.env.BOT_CLASSES ?? MIR4_PLAYTEST_ROSTER.map((entry) => entry.classKey).join(','))
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const ACTIVE_ROSTER = MIR4_PLAYTEST_ROSTER.filter((entry) => REQUESTED_CLASSES.has(entry.classKey));

function boundedSeconds(name, fallback, min, max) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} must be between ${min} and ${max} seconds`);
  }
  return value;
}

function sanitizeNamespace(value) {
  const normalized = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10);
  if (normalized.length < 3) throw new Error('BOT_NAMESPACE needs at least 3 letters or digits');
  return normalized;
}

const sleep = (ms) => new Promise((accept) => setTimeout(accept, ms));

async function api(path, { method = 'GET', body, token } = {}, retry = 0) {
  const response = await fetch(BASE + path, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 429 && retry < 5) {
    await sleep(500 * 2 ** retry);
    return api(path, { method, body, token }, retry + 1);
  }
  return { status: response.status, body: payload };
}

function expectApi(result, expected, operation) {
  if (expected.includes(result.status)) return result.body;
  throw new Error(`${operation} failed (${result.status}): ${JSON.stringify(result.body)}`);
}

class RealPlayerBot {
  constructor(rosterEntry, startedAt) {
    this.rosterEntry = rosterEntry;
    const identity = mir4BotAccountIdentity(NAMESPACE, rosterEntry);
    this.username = identity.username;
    this.characterName = identity.characterName;
    this.tracker = createMir4BotTracker(rosterEntry, this.characterName, startedAt);
    this.entities = new Map();
    this.events = [];
    this.self = null;
    this.pid = null;
    this.lastPolicyAt = 0;
    this.tutorialSeeking = false;
    this.connectionErrors = [];
  }

  async provision() {
    let auth = await api('/api/login', {
      method: 'POST',
      body: { username: this.username, password: PASSWORD },
    });
    if (auth.status === 401) {
      auth = await api('/api/register', {
        method: 'POST',
        body: {
          username: this.username,
          password: PASSWORD,
          email: `${this.username}@example.com`,
        },
      });
      expectApi(auth, [200], `register ${this.username}`);
    } else {
      expectApi(auth, [200], `login ${this.username}`);
    }
    this.token = auth.body.token;
    if (typeof this.token !== 'string') throw new Error(`No token for ${this.username}`);

    const listed = expectApi(
      await api('/api/characters', { token: this.token }),
      [200],
      `list characters for ${this.username}`,
    );
    let character = listed.characters?.find((entry) => entry.class === this.rosterEntry.classKey);
    if (!character) {
      character = expectApi(
        await api('/api/characters', {
          method: 'POST',
          token: this.token,
          body: { name: this.characterName, class: this.rosterEntry.classKey },
        }),
        [200],
        `create ${this.rosterEntry.classKey}`,
      );
    } else {
      this.characterName = character.name;
      this.tracker.identity.characterName = character.name;
      if (character.online) {
        expectApi(
          await api(`/api/characters/${character.id}/takeover`, {
            method: 'POST',
            token: this.token,
            body: {},
          }),
          [200],
          `take over stale session for ${this.characterName}`,
        );
      }
    }
    this.characterId = character.id;
  }

  connect() {
    return new Promise((accept, reject) => {
      let receivedHello = false;
      const timeout = setTimeout(
        () => reject(new Error(`WebSocket timeout for ${this.characterName}`)),
        10_000,
      );
      this.ws = new WebSocket(`${WS_BASE}/ws`);
      this.ws.on('open', () =>
        this.ws.send(JSON.stringify(worldAuthMessage(this.token, this.characterId, PROFILE))),
      );
      this.ws.on('message', (data) => {
        let message;
        try {
          message = JSON.parse(String(data));
        } catch (error) {
          this.connectionErrors.push(`invalid-json:${String(error)}`);
          return;
        }
        const now = Date.now();
        if (message.t === 'hello') {
          receivedHello = true;
          this.pid = message.pid;
          clearTimeout(timeout);
          accept(message);
        } else if (message.t === 'snap') {
          this.self = mergeSelfSnapshot(this.self, message.self);
          this.entities = mergeEntitySnapshot(this.entities, message);
          if (this.self?.id) this.entities.set(this.self.id, this.self);
          recordMir4BotSnapshot(this.tracker, this.self, now);
        } else if (message.t === 'events') {
          this.events.push(...message.list);
          if (this.events.length > 2_000) this.events.splice(0, this.events.length - 2_000);
          recordMir4BotEvents(this.tracker, message.list, now);
        } else if (message.t === 'error') {
          this.connectionErrors.push(String(message.error ?? 'WebSocket error'));
          clearTimeout(timeout);
          reject(new Error(`${this.characterName}: ${message.error}`));
        }
      });
      this.ws.on('error', (error) => {
        this.connectionErrors.push(String(error.message ?? error));
        clearTimeout(timeout);
        reject(error);
      });
      this.ws.on('close', () => {
        clearTimeout(timeout);
        if (!receivedHello)
          reject(new Error(`WebSocket closed before hello for ${this.characterName}`));
      });
    });
  }

  send(payload) {
    if (this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  cmd(payload) {
    return this.send({ t: 'cmd', ...payload });
  }

  input(move, facing) {
    return this.send({ t: 'input', mi: move, ...(facing === undefined ? {} : { facing }) });
  }

  applyProgressionPolicy(now) {
    if (now - this.lastPolicyAt < POLICY_INTERVAL_MS) return;
    this.lastPolicyAt = now;
    const tutorialActions = planMir4TutorialEngagement(this.self, this.entities, this.rosterEntry);
    if (tutorialActions.length > 0) {
      this.tutorialSeeking = true;
      for (const action of tutorialActions) {
        if (action.t === 'input') this.input(action.mi, action.facing);
        else this.cmd(action);
      }
      return;
    }
    if (this.tutorialSeeking) {
      this.input({});
      this.tutorialSeeking = false;
    }
    for (const action of planMir4ProgressionActions(this.self, this.rosterEntry)) this.cmd(action);
  }

  close() {
    this.input({});
    this.ws?.close();
  }
}

function findDuelEnd(bot) {
  return bot.events.find((event) => event.type === 'duelEnd');
}

function classForCharacter(bots, name) {
  return bots.find((bot) => name === bot.characterName)?.rosterEntry.classKey ?? null;
}

function drivePvp(pvp, bots, now) {
  const [challenger, defender] = bots;
  pvp.startedTryingAt ??= now;
  if (now - pvp.startedTryingAt > PVP_TIMEOUT_MS) {
    pvp.status = 'timeout';
    pvp.endedAt = now;
    challenger.input({});
    defender.input({});
    return;
  }
  if (pvp.status === 'pending' || pvp.status === 'positioning') {
    const approach = planMir4PvpChallenge(challenger.self, defender.self);
    challenger.input(approach.move, approach.facing);
    defender.input({});
    if (!approach.ready) {
      pvp.status = 'positioning';
      return;
    }
    challenger.cmd({ cmd: 'duel_req', id: defender.pid });
    pvp.status = 'requested';
    pvp.firstRequestedAt ??= now;
    pvp.requestedAt = now;
    return;
  }
  if (pvp.status === 'requested') {
    if (mir4BotHasDuelRequest(defender.events, challenger.pid)) {
      defender.cmd({ cmd: 'duel_accept' });
      pvp.status = 'accepted';
      pvp.acceptedAt = now;
    } else if (now - pvp.requestedAt >= 2_000) {
      pvp.status = 'positioning';
      pvp.requestRetries = (pvp.requestRetries ?? 0) + 1;
    }
    return;
  }
  const duelState = challenger.self?.duel?.state ?? defender.self?.duel?.state;
  if (duelState === 'active') {
    if (!pvp.startedAt) pvp.startedAt = now;
    pvp.status = 'active';
    for (const [attacker, target] of [
      [challenger, defender],
      [defender, challenger],
    ]) {
      const dx = (target.self?.x ?? 0) - (attacker.self?.x ?? 0);
      const dz = (target.self?.z ?? 0) - (attacker.self?.z ?? 0);
      const facing = Math.atan2(dx, dz);
      if (Math.hypot(dx, dz) > 2.5) attacker.input({ f: 1 }, facing);
      else attacker.input({}, facing);
      attacker.cmd({
        cmd: 'mir4',
        m: 'cast',
        skill: attacker.rosterEntry.initialSkillIds[0],
        target: target.pid,
      });
      attacker.cmd({ cmd: 'mir4', m: 'basic', target: target.pid });
    }
  }
  const end = findDuelEnd(challenger) ?? findDuelEnd(defender);
  if (end) {
    pvp.status = 'completed';
    pvp.endedAt = now;
    pvp.durationMs = now - (pvp.startedAt ?? pvp.requestedAt);
    pvp.winnerName = end.winnerName;
    pvp.loserName = end.loserName;
    pvp.winnerClass = classForCharacter(bots, end.winnerName);
    pvp.loserClass = classForCharacter(bots, end.loserName);
  }
}

async function writeReport(path, report) {
  const partial = `${path}.partial`;
  await writeFile(partial, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await rename(partial, path).catch(async () => {
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  });
}

async function main() {
  assertLoopbackUrl(BASE, 'SERVER_URL');
  if (PASSWORD.length < 12) throw new Error('BOT_PASSWORD must contain at least 12 characters');
  if (ACTIVE_ROSTER.length < 2) throw new Error('BOT_CLASSES must select at least two classes');
  const status = expectApi(await api('/api/status'), [200], 'server status');
  if (status.gameProfile && status.gameProfile !== PROFILE) {
    throw new Error(`Server profile is ${status.gameProfile}, expected ${PROFILE}`);
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const startedAt = Date.now();
  const reportPath = join(REPORT_DIR, `${NAMESPACE}-${startedAt}.json`);
  const bots = ACTIVE_ROSTER.map((entry) => new RealPlayerBot(entry, startedAt));
  const pvp = { status: 'pending', requestedAt: null, startedTryingAt: null };
  let stopping = false;
  process.once('SIGINT', () => {
    stopping = true;
  });
  process.once('SIGTERM', () => {
    stopping = true;
  });

  try {
    for (const bot of bots) {
      await bot.provision();
      await sleep(200);
    }
    await Promise.all(bots.map((bot) => bot.connect()));
    const snapshotDeadline = Date.now() + 10_000;
    while (bots.some((bot) => !bot.self) && Date.now() < snapshotDeadline) await sleep(100);
    if (bots.some((bot) => !bot.self))
      throw new Error('At least one bot did not receive its first snapshot');

    for (const bot of bots.slice(0, 2)) {
      bot.cmd({ cmd: 'mir4', m: 'auto', on: false });
      bot.cmd({ cmd: 'mir4', m: 'quest', on: false });
    }
    console.log(
      `MIR4 bot cohort ${NAMESPACE}: ${bots.map((bot) => `${bot.characterName}/${bot.rosterEntry.classKey}`).join(', ')}`,
    );
    console.log(`Report: ${reportPath}`);

    let lastReportAt = 0;
    while (!stopping && Date.now() - startedAt < DURATION_MS) {
      const now = Date.now();
      if (!['completed', 'timeout'].includes(pvp.status)) drivePvp(pvp, bots, now);
      for (const bot of bots) {
        const heldForPvp =
          bots.slice(0, 2).includes(bot) && !['completed', 'timeout'].includes(pvp.status);
        if (!heldForPvp) bot.applyProgressionPolicy(now);
      }
      if (now - lastReportAt >= REPORT_INTERVAL_MS) {
        lastReportAt = now;
        const report = buildMir4PlaytestReport({
          namespace: NAMESPACE,
          trackers: bots.map((bot) => bot.tracker),
          startedAt,
          endedAt: now,
          stallThresholdMs: STALL_MS,
          pvp,
        });
        report.runtime = {
          serverUrl: BASE,
          connectionErrors: Object.fromEntries(
            bots.map((bot) => [bot.rosterEntry.classKey, bot.connectionErrors]),
          ),
        };
        await writeReport(reportPath, report);
        console.log(
          `[${Math.floor((now - startedAt) / 1_000)}s] ${report.bots.map((bot) => `${bot.identity.classKey}:L${bot.latest?.level ?? '?'} Q${bot.progress.questAdvances} D${bot.progress.deaths}`).join(' | ')} | PvP ${pvp.status}`,
        );
      }
      await sleep(500);
    }
  } finally {
    const endedAt = Date.now();
    for (const bot of bots) bot.close();
    await sleep(750);
    const report = buildMir4PlaytestReport({
      namespace: NAMESPACE,
      trackers: bots.map((bot) => bot.tracker),
      startedAt,
      endedAt,
      stallThresholdMs: STALL_MS,
      pvp,
    });
    report.runtime = {
      serverUrl: BASE,
      interrupted: stopping,
      connectionErrors: Object.fromEntries(
        bots.map((bot) => [bot.rosterEntry.classKey, bot.connectionErrors]),
      ),
    };
    await writeReport(reportPath, report);
    console.log(`Final report written to ${reportPath}`);
    if (report.findings.length > 0) console.log(JSON.stringify(report.findings, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
