import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../src/render/renderer.ts', import.meta.url), 'utf8');

function method(startToken: string, endToken: string): string {
  const start = source.indexOf(startToken);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(endToken, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('renderer active WorldContent seam', () => {
  it('streams and evicts zones from the configured world instead of the classic fallback', () => {
    const queue = method(
      'private queueVisibleZonePrepares(',
      '\n  // Thin consumer of zone_eviction_core.ts',
    );
    expect(queue).toContain(
      'zonesWithinStreamingHorizon(\n      this.sim.cfg.world?.zones ?? ZONES,',
    );

    const eviction = method(
      'private evictFarZoneIfConstrained(',
      '\n  private pumpVisibleZonePrepareQueue(',
    );
    expect(eviction).toContain(
      'zonesEligibleForEviction(\n      this.sim.cfg.world?.zones ?? ZONES,',
    );
    expect(eviction).toContain('(this.sim.cfg.world?.zones ?? ZONES).find((z) => z.id === zoneId)');
  });

  it('rebuilds terrain and water residency from the configured world', () => {
    const terrain = method('  rebuildTerrain(', '\n  /**\n   * Rebake the macro normal');
    expect(terrain).toContain('const worldZones = this.sim.cfg.world?.zones ?? ZONES;');
    expect(terrain).toContain(
      'const residentZones = worldZones.filter((zone) => this.preparedZones.has(zone.id));',
    );

    const water = method('  rebuildWaterBodies(', '\n  /**\n   * Project the editor brush ring');
    expect(water).toContain('for (const zone of this.sim.cfg.world?.zones ?? ZONES)');
  });
});
