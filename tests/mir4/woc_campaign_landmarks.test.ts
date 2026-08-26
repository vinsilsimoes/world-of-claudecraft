import { describe, expect, it } from 'vitest';
import { buildMir4ArcWorld } from '../../src/sim/content/mir4/arc_world';
import { projectMir4ArcPoint } from '../../src/sim/content/mir4/arc_world_layout';
import { BUILTIN_WORLD } from '../../src/sim/data';
import { buildMir4WocCampaignZones } from '../../src/sim/mir4/woc_campaign_landmarks';
import { buildMir4WocCampaignWorld } from '../../src/sim/mir4/woc_comparison_world';

describe('MIR4 campaign landmarks on WoC cartography', () => {
  it('projects campaign names without mutating the original zone geometry or POIs', () => {
    const world = buildMir4WocCampaignWorld(2);
    const zones = buildMir4WocCampaignZones(
      BUILTIN_WORLD.zones,
      buildMir4ArcWorld(2).zones,
      world.mir4ArcMapProjections ?? [],
    );
    const projected = zones.find((zone) => zone.id === 'willowfen');
    const original = BUILTIN_WORLD.zones.find((zone) => zone.id === 'willowfen');
    if (!projected || !original) throw new Error('Willowfen is required');

    expect(projected).not.toBe(original);
    expect({ ...projected, pois: original.pois }).toEqual(original);
    expect(projected.pois.map((poi) => poi.label)).toContain('Juncal das Três Chamas');
    expect(original.pois.map((poi) => poi.label)).toContain('The Amberfen Steps');
  });

  it('keeps shared-biome campaign landmark identities unique', () => {
    const world = buildMir4WocCampaignWorld(10);
    const willowfen = world.zones.find((zone) => zone.id === 'willowfen');
    if (!willowfen) throw new Error('Willowfen is required');

    const ids = willowfen.pois.map((poi) => poi.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(willowfen.pois.map((poi) => poi.label)).toEqual(
      expect.arrayContaining(['Juncal das Três Chamas', 'Posto das Tábuas']),
    );
  });

  it('projects every authored landmark from all 20 campaign chapters', () => {
    const campaign = buildMir4ArcWorld(20);
    const world = buildMir4WocCampaignWorld(20);
    const projections = world.mir4ArcMapProjections ?? [];

    expect(projections).toHaveLength(20);
    for (const projection of projections) {
      const source = campaign.zones.find((zone) => zone.id === `mir4_${projection.mapId}`);
      const target = world.zones.find((zone) => zone.id === projection.targetZoneId);
      if (!source || !target)
        throw new Error(`Missing campaign projection for ${projection.mapId}`);

      for (const poi of source.pois) {
        const projected = projectMir4ArcPoint(projections, projection.mapId, poi);
        expect(
          target.pois.some(
            (candidate) =>
              candidate.label === poi.label &&
              candidate.x === projected.x &&
              candidate.z === projected.z,
          ),
        ).toBe(true);
      }
    }

    const eastbrook = world.zones.find((zone) => zone.id === 'eastbrook_vale');
    expect(eastbrook?.pois.some((poi) => poi.id === 'm01-poi-vila-do-vau')).toBe(true);
  });

  it('seats the M17 patrol giver on the accessible edge of the aurora camp', () => {
    const world = buildMir4WocCampaignWorld();
    const yrsa = world.npcs['m17-tundra-dos-uivos-ferreira-yrsa'];

    expect(yrsa?.pos).toEqual({ x: 27, z: 1738 });
  });

  it('offers the M17 strengthening quest before the Glacier Tarn danger gate', () => {
    const world = buildMir4WocCampaignWorld();
    const ulf = world.npcs['m17-tundra-dos-uivos-rastreador-ulf'];
    const edda = world.npcs['m17-tundra-dos-uivos-edda-aurora'];

    expect(ulf?.pos).toEqual({ x: 40, z: 1700 });
    expect(edda?.pos).toEqual({ x: 32, z: 1720 });
  });

  it('seats Abade Lumen outside the Icemantle lodge collision', () => {
    const world = buildMir4WocCampaignWorld();
    const astrid = world.npcs['m18-passo-do-jarl-astrid-aurora'];
    const lumen = world.npcs['m18-passo-do-jarl-abade-lumen'];
    const svala = world.npcs['m18-passo-do-jarl-ferreira-svala'];

    expect(astrid?.pos).toEqual({ x: -10, z: 1580 });
    expect(lumen?.pos).toEqual({ x: 0, z: 1590 });
    expect(svala?.pos).toEqual({ x: -120, z: 1860 });
  });
});
