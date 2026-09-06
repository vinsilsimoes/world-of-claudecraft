import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../src/sim/mir4/runtime_skill_execution';
import type { SimEvent } from '../src/sim/types';

const OVERDRIVE_EVENT: Extract<SimEvent, { type: 'mir4SkillPresentation' }> = {
  type: 'mir4SkillPresentation',
  sourceId: 7,
  targetId: 9,
  sourceFacing: -Math.PI / 5,
  skillId: 1101,
  ability: 'mir4_skill_1101',
  profile: 'warrior-overdrive',
  durationMs: 1367,
  endCutMs: 1220,
  animationAssetPath:
    '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_OverDrive',
  vfxAssetPaths: [
    '/Game/Effect/PC/Pcw/P_pcw_OverDrive_001',
    '/Game/Effect/PC/Pcw/P_Pcw_Counter_Atk_01',
    '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
  ],
  soundAssetPaths: [],
  cameraCurveAssetPaths: [],
  cameraShakeAssetPaths: [],
  contacts: [
    {
      attackId: 110100,
      offsetMs: 20,
      shape: 'circle',
      centerOffsetYards: 0,
      radiusYards: 5,
      heightYards: 4,
      damageCoefficient: 8000,
    },
    {
      attackId: 110101,
      offsetMs: 650,
      shape: 'circle',
      centerOffsetYards: 0,
      radiusYards: 5,
      heightYards: 4,
      damageCoefficient: 8000,
    },
  ],
};

const EVENT: Extract<SimEvent, { type: 'mir4SkillPresentation' }> = {
  type: 'mir4SkillPresentation',
  sourceId: 7,
  targetId: 9,
  sourceFacing: Math.PI / 3,
  skillId: 1102,
  ability: 'mir4_skill_1102',
  profile: 'warrior-air-slash',
  durationMs: 1500,
  endCutMs: 1300,
  animationAssetPath:
    '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_AirSlash',
  vfxAssetPaths: [
    '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_002',
    '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_003',
    '/Game/Effect/PC/Pcw/AirSlash/P_Pcw_AirSlash_Atk_01',
  ],
  soundAssetPaths: ['/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue'],
  cameraCurveAssetPaths: [
    '/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_Banwol02',
  ],
  cameraShakeAssetPaths: ['/Game/Blueprint/BPCameraShake/BP_Atk_CameraShake'],
  contacts: [
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
  ],
};

const IRON_SHACKLE_EVENT: Extract<SimEvent, { type: 'mir4SkillPresentation' }> =
  {
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
    vfxAssetPaths: [
      '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_01',
      '/Game/Effect/PC/Pcw/IronChain/P_pcw_iron_chain_02',
      '/Game/Effect/PC/Pcw/P_Pcw_IronChain_Atk_01',
    ],
    soundAssetPaths: ['/Game/Sound/Sound_Hit/hit_effect/hit_nomal_1_Cue'],
    cameraCurveAssetPaths: [
      '/Game/Blueprint/Camera/CameraCurve/Pcw_Btl_Skl_IronChain01',
    ],
    cameraShakeAssetPaths: [
      '/Game/Blueprint/BPCameraShake/BP_Hit_CameraShake_02',
    ],
    contacts: [
      {
        attackId: 120101,
        offsetMs: 500,
        shape: 'circle',
        centerOffsetYards: 7,
        radiusYards: 11,
        heightYards: 4,
        damageCoefficient: 7000,
      },
      {
        attackId: 120102,
        offsetMs: 850,
        shape: 'circle',
        centerOffsetYards: 7,
        radiusYards: 11,
        heightYards: 4,
        damageCoefficient: 7000,
      },
      {
        attackId: 120103,
        offsetMs: 1500,
        shape: 'circle',
        centerOffsetYards: 3,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient: 8000,
      },
    ],
  };

const DRAGON_FLAME_EVENT: Extract<SimEvent, { type: 'mir4SkillPresentation' }> =
  {
    type: 'mir4SkillPresentation',
    sourceId: 7,
    targetId: 9,
    sourceFacing: 0,
    skillId: 1403,
    ability: 'mir4_ultimate_1',
    profile: 'warrior-dragon-flame',
    durationMs: 3433,
    endCutMs: 2950,
    animationAssetPath:
      '/Game/Animation/AnimationSequence/PC/Pcw/Pcw_Btl_Skl_Special',
    vfxAssetPaths: [
      '/Game/Animation/AnimationSequence/PC/Effect/EFT_Dragon01/EFT_Dragon01_FireSword01',
      '/Game/Blueprint/Projectile/SkeletalEffect/SkeletalEffect04',
      '/Game/Effect/PC/Basic/P_Pct_Action01_03',
      '/Game/Effect/PC/Pcw/Special/p_pc_Special_001',
      '/Game/Effect/PC/Pcw/Special/p_pc_Special_002',
      '/Game/Effect/Hit/PC_Pcw/P_Pcw_hit_Atk_01',
      '/Game/Effect/Common/System/Buff/P_Buff_SuperArmor_01',
      '/Game/Effect/Common/System/Debuff/P_Buff_Fire_Bleeding_01',
    ],
    soundAssetPaths: [],
    cameraCurveAssetPaths: [],
    cameraShakeAssetPaths: [],
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
  };

