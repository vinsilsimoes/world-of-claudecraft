import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../src/render/mir4_native_skill_presentation_core';
import type { SimEvent } from '../src/sim/types';

type PresentationEvent = Extract<SimEvent, { type: 'mir4SkillPresentation' }>;

const IRON_EVENT = {
  type: 'mir4SkillPresentation',
  sourceId: 7,
  targetId: 9,
  sourceFacing: 0,
  skillId: 1201,
  ability: 'mir4_skill_1201',
  profile: 'warrior-iron-shackle',
  durationMs: 2833,
  endCutMs: 2300,
  animationAssetPath:
    '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain',
  vfxAssetPaths: [],
  soundAssetPaths: [],
  cameraCurveAssetPaths: [],
  cameraShakeAssetPaths: [],
  contacts: [],
} as PresentationEvent;

const CIRCLE_VISUAL = {
  shape: 'circle',
  x: 4,
  y: 1.5,
  z: 8,
  radiusYards: 11,
  heightYards: 4,
  power: 1,
} as Mir4NativePresentationContactVisual;

const OVERDRIVE_EVENT = {
  ...IRON_EVENT,
  skillId: 1101,
  ability: 'mir4_skill_1101',
  profile: 'warrior-overdrive',
} as PresentationEvent;

const DRAGON_FLAME_EVENT = {
  ...IRON_EVENT,
  skillId: 1403,
  ability: 'mir4_ultimate_1',
  profile: 'warrior-dragon-flame',
  contacts: [
    {
      attackId: 140302,
      offsetMs: 780,
      shape: 'circle',
      centerOffsetYards: 5,
      radiusYards: 7,
      heightYards: 4,
      damageCoefficient: 15_000,
    },
    {
      attackId: 140303,
      offsetMs: 1500,
      shape: 'circle',
      centerOffsetYards: 5,
      radiusYards: 7,
      heightYards: 4,
      damageCoefficient: 15_500,
    },
    {
      attackId: 140303,
      offsetMs: 1720,
      shape: 'circle',
      centerOffsetYards: 5,
      radiusYards: 7,
      heightYards: 4,
      damageCoefficient: 15_500,
    },
    {
      attackId: 140304,
      offsetMs: 2560,
      shape: 'circle',
      centerOffsetYards: 5,
      radiusYards: 7,
      heightYards: 4,
      damageCoefficient: 20_000,
    },
  ],
} as PresentationEvent;

const FROST_ORB_EVENT = {
  ...IRON_EVENT,
  skillId: 2111,
  ability: 'mir4_skill_2111',
  profile: 'sorcerer-frost-orb',
} as PresentationEvent;

