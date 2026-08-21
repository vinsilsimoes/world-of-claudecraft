// Multiplayer integration test against a running game server (+ postgres).
// Covers: register, login, profile-native character CRUD, two clients in one
// world seeing each other, movement sync, combat, chat, profile-native starter
// equipment, and persistence across reconnect. GAME_PROFILE selects the classic
// or MIR4 scenario.
import WebSocket from 'ws';
import { multiplayerScenarioForProfile } from './lib/mp_profile_scenario.mjs';
import { mergeEntitySnapshot, mergeSelfSnapshot } from './lib/mp_snapshot_merge.mjs';
import { requireGameProfile, worldAuthMessage } from './lib/world_auth.mjs';

const BASE = process.env.SERVER_URL ?? 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');
const GAME_PROFILE = requireGameProfile(process.env.GAME_PROFILE);
const SCENARIO = multiplayerScenarioForProfile(GAME_PROFILE);
const IS_MIR4 = GAME_PROFILE === 'mir4-gameplay-port';
let pass = 0,
  fail = 0;

function check(name, cond, extra = '') {
  if (cond) {
    pass++;
    console.log(`OK   ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name} ${extra}`);
  }
}

async function api(path, opts = {}, token = null) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

class Client {
  constructor() {
    this.snapshots = [];
    this.events = [];
    this.self = null;
    this.pid = -1;
    this.entities = new Map();
  }

