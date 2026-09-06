import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Moonlight Wave native presentation', () => {
  it('projects the fixed lunar field and all five source-timed impacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3506);
    if (!plan) throw new Error('Missing Moonlight Wave plan');
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
      skillId: 3506,
      ability: 'mir4_skill_3506',
      profile: 'taoist-moonlight-wave',
      durationMs: 4200,
      endCutMs: 2280,
      animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_MoonWave',
      persistentArea: {
        spawnOffsetMs: 200,
        expiresOffsetMs: 4200,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 6,
        heightYards: 4,
      },
    });
    expect(event?.contacts).toEqual([
      ...[
        [350611, 620],
        [350611, 700],
      ].map(([attackId, offsetMs]) => ({
        attackId,
        offsetMs,
        shape: 'fixed-circle' as const,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 5000,
      })),
      {
        attackId: 350602,
        offsetMs: 732,
        shape: 'target-circle',
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 6000,
      },
      ...[
        [350612, 780],
        [350612, 800],
      ].map(([attackId, offsetMs]) => ({
        attackId,
        offsetMs,
        shape: 'fixed-circle' as const,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 6,
        heightYards: 4,
        damageCoefficient: 5000,
      })),
    ]);
  });

  it('keeps the field at the cast anchor while all five cues play', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3506);
    if (!plan) throw new Error('Missing Moonlight Wave plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    if (!event) throw new Error('Missing Moonlight Wave presentation');

    const playPersistentArea = vi.fn();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter(
      { playPersistentArea, playContact },
      1,
    );
    const pose = (
      entityId: number,
      out: { x: number; y: number; z: number; facing: number },
    ) => {
      Object.assign(
        out,
        entityId === 7
          ? { x: 2, y: 1, z: 3, facing: 0 }
          : { x: 30, y: 1.5, z: 35, facing: Math.PI },
      );
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(0.2, pose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject({ x: 12, z: 18 });
    painter.update(0.6, pose);
    expect(playContact).toHaveBeenCalledTimes(5);
    expect(playContact.mock.calls.filter((call) => call[2].shape === 'fixed-circle')).toHaveLength(4);
    expect(playContact.mock.calls[4]?.[2]).toMatchObject({
      shape: 'fixed-circle',
      x: 12,
      z: 18,
    });
  });

  it('fails closed without the reconstructed fixed spawn anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3506);
    if (!plan) throw new Error('Missing Moonlight Wave plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
