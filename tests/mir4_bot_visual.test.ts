import { describe, expect, it } from 'vitest';
import {
  applyMir4VisualAction,
  dismissMir4VisualObstructions,
  mir4VisualBotEntities,
  mir4VisualBotSnapshot,
  mir4VisualCharacterEntryState,
  mir4VisualOnlineEntryState,
  mir4VisualRecordingOptions,
  mir4VisualWindowLayout,
  planMir4VisualPolicy,
  resumeMir4VisualCharacter,
  updateMir4VisualRecovery,
  visualBotCaption,
} from '../scripts/lib/mir4_bot_visual.mjs';

describe('MIR4 visible bot playtest core', () => {
  it('tiles all five class clients into visible desktop windows', () => {
    expect(mir4VisualWindowLayout(5, 1920, 1080)).toEqual([
      { x: 0, y: 0, width: 640, height: 540 },
      { x: 640, y: 0, width: 640, height: 540 },
      { x: 1280, y: 0, width: 640, height: 540 },
      { x: 0, y: 540, width: 640, height: 540 },
      { x: 640, y: 540, width: 640, height: 540 },
    ]);
  });

  it('projects the real ClientWorld state into the shared progression tracker', () => {
    const mir4 = { classId: 3, mir4ArcQuests: { 'M01-Q01': { state: 'active' } } };
    const snapshot = mir4VisualBotSnapshot({
      player: {
        id: 41,
        level: 7,
        hp: 321,
        maxHp: 500,
        dead: false,
        ghost: false,
        inCombat: false,
        eating: null,
        potionCdRemaining: 0,
        pos: { x: 12, z: 34 },
      },
      xp: 88,
      copper: 200,
      inventory: [{ itemId: 'minor_healing_potion', count: 2 }],
      equipment: { mainhand: 'gnarled_staff' },
      mir4PlayerState: () => mir4,
    });

    expect(snapshot).toMatchObject({
      id: 41,
      lv: 7,
      xp: 88,
      copper: 200,
      hp: 321,
      mhp: 500,
      combat: false,
      eating: false,
      x: 12,
      z: 34,
      eq: { mainhand: 'gnarled_staff' },
      mir4,
    });
  });

  it('reads the visible page ClientWorld when Puppeteer invokes the projector without arguments', () => {
    const priorWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {
      __game: {
        world: {
          player: {
            id: 51,
            level: 9,
            hp: 450,
            maxHp: 500,
            dead: false,
            ghost: false,
            potionCdRemaining: 0,
            pos: { x: 20, z: 40 },
          },
          xp: 123,
          copper: 456,
          inventory: [],
          entities: new Map([
            [51, { id: 51, kind: 'player', hp: 450, dead: false, pos: { x: 20, z: 40 } }],
            [91, { id: 91, kind: 'mob', hp: 200, dead: false, pos: { x: 22, z: 43 } }],
          ]),
          mir4PlayerState: () => ({ classId: 2 }),
        },
      },
    };

    try {
      expect(mir4VisualBotSnapshot()).toMatchObject({ id: 51, lv: 9, xp: 123 });
      expect(mir4VisualBotEntities()).toHaveLength(2);
    } finally {
      if (priorWindow === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = priorWindow;
    }
  });

  it('projects visible hostile positions for the real tutorial engagement policy', () => {
    expect(
      mir4VisualBotEntities({
        entities: new Map([
          [41, { id: 41, kind: 'player', hp: 500, dead: false, pos: { x: 12, z: 34 } }],
          [
            90,
            {
              id: 90,
              kind: 'mob',
              hp: 200,
              dead: false,
              hostile: true,
              targetId: null,
              aggroTargetId: 41,
              runScoped: false,
              summonedAdd: false,
              pos: { x: 14, z: 38 },
            },
          ],
        ]),
      }),
    ).toEqual([
      {
        id: 41,
        kind: 'player',
        hp: 500,
        dead: false,
        hostile: undefined,
        targetId: undefined,
        aggroTargetId: undefined,
        runScoped: false,
        summonedAdd: false,
        vendorItems: undefined,
        x: 12,
        z: 34,
      },
      {
        id: 90,
        kind: 'mob',
        hp: 200,
        dead: false,
        hostile: true,
        targetId: null,
        aggroTargetId: 41,
        runScoped: false,
        summonedAdd: false,
        vendorItems: undefined,
        x: 14,
        z: 38,
      },
    ]);
  });

  it('dispatches explicit battle state and single-target combat through the real world facade', async () => {
    const calls: unknown[] = [];
    const game = {
      input: {
        setControllerMoveInput: (move: unknown, facing: unknown) =>
          calls.push(['input', move, facing]),
      },
      world: {
        equipItem: (item: string) => calls.push(['equip', item]),
        setMir4AutoBattle: (on: boolean) => calls.push(['auto', on]),
        mir4CastSkill: (skill: number, target: number) => calls.push(['cast', skill, target]),
        mir4BasicAttack: (target: number) => calls.push(['basic', target]),
      },
    };

    await applyMir4VisualAction({ t: 'input', mi: {}, facing: 1.25 }, game);
    await applyMir4VisualAction({ cmd: 'equip', item: 'gnarled_staff' }, game);
    await applyMir4VisualAction({ cmd: 'mir4', m: 'auto', on: true }, game);
    await applyMir4VisualAction({ cmd: 'mir4', m: 'cast', skill: 2101, target: 90 }, game);
    await applyMir4VisualAction({ cmd: 'mir4', m: 'basic', target: 90 }, game);

    expect(calls).toEqual([
      ['input', {}, 1.25],
      ['equip', 'gnarled_staff'],
      ['auto', true],
      ['cast', 2101, 90],
      ['basic', 90],
    ]);
  });

  it('prioritizes a mob attacking the player over automatic mission progression', () => {
    const self = {
      id: 41,
      hp: 500,
      mhp: 500,
      x: 12,
      z: 34,
      mir4: {
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M01-Q02', phase: 'to-site' },
        mir4ArcQuests: {
          'M01-Q02': { state: 'active', stageIndex: 2, stageProgress: 0 },
        },
      },
    };
    const entities = new Map([
      [
        90,
        {
          id: 90,
          kind: 'mob',
          hp: 200,
          hostile: true,
          aggroTargetId: 41,
          x: 14,
          z: 38,
        },
      ],
    ]);

    expect(
      planMir4VisualPolicy({
        self,
        entities,
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [
        { cmd: 'mir4', m: 'auto', on: false },
        { t: 'input', mi: {}, facing: Math.atan2(2, 4) },
        { cmd: 'mir4', m: 'cast', skill: 2101, target: 90 },
        { cmd: 'mir4', m: 'basic', target: 90 },
      ],
    });
  });

  it('actively clears a quest-scoped wave enemy before resuming Auto Mission', () => {
    const self = {
      id: 41,
      hp: 500,
      mhp: 500,
      x: 12,
      z: 34,
      mir4: {
        autoBattle: { mode: 'battle' },
        mir4AutoQuest: { questId: 'M01-Q05', phase: 'to-site' },
        mir4ArcQuests: {
          'M01-Q05': { state: 'active', stageIndex: 3, stageProgress: 0 },
        },
      },
    };
    const entities = new Map([
      [
        91,
        {
          id: 91,
          kind: 'mob',
          hp: 200,
          hostile: true,
          runScoped: true,
          summonedAdd: true,
          x: 14,
          z: 36,
        },
      ],
    ]);

    expect(
      planMir4VisualPolicy({
        self,
        entities,
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [
        { cmd: 'mir4', m: 'auto', on: false },
        { t: 'input', mi: {}, facing: Math.PI / 4 },
        { cmd: 'mir4', m: 'cast', skill: 2101, target: 91 },
        { cmd: 'mir4', m: 'basic', target: 91 },
      ],
    });
  });

  it('equips an available WoC-native class weapon before resuming campaign automation', () => {
    expect(
      planMir4VisualPolicy({
        self: {
          id: 41,
          lv: 7,
          hp: 500,
          mhp: 500,
          inv: [{ itemId: 'gnarled_staff', count: 1 }],
          eq: {},
          mir4: { classId: 2, autoBattle: { mode: 'off' }, mir4ArcQuests: {} },
        },
        entities: new Map(),
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [{ cmd: 'equip', item: 'gnarled_staff' }],
    });
  });

  it('pauses Auto Mission and recovers out of combat after a failed campaign attempt', () => {
    expect(
      planMir4VisualPolicy({
        self: {
          id: 41,
          lv: 7,
          hp: 500,
          mhp: 5_000,
          combat: false,
          eating: false,
          pcd: 0,
          inv: [{ itemId: 'baked_bread', count: 2 }],
          mir4: {
            classId: 2,
            autoBattle: { mode: 'battle' },
            mir4AutoQuest: { questId: 'M01-Q05', phase: 'to-site' },
            mir4ArcQuests: {},
          },
        },
        entities: new Map(),
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
        recoveryLevel: 8,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [
        { cmd: 'mir4', m: 'quest', on: false },
        { cmd: 'mir4', m: 'auto', on: false },
        { cmd: 'use', item: 'baked_bread' },
        { t: 'input', mi: {} },
      ],
    });
  });

  it('walks to the nearest healing vendor when recovery has no consumables', () => {
    expect(
      planMir4VisualPolicy({
        self: {
          id: 41,
          lv: 7,
          hp: 1,
          mhp: 5_440,
          x: 0,
          z: 0,
          combat: false,
          eating: false,
          copper: 3_100,
          inv: [],
          mir4: {
            classId: 2,
            autoBattle: { mode: 'battle' },
            mir4AutoQuest: { questId: 'M01-Q05', phase: 'to-site' },
            mir4ArcQuests: {},
          },
        },
        entities: new Map([
          [
            70,
            {
              id: 70,
              kind: 'npc',
              x: 20,
              z: 0,
              vendorItems: ['minor_healing_potion'],
            },
          ],
        ]),
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
        recoveryLevel: 8,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [
        { cmd: 'mir4', m: 'quest', on: false },
        { cmd: 'mir4', m: 'auto', on: false },
        { t: 'input', mi: { f: 1 }, facing: Math.PI / 2 },
      ],
    });
  });

  it('grinds ambient monsters until the adaptive recovery level is reached', () => {
    const base = {
      id: 41,
      lv: 7,
      hp: 4_000,
      mhp: 5_000,
      x: 0,
      z: 0,
      inv: [],
      mir4: { classId: 2, autoBattle: { mode: 'off' }, mir4ArcQuests: {} },
    };
    const rosterEntry = {
      classKey: 'elementalist' as const,
      classId: 2 as const,
      namePrefix: 'Elyra',
      engagementRangeYards: 12 as const,
      initialSkillIds: [2101],
    };
    expect(
      planMir4VisualPolicy({
        self: base,
        entities: new Map([[90, { id: 90, kind: 'mob', hp: 200, hostile: true, x: 50, z: 0 }]]),
        rosterEntry,
        tutorialSeeking: false,
        recoveryLevel: 8,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [
        { cmd: 'mir4', m: 'auto', on: true },
        { t: 'input', mi: { f: 1 }, facing: Math.PI / 2 },
      ],
    });
    expect(
      planMir4VisualPolicy({
        self: { ...base, lv: 8 },
        entities: new Map(),
        rosterEntry,
        tutorialSeeking: false,
        recoveryLevel: 8,
      }).actions,
    ).toContainEqual({ cmd: 'mir4', m: 'quest', on: true });
  });

  it('starts one-level recovery after death and resumes only after reaching it', () => {
    expect(updateMir4VisualRecovery(null, 0, 1, 7)).toEqual({
      recoveryLevel: 8,
      observedDeaths: 1,
      started: true,
      completed: false,
    });
    expect(updateMir4VisualRecovery(8, 1, 1, 8)).toEqual({
      recoveryLevel: null,
      observedDeaths: 1,
      started: false,
      completed: true,
    });
    expect(updateMir4VisualRecovery(8, 1, 2, 8)).toEqual({
      recoveryLevel: 9,
      observedDeaths: 2,
      started: true,
      completed: false,
    });
  });

  it('restocks healing potions from a nearby projected WoC vendor', () => {
    const entities = mir4VisualBotEntities({
      entities: new Map([
        [
          70,
          {
            id: 70,
            kind: 'npc',
            hp: 1,
            pos: { x: 2, z: 0 },
            vendorItems: ['minor_healing_potion'],
          },
        ],
      ]),
    });
    expect(entities[0]).toMatchObject({
      id: 70,
      vendorItems: ['minor_healing_potion'],
    });
    expect(
      planMir4VisualPolicy({
        self: {
          id: 41,
          lv: 1,
          hp: 500,
          mhp: 500,
          x: 0,
          z: 0,
          copper: 400,
          inv: [],
          mir4: { classId: 2, autoBattle: { mode: 'off' }, mir4ArcQuests: {} },
        },
        entities: new Map(entities.map((entity) => [Number(entity.id), entity])),
        rosterEntry: {
          classKey: 'elementalist',
          classId: 2,
          namePrefix: 'Elyra',
          engagementRangeYards: 12,
          initialSkillIds: [2101],
        },
        tutorialSeeking: false,
      }),
    ).toEqual({
      tutorialSeeking: false,
      actions: [{ cmd: 'buy', npcId: 70, item: 'minor_healing_potion', count: 10 }],
    });
  });

  it('labels each existing game window without introducing a replacement HUD', () => {
    expect(
      visualBotCaption(
        {
          classKey: 'lancer',
          classId: 5,
          namePrefix: 'Kael',
          engagementRangeYards: 4,
          initialSkillIds: [],
        },
        'Kaelbot',
      ),
    ).toBe('MIR4 BOT · LANCER · Kaelbot');
  });

  it('records a clean MP4 from the game page with the bundled ffmpeg runtime', () => {
    expect(
      mir4VisualRecordingOptions('F:/captures/elementalist.webm', 'F:/runtime/ffmpeg.exe', 30),
    ).toEqual({
      path: 'F:/captures/elementalist.webm',
      format: 'webm',
      fps: 30,
      ffmpegPath: 'F:/runtime/ffmpeg.exe',
      overwrite: true,
    });
  });

  it('dismisses only player-dismissible notices that would cover recorded gameplay', () => {
    const clicked: string[] = [];
    const documentLike = {
      querySelector: (selector: string) => ({ click: () => clicked.push(selector) }),
    };

    expect(dismissMir4VisualObstructions(documentLike)).toBe(3);
    expect(clicked).toEqual([
      '#gpu-notice .gpu-notice-dismiss',
      '#perf-nudge .perf-nudge-dismiss',
      '.store-promo-card .store-promo-card-close',
    ]);
  });

  it('re-enters the selected character only while character select is visible', () => {
    const clicks: string[] = [];
    const name = { textContent: ' Elyradpvqhu ' };
    const row = {
      click: () => clicks.push('row'),
      querySelector: (selector: string) => (selector === '.char-name' ? name : null),
    };
    const enter = { disabled: false, click: () => clicks.push('enter') };
    const documentLike = {
      defaultView: { confirm: () => false },
      querySelector: (selector: string) => {
        if (selector === '#start-screen') return { hidden: false, style: { display: '' } };
        if (selector === '#charselect-panel') return { hidden: false };
        if (selector === '#btn-charselect-enter') return enter;
        return null;
      },
      querySelectorAll: (selector: string) => (selector === '#char-list .char-row' ? [row] : []),
    };

    expect(resumeMir4VisualCharacter('Elyradpvqhu', documentLike)).toBe(true);
    expect(clicks).toEqual(['row', 'enter']);
    expect(documentLike.defaultView.confirm()).toBe(true);

    documentLike.querySelector = (selector: string) =>
      selector === '#start-screen'
        ? { hidden: false, style: { display: 'none' } }
        : selector === '#charselect-panel'
          ? { hidden: false }
          : null;
    expect(resumeMir4VisualCharacter('Elyradpvqhu', documentLike)).toBe(false);
  });

  it('accepts an automatic world resume without waiting for a character row', () => {
    const inWorldDocument = {
      querySelector: (selector: string) =>
        selector === '#start-screen' ? { hidden: false, style: { display: 'none' } } : null,
      querySelectorAll: (_selector: string): unknown[] => [],
    };
    expect(
      mir4VisualCharacterEntryState('Elyradpvqhu', inWorldDocument, {
        world: { entities: new Map([[41, { id: 41 }]]) },
      }),
    ).toBe('world');

    const name = { textContent: ' Elyradpvqhu ' };
    const selectDocument = {
      querySelector: (selector: string) =>
        selector === '#start-screen' ? { hidden: false, style: { display: '' } } : null,
      querySelectorAll: () => [{ querySelector: () => name }],
    };
    expect(mir4VisualCharacterEntryState('Elyradpvqhu', selectDocument, null)).toBe('select');
    expect(mir4VisualCharacterEntryState('Other', selectDocument, null)).toBe(false);
  });

  it('identifies every persisted online-shell state used by the launcher', () => {
    const panels = new Map([
      ['#login-panel', { hidden: false }],
      ['#realm-panel', { hidden: true }],
      ['#charselect-panel', { hidden: true }],
      ['#start-screen', { hidden: false, style: { display: '' } }],
    ]);
    const documentLike = {
      querySelector: (selector: string) => panels.get(selector) ?? null,
      querySelectorAll: (_selector: string): unknown[] => [],
    };
    expect(mir4VisualOnlineEntryState('Elyradpvqhu', [], documentLike, null)).toBe('login');
    expect(mir4VisualOnlineEntryState('Elyradpvqhu', ['login'], documentLike, null)).toBe(false);

    panels.set('#login-panel', { hidden: true });
    panels.set('#realm-panel', { hidden: false });
    documentLike.querySelectorAll = (selector: string) =>
      selector === '#realm-list .realm-row' ? [{}] : [];
    expect(mir4VisualOnlineEntryState('Elyradpvqhu', [], documentLike, null)).toBe('realm');
  });
});
