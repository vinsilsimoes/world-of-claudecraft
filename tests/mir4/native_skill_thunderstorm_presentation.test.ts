import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Thunderstorm native presentation', () => {
  it('projects the fixed field, warning, and four source-timed lightning contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2301);
    if (!plan) throw new Error('Missing Thunderstorm plan');

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
      skillId: 2301,
      ability: 'mir4_skill_2301',
      profile: 'sorcerer-thunderstorm',
      durationMs: 4_100,
      endCutMs: 1_300,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Thunder',
      persistentArea: {
        spawnOffsetMs: 100,
        expiresOffsetMs: 4_100,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
      },
    });
    expect(event?.contacts).toEqual([
      {
        attackId: 230112,
        offsetMs: 800,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient: 0,
      },
      ...[230113, 230114, 230115, 230116].map((attackId, index) => ({
        attackId,
        offsetMs: [900, 950, 1_000, 1_050][index],
        shape: 'fixed-circle' as const,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: index === 3 ? 3.5 : 7,
        heightYards: 4,
        damageCoefficient: 7_300,
      })),
    ]);
  });

  it('keeps every field cue at the cast anchor after the selected target moves', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2301);
    if (!plan) throw new Error('Missing Thunderstorm plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    if (!event) throw new Error('Missing Thunderstorm presentation');

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
    painter.update(0.1, pose);
    expect(playPersistentArea.mock.calls[0]?.[1]).toMatchObject({ x: 12, z: 18 });

    painter.update(0.7, pose);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({
      shape: 'fixed-circle',
      x: 12,
      z: 18,
    });
    painter.update(0.25, pose);
    expect(playContact).toHaveBeenCalledTimes(5);
    expect(playContact.mock.calls[4]?.[2]).toMatchObject({
      shape: 'fixed-circle',
      x: 12,
      z: 18,
      radiusYards: 3.5,
    });
  });

  it('fails closed without the reconstructed fixed spawn anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2301);
    if (!plan) throw new Error('Missing Thunderstorm plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
