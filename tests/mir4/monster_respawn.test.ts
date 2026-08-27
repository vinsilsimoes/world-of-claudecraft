import { describe, expect, it } from 'vitest';
import { MOBS } from '../../src/sim/data';
import { createMob } from '../../src/sim/entity';
import { MIR4_GAME_PROFILE } from '../../src/sim/game_profile';
import {
  MIR4_MONSTER_RESPAWN_SPEED_MULTIPLIER,
  mir4MonsterRespawnSeconds,
} from '../../src/sim/mir4/monster_respawn';
import { Sim } from '../../src/sim/sim';
import { DT, type Entity } from '../../src/sim/types';

type GameProfile = 'woc-classic' | typeof MIR4_GAME_PROFILE;

function slainMob(
  gameProfile: GameProfile,
  templateId: string,
  options: { respawnSeconds?: number; runScoped?: boolean } = {},
) {
  const sim = new Sim({
    seed: 9_901,
    playerClass: 'warrior',
    playerClassMir4: gameProfile === MIR4_GAME_PROFILE ? 'warrior' : undefined,
    playerName: 'Respawn QA',
    gameProfile,
    ...(options.respawnSeconds === undefined ? {} : { respawnSeconds: options.respawnSeconds }),
  });
  const p = sim.player;
  const template = MOBS[templateId];
  if (!template) throw new Error(`missing mob template ${templateId}`);
  const mob = createMob(
    sim.nextId++,
    template,
    template.minLevel,
    sim.groundPos(p.pos.x + 2, p.pos.z),
  );
  mob.runScoped = options.runScoped;
  sim.addEntity(mob);

  sim.dealDamage(null, mob, Number.MAX_SAFE_INTEGER, false, 'physical', null, 'hit');

  return { sim, mob };
}

function secondsUntilRespawn(sim: Sim, mob: Entity, maxSeconds: number): number {
  const maxTicks = Math.ceil(maxSeconds / DT);
  for (let tick = 1; tick <= maxTicks; tick += 1) {
    sim.tick();
    if (!mob.dead) return tick * DT;
  }
  throw new Error(`${mob.templateId} did not respawn within ${maxSeconds}s`);
}

describe('MIR4 monster respawn cadence', () => {
  it('quarters every finite schedule and preserves non-respawning sentinels', () => {
    expect(MIR4_MONSTER_RESPAWN_SPEED_MULTIPLIER).toBe(4);
    expect(mir4MonsterRespawnSeconds(60)).toBe(15);
    expect(mir4MonsterRespawnSeconds(10)).toBe(2.5);
    expect(mir4MonsterRespawnSeconds(1_800)).toBe(450);
    expect(mir4MonsterRespawnSeconds(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });

  it('quarters ordinary and explicit schedules without changing WoC classic', () => {
    const classic = slainMob('woc-classic', 'forest_wolf', { respawnSeconds: 60 }).mob;
    const mir4 = slainMob(MIR4_GAME_PROFILE, 'forest_wolf', { respawnSeconds: 60 }).mob;
    const classicExplicit = slainMob('woc-classic', 'training_dummy').mob;
    const mir4Explicit = slainMob(MIR4_GAME_PROFILE, 'training_dummy').mob;

    expect(classic.respawnTimer).toBe(60);
    expect(mir4.respawnTimer).toBe(15);
    expect(mir4.respawnTimer).toBeLessThanOrEqual(classic.respawnTimer / 4);
    expect(mir4.corpseTimer).toBeLessThanOrEqual(mir4.respawnTimer);
    expect(classicExplicit.respawnTimer).toBe(10);
    expect(mir4Explicit.respawnTimer).toBe(2.5);
  });

  it('quarters rare fixed and random schedules through the real death path', () => {
    const classicRare = slainMob('woc-classic', 'old_greyjaw').mob;
    const mir4Rare = slainMob(MIR4_GAME_PROFILE, 'old_greyjaw').mob;
    const classicWindow = slainMob('woc-classic', 'grix_the_tunnelking').mob;
    const mir4Window = slainMob(MIR4_GAME_PROFILE, 'grix_the_tunnelking').mob;

    expect(classicRare.respawnTimer).toBe(100);
    expect(mir4Rare.respawnTimer).toBe(25);
    expect(classicWindow.respawnTimer).toBeGreaterThanOrEqual(900);
    expect(classicWindow.respawnTimer).toBeLessThan(1_800);
    expect(mir4Window.respawnTimer).toBeGreaterThanOrEqual(225);
    expect(mir4Window.respawnTimer).toBeLessThan(450);
  });

  it('preserves non-respawning run and world-boss sentinels through the real death path', () => {
    const runScoped = slainMob(MIR4_GAME_PROFILE, 'forest_wolf', { runScoped: true }).mob;
    const worldBossTemplate = Object.values(MOBS).find((template) => template.worldBoss);
    if (!worldBossTemplate) throw new Error('missing world boss template');
    const worldBoss = slainMob(MIR4_GAME_PROFILE, worldBossTemplate.id).mob;

    expect(runScoped.respawnTimer).toBe(Number.POSITIVE_INFINITY);
    expect(worldBoss.respawnTimer).toBe(Number.POSITIVE_INFINITY);
  });

  it('actually returns a ten-second monster in one quarter of the classic wall-clock time', () => {
    const classic = slainMob('woc-classic', 'training_dummy');
    const mir4 = slainMob(MIR4_GAME_PROFILE, 'training_dummy');
    const classicSeconds = secondsUntilRespawn(classic.sim, classic.mob, 11);
    const mir4Seconds = secondsUntilRespawn(mir4.sim, mir4.mob, 3);

    expect(classicSeconds).toBeGreaterThanOrEqual(10);
    expect(mir4Seconds).toBeLessThanOrEqual(2.5 + DT * 1.1);
    expect(mir4Seconds).toBeLessThanOrEqual(classicSeconds / 4 + DT * 1.1);
  });
});
