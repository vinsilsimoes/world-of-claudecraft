import { describe, expect, it, vi } from 'vitest';
import {
  runSocialPrivacyMigration,
  SOCIAL_PRIVACY_MIGRATION_MARKER_KEY,
  type SocialPrivacyMigrationClient,
} from '../server/social_privacy_migration';

function clientWith(options: { markerExists?: boolean; removed?: number } = {}) {
  const calls: Array<{ text: string; values?: unknown[] }> = [];
  const query = vi.fn(async (text: string, values?: unknown[]) => {
    calls.push({ text, values });
    if (text.startsWith('SELECT 1 FROM world_state')) {
      return {
        rows: options.markerExists ? [{ '?column?': 1 }] : [],
        rowCount: options.markerExists ? 1 : 0,
      };
    }
    if (text.startsWith('DELETE FROM friendships')) {
      return { rows: [], rowCount: options.removed ?? 0 };
    }
    return { rows: [], rowCount: 1 };
  });
  return { calls, query, client: { query } as SocialPrivacyMigrationClient };
}

describe('one-shot social privacy migration', () => {
  it('removes provisional presence edges and records a versioned marker once', async () => {
    const h = clientWith({ removed: 7 });

    await expect(runSocialPrivacyMigration(h.client)).resolves.toEqual({
      ran: true,
      removedProvisionalEdges: 7,
    });

    expect(h.calls).toHaveLength(3);
    expect(h.calls[0]).toEqual({
      text: 'SELECT 1 FROM world_state WHERE key = $1',
      values: [SOCIAL_PRIVACY_MIGRATION_MARKER_KEY],
    });
    expect(h.calls[1].text).toContain('DELETE FROM friendships f');
    expect(h.calls[1].text).toContain('USING friend_requests r');
    expect(h.calls[2].text).toContain('INSERT INTO world_state');
    expect(h.calls[2].text).toContain('ON CONFLICT (key) DO NOTHING');
    expect(h.calls[2].values).toEqual([
      SOCIAL_PRIVACY_MIGRATION_MARKER_KEY,
      JSON.stringify({ removedProvisionalEdges: 7 }),
    ]);
  });

  it('does only the indexed marker probe after the migration has completed', async () => {
    const h = clientWith({ markerExists: true, removed: 99 });

    await expect(runSocialPrivacyMigration(h.client)).resolves.toEqual({
      ran: false,
      removedProvisionalEdges: 0,
    });

    expect(h.calls).toHaveLength(1);
    expect(h.calls[0].text).toBe('SELECT 1 FROM world_state WHERE key = $1');
  });
});
