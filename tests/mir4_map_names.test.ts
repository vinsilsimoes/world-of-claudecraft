import { afterEach, describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../src/sim/content/mir4/arc_world';
import { setActiveWorldContent } from '../src/sim/data';
import { buildMir4WocCampaignWorld } from '../src/sim/mir4/woc_comparison_world';
import { zoneDisplayName, zonePoiLabel, zoneWelcomeText } from '../src/ui/entity_i18n';
import { setLanguage } from '../src/ui/i18n';

afterEach(() => {
  setActiveWorldContent(null);
  setLanguage('en');
});

describe('MIR4 map presentation through the existing WoC map UI', () => {
  it('resolves the campaign zone, hub POI, portal POI and welcome without leaking ids', () => {
    const zoneId = 'mir4_m01-vila-do-vau';

    expect(zoneDisplayName(zoneId)).toBe('Ford Village');
    expect(zonePoiLabel(zoneId, 0)).toBe('Ford Village');
    expect(zonePoiLabel(zoneId, 1)).toBe('Ford Village Portal');
    expect(zoneWelcomeText(zoneId)).toBe('Ford Village (Act 1).');
  });

  it('keeps the classic entity localization path unchanged', () => {
    expect(zoneDisplayName('eastbrook_vale')).toBe('Eastbrook Vale');
    expect(zonePoiLabel('eastbrook_vale', 0)).not.toContain('eastbrook_vale');
  });

  it('uses authored point-of-interest names for a live MIR4 world', () => {
    setActiveWorldContent(buildMir4ArcWorld());
    const zoneId = 'mir4_m01-vila-do-vau';

    expect(zonePoiLabel(zoneId, 0)).toBe('Vila do Vau');
    expect(zonePoiLabel(zoneId, 1)).toBe('Clareira dos Rastros');
    expect(zonePoiLabel(zoneId, 2)).toBe('Campos Pisoteados');
  });

  it('uses campaign landmark names over the unchanged WoC map artwork', () => {
    const world = buildMir4WocCampaignWorld(2);
    setActiveWorldContent(world);

    expect(zonePoiLabel('willowfen', 0)).toBe('Posto das Duas Pontes');
    expect(zonePoiLabel('willowfen', 1)).toBe('Juncal das Três Chamas');
  });
});
