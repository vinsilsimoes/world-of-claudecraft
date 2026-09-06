import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  mir4SkillQaBootRequest,
  mir4SkillQaSelectedActionBarLayout,
  mir4SkillQaSelectedActionId,
  provisionMir4SkillQa,
} from '../src/game/mir4_skill_qa_boot';
import { MIR4_SKILL_QA_WORLD } from '../src/sim/content/mir4';

describe('MIR4 skill QA boot', () => {
  it.each([
    ['warrior', 'Warrior QA'],
    ['elementalist', 'Elementalist QA'],
    ['taoist', 'Taoist QA'],
    ['arbalist', 'Arbalist QA'],
    ['lancer', 'Lancer QA'],
  ] as const)('boots the %s roster key through the lightweight development route', (key, name) => {
    expect(mir4SkillQaBootRequest(new URLSearchParams({ mir4SkillQa: key }), true)).toEqual({
      playerClass: key,
      playerName: name,
    });
  });

  it('is inert in production builds', () => {
    expect(
      mir4SkillQaBootRequest(new URLSearchParams({ mir4SkillQa: 'warrior' }), false),
    ).toBeNull();
  });

  it.each(['', 'sorcerer', 'mage', 'Warrior', '1102'])('rejects unsupported key %j', (key) => {
    expect(mir4SkillQaBootRequest(new URLSearchParams({ mir4SkillQa: key }), true)).toBeNull();
  });

  it.each([
    [1102, 1],
    [1302, 8],
    [1301, 16],
  ])('starts Warrior skill %i at its exact observed unlock level %i', (skillId, level) => {
    expect(
      mir4SkillQaBootRequest(
        new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: String(skillId) }),
        true,
      ),
    ).toMatchObject({ playerClass: 'warrior', skillId, playerLevel: level });
  });

  it('isolates the Warrior ultimate with a full gauge at its native action id', () => {
    const request = mir4SkillQaBootRequest(
      new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: '1403' }),
      true,
    );
    expect(request).toEqual({
      playerClass: 'warrior',
      playerName: 'Warrior QA',
      skillId: 1403,
      playerLevel: 1,
    });
    expect(mir4SkillQaSelectedActionBarLayout(request)).toEqual({
      v: 1,
      forms: {
        normal: {
          bar: [{ type: 'ability', id: 'mir4_ultimate_1' }],
          attack: null,
        },
      },
    });

    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    const player = { name: 'Warrior QA', mir4UltGauge: 0 };
    expect(
      provisionMir4SkillQa(
        { player, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: '1403' }),
        true,
      ),
    ).toBe(true);
    expect(player.mir4UltGauge).toBe(100);
  });

  it.each(['2101', '9999', '1102x', '1.102'])(
    'rejects mismatched or malformed skill %j',
    (skillId) => {
      expect(
        mir4SkillQaBootRequest(
          new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: skillId }),
          true,
        ),
      ).toBeNull();
    },
  );

  it('uses a flat, empty, bounded content world instead of the complete campaign world', () => {
    expect(MIR4_SKILL_QA_WORLD).toMatchObject({
      camps: [],
      npcs: {},
      groundObjects: [],
      roads: [],
      placements: [],
      blockers: [],
      travelPortals: [],
      services: {},
      terrainModel: 'content',
      presentationModel: 'content',
      playerStart: { x: 0, z: 0 },
    });
    expect(MIR4_SKILL_QA_WORLD.zones).toHaveLength(1);
    expect(MIR4_SKILL_QA_WORLD.terrainEdits).toEqual([
      { x: 0, z: 0, radius: 80, delta: 0, falloff: 'flat', mode: 'level' },
    ]);
  });

  it('provisions every unlocked skill plus one threat-free practice target', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Warrior QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: '1102' }),
        true,
      ),
    ).toBe(true);
    expect(chat.mock.calls).toEqual([
      ['/dev level 1'],
      ['/dev combatreset'],
      ['/dev cooldowns'],
      ['/dev resource infinite on'],
      ['/dev skillqa isolate on'],
      ['/dev spawn training_dummy 1 1'],
    ]);
    expect(setMir4AutoSkillEnabled).toHaveBeenCalledTimes(12);
    expect(setMir4AutoSkillEnabled).toHaveBeenCalledWith(1102, false);
  });

  it('isolates the requested skill as the only visible action-bar binding', () => {
    const request = mir4SkillQaBootRequest(
      new URLSearchParams({ mir4SkillQa: 'warrior', mir4Skill: '1103' }),
      true,
    );

    expect(request).not.toBeNull();
    if (!request) throw new Error('expected the Warrior 1103 QA request to resolve');
    expect(mir4SkillQaSelectedActionId(request)).toBe('mir4_skill_1103');
    expect(mir4SkillQaSelectedActionBarLayout(request)).toEqual({
      v: 1,
      forms: {
        normal: {
          // Seed through the regular bar so the MIR4 controller promotes this
          // single action into seat 1. An empty bar is intentionally interpreted
          // as a pre-homologation layout and rebuilt with the whole starter kit.
          bar: [{ type: 'ability', id: 'mir4_skill_1103' }],
          attack: null,
        },
      },
    });
  });

  it('spawns seven lightweight targets only for Chain Lightning visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Elementalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'elementalist', mir4Skill: '2303' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 7 16');
  });

  it('spawns nine lightweight targets for Flame Strike cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Elementalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'elementalist', mir4Skill: '2201' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 24');
  });

  it('spawns six targets for Frozen Block cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Elementalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'elementalist', mir4Skill: '2202' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 6 56');
  });

  it('spawns seven targets for Soul Devour cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Elementalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'elementalist', mir4Skill: '2502' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 7 32');
  });

  it('spawns eleven targets for Dragon Tornado cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Elementalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'elementalist', mir4Skill: '2403' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 11 1');
  });

  it('spawns ten targets for Moonlight Wave cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Taoist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'taoist', mir4Skill: '3506' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 10 1');
  });

  it('spawns nine targets for Sunbeam Sword cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Taoist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'taoist', mir4Skill: '3101' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 1');
  });

  it('spawns eight targets for Moonlight Orb pull and cap visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Taoist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'taoist', mir4Skill: '3301' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 8 1');
  });

  it('spawns nine targets for Piercing Blades cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Taoist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'taoist', mir4Skill: '3103' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 8');
  });

  it('spawns six targets for Quick Shot cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4101' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 6 1');
  });

  it('spawns six targets for Painstrike Gale strip cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4106' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 6 1');
  });

  it('spawns nine targets for Illusion Arrow wave cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4102' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 1');
  });

  it('spawns six targets for Burst Shell device cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4103' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 6 1');
  });

  it('spawns seven targets for Venom Mist Shell field cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4104' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 7 40');
  });

  it('spawns seven targets for Ice Cage field cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4105' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 7 24');
  });

  it('spawns nine targets for Obliterate Shell strip cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4109' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 32');
  });

  it('spawns six targets for Flash Arrow field cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4107' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 6 5');
  });

  it('spawns nine targets for Heavenly Bow field cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4108' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 8');
  });

  it('spawns nine targets for Cloaking decoy cap and overflow visual QA', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Arbalist QA' }, chat, setMir4AutoSkillEnabled },
        new URLSearchParams({ mir4SkillQa: 'arbalist', mir4Skill: '4112' }),
        true,
      ),
    ).toBe(true);
    expect(chat).toHaveBeenLastCalledWith('/dev spawn training_dummy 9 56');
  });

  it('does not provision a mismatched or non-development player', () => {
    const chat = vi.fn();
    const setMir4AutoSkillEnabled = vi.fn(() => true);
    const params = new URLSearchParams({ mir4SkillQa: 'warrior' });
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Other' }, chat, setMir4AutoSkillEnabled },
        params,
        true,
      ),
    ).toBe(false);
    expect(
      provisionMir4SkillQa(
        { player: { name: 'Warrior QA' }, chat, setMir4AutoSkillEnabled },
        params,
        false,
      ),
    ).toBe(false);
    expect(chat).not.toHaveBeenCalled();
    expect(setMir4AutoSkillEnabled).not.toHaveBeenCalled();
  });

  it('is wired before the heavy diagnostics auto-start and forces the MIR4 profile', () => {
    const source = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
    const hudSource = readFileSync(new URL('../src/ui/hud.ts', import.meta.url), 'utf8');
    const qaRequest = source.indexOf('const mir4SkillQa = mir4SkillQaBootRequest(');
    const diagnosticsRequest = source.indexOf('const diagnosticsAutoOffline =');
    const qaBranch = source.indexOf('else if (mir4SkillQa)');

    expect(qaRequest).toBeGreaterThanOrEqual(0);
    expect(diagnosticsRequest).toBeGreaterThan(qaRequest);
    expect(qaBranch).toBeGreaterThanOrEqual(0);
    expect(
      source.slice(qaBranch, source.indexOf('} else if (diagnosticsAutoOffline)', qaBranch)),
    ).toContain('MIR4_GAME_PROFILE');
    expect(
      source.slice(qaBranch, source.indexOf('} else if (diagnosticsAutoOffline)', qaBranch)),
    ).toContain('MIR4_SKILL_QA_WORLD');
    expect(source).toContain('provisionMir4SkillQa(sim, startupParams, import.meta.env.DEV);');
    const qaActionBar = source.indexOf('mir4SkillQaSelectedActionBarLayout(mir4SkillQa)');
    const hudConstructor = source.indexOf('hud = new Hud(world, renderer, keybinds, {');
    expect(qaActionBar).toBeGreaterThanOrEqual(0);
    expect(hudConstructor).toBeGreaterThan(qaActionBar);
    expect(source.slice(qaActionBar, hudConstructor)).toMatch(
      /applyActionBarLayout\([\s\S]*?localStorage,[\s\S]*?world\.cfg\.playerClass,/,
    );
    expect(source.slice(qaActionBar, hudConstructor)).not.toContain(
      'localStorage,\n        mir4SkillQa.playerClass,',
    );
    expect(source.slice(qaActionBar, hudConstructor + 700)).toContain(
      'actionBarAbilityIdAllowlist: mir4SkillQaActionId',
    );
    expect(hudSource).toContain('actionBarAbilityIdAllowlist?: readonly string[];');
    expect(hudSource).toMatch(
      /knownAbilityIds:\s*\(\)\s*=>[\s\S]*?actionBarAbilityIdAllowlist[\s\S]*?includes\(known\.def\.id\)/,
    );
  });
});
