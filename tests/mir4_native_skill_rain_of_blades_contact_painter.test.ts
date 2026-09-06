import { describe, expect, it, vi } from 'vitest';
import {
  playMir4NativePersistentSkillArea,
  playMir4NativeSkillContact,
} from '../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../src/render/mir4_native_skill_presentation_core';
import type { SimEvent } from '../src/sim/types';

type PresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;

const EVENT = {
  type: 'mir4SkillPresentation',
  sourceId: 7,
  targetId: 9,
  sourceFacing: 0,
  skillId: 3104,
  ability: 'mir4_skill_3104',
  profile: 'taoist-rain-of-blades',
  durationMs: 4_100,
  endCutMs: 1_150,
  animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain',
  vfxAssetPaths: ['/Game/Effect/PC/Pct/SwordRain/P_Pct_SwordRain_Shot_01'],
  soundAssetPaths: [],
  cameraCurveAssetPaths: [],
  cameraShakeAssetPaths: [],
  contacts: [],
} as PresentationEvent;

function deps() {
  return {
    slashStyled: vi.fn(),
    burstAt: vi.fn(),
    ringAt: vi.fn(),
    decalXZ: vi.fn(),
    pathRibbon: vi.fn(),
    beamRibbon: vi.fn(),
    impactRing: vi.fn(),
    groundYAt: vi.fn(() => 0.25),
    playImpactAudio: vi.fn(),
  };
}

describe('MIR4 Rain of Blades browser presentation', () => {
  it('draws the four-second sword-rain field at the fixed target anchor', () => {
    const painter = deps();

    playMir4NativePersistentSkillArea(painter, EVENT, {
      spawnOffsetMs: 100,
      expiresOffsetMs: 4_100,
      shape: 'fixed-circle',
      x: 4,
      y: 1.5,
      z: 8,
      radiusYards: 6,
      heightYards: 4,
    });

    expect(painter.decalXZ).toHaveBeenCalledWith(4, 8, 6, 0x538ec7, 'sword-rain', 4);
    expect(painter.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 6, 4, 0x6ebeff, 1.65, false);
    expect(painter.pathRibbon).toHaveBeenCalledTimes(4);
    expect(painter.beamRibbon).not.toHaveBeenCalled();
    expect(painter.playImpactAudio).toHaveBeenCalledWith('magic', 0.9, 4, 1.5, 8);
  });

  it('renders each contact as a descending sword impact and strengthens the direct finish', () => {
    const painter = deps();
    const visual = {
      shape: 'target-circle',
      x: 4,
      y: 1.5,
      z: 8,
      radiusYards: 6,
      heightYards: 4,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(
      painter,
      { ...EVENT, contacts: [{}, {}, {}] } as PresentationEvent,
      {
        attackId: 310402,
        offsetMs: 1_000,
        shape: 'target-circle',
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 9_000,
      },
      visual,
      2,
    );

    expect(painter.slashStyled).toHaveBeenCalledWith(
      { x: 4, y: 3.1, z: 8 },
      0xeaf8ff,
      'thrust',
      2.1,
    );
    expect(painter.pathRibbon).toHaveBeenCalledTimes(2);
    expect(painter.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 6, 0.62, 0xeaf8ff, 2.5, false);
    expect(painter.impactRing).toHaveBeenCalledWith(9, 0xeaf8ff, true);
    expect(painter.burstAt).toHaveBeenCalledWith(4, 1.5, 8, 0xeaf8ff, 30, 1, 'sparks');
    expect(painter.playImpactAudio).toHaveBeenCalledWith('magic', 1.12, 4, 1.5, 8);
  });
});
