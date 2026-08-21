// Headless RL environment server.
// Speaks NDJSON over stdin/stdout: one JSON object per line in, one per line out.
//
//   -> {"cmd":"info"}
//   <- {"obs_size":...,"num_actions":...,"actions":[...]}  (sizes are content-dependent; query, don't hardcode)
//   -> {"cmd":"reset","seed":123,"player_class":"warrior","player_level":20,"talents":{"spec":"arms","rows":{}},"config":{...}}
//   <- {"obs":[...],"info":{...}}
//   -> {"cmd":"step","action":4}
//   <- {"obs":[...],"reward":0.01,"terminated":false,"truncated":false,"info":{...}}
//   -> {"cmd":"close"}
//
// Run `node dist-env/env_server.cjs --bench` for a throughput benchmark.

import * as readline from 'node:readline';
import { GAME_PROFILES, type GameProfile, MIR4_GAME_PROFILE } from '../src/game_profile';
import { MIR4_MAX_LEVEL } from '../src/sim/content/mir4';
import type { TalentAllocation } from '../src/sim/content/talents';
import { classesForGameProfile } from '../src/sim/game_profile_roster';
import { activateWorldForGameProfile } from '../src/sim/game_profile_world';
import { mir4ShellClassFor } from '../src/sim/mir4/stats';
import { ACTIONS, applyAction, encodeObs, NUM_ACTIONS, obsSize } from '../src/sim/obs';
import { type RewardCounters, Sim } from '../src/sim/sim';
import { MAX_LEVEL, type Mir4ClassKey, type PlayableClass } from '../src/sim/types';
import { buildHeadlessEpisodeInfo } from './info';
import {
  MAX_INPUT_LINE_LENGTH,
  maxLevelForGameProfile,
  parseTalentResetRequest,
  validateAction,
  validateGameProfile,
  validatePlayerClass,
} from './protocol';
import { ownedPetDamageForReward } from './reward_credit';

interface EnvConfig {
  frameSkip: number; // sim ticks per env step (20 ticks = 1 second)
  maxSteps: number; // truncate episode after this many steps (0 = never)
  respawnSeconds: number;
  terminateOnDeath: boolean;
  rewards: {
    xp: number; // per xp point
    damageDealt: number;
    damageTaken: number;
    kill: number;
    death: number;
    questDone: number;
    questProgress: number;
    levelUp: number;
    timePenalty: number; // per step
  };
}

interface EnvStepResult {
  obs: number[];
  reward: number;
  terminated: boolean;
  truncated: boolean;
  info: object;
}

const DEFAULT_CONFIG: EnvConfig = {
  frameSkip: 5, // 4 decisions per sim-second
  // the cap is level 20 across three zones now — episodes need room to breathe
  maxSteps: 8000,
  respawnSeconds: 15,
  terminateOnDeath: false,
  rewards: {
    xp: 0.01,
    damageDealt: 0.002,
    damageTaken: -0.001,
    kill: 0.2,
    death: -5,
    questDone: 5,
    questProgress: 0.5,
    levelUp: 2,
    timePenalty: 0,
  },
};

class Env {
  sim: Sim | null = null;
  config: EnvConfig = DEFAULT_CONFIG;
  playerClass: PlayableClass = 'warrior';
  gameProfile: GameProfile = 'woc-classic';
  stepCount = 0;
  prev: RewardCounters | null = null;

  reset(
    seed: number,
    playerClass: PlayableClass,
    cfg: Partial<EnvConfig> & { rewards?: Partial<EnvConfig['rewards']> },
    playerLevel = 1,
    talents?: TalentAllocation,
    gameProfile: GameProfile = 'woc-classic',
  ): object {
    this.config = {
      ...DEFAULT_CONFIG,
      ...cfg,
      rewards: { ...DEFAULT_CONFIG.rewards, ...(cfg.rewards ?? {}) },
    };
    this.playerClass = playerClass;
    this.gameProfile = gameProfile;
    this.sim = new Sim({
      seed,
      playerClass: mir4ShellClassFor(playerClass, gameProfile),
      playerClassMir4:
        gameProfile === MIR4_GAME_PROFILE ? (playerClass as Mir4ClassKey) : undefined,
      gameProfile,
      world: activateWorldForGameProfile(gameProfile),
      respawnSeconds: this.config.respawnSeconds,
      autoEquip: gameProfile !== MIR4_GAME_PROFILE,
      idleMobTickRadius: 80,
    });
    if (playerLevel !== 1) this.sim.setPlayerLevel(playerLevel);
    if (talents && !this.sim.applyTalents(talents)) throw new Error('invalid talents');
    this.stepCount = 0;
    this.prev = { ...this.sim.counters };
    return { obs: encodeObs(this.sim), info: this.infoDict() };
  }

