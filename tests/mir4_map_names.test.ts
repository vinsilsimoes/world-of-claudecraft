import { afterEach, describe, expect, it } from 'vitest';
import { zoneDisplayName, zonePoiLabel, zoneWelcomeText } from '../src/ui/entity_i18n';
import { setLanguage } from '../src/ui/i18n';

afterEach(() => setLanguage('en'));

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
});