describe('MIR4 native skill presentation painter', () => {
  it('advances Chain Lightning through each acquired entity pair', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2303);
    if (!plan) throw new Error('missing Chain Lightning execution plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, undefined, [9, 11, 13]);
    if (!event) throw new Error('missing Chain Lightning presentation event');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);

    expect(painter.start(event)).toBe(true);
    painter.update(1.12, (entityId, out) => {
      out.x = entityId;
      out.y = 1;
      out.z = 2;
      out.facing = 0;
      return true;
    });

    expect(playContact).toHaveBeenCalledTimes(2);
    expect(playContact.mock.calls.map((call) => call[2])).toMatchObject([
      { shape: 'chain', fromEntityId: 7, toEntityId: 9, x: 9 },
      { shape: 'chain', fromEntityId: 9, toEntityId: 11, x: 11 },
    ]);
  });

  it('plays the two OverDrive self pulses at the native timestamps', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (
      _sourceId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(OVERDRIVE_EVENT)).toBe(true);
    painter.update(0.019, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0][2]).toMatchObject({
      shape: 'circle',
      x: 2,
      z: 3,
      radiusYards: 5,
    });
    painter.update(0.63, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      110100, 110101,
    ]);
    painter.update(0.717, pose);
    expect(painter.activeCount()).toBe(0);
  });

  it('plays exactly three forward slash contacts at the native timestamps', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (
      _sourceId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(out, { x: 0, y: 1, z: 0, facing: 0 });
      return true;
    };

    expect(painter.start(EVENT)).toBe(true);
    painter.update(0.519, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.18, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      110202, 110203,
    ]);
    painter.update(0.201, pose);
    expect(playContact).toHaveBeenCalledTimes(3);
    expect(playContact.mock.calls[2][1].attackId).toBe(110204);
    expect(playContact.mock.calls[2][2]).toMatchObject({
      x: 0,
      y: 1,
      z: 4.25,
      power: 1.125,
    });
    painter.update(0.601, pose);
    expect(painter.activeCount()).toBe(0);
  });

  it('fails closed for an event whose native presentation contract does not match', () => {
    const painter = new Mir4NativeSkillPresentationPainter(
      { playContact: vi.fn() },
      1,
    );
    expect(painter.start({ ...EVENT, animationAssetPath: '/unexpected' })).toBe(
      false,
    );
  });

  it('plays the three Iron Shackle circles at their native timestamps', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (
      _sourceId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(IRON_SHACKLE_EVENT)).toBe(true);
    painter.update(0.5, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0][2]).toEqual({
      shape: 'circle',
      x: 2,
      y: 1,
      z: 10,
      radiusYards: 11,
      heightYards: 4,
      power: 1,
    });
    painter.update(0.35, pose);
    painter.update(0.65, pose);
    expect(playContact.mock.calls.map((call) => call[1].attackId)).toEqual([
      120101, 120102, 120103,
    ]);
    expect(playContact.mock.calls[2][2]).toMatchObject({
      shape: 'circle',
      z: 6,
      radiusYards: 7,
      power: 8 / 7,
    });
  });

  it('plays Dragon Flame at the four native damage contacts and forward footprint', () => {
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (
      _sourceId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(DRAGON_FLAME_EVENT)).toBe(true);
    painter.update(0.779, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    painter.update(0.72, pose);
    painter.update(0.22, pose);
    painter.update(0.84, pose);
    expect(
      playContact.mock.calls.map((call) => [
        call[1].attackId,
        call[1].offsetMs,
      ]),
    ).toEqual([
      [140302, 780],
      [140303, 1500],
      [140303, 1720],
      [140304, 2560],
    ]);
    expect(playContact.mock.calls[0][2]).toMatchObject({
      shape: 'circle',
      x: 2,
      y: 1,
      z: 8,
      radiusYards: 7,
      heightYards: 4,
      power: 1,
    });
    expect(playContact.mock.calls[3][2]).toMatchObject({ power: 4 / 3 });
    painter.update(0.873, pose);
    expect(painter.activeCount()).toBe(0);
  });
});
