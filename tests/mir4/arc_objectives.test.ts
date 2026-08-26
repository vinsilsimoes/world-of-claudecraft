import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  questObjectPreloadInternalsForTest,
  questObjectPreloadUrlsForProfile,
} from '../../src/render/quest_objects';
import {
  MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS,
  mir4ArcObjectiveObjectItemId,
} from '../../src/sim/mir4/arc_objectives';
import { MIR4_ARC_INTERACT_STAGE_KINDS } from '../../src/sim/mir4/arc_stage_kinds';
import { MIR4_ENERGY_SITE_ITEM_ID } from '../../src/sim/mir4/energy';

describe('MIR4 physical campaign objectives', () => {
  it('maps every interaction verb to a distinct native WoC object family', () => {
    const mappedKinds = [...MIR4_ARC_INTERACT_STAGE_KINDS].map(
      (kind) => [kind, mir4ArcObjectiveObjectItemId(kind)] as const,
    );

    expect(mappedKinds.every(([, itemId]) => itemId.startsWith('mir4_object_'))).toBe(true);
    expect(new Set(mappedKinds.map(([, itemId]) => itemId)).size).toBeGreaterThanOrEqual(9);
    expect(Object.keys(MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS).sort()).toEqual(
      [...MIR4_ARC_INTERACT_STAGE_KINDS].sort(),
    );
    expect(MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS).toMatchObject({
      'activate-sequence': 'mir4_object_device_cog',
      'discover-shortcut': 'mir4_object_shortcut_key',
      'discover-waypoint': 'mir4_object_waypoint_crystal',
      'gather-resource-patches': 'mir4_object_gather_patch',
      'inspect-clues': 'mir4_object_clue_magnifier',
      'lore-resolution': 'mir4_object_lore_journal',
      'reconstruct-evidence': 'mir4_object_evidence_ledger',
      'repair-public-anchor': 'mir4_object_repair_wrench',
    });
  });

  it('backs every objective family with a committed WoC GLB', () => {
    const urls = questObjectPreloadInternalsForTest.questObjectUrl;
    for (const itemId of new Set(Object.values(MIR4_ARC_OBJECTIVE_OBJECT_ITEM_IDS))) {
      const url = urls[itemId];
      expect(url, itemId).toBeTypeOf('string');
      const file = fileURLToPath(new URL(`../../public${url}`, import.meta.url));
      expect(existsSync(file), url).toBe(true);
    }
  });

  it('renders Energy with the existing WoC hollow-gate crystal', () => {
    const urls = questObjectPreloadInternalsForTest.questObjectUrl;
    expect(urls[MIR4_ENERGY_SITE_ITEM_ID]).toBe('/models/props/hollow_gate_crystal.glb');
    expect(urls[MIR4_ENERGY_SITE_ITEM_ID]).toBe(urls.mir4_object_waypoint_crystal);
    expect(
      existsSync(
        fileURLToPath(new URL(`../../public${urls[MIR4_ENERGY_SITE_ITEM_ID]}`, import.meta.url)),
      ),
    ).toBe(true);
  });

  it('preloads MIR4-only props only for the MIR4 profile', () => {
    const classic = questObjectPreloadUrlsForProfile('woc-classic');
    const mir4 = questObjectPreloadUrlsForProfile('mir4-gameplay-port');

    expect(classic).not.toContain('/models/resources/parts_cog.glb');
    expect(mir4).toContain('/models/resources/parts_cog.glb');
    expect(mir4.length).toBeGreaterThan(classic.length);
    expect(classic).toContain('/models/quest/supply_crate.glb');
  });
});
