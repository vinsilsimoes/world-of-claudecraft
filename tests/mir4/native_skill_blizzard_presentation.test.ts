import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Blizzard native presentation', () => {
  it('projects the fixed six-second field and seven contacts in chronological order', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2203);
    if (!plan) throw new Error('Missing Blizzard plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 4, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 4,
      skillId: 2203,
      ability: 'mir4_skill_2203',
      profile: 'sorcerer-blizzard',
      durationMs: 6100,
      endCutMs: 1600,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Blizzard',
      persistentArea: {
        spawnOffsetMs: 100,
        expiresOffsetMs: 6100,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
      },
    });
    expect(event?.contacts).toEqual([
      ...[
        [220311, 555, 3450],
        [220311, 750, 3450],
        [220312, 950, 3900],
        [220313, 1150, 3450],
        [220313, 1550, 3450],
      ].map(([attackId, offsetMs, damageCoefficient]) => ({
        attackId,
        offsetMs,
        shape: 'fixed-circle' as const,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient,
      })),
      {
        attackId: 220302,
        offsetMs: 1600,
        shape: 'target-circle',
        radiusYards: 7,
        heightYards: 3,
        damageCoefficient: 3900,
      },
      {
        attackId: 220314,
        offsetMs: 1750,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 7,
        heightYards: 4,
        damageCoefficient: 3900,
      },
    ]);
  });

  it('keeps the persistent field at the cast anchor after the selected target moves', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2203);
    if (!plan) throw new Error('Missing Blizzard plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    if (!event) throw new Error('Missing Blizzard presentation');
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
    painter.update(1.65, pose);
    expect(playContact).toHaveBeenCalledTimes(7);
    expect(playContact.mock.calls[0]?.[2]).toMatchObject({ x: 12, z: 18 });
    expect(playContact.mock.calls[6]?.[2]).toMatchObject({ x: 12, z: 18 });
  });

  it('fails closed without the reconstructed fixed spawn anchor', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2203);
    if (!plan) throw new Error('Missing Blizzard plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
