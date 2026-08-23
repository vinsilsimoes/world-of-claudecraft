import { describe, expect, it } from 'vitest';
import { MIR4_ARC_MOB_IDS } from '../src/sim/content/mir4/arc_mob_ids';
import { MIR4_MOBS } from '../src/sim/content/mir4/mobs';
import { MIR4_WORLD_ARC } from '../src/sim/content/mir4/world_arc';
import { MOBS } from '../src/sim/data';
import { resolveMobTemplate, rollCampMobLevel } from '../src/sim/mob/template';
import { Rng } from '../src/sim/rng';
import type { CampDef, MobTemplate } from '../src/sim/types';

describe('resolveMobTemplate', () => {
  it('preserves the registered classic and tutorial template instances', () => {
    const classic = Object.values(MOBS)[0];
    if (!classic) throw new Error('classic mob catalog must not be empty');
    expect(resolveMobTemplate(classic.id)).toBe(classic);
    expect(resolveMobTemplate('mir4_forest_wolf')).toBe(MIR4_MOBS.mir4_forest_wolf);
  });

  it('derives map-scoped campaign monsters with active proximity aggression', () => {
    const map = MIR4_WORLD_ARC[0];
    const mobId = MIR4_ARC_MOB_IDS[0]?.[0];
    if (!map || !mobId) throw new Error('MIR4 campaign census must not be empty');
    const templateId = `mir4_${map.mapId}_${mobId}`;

    const template = resolveMobTemplate(templateId);

    expect(template?.id).toBe(templateId);
    expect(template?.aggroRadius).toBeGreaterThanOrEqual(9);
    expect(resolveMobTemplate(templateId)).toBe(template);
  });

  it('does not invent a template for an unknown id', () => {
    expect(resolveMobTemplate('mir4_missing_creature')).toBeUndefined();
  });

  it('resolves run-scoped campaign templates through the owning runtime catalog', () => {
    const template: MobTemplate = {
      ...MIR4_MOBS.mir4_forest_wolf,
      id: 'mir4_quest_m04-q03_4_0_alfa_da_muralha',
      name: 'Alfa da Muralha',
    };
    const runtimeTemplates = new Map([[template.id, template]]);

    expect(resolveMobTemplate(template.id)).toBeUndefined();
    expect(resolveMobTemplate(template.id, runtimeTemplates)).toBe(template);
  });

  it('clamps an authored camp level band to its monster template', () => {
    const template = { ...MIR4_MOBS.mir4_forest_wolf, minLevel: 3, maxLevel: 9 };
    const camp = { minLevel: 5, maxLevel: 7 } as CampDef;
    const rng = new Rng(42);
    const levels = Array.from({ length: 32 }, () => rollCampMobLevel(template, camp, rng));

    expect(Math.min(...levels)).toBeGreaterThanOrEqual(5);
    expect(Math.max(...levels)).toBeLessThanOrEqual(7);
  });
});
