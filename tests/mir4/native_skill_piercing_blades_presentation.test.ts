import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Piercing Blades native presentation', () => {
  it('pins the inspected PiercingAtk package and its extracted presentation dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(3103);
    expect(evidence).toMatchObject({
      skillId: 3103,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_PiercingAtk',
        sha256: '0B70FC8A1F3E705C911040815B8F07352ACE5B4A9F3D06E2004AE01448436ECC',
        sizeBytes: 63_285,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_PiercingAtk',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
    expect(evidence?.presentation.vfxAssetPaths).toHaveLength(3);
    expect(evidence?.presentation.guideAssetPaths).toHaveLength(2);
    expect(evidence?.presentation.cameraCurveAssetPaths).toContain(
      '/Game/Blueprint/Camera/CameraCurve/Pct_Btl_Skl_PiercingAtk',
    );
  });

  it('projects all five source-timed contacts over the native frontal footprint', () => {
    const authority = mir4RuntimeSkillExecutionAuthority(3103);
    expect(authority?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(3103);
    if (!plan) throw new Error('Missing Piercing Blades plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 4, plan);

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      sourceId: 7,
      targetId: 9,
      sourceFacing: Math.PI / 4,
      skillId: 3103,
      ability: 'mir4_skill_3103',
      profile: 'taoist-piercing-blades',
      durationMs: 1_767,
      endCutMs: 1_650,
    });
    expect(
      event?.contacts.map((contact) => [
        contact.attackId,
        contact.offsetMs,
        contact.damageCoefficient,
        contact.shape,
        contact.shape === 'direct' ? contact.reachYards : null,
        contact.shape === 'direct' ? contact.widthYards : null,
      ]),
    ).toEqual([
      [310302, 720, 10_000, 'direct', 12, 5],
      [310302, 850, 10_000, 'direct', 12, 5],
      [310302, 980, 10_000, 'direct', 12, 5],
      [310303, 1_120, 10_000, 'direct', 12, 5],
      [310303, 1_250, 10_000, 'direct', 12, 5],
    ]);
  });

  it('admits the sealed event into the pooled painter and plays each contact once', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3103);
    if (!plan) throw new Error('Missing Piercing Blades plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    if (!event) throw new Error('Missing Piercing Blades presentation');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(1.3, pose);
    expect(playContact).toHaveBeenCalledTimes(5);
  });

  it('paints the final extracted shoot and trail contact as a piercing finisher', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3103);
    if (!plan) throw new Error('Missing Piercing Blades plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    const contact = event?.contacts[4];
    if (!event || !contact) throw new Error('Missing Piercing Blades final contact');
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
      shape: 'direct',
      x: 4,
      y: 1.5,
      z: 8,
      slashScale: 5 / 2.3,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, contact, visual, 4);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xf5e8ff, 'thrust', (5 / 2.3) * 1.3);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 3.2, 0.58, 0xf5e8ff, 2.25, false);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 1.75, 8, 0xf5e8ff, 28, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.15, 4, 1.5, 8);
  });
});
