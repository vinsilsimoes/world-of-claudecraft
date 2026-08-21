import { describe, expect, it } from 'vitest';
import { isExpectedOfflineDevResponse } from '../scripts/lib/browser_dev_response_allowlist.mjs';

describe('offline browser proof response allowlist', () => {
  const origin = 'http://127.0.0.1:5174';

  it.each([
    [403, `${origin}/api/site-presence`],
    [404, `${origin}/api/project-stats`],
    [404, `${origin}/api/project-stats?cache=1`],
  ])('accepts only the known dev fallback %i %s', (status, url) => {
    expect(isExpectedOfflineDevResponse(status, url, origin)).toBe(true);
  });

  it.each([
    [404, `${origin}/assets/mount.glb`],
    [404, `${origin}/src/main.ts`],
    [500, `${origin}/api/project-stats`],
    [403, `${origin}/api/project-stats`],
    [404, 'http://example.test/api/project-stats'],
  ])('rejects every other broken response %i %s', (status, url) => {
    expect(isExpectedOfflineDevResponse(status, url, origin)).toBe(false);
  });
});
