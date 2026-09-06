import { describe, expect, it } from 'vitest';
import {
  mir4NativeSkillContactVisual,
  mir4NativeSkillFacingLock,
  mir4NativeSkillFacingLockValue,
  mir4NativeSkillPresentationContactRange,
  mir4NativeSkillPresentationOwnsAbilityVfx,
  mir4NativeSkillSourceSocketHeightFraction,
} from '../src/render/mir4_native_skill_presentation_core';

const CONTACTS = [
  {
    attackId: 110202,
    offsetMs: 520,
    shape: 'direct',
    reachYards: 4.5,
    widthYards: 5,
    damageCoefficient: 8000,
  },
  {
    attackId: 110203,
    offsetMs: 699,
    shape: 'direct',
    reachYards: 6.5,
    widthYards: 5,
    damageCoefficient: 8000,
  },
  {
    attackId: 110204,
    offsetMs: 900,
    shape: 'direct',
    reachYards: 8.5,
    widthYards: 5,
    damageCoefficient: 9000,
  },
] as const;

describe('MIR4 native skill presentation core', () => {
  it('releases only the contacts crossed by the current frame', () => {
    expect(mir4NativeSkillPresentationContactRange(0, 519, CONTACTS)).toEqual({ start: 0, end: 0 });
    expect(mir4NativeSkillPresentationContactRange(519, 699, CONTACTS)).toEqual({
      start: 0,
      end: 2,
    });
    expect(mir4NativeSkillPresentationContactRange(699, 900, CONTACTS)).toEqual({
      start: 2,
      end: 3,
    });
    expect(mir4NativeSkillPresentationContactRange(900, 1500, CONTACTS)).toEqual({
      start: 3,
      end: 3,
    });
  });

  it('places each direct slash in the center of its native forward footprint', () => {
    const visual = mir4NativeSkillContactVisual(CONTACTS[2], CONTACTS[0].damageCoefficient, {
      x: 3,
      y: 4,
      z: 5,
      facing: Math.PI / 2,
    });

    expect(visual.x).toBeCloseTo(7.25);
    expect(visual.y).toBe(4);
    expect(visual.z).toBeCloseTo(5);
    expect(visual.shape).toBe('direct');
    if (visual.shape !== 'direct') return;
    expect(visual.slashScale).toBeCloseTo(5 / 2.3);
    expect(visual.power).toBeCloseTo(1.125);
  });

  it('places a ranged-only direct contact in the center of its native inner and outer edges', () => {
    const visual = mir4NativeSkillContactVisual(
      {
        attackId: 520503,
        offsetMs: 400,
        shape: 'direct',
        minReachYards: 15,
        reachYards: 20,
        widthYards: 4,
        damageCoefficient: 21_000,
      },
      21_000,
      { x: 3, y: 4, z: 5, facing: Math.PI / 2 },
    );

    expect(visual.x).toBeCloseTo(20.5);
    expect(visual.y).toBe(4);
    expect(visual.z).toBeCloseTo(5);
    expect(visual.shape).toBe('direct');
  });

  it('places an Iron Shackle circle at its native forward offset and radius', () => {
    const visual = mir4NativeSkillContactVisual(
      {
        attackId: 120101,
        offsetMs: 500,
        shape: 'circle',
        centerOffsetYards: 7,
        radiusYards: 11,
        heightYards: 4,
        damageCoefficient: 7000,
      },
      7000,
      { x: 3, y: 4, z: 5, facing: Math.PI / 2 },
    );

    expect(visual).toEqual({
      shape: 'circle',
      x: 10,
      y: 4,
      z: 5,
      radiusYards: 11,
      heightYards: 4,
      power: 1,
    });
  });

  it('claims generic AbilityVfx only for a presentation profile implemented natively', () => {
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_1101')).toBe(true);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_1102')).toBe(true);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_1201')).toBe(true);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2111')).toBe(true);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_5205')).toBe(true);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_1103')).toBe(false);
    expect(mir4NativeSkillPresentationOwnsAbilityVfx(null)).toBe(false);
  });

  it('maps the reviewed native head socket to the standing model head anchor', () => {
    expect(mir4NativeSkillSourceSocketHeightFraction('head')).toBe(0.86);
    expect(mir4NativeSkillSourceSocketHeightFraction('unreviewed')).toBeNull();
  });

  it('holds OverDrive on the committed facing through its native end-cut', () => {
    const lock = mir4NativeSkillFacingLock(
      {
        type: 'mir4SkillPresentation',
        sourceId: 7,
        targetId: 9,
        sourceFacing: -0.5,
        skillId: 1101,
        ability: 'mir4_skill_1101',
        profile: 'warrior-overdrive',
        durationMs: 1367,
        endCutMs: 1220,
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive',
        vfxAssetPaths: [],
        soundAssetPaths: [],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
        contacts: [],
      },
      4,
    );
    expect(lock).toEqual({ facing: -0.5, until: 5.22 });
  });

  it('holds the committed target-facing through the native end-cut and then releases it', () => {
    const lock = mir4NativeSkillFacingLock(
      {
        type: 'mir4SkillPresentation',
        sourceId: 7,
        targetId: 9,
        sourceFacing: Math.PI / 3,
        skillId: 1102,
        ability: 'mir4_skill_1102',
        profile: 'warrior-air-slash',
        durationMs: 1500,
        endCutMs: 1300,
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash',
        vfxAssetPaths: [],
        soundAssetPaths: [],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
        contacts: [...CONTACTS],
      },
      10,
    );

    expect(lock).toEqual({ facing: Math.PI / 3, until: 11.3 });
    expect(mir4NativeSkillFacingLockValue(lock, 11.299)).toBeCloseTo(Math.PI / 3);
    expect(mir4NativeSkillFacingLockValue(lock, 11.3)).toBeNull();
  });

  it('holds Iron Shackle on the committed facing through its native end-cut', () => {
    const lock = mir4NativeSkillFacingLock(
      {
        type: 'mir4SkillPresentation',
        sourceId: 7,
        targetId: 9,
        sourceFacing: -0.75,
        skillId: 1201,
        ability: 'mir4_skill_1201',
        profile: 'warrior-iron-shackle',
        durationMs: 2833,
        endCutMs: 2300,
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_IronChain',
        vfxAssetPaths: [],
        soundAssetPaths: [],
        cameraCurveAssetPaths: [],
        cameraShakeAssetPaths: [],
        contacts: [],
      },
      4,
    );

    expect(lock).toEqual({ facing: -0.75, until: 6.3 });
  });
});
