import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), 'utf8');

describe('game profile deployment wiring', () => {
  it('builds the browser bundle with the selected Docker profile', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toContain('ARG VITE_GAME_PROFILE="woc-classic"');
    expect(dockerfile).toContain('VITE_GAME_PROFILE="$VITE_GAME_PROFILE"');
  });

  it('uses one compose value for both browser and server profiles', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toContain('VITE_GAME_PROFILE: ${GAME_PROFILE:-woc-classic}');
    expect(compose).toContain('GAME_PROFILE: ${GAME_PROFILE:-woc-classic}');
  });

  it('includes both profile variables in Turborepo cache inputs', () => {
    const turbo = JSON.parse(read('turbo.json')) as {
      globalEnv?: unknown;
    };
    expect(turbo.globalEnv).toEqual(['GAME_PROFILE', 'VITE_GAME_PROFILE']);
  });
});