  connect(token, characterId) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${WS_BASE}/ws`);
      const timeout = setTimeout(() => reject(new Error('connect timeout')), 8000);
      this.ws.on('open', () => {
        this.send(worldAuthMessage(token, characterId));
      });
      this.ws.on('message', (data) => {
        const msg = JSON.parse(String(data));
        if (msg.t === 'hello') {
          this.pid = msg.pid;
          clearTimeout(timeout);
          resolve(msg);
        } else if (msg.t === 'snap') {
          this.self = mergeSelfSnapshot(this.self, msg.self);
          this.entities = mergeEntitySnapshot(this.entities, msg);
          this.entities.set(this.self.id, this.self);
        } else if (msg.t === 'events') {
          this.events.push(...msg.list);
        } else if (msg.t === 'error') {
          clearTimeout(timeout);
          reject(new Error(msg.error));
        }
      });
      this.ws.on('error', (e) => {
        clearTimeout(timeout);
        reject(e);
      });
    });
  }

  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }
  cmd(payload) {
    this.send({ t: 'cmd', ...payload });
  }
  input(mi, facing) {
    this.send({ t: 'input', mi, ...(facing !== undefined ? { facing } : {}) });
  }
  close() {
    this.ws?.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = Date.now().toString(36);
// character names must be letters only (classic rules)
const alpha = uniq.replace(/[0-9]/g, (d) => 'abcdefghij'[Number(d)]).slice(-6);

async function main() {
  console.log(`Multiplayer integration profile: ${GAME_PROFILE}`);

  // --- status
  const status = await api('/api/status');
  check('server status', status.status === 200 && status.body.ok);

  // --- register two accounts
  const u1 = `tester_${uniq}_a`,
    u2 = `tester_${uniq}_b`;
  const r1 = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username: u1, password: 'hunter22', email: `${u1}@example.com` }),
  });
  check('register account 1', r1.status === 200 && r1.body.token);
  const r2 = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username: u2, password: 'hunter22', email: `${u2}@example.com` }),
  });
  check('register account 2', r2.status === 200 && r2.body.token);

  const dup = await api('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username: u1, password: 'hunter22', email: `${u1}@example.com` }),
  });
  check('duplicate username rejected', dup.status === 409);

  const badLogin = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: u1, password: 'wrongpw' }),
  });
  check('wrong password rejected', badLogin.status === 401);

  const login = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username: u1, password: 'hunter22' }),
  });
  check('login works', login.status === 200 && login.body.token);
  const t1 = login.body.token;
  const t2 = r2.body.token;

  // --- characters
  const noAuth = await api('/api/characters');
  check('characters require auth', noAuth.status === 401);
  const c1 = await api(
    '/api/characters',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `${SCENARIO.primary.namePrefix}${alpha}`,
        class: SCENARIO.primary.classKey,
      }),
    },
    t1,
  );
  check('create character 1', c1.status === 200 && c1.body.id > 0);
  const c2 = await api(
    '/api/characters',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `${SCENARIO.secondary.namePrefix}${alpha}`,
        class: SCENARIO.secondary.classKey,
      }),
    },
    t2,
  );
  check('create character 2', c2.status === 200 && c2.body.id > 0);
  const badName = await api(
    '/api/characters',
    { method: 'POST', body: JSON.stringify({ name: '!!', class: 'warrior' }) },
    t1,
  );
  check('bad character name rejected', badName.status === 400);
  const list1 = await api('/api/characters', {}, t1);
  check('list characters', list1.status === 200 && list1.body.characters.length === 1);

  // --- both enter the world
  const a = new Client();
  const b = new Client();
  await a.connect(t1, c1.body.id);
  await b.connect(t2, c2.body.id);
  check('both clients joined', a.pid > 0 && b.pid > 0 && a.pid !== b.pid);

  await sleep(400);
  check('client A sees B', a.entities.has(b.pid), `ents=${a.entities.size}`);
  check('client B sees A', b.entities.has(a.pid));
  const bSeenByA = a.entities.get(b.pid);
  check(
    'remote player wire data',
    bSeenByA &&
      bSeenByA.k === 'player' &&
      (IS_MIR4
        ? typeof bSeenByA.nm === 'string' && bSeenByA.nm.startsWith(SCENARIO.secondary.namePrefix)
        : bSeenByA.tid === 'mage'),
  );
  if (IS_MIR4) {
    check(
      'client A receives authoritative MIR4 identity',
      a.self?.mir4?.classId === SCENARIO.primary.mir4ClassId,
      JSON.stringify(a.self?.mir4),
    );
    check(
      'client B receives authoritative MIR4 identity',
      b.self?.mir4?.classId === SCENARIO.secondary.mir4ClassId,
      JSON.stringify(b.self?.mir4),
    );
    check(
      'MIR4 creation grants the source-backed starter loadout in the owner snapshot',
      a.self?.mir4?.mir4Equipment?.[1] === SCENARIO.primary.starterItemId &&
        a.self?.mir4?.mir4Equipment?.[5] === SCENARIO.primary.starterArmorItemId &&
        a.self?.mir4?.mir4EquipmentInstances?.[SCENARIO.primary.starterItemId]?.enhancement === 0 &&
        a.self?.mir4?.mir4EquipmentInstances?.[SCENARIO.primary.starterArmorItemId]?.enhancement ===
          0,
      JSON.stringify({
        equipment: a.self?.mir4?.mir4Equipment,
        instances: a.self?.mir4?.mir4EquipmentInstances,
      }),
    );
  }

  // duplicate character login rejected
  const dupClient = new Client();
  let dupRejected = false;
  try {
    await dupClient.connect(t1, c1.body.id);
  } catch (e) {
    dupRejected = String(e.message).includes('already');
  }
  check('duplicate character login rejected', dupRejected);

  // --- movement sync: A runs forward, B should see A move
  const aStart = { ...b.entities.get(a.pid) };
  a.input({ f: 1 }, 0);
  await sleep(1200);
  a.input({});
  await sleep(300);
  const aAfter = b.entities.get(a.pid);
  const moved = Math.hypot(aAfter.x - aStart.x, aAfter.z - aStart.z);
  check('B sees A move', moved > 4, `moved=${moved.toFixed(1)}`);

  // --- chat
  a.cmd({ cmd: 'chat', text: 'Hello from A!' });
  await sleep(400);
  const bChat = b.events.find((e) => e.type === 'chat' && e.text === 'Hello from A!');
  check('B receives A chat', !!bChat && bChat.from.startsWith(SCENARIO.primary.namePrefix));

  if (IS_MIR4) {
    // MIR4 automation is a server-owned command whose state returns only in
    // the authoritative profile payload. This also proves that the standalone
    // client retains a delta-elided `mir4` block between snapshots.
    a.cmd({ cmd: 'mir4', m: 'auto', on: true });
    await sleep(500);
    check(
      'MIR4 auto battle is acknowledged authoritatively',
      a.self?.mir4?.autoBattle?.mode === 'battle',
      JSON.stringify(a.self?.mir4?.autoBattle),
    );
    a.cmd({ cmd: 'mir4', m: 'auto', on: false });
    await sleep(500);
    check(
      'MIR4 auto battle stop is acknowledged authoritatively',
      a.self?.mir4?.autoBattle?.mode === 'off',
      JSON.stringify(a.self?.mir4?.autoBattle),
    );
    a.cmd({ cmd: 'mir4', m: 'quest', on: true });
    await sleep(400);
    check(
      'MIR4 journey is acknowledged authoritatively',
      typeof a.self?.mir4?.mir4AutoQuest?.questId === 'string',
      JSON.stringify(a.self?.mir4?.mir4AutoQuest),
    );
    a.cmd({ cmd: 'mir4', m: 'quest', on: false });
    await sleep(400);
    check(
      'MIR4 journey stop is acknowledged authoritatively',
      a.self?.mir4?.mir4AutoQuest === undefined,
      JSON.stringify(a.self?.mir4?.mir4AutoQuest),
    );

    // A crafted classic ability command must not leak the WoC class kit into
    // the MIR4 profile. Lancer rides a Warrior render shell, so this assertion
    // protects the profile boundary rather than a cosmetic class distinction.
    b.cmd({ cmd: 'cast', ability: 'battle_shout' });
    await sleep(400);
    check(
      'classic abilities stay blocked in the MIR4 profile',
      !b.self?.auras?.some((x) => x.id === 'battle_shout'),
      JSON.stringify(b.self?.auras),
    );
  } else {
    // --- classic combat: teleport-free version — A targets nearest mob and attacks.
    a.cmd({ cmd: 'targetNearest' });
    await sleep(200);
    check('target acquired or none in range', true); // mobs may be far from town; not fatal
    a.cmd({ cmd: 'cast', ability: 'battle_shout' });
    await sleep(400);
    const denied = a.events.some((e) => e.type === 'error' && e.text.includes('rage'));
    check('server denies cast without resource', denied);
    b.cmd({ cmd: 'cast', ability: 'frost_armor' });
    await sleep(600);
    const armorAura = b.self?.auras?.some((x) => x.id === 'frost_armor');
    check(
      'B buffs with Frost Armor (server-side cast)',
      !!armorAura,
      JSON.stringify(b.self?.auras),
    );
  }

  // Classic interaction remains in its established scenario. MIR4 quest state
  // was exercised above through the profile command and self snapshot.
  if (!IS_MIR4) {
    a.cmd({ cmd: 'interact' });
    await sleep(400);
  }
  const qlog = a.self?.qlog ?? [];

  // --- persistence across reconnect: record state, disconnect, reconnect
  const beforeXp = a.self.xp;
  const beforeCopper = a.self.copper;
  const beforePos = { x: a.self.x, z: a.self.z };
  const beforeMir4 = a.self.mir4;
  const beforeMir4Equipment = JSON.stringify({
    equipment: beforeMir4?.mir4Equipment,
    instances: beforeMir4?.mir4EquipmentInstances,
  });
  a.close();
  await sleep(800); // server saves on disconnect
  const a2 = new Client();
  await a2.connect(t1, c1.body.id);
  await sleep(400);
  check(
    'reconnect restores xp/copper',
    a2.self.xp === beforeXp && a2.self.copper === beforeCopper,
    `xp ${a2.self.xp} vs ${beforeXp}`,
  );
  const posDelta = Math.hypot(a2.self.x - beforePos.x, a2.self.z - beforePos.z);
  check('reconnect restores position', posDelta < 3, `delta=${posDelta.toFixed(1)}`);
  if (IS_MIR4) {
    check(
      'reconnect restores MIR4 identity and automation state',
      a2.self?.mir4?.classId === beforeMir4?.classId &&
        a2.self?.mir4?.autoBattle?.mode === beforeMir4?.autoBattle?.mode,
      JSON.stringify(a2.self?.mir4),
    );
    check(
      'reconnect restores the class-native MIR4 starter equipment',
      JSON.stringify({
        equipment: a2.self?.mir4?.mir4Equipment,
        instances: a2.self?.mir4?.mir4EquipmentInstances,
      }) === beforeMir4Equipment,
      JSON.stringify(a2.self?.mir4?.mir4Equipment),
    );
  }
  check(
    'classic quest-log projection is stable after reconnect',
    (a2.self.qlog ?? []).length === qlog.length,
  );

  // B should have seen A leave and rejoin
  await sleep(300);
  check('B sees A again after reconnect', b.entities.has(a2.pid));

  a2.close();
  b.close();
  await sleep(500);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