  step(action: number): EnvStepResult {
    if (!this.sim || !this.prev) throw new Error('call reset first');
    const sim = this.sim;
    applyAction(sim, action);
    let ownedPetDamage = 0;
    for (let i = 0; i < this.config.frameSkip; i++) {
      ownedPetDamage += ownedPetDamageForReward(sim.tick(), sim.entities, sim.playerId);
    }
    this.stepCount++;

    const c = sim.counters;
    const r = this.config.rewards;
    const reward =
      (c.xpGained - this.prev.xpGained) * r.xp +
      (c.damageDealt - this.prev.damageDealt + ownedPetDamage) * r.damageDealt +
      (c.damageTaken - this.prev.damageTaken) * r.damageTaken +
      (c.kills - this.prev.kills) * r.kill +
      (c.deaths - this.prev.deaths) * r.death +
      (c.questsCompleted - this.prev.questsCompleted) * r.questDone +
      (c.questProgress - this.prev.questProgress) * r.questProgress +
      (c.levelUps - this.prev.levelUps) * r.levelUp +
      r.timePenalty;
    const died = c.deaths > this.prev.deaths;
    this.prev = { ...c };

    const levelCap = this.gameProfile === MIR4_GAME_PROFILE ? MIR4_MAX_LEVEL : MAX_LEVEL;
    const terminated = (this.config.terminateOnDeath && died) || sim.player.level >= levelCap;
    const truncated = this.config.maxSteps > 0 && this.stepCount >= this.config.maxSteps;

    return {
      obs: encodeObs(sim),
      reward,
      terminated,
      truncated,
      info: this.infoDict(),
    };
  }

  infoDict(): object {
    return buildHeadlessEpisodeInfo(this.sim!, this.stepCount);
  }
}

function bench(): void {
  const env = new Env();
  env.reset(1, 'warrior', {});
  const targetSeconds = 20;
  let steps = 0;
  // exercise a realistic action mix
  const start = process.hrtime.bigint();
  let elapsed = 0;
  while (elapsed < targetSeconds) {
    const a = steps % 11 === 0 ? 8 : steps % 7 === 0 ? 9 : steps % 5 === 0 ? 10 : 1;
    const res = env.step(a);
    steps++;
    if (res.terminated || res.truncated) env.reset(steps, 'warrior', {});
    if (steps % 100 === 0) elapsed = Number(process.hrtime.bigint() - start) / 1e9;
  }
  elapsed = Number(process.hrtime.bigint() - start) / 1e9;
  const sps = Math.round(steps / elapsed);
  const tps = sps * DEFAULT_CONFIG.frameSkip;
  console.log(`steps: ${steps}, elapsed: ${elapsed.toFixed(2)}s`);
  console.log(`env steps/sec: ${sps} (${tps} sim ticks/sec) on a single core`);
}

function serve(): void {
  const env = new Env();
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  const send = (obj: object) => process.stdout.write(JSON.stringify(obj) + '\n');

  rl.on('line', (line: string) => {
    if (line.length > MAX_INPUT_LINE_LENGTH) {
      send({ error: 'input line too large' });
      return;
    }
    line = line.trim();
    if (!line) return;
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ error: 'bad json' });
      return;
    }
    try {
      switch (msg.cmd) {
        case 'info':
          {
            const gameProfile = validateGameProfile(msg.game_profile);
            if (gameProfile === null) {
              send({ error: `invalid game_profile: expected one of ${GAME_PROFILES.join(', ')}` });
              break;
            }
            send({
              obs_size: obsSize(),
              num_actions: NUM_ACTIONS,
              actions: ACTIONS,
              max_level: maxLevelForGameProfile(gameProfile),
              game_profile: gameProfile,
              game_profiles: GAME_PROFILES,
            });
          }
          break;
        case 'reset':
          {
            const gameProfile = validateGameProfile(msg.game_profile);
            if (gameProfile === null) {
              send({ error: `invalid game_profile: expected one of ${GAME_PROFILES.join(', ')}` });
              break;
            }
            const playerClass = validatePlayerClass(msg.player_class ?? 'warrior', gameProfile);
            if (playerClass === null) {
              send({
                error: `invalid player_class: expected one of ${classesForGameProfile(gameProfile).join(', ')}`,
              });
              break;
            }
            const reset = parseTalentResetRequest(msg, gameProfile, playerClass);
            if (!reset.ok) {
              send({ error: reset.error });
              break;
            }
            send(
              env.reset(
                msg.seed ?? 0,
                playerClass,
                msg.config ?? {},
                reset.playerLevel,
                reset.talents,
                gameProfile,
              ),
            );
          }
          break;
        case 'step':
          {
            const action = validateAction(msg.action ?? 0);
            if (action === null) {
              send({ error: `invalid action: expected integer 0-${NUM_ACTIONS - 1}` });
              break;
            }
            send(env.step(action));
          }
          break;
        case 'close':
          send({ ok: true });
          process.exit(0);
          break;
        default:
          send({ error: `unknown cmd: ${msg.cmd}` });
      }
    } catch (err: any) {
      send({ error: String(err?.message ?? err) });
    }
  });
  rl.on('close', () => process.exit(0));
}

if (process.argv.includes('--bench')) bench();
else serve();
