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
  skillId: 2203,
  ability: 'mir4_skill_2203',
  profile: 'sorcerer-blizzard',
  durationMs: 6100,
  endCutMs: 1600,
  animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard',
  vfxAssetPaths: [],
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

describe('MIR4 Blizzard browser presentation', () => {
  it('draws one durable frost field without spawning target tethers', () => {
    const painter = deps();
    playMir4NativePersistentSkillArea(painter, EVENT, {
      spawnOffsetMs: 100,
      expiresOffsetMs: 6100,
      shape: 'fixed-circle',
      x: 4,
      y: 1.5,
      z: 8,
      radiusYards: 7,
      heightYards: 4,
    });
    expect(painter.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 7, 6, 0x86cfff, 1.55, false);
    expect(painter.decalXZ).toHaveBeenCalledWith(4, 8, 7, 0x79cfff, 'rime', 6);
    expect(painter.pathRibbon).toHaveBeenCalledTimes(2);
    expect(painter.beamRibbon).not.toHaveBeenCalled();
    expect(painter.playImpactAudio).toHaveBeenCalledWith('frost', 0.9, 4, 1.5, 8);
  });

  it('draws a field contact as a frost pulse at its fixed world-space origin', () => {
    const painter = deps();
    const visual = {
      shape: 'fixed-circle',
      x: 4,
      y: 1.5,
      z: 8,
      radiusYards: 7,
      heightYards: 4,
      power: 1,
    } as Mir4NativePresentationContactVisual;
    playMir4NativeSkillContact(
      painter,
      EVENT,
      {
        attackId: 220311,
        offsetMs: 555,
        shape: 'fixed-circle',
        x: 4,
        y: 1.5,
        z: 8,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient: 3450,
      },
      visual,
      0,
    );
    expect(painter.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 7, 0.34, 0x8ad9ff, 1.45, false);
    expect(painter.burstAt).toHaveBeenCalledWith(4, 1.5, 8, 0x8ad9ff, 16, 1, 'sparks');
    expect(painter.playImpactAudio).toHaveBeenCalledWith('frost', 0.9, 4, 1.5, 8);
  });
});
