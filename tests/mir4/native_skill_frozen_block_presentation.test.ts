import { describe, expect, it } from 'vitest';
import { mir4NativeSkillPresentationOwnsAbilityVfx } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Sorcerer 2202 Frozen Block presentation', () => {
  it('pins the inspected Freezing animation and its three embedded VFX packages', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(2202)).toMatchObject({
      skillId: 2202,
      source: {
        packagePath: '/Game/Animation/AnimationSequence/PC/Pcm/Pcm_Btl_Skl_Freezing',
        sha256: '73410BF9BC9127277EB99D5FD5C6A0A02576FD53C4611D7CB5BC4F35CDD82436',
        sizeBytes: 62_730,
      },
      presentation: {
        vfxAssetPaths: [
          '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_01',
          '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_02',
          '/Game/Effect/PC/Pcm/FReezing/P_Pcm_Freezing_03',
        ],
      },
    });
  });

  it('projects and schedules all three actor-centred frost contacts', () => {
    const plan = mir4RuntimeSkillExecutionPlan(2202);
    if (!plan) throw new Error('missing Frozen Block execution plan');
    const event = mir4NativeSkillPresentationEvent(7, 7, 0, plan);
    expect(event).toMatchObject({
      sourceId: 7,
      targetId: 7,
      profile: 'sorcerer-frozen-block',
      durationMs: 4_000,
      endCutMs: 3_600,
      contacts: [
        { attackId: 220201, offsetMs: 20, shape: 'circle', radiusYards: 7 },
        { attackId: 220202, offsetMs: 3_000, shape: 'circle', radiusYards: 7 },
        { attackId: 220203, offsetMs: 3_400, shape: 'circle', radiusYards: 7 },
      ],
    });
    expect(mir4NativeSkillPresentationOwnsAbilityVfx('mir4_skill_2202')).toBe(true);
    if (!event) throw new Error('missing Frozen Block presentation event');
    const contacts: number[] = [];
    const painter = new Mir4NativeSkillPresentationPainter({
      playContact: (_event, contact) => contacts.push(contact.offsetMs),
    }, 1);
    expect(painter.start(event)).toBe(true);
    painter.update(0.019, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 4, facing: 0 });
      return true;
    });
    expect(contacts).toEqual([]);
    painter.update(3.381, (_entityId, out) => {
      Object.assign(out, { x: 3, y: 1, z: 4, facing: 0 });
      return true;
    });
    expect(contacts).toEqual([20, 3_000, 3_400]);
  });
});
