import { describe, expect, it } from 'vitest';
import { MIR4_EMPTY_MATERIALS } from '../src/sim/mir4/equipment';
import {
  buildMir4ConstitutionView,
  buildMir4InnerForceView,
  buildMir4SolitudeView,
} from '../src/ui/mir4_growth_view';

describe('MIR4 independent growth-system views', () => {
  it('projects seven Constitution branches and their exact next status values', () => {
    const view = buildMir4ConstitutionView({
      classId: 1,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 0, energy: 250 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, herbLeaf: 3, unihornSlice: 1 },
      mir4Training: {
        version: 1,
        constitution: [0, 0, 1, 0, 0, 0, 0],
        innerForce: [0, 0, 0, 0],
      },
    });

    expect(view.system).toBe('constitution');
    expect(view.energy).toBe(250);
    expect(view.branches).toHaveLength(7);
    expect(view.branches[2]).toMatchObject({
      id: 3,
      name: 'Insightful',
      level: 1,
      nextLevel: 2,
      cost: 100,
      canUpgrade: true,
      bonuses: [{ statusId: 1, current: 100, next: 200 }],
      materials: [
        {
          key: 'herbLeaf',
          name: 'Herb Leaf',
          rarity: 'common',
          source: 'herbalism',
          owned: 3,
          required: 3,
          enough: true,
        },
        {
          key: 'unihornSlice',
          name: 'Unihorn Slice',
          rarity: 'common',
          source: 'hunting',
          owned: 1,
          required: 1,
          enough: true,
        },
      ],
    });
  });

  it('projects Inner Force as a separate four-channel system and honors Energy admission', () => {
    const view = buildMir4InnerForceView({
      classId: 2,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 0, energy: 99 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, greaterYangPill: 1 },
    });

    expect(view.system).toBe('innerForce');
    expect(view.manualName).toBe('Muscle Strength Manual');
    expect(view.branches).toHaveLength(4);
    expect(view.branches[0]).toMatchObject({
      name: 'Sky Palace',
      level: 0,
      canUpgrade: false,
      bonuses: [{ statusId: 22, current: 0, next: 5 }],
      materials: [
        {
          key: 'greaterYangPill',
          name: 'Greater Yang Pill',
          rarity: 'common',
          source: 'crafting',
          owned: 1,
          required: 1,
          enough: true,
        },
      ],
    });
  });

  it('blocks a branch with a visible material shortage even when Energy is sufficient', () => {
    const view = buildMir4ConstitutionView({
      classId: 1,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 0, energy: 500 },
      mir4Materials: { ...MIR4_EMPTY_MATERIALS, herbLeaf: 2, reishi: 1 },
    });
    expect(view.branches[0]).toMatchObject({
      canUpgrade: false,
      materials: [
        { key: 'herbLeaf', owned: 2, required: 2, enough: true },
        { key: 'reishi', owned: 1, required: 2, enough: false },
      ],
    });
  });

  it('projects Solitude Training with level gates, Darksteel and ranked materials', () => {
    const view = buildMir4SolitudeView({
      classId: 1,
      playerLevel: 70,
      ultimateGauge: 0,
      mir4Currencies: { darksteel: 1_000, energy: 0 },
      mir4Materials: {
        ...MIR4_EMPTY_MATERIALS,
        noirsoulHerbRare: 1,
        unihornRare: 5,
      },
    });

    expect(view.system).toBe('solitude');
    expect(view.manualName).toBe('Conception Vessel');
    expect(view.darksteel).toBe(1_000);
    expect(view.branches).toHaveLength(8);
    expect(view.branches[0]).toMatchObject({
      level: 0,
      unlockLevel: 70,
      locked: false,
      cost: 1_000,
      successBps: 7_000,
      criticalFailBps: 0,
      canUpgrade: true,
      materials: [
        { key: 'noirsoulHerbRare', owned: 1, required: 1, enough: true },
        { key: 'unihornRare', owned: 5, required: 5, enough: true },
      ],
    });
    expect(view.branches[4]).toMatchObject({ unlockLevel: 75, locked: true, canUpgrade: false });
  });
});