describe('MIR4 native skill contact painter', () => {
  it('draws the final Flame Strike contact as a source-centred firewind burst', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const event = {
      ...IRON_EVENT,
      skillId: 2201,
      ability: 'mir4_skill_2201',
      profile: 'sorcerer-flame-strike',
      contacts: [
        { attackId: 220102, offsetMs: 446, shape: 'circle', centerOffsetYards: 0, radiusYards: 7.5, heightYards: 4, damageCoefficient: 8_000 },
        { attackId: 220103, offsetMs: 746, shape: 'circle', centerOffsetYards: 0, radiusYards: 7.5, heightYards: 4, damageCoefficient: 15_000 },
        { attackId: 220103, offsetMs: 1_076, shape: 'circle', centerOffsetYards: 0, radiusYards: 7.5, heightYards: 4, damageCoefficient: 15_000 },
      ],
    } as PresentationEvent;
    const visual = { ...CIRCLE_VISUAL, radiusYards: 7.5 } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, event.contacts[2], visual, 2);

    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.37, 8, 7.5, 0.72, 0xffd27a, 2.25, false);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 1.5, 8, 0xffd27a, 30, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('fire', 1.15, 4, 1.5, 8);
  });

  it('draws Chain Lightning as a beam between consecutive acquired targets', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const event = {
      ...IRON_EVENT,
      skillId: 2303,
      ability: 'mir4_skill_2303',
      profile: 'sorcerer-chain-lightning',
      contacts: [
        {
          attackId: 230301,
          offsetMs: 979,
          shape: 'chain',
          fromEntityId: 7,
          toEntityId: 9,
          jumpRadiusYards: 11,
          heightYards: 8,
          damageCoefficient: 35_200,
        },
      ],
    } as PresentationEvent;
    const visual = {
      shape: 'chain',
      x: 4,
      y: 1.5,
      z: 8,
      power: 1,
      fromEntityId: 7,
      toEntityId: 9,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, event.contacts[0], visual, 0);

    expect(deps.beamRibbon).toHaveBeenCalledWith(7, 9, 0xe5fbff, 0.12, 0.24);
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0xe5fbff, true);
    expect(deps.playImpactAudio).toHaveBeenCalledWith('lightning', 1.05, 4, 1.5, 8);
  });

  it('draws OverDrive as two source-centred golden power pulses without a target tether', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const visual = {
      ...CIRCLE_VISUAL,
      radiusYards: 5,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(
      deps,
      OVERDRIVE_EVENT,
      {
        attackId: 110101,
        offsetMs: 650,
        shape: 'circle',
        centerOffsetYards: 0,
        radiusYards: 5,
        heightYards: 4,
        damageCoefficient: 8000,
      },
      visual,
      1,
    );

    expect(deps.slashStyled).not.toHaveBeenCalled();
    expect(deps.beamRibbon).not.toHaveBeenCalled();
    expect(deps.impactRing).not.toHaveBeenCalled();
    expect(deps.ringAt).toHaveBeenCalledWith(
      4,
      0.37,
      8,
      5,
      0.7,
      0xffe08a,
      2.2,
      false,
    );
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.burstAt).toHaveBeenCalledWith(
      4,
      1.5,
      8,
      0xffe08a,
      22,
      1,
      'sparks',
    );
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1, 4, 1.5, 8);
  });

  it('draws Iron Shackle as a circular chain sweep and target tether', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };

    playMir4NativeSkillContact(
      deps,
      IRON_EVENT,
      {
        attackId: 120101,
        offsetMs: 500,
        shape: 'circle',
        centerOffsetYards: 7,
        radiusYards: 11,
        heightYards: 4,
        damageCoefficient: 7000,
      },
      CIRCLE_VISUAL,
      0,
    );

    expect(deps.slashStyled).not.toHaveBeenCalled();
    expect(deps.ringAt).toHaveBeenCalledWith(
      4,
      0.37,
      8,
      11,
      0.52,
      0x79c8ff,
      1.45,
      false,
    );
    expect(deps.beamRibbon).toHaveBeenCalledWith(7, 9, 0xb8e4ff, 0.1, 0.42);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(2);
    expect(deps.burstAt).toHaveBeenCalledWith(
      4,
      1.5,
      8,
      0xd6f1ff,
      14,
      1,
      'sparks',
    );
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1, 4, 1.5, 8);
  });

  it('contracts the final Iron Shackle circle and accents the target impact', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0),
      playImpactAudio: vi.fn(),
    };

    playMir4NativeSkillContact(
      deps,
      IRON_EVENT,
      {
        attackId: 120103,
        offsetMs: 1500,
        shape: 'circle',
        centerOffsetYards: 3,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient: 8000,
      },
      {
        shape: 'circle',
        x: 4,
        y: 1.5,
        z: 8,
        radiusYards: 7,
        heightYards: 4,
        power: 8 / 7,
      },
      2,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(
      4,
      0.12,
      8,
      7,
      0.62,
      0xf1f8ff,
      2.2,
      false,
    );
    expect(deps.beamRibbon).not.toHaveBeenCalled();
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0xf1f8ff, true);
    expect(deps.burstAt).toHaveBeenCalledWith(
      4,
      1.5,
      8,
      0xf1f8ff,
      22,
      8 / 7,
      'sparks',
    );
  });

  it('draws the final Dragon Flame contact as the large fire finisher', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0),
      playImpactAudio: vi.fn(),
    };
    const visual = {
      ...CIRCLE_VISUAL,
      radiusYards: 7,
      power: 4 / 3,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(
      deps,
      DRAGON_FLAME_EVENT,
      DRAGON_FLAME_EVENT.contacts[3],
      visual,
      3,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(
      4,
      0.12,
      8,
      7,
      0.82,
      0xfff0aa,
      3,
      false,
    );
    expect(deps.slashStyled).toHaveBeenCalledWith(
      visual,
      0xfff0aa,
      'horizontal',
      7 / 2.3,
    );
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0xfff0aa, true);
    expect(deps.burstAt).toHaveBeenCalledWith(
      4,
      1.5,
      8,
      0xfff0aa,
      38,
      4 / 3,
      'sparks',
    );
    expect(deps.playImpactAudio).toHaveBeenCalledWith(
      'fire',
      (4 / 3) * 1.35,
      4,
      1.5,
      8,
    );
  });

  it('draws Frost Orb impact as a frost burst on its target footprint', () => {
    const deps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      pathRibbon: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: vi.fn(() => 0.25),
      playImpactAudio: vi.fn(),
    };
    const visual = {
      shape: 'target-circle',
      x: 10,
      y: 3,
      z: 20,
      radiusYards: 4.5,
      heightYards: 4,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(
      deps,
      FROST_ORB_EVENT,
      {
        attackId: 211102,
        offsetMs: 824,
        shape: 'target-circle',
        radiusYards: 4.5,
        heightYards: 4,
        damageCoefficient: 17_800,
      },
      visual,
      0,
    );

    expect(deps.ringAt).toHaveBeenCalledWith(
      10,
      0.37,
      20,
      4.5,
      0.44,
      0x9cecff,
      1.8,
      false,
    );
    expect(deps.impactRing).toHaveBeenCalledWith(9, 0xd8f8ff, true);
    expect(deps.burstAt).toHaveBeenCalledWith(
      10,
      3,
      20,
      0xd8f8ff,
      22,
      1,
      'sparks',
    );
    expect(deps.playImpactAudio).toHaveBeenCalledWith('frost', 1, 10, 3, 20);
  });
});
