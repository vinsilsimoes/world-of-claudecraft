import { describe, expect, it } from 'vitest';
import {
  mir4VisualBotEntities,
  mir4VisualBotSnapshot,
  mir4VisualWindowLayout,
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
        potionCdRemaining: 0,
        pos: { x: 12, z: 34 },
      },
      xp: 88,
      copper: 200,
      inventory: [{ itemId: 'minor_healing_potion', count: 2 }],
      mir4PlayerState: () => mir4,
    });

    expect(snapshot).toMatchObject({
      id: 41,
      lv: 7,
      xp: 88,
      copper: 200,
      hp: 321,
      mhp: 500,
      x: 12,
      z: 34,
      mir4,
    });
  });

  it('projects visible hostile positions for the real tutorial engagement policy', () => {
    expect(
      mir4VisualBotEntities({
        entities: new Map([
          [41, { id: 41, kind: 'player', hp: 500, dead: false, pos: { x: 12, z: 34 } }],
          [90, { id: 90, kind: 'mob', hp: 200, dead: false, pos: { x: 14, z: 38 } }],
        ]),
      }),
    ).toEqual([
      { id: 41, kind: 'player', hp: 500, dead: false, x: 12, z: 34 },
      { id: 90, kind: 'mob', hp: 200, dead: false, x: 14, z: 38 },
    ]);
  });

  it('labels each existing game window without introducing a replacement HUD', () => {
    expect(
      visualBotCaption(
        { classKey: 'lancer', classId: 5, namePrefix: 'Kael', initialSkillIds: [] },
        'Kaelbot',
      ),
    ).toBe('MIR4 BOT · LANCER · Kaelbot');
  });
});
