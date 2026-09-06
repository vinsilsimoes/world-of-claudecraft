import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Moonlight Orb native presentation', () => {
  it('projects the fixed lunar orb and all nine source-timed impacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3301);
    if (!plan) throw new Error('Missing Moonlight Orb plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 3,
      skillId: 3301,
      ability: 'mir4_skill_3301',
      profile: 'taoist-moonlight-orb',
      durationMs: 6567,
      endCutMs: 1300,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonOrb',
      persistentArea: {
        spawnOffsetMs: 567,
        expiresOffsetMs: 6567,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 5.5,
        heightYards: 3,
      },
    });
    expect(event?.contacts.map(({ attackId, offsetMs, shape, damageCoefficient }) => ({
      attackId,
      offsetMs,
      shape,
      damageCoefficient,
    }))).toEqual([
      { attackId: 330111, offsetMs: 867, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330102, offsetMs: 900, shape: 'target-circle', damageCoefficient: 3500 },
      { attackId: 330111, offsetMs: 1467, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330112, offsetMs: 1817, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330112, offsetMs: 2117, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330113, offsetMs: 2467, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330113, offsetMs: 2767, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330114, offsetMs: 3117, shape: 'fixed-circle', damageCoefficient: 2500 },
      { attackId: 330114, offsetMs: 3417, shape: 'fixed-circle', damageCoefficient: 2500 },
    ]);
  });

  it('keeps the orb at the cast anchor while all nine cues play', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3301);
    if (!plan) throw new Error('Missing Moonlight Orb plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, { x: 12, y: 1.5, z: 18 });
    if (!event) throw new Error('Missing Moonlight Orb presentation');

    const playPersistentArea = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playPersistentArea, playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, entityId === 7
        ? { x: 2, y: 1, z: 3, facing: 0 }
        : { x: 30, y: 1.5, z: 35, facing: Math.PI });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.567, pose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject({ x: 12, z: 18 });
    painter.update(2.9, pose);
    expect(playContact).toHaveBeenCalledTimes(9);
    expect(playContact.mock.calls.filter((call) => call[2].shape === 'fixed-circle')).toHaveLength(8);
    expect(playContact.mock.calls.at(-1)?.[2]).toMatchObject({ shape: 'fixed-circle', x: 12, z: 18 });
  });

  it('fails closed without the reconstructed fixed spawn anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3301);
    if (!plan) throw new Error('Missing Moonlight Orb plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
