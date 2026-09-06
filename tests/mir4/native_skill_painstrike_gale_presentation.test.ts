import { describe, expect, it, vi } from 'vitest';
import { playMir4NativeSkillContact } from '../../src/render/mir4_native_skill_contact_painter';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import type { Mir4NativePresentationContactVisual } from '../../src/render/mir4_native_skill_presentation_core';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import {
  mir4RuntimeSkillExecutionAuthority,
  mir4RuntimeSkillExecutionPlan,
} from '../../src/sim/mir4/runtime_skill_execution';

describe('MIR4 Painstrike Gale native presentation', () => {
  it('pins the inspected Pca Skl02 package and dependencies', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4106)).toMatchObject({
      skillId: 4106,
      source: {
        kind: 'extracted-cooked-uasset',
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl02',
        sha256: 'F1856B6E22781826725D774E763131A9895D212A59EDDA5FBDF5358373AE23B3',
        sizeBytes: 117_671,
      },
      presentation: {
        animationAssetPath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl02',
        animationBindingConfidence: 'corroborated-asset',
      },
    });
  });

  it('presents the single authored kick contact on its exact timeline', () => {
    expect(mir4RuntimeSkillExecutionAuthority(4106)?.issues).toEqual([]);
    const plan = mir4RuntimeSkillExecutionPlan(4106);
    if (!plan) throw new Error('Missing Painstrike Gale plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);

    expect(event).toMatchObject({
      type: 'mir4SkillPresentation',
      skillId: 4106,
      ability: 'mir4_skill_4106',
      profile: 'arbalist-painstrike-gale',
      durationMs: 1_000,
      endCutMs: 900,
      contacts: [
        {
          attackId: 410602,
          offsetMs: 450,
          shape: 'direct',
          reachYards: 6,
          widthYards: 0,
          damageCoefficient: 17_000,
        },
      ],
    });

    if (!event) throw new Error('Missing Painstrike Gale event');
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    const pose = (_entityId: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 2, y: 1, z: 3, facing: 0 });
      return true;
    };
    expect(painter.start(event)).toBe(true);
    painter.update(0.46, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
  });

  it('paints the kick as an impact gale instead of a zero-width invisible slash', () => {
    const plan = mir4RuntimeSkillExecutionPlan(4106);
    if (!plan) throw new Error('Missing Painstrike Gale plan');
    const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
    const contact = event?.contacts[0];
    if (!event || !contact) throw new Error('Missing Painstrike Gale contact');
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
      slashScale: 0,
      power: 1,
    } as Mir4NativePresentationContactVisual;

    playMir4NativeSkillContact(deps, event, contact, visual, 0);

    expect(deps.slashStyled).toHaveBeenNthCalledWith(1, visual, 0x7250b8, 'horizontal', 1.45);
    expect(deps.slashStyled).toHaveBeenNthCalledWith(2, visual, 0xffd56a, 'vertical', 1.05);
    expect(deps.ringAt).toHaveBeenCalledWith(4, 0.31, 8, 1.8, 0.36, 0x7250b8, 1.8, false);
    expect(deps.burstAt).toHaveBeenCalledWith(4, 2.25, 8, 0xffd56a, 22, 1, 'sparks');
    expect(deps.playImpactAudio).toHaveBeenCalledWith('physical', 1.05, 4, 1.5, 8);
  });
});
