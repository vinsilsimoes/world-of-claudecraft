import { describe, expect, it, vi } from 'vitest';
import { Mir4NativeSkillPresentationPainter } from '../../src/render/mir4_native_skill_presentation_painter';
import {
  playMir4NativeSkillContact,
  type Mir4NativeSkillContactPainterDeps,
} from '../../src/render/mir4_native_skill_contact_painter';
import { mir4NativeSkillAssetPresentationEvidence } from '../../src/sim/mir4/native_skill_asset_presentation';
import { mir4NativeSkillPresentationEvent } from '../../src/sim/mir4/native_skill_presentation_event';
import { mir4RuntimeSkillExecutionPlan } from '../../src/sim/mir4/runtime_skill_execution';

function presentation() {
  const plan = mir4RuntimeSkillExecutionPlan(4109);
  if (!plan) throw new Error('Missing Obliterate Shell plan');
  const event = mir4NativeSkillPresentationEvent(7, 9, 0, plan);
  if (!event) throw new Error('Missing Obliterate Shell presentation');
  return event;
}

describe('MIR4 Obliterate Shell native presentation', () => {
  it('pins the inspected Skl09 animation and preserves the two frontal contacts', () => {
    expect(mir4NativeSkillAssetPresentationEvidence(4109)).toMatchObject({
      source: {
        packagePath: '/Game/Animation/AnimationSequence/PC/Pca/PCA_Btl_Skl09',
        sha256: '666B01BB6612FF176DE86B8600E8ABE95E028649617E0AF67A4E1C67B114DCE7',
        sizeBytes: 63_456,
      },
    });
    const event = presentation();
    expect(event).toMatchObject({
      skillId: 4109,
      profile: 'arbalist-obliterate-shell',
      durationMs: 1_000,
      endCutMs: 900,
    });
    expect(event.contacts).toEqual([
      {
        attackId: 410902,
        offsetMs: 480,
        shape: 'direct',
        reachYards: 20,
        widthYards: 4,
        damageCoefficient: 11_000,
      },
      {
        attackId: 410903,
        offsetMs: 520,
        shape: 'direct',
        reachYards: 20,
        widthYards: 4,
        damageCoefficient: 11_000,
      },
    ]);
    expect(new Mir4NativeSkillPresentationPainter({ playContact() {} }, 1).start(event)).toBe(true);
  });

  it('rejects a shifted impact timeline instead of presenting a mismatched action', () => {
    const event = presentation();
    const playContact = vi.fn();
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    expect(
      painter.start({
        ...event,
        contacts: event.contacts.map((contact) => ({
          ...contact,
          offsetMs: contact.offsetMs + 100,
        })),
      }),
    ).toBe(false);
    expect(playContact).not.toHaveBeenCalled();
  });

  it('renders both contacts once at their actual times and releases the presentation slot', () => {
    const event = presentation();
    const ribbons: number[][][] = [];
    const deps: Mir4NativeSkillContactPainterDeps = {
      slashStyled: vi.fn(),
      burstAt: vi.fn(),
      ringAt: vi.fn(),
      beamRibbon: vi.fn(),
      impactRing: vi.fn(),
      groundYAt: () => 2,
      playImpactAudio: vi.fn(),
      pathRibbon(_color, _width, _life, fill) {
        const points: number[][] = [];
        const count = fill(
          Array.from({ length: 12 }, (_, index) => ({
            set(x: number, y: number, z: number) {
              points[index] = [x, y, z];
            },
          })),
        );
        ribbons.push(points.slice(0, count));
      },
    };
    const playContact = vi.fn((ev, contact, visual, index) =>
      playMir4NativeSkillContact(deps, ev, contact, visual, index),
    );
    const painter = new Mir4NativeSkillPresentationPainter({ playContact }, 1);
    expect(painter.start({ ...event, sourceFacing: Math.PI / 2 })).toBe(true);
    const pose = (_id: number, out: { x: number; y: number; z: number; facing: number }) => {
      Object.assign(out, { x: 0, y: 2, z: 0, facing: Math.PI / 2 });
      return true;
    };
    painter.update(0.479, pose);
    expect(playContact).not.toHaveBeenCalled();
    painter.update(0.001, pose);
    expect(playContact).toHaveBeenCalledTimes(1);
    painter.update(0.04, pose);
    expect(playContact).toHaveBeenCalledTimes(2);
    expect(ribbons).toHaveLength(6);
    // Both center trails follow the 20-yard line, using the current terrain height.
    for (const trail of [ribbons[1], ribbons[4]]) {
      expect(trail[0][0]).toBeCloseTo(0);
      expect(trail[11][0]).toBeCloseTo(20);
      expect(trail[0][1]).toBe(2.8);
      expect(trail[11][2]).toBeCloseTo(0);
    }
    painter.update(0.48, pose);
    expect(painter.activeCount()).toBe(0);
    expect(playContact).toHaveBeenCalledTimes(2);
  });
});
