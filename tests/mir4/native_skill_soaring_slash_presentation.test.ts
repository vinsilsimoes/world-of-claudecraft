import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Taoist 3203 Soaring Slash native presentation', () => {
  it('pins the extracted SwordBlast package and dependencies', () => {
    const evidence = mir4NativeSkillAssetPresentationEvidence(3203);
    expect(evidence).toMatchObject({
      skillId: 3203,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordBlast',
        sha256: '2035FFE5290ED96D95ED9DAF02FA886D9FE756D7F60C99365BD514E63B58FF90',
        sizeBytes: 74_410,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pct/Pct_Btl_Skl_SwordBlast',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
    expect(evidence?.presentation.vfxAssetPaths).toHaveLength(2);
    expect(evidence?.presentation.guideAssetPaths).toHaveLength(2);
  });

  it('projects nine hybrid contacts as three exact frontal sword-blast waves', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3203);
    if (!plan) throw new Error('Missing Soaring Slash plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, Math.PI / 3, plan);

    expect(event).toMatchObject({
      sourceId: 7,
      targetId: 9,
      skillId: 3203,
      ability: 'mir4_skill_3203',
      profile: 'taoist-soaring-slash',
      durationMs: 1_700,
      endCutMs: 1_550,
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
      [320301, 350, 12_000, 'direct', 12, 4],
      [320301, 500, 12_000, 'direct', 12, 4],
      [320301, 650, 12_000, 'direct', 12, 4],
      [320302, 800, 14_000, 'direct', 12, 4],
      [320302, 950, 14_000, 'direct', 12, 4],
      [320302, 1_100, 14_000, 'direct', 12, 4],
      [320303, 1_250, 14_000, 'direct', 12, 4],
      [320303, 1_450, 14_000, 'direct', 12, 4],
      [320303, 1_650, 14_000, 'direct', 12, 4],
    ]);
  });

  it('admits and drains every contact once through the pooled painter', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3203);
    if (!plan) throw new Error('Missing Soaring Slash plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    if (!event) throw new Error('Missing Soaring Slash event');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_id: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };

    expect(painter.start(event)).toBe(true);
    painter.update(1.7, pose);
    expect(playContact).toHaveBeenCalledTimes(9);
  });

  it('paints the final wave as the strongest white-gold cleave', () => {
    const plan = mir4RuntimeSkillExecutionPlan(3203);
    if (!plan) throw new Error('Missing Soaring Slash plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    const contact = event?.contacts[8];
    if (!event || !contact) throw new Error('Missing Soaring Slash final contact');
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
      slashScale: 4 / 2.3,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, contact, visual, 8);

    expect(deps.slashStyled).toHaveBeenCalledWith(visual, 0xffffff, 'cleave', (4 / 2.3) * 1.44);
    expect(deps.pathRibbon).toHaveBeenCalledTimes(1);
    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.35, 8, 3.8, 0.62, 0xffffff, 2.4, false);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 1.8, 8, 0xffffff, 34, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('holy', 1.02, 4, 1.5, 8);
  });
});
