import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Dark Vortex native presentation', () => {
  it('projects the cast, persistent field, direct contact, and five Totem contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2501);
    if (!plan) throw new Error('Missing Dark Vortex plan');

    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 4, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });

    expect(event).not.toBeNull();
    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 4,
      skillId: 2501,
      ability: 'mir4_skill_2501',
      profile: 'sorcerer-dark-vortex',
      durationMs: 6_100,
      endCutMs: 1_010,
      animationAssetPath:
        '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Tornado',
      persistentArea: {
        spawnOffsetMs: 100,
        expiresOffsetMs: 6_100,
        shape: 'fixed-circle',
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 4.5,
        heightYards: 3,
      },
    });
    expect(event?.contacts).toEqual([
      {
        attackId: 250102,
        offsetMs: 720,
        shape: 'target-circle',
        radiusYards: 3,
        heightYards: 4,
        damageCoefficient: 4_000,
      },
      ...[250111, 250112, 250113, 250114, 250115].map((attackId, index) => ({
        attackId,
        offsetMs: [1_100, 1_300, 1_500, 1_700, 1_800][index],
        shape: 'fixed-circle' as const,
        x: 12,
        y: 1.5,
        z: 18,
        radiusYards: 4.5,
        heightYards: 3,
        damageCoefficient: index < 3 ? 4_000 : 5_000,
      })),
    ]);
  });

  it('keeps the tornado and Totem contacts at the cast anchor when the target moves', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2501);
    if (!plan) throw new Error('Missing Dark Vortex plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan, {
      x: 12,
      y: 1.5,
      z: 18,
    });
    if (!event) throw new Error('Missing Dark Vortex presentation');

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
    expect(playPersistentArea).toHaveBeenCalledOnce();
    expect(playPersistentArea.mock.calls[0][1]).toMatchObject({ x: 12, z: 18 });

    painter.update(0.62, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    expect(playContact.mock.calls[0][2]).toMatchObject({
      shape: 'target-circle',
      x: 30,
      z: 35,
    });

    painter.update(0.38, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    expect(playContact.mock.calls[1][2]).toMatchObject({
      shape: 'fixed-circle',
      x: 12,
      z: 18,
    });
  });

  it('fails closed when the reconstructed fixed spawn anchor is absent', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2501);
    if (!plan) throw new Error('Missing Dark Vortex plan');
    expect(mir4NativeSkillPresentationEvent(7, 9, 0, plan)).toBeNull();
  });
});
