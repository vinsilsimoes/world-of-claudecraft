import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Rain of Blades native presentation', () => {
  it('projects the two sword phantoms and direct hybrid contact as three visual beats', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3104);
    if (!plan) throw new Error('Missing Rain of Blades plan');
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
      skillId: 3104,
      ability: 'mir4_skill_3104',
      profile: 'taoist-rain-of-blades',
      durationMs: 4_100,
      endCutMs: 1_150,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordRain',
      persistentArea: {
        spawnOffsetMs: 100,
        expiresOffsetMs: 4_100,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 6,
        heightYards: 4,
      },
    });
    expect(
      event?.contacts.map(({ attackId, offsetMs, shape, damageCoefficient }) => ({
        attackId,
        offsetMs,
        shape,
        damageCoefficient,
      })),
    ).toEqual([
      { attackId: 310411, offsetMs: 480, shape: 'fixed-circle', damageCoefficient: 10_000 },
      { attackId: 310412, offsetMs: 680, shape: 'fixed-circle', damageCoefficient: 11_000 },
      { attackId: 310402, offsetMs: 1_000, shape: 'target-circle', damageCoefficient: 9_000 },
    ]);
  });

  it('keeps the reconstructed sword-rain field at its cast anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3104);
    if (!plan) throw new Error('Missing Rain of Blades plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, { x: 12, y: 1.5, z: 18 });
    if (!event) throw new Error('Missing Rain of Blades presentation');

    const playPersistentArea = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playPersistentArea, playContact }, 1);
    const pose = (entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(
        out,
        entityId === 7
          ? { x: 2, y: 1, z: 3, facing: 0 }
          : { x: 30, y: 1.5, z: 35, facing: Math.PI },
      );
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.1, pose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject({ x: 12, z: 18 });
    painter.update(1, pose);
    expect(playContact).toHaveBeenCalledTimes(3);
    expect(playContact.mock.calls.filter((call) => call[2].shape === 'fixed-circle')).toHaveLength(2);
    expect(playContact.mock.calls.at(-1)?.[2]).toMatchObject({ shape: 'target-circle' });
  });

  it('fails closed without the reconstructed fixed spawn anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3104);
    if (!plan) throw new Error('Missing Rain of Blades plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
