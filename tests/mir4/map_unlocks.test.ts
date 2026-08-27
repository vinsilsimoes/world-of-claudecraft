import { describe, expect, it } from 'vitest';
import type { Mir4ArcQuestProgress } from '../../src/sim/mir4/arc_quests';
import {
  isMir4CampaignMapUnlocked,
  mir4PortalDestinationMapId,
} from '../../src/sim/mir4/map_unlocks';

const progress = (questId: string): Mir4ArcQuestProgress => ({
  questId,
  stageIndex: 0,
  stageProgress: 0,
  state: 'active',
});

describe('MIR4 campaign map unlocks', () => {
  it('keeps the starting map open and unlocks a later map as soon as its main quest is accepted', () => {
    expect(isMir4CampaignMapUnlocked('m01-vila-do-vau', undefined)).toBe(true);
    expect(isMir4CampaignMapUnlocked('m02-trilha-dos-juncos', undefined)).toBe(false);
    expect(
      isMir4CampaignMapUnlocked('m02-trilha-dos-juncos', {
        'M02-Q01': progress('M02-Q01'),
      }),
    ).toBe(true);
  });

  it('resolves native and WoC portal destinations in both travel directions', () => {
    expect(
      mir4PortalDestinationMapId('mir4_m01-vila-do-vau_to_m02-trilha-dos-juncos', 'a-to-b'),
    ).toBe('m02-trilha-dos-juncos');
    expect(mir4PortalDestinationMapId('mir4_woc_m02_m03_garden_waypoint', 'b-to-a')).toBe(
      'm02-trilha-dos-juncos',
    );
    expect(mir4PortalDestinationMapId('mir4_woc_tutorial_m09_waypoint', 'b-to-a')).toBe(
      'm09-pantano-das-lanternas',
    );
  });
});
