import { describe, expect, it } from 'vitest';
import {
  assertCharacterStateGameProfile,
  assertGameProfileCharacterRoster,
  ensureGameProfilePersistence,
  GAME_PROFILE_GUARD_SCHEMA,
  migrateMir4SaveNamespaceV1ToV2,
} from '../../server/game_profile_db';

class FakeClient {
  stored: { game_profile: unknown; save_namespace: unknown } | null = null;
  legacy = false;
  activeLeases: unknown = false;
  readonly calls: { sql: string; values?: readonly unknown[] }[] = [];

  async query(
    sql: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.calls.push({ sql, values });
    if (sql.includes('FROM game_profile_guard')) {
      return { rows: this.stored ? [{ ...this.stored }] : [], rowCount: this.stored ? 1 : 0 };
    }
    if (sql.includes('has_legacy_state')) {
      return { rows: [{ has_legacy_state: this.legacy }], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO game_profile_guard') && this.stored === null) {
      this.stored = {
        game_profile: values?.[0],
        save_namespace: values?.[1],
      };
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('GROUP BY class')) {
      return { rows: [{ class: 'warrior', count: 1 }], rowCount: 1 };
    }
    if (sql.includes('SELECT EXISTS') && sql.includes('FROM character_leases')) {
      return this.activeLeases === undefined
        ? { rows: [], rowCount: 0 }
        : { rows: [{ has_active: this.activeLeases }], rowCount: 1 };
    }
    if (sql.includes('UPDATE game_profile_guard')) {
      this.stored = { game_profile: values?.[1], save_namespace: values?.[0] };
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
}

describe('game profile database persistence guard', () => {
  it('rejects a character blob from another or unknown profile', () => {
    expect(() =>
      assertCharacterStateGameProfile({ gameProfile: 'mir4-gameplay-port' }, 'woc-classic', 'save'),
    ).toThrow('save belongs to game profile mir4-gameplay-port, not woc-classic');
    expect(() =>
      assertCharacterStateGameProfile({ gameProfile: 'future-profile' }, 'woc-classic'),
    ).toThrow('character state belongs to game profile unknown, not woc-classic');
    expect(() => assertCharacterStateGameProfile(null, 'woc-classic')).not.toThrow();
  });

  it('binds an empty database to the requested MIR4 namespace', async () => {
    const client = new FakeClient();
    await ensureGameProfilePersistence(client, 'mir4-gameplay-port');
    expect(client.stored).toEqual({
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v2',
    });
    expect(client.calls[0]?.sql).toBe(GAME_PROFILE_GUARD_SCHEMA);
  });

  it('adopts any pre-guard WoC database as classic and refuses MIR4 boot', async () => {
    const client = new FakeClient();
    client.legacy = true;
    await expect(ensureGameProfilePersistence(client, 'mir4-gameplay-port')).rejects.toThrow(
      'database belongs to game profile woc-classic',
    );
    expect(client.stored).toEqual({
      game_profile: 'woc-classic',
      save_namespace: 'woc-classic-v1',
    });
  });

  it('accepts the matching stored profile and rejects a different process profile', async () => {
    const client = new FakeClient();
    client.stored = {
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v2',
    };
    await expect(
      ensureGameProfilePersistence(client, 'mir4-gameplay-port'),
    ).resolves.toBeUndefined();
    await expect(ensureGameProfilePersistence(client, 'woc-classic')).rejects.toThrow(
      'database belongs to game profile mir4-gameplay-port',
    );
  });

  it('fails closed on unknown profiles and tampered namespace versions', async () => {
    const unknown = new FakeClient();
    unknown.stored = {
      game_profile: 'future-profile',
      save_namespace: 'future-profile-v1',
    };
    await expect(ensureGameProfilePersistence(unknown, 'woc-classic')).rejects.toThrow(
      'guard is missing or invalid',
    );

    const tampered = new FakeClient();
    tampered.stored = {
      game_profile: 'woc-classic',
      save_namespace: 'mir4-gameplay-port-v2',
    };
    await expect(ensureGameProfilePersistence(tampered, 'woc-classic')).rejects.toThrow(
      'persistence namespace mismatch',
    );

    const staleMir4 = new FakeClient();
    staleMir4.stored = {
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v1',
    };
    await expect(ensureGameProfilePersistence(staleMir4, 'mir4-gameplay-port')).rejects.toThrow(
      'persistence namespace mismatch',
    );
  });

  it('preflights only aggregate class counts and rejects cross-profile rows', async () => {
    const valid = new FakeClient();
    valid.query = async (sql: string) => ({
      rows: sql.includes('GROUP BY class')
        ? [
            { class: 'warrior', count: 3 },
            { class: 'elementalist', count: 2 },
          ]
        : [],
      rowCount: 2,
    });
    await expect(
      assertGameProfileCharacterRoster(valid, 'mir4-gameplay-port'),
    ).resolves.toBeUndefined();

    const invalid = new FakeClient();
    invalid.query = async () => ({ rows: [{ class: 'paladin', count: 4 }], rowCount: 1 });
    await expect(assertGameProfileCharacterRoster(invalid, 'mir4-gameplay-port')).rejects.toThrow(
      'paladin=4',
    );
    expect(invalid.calls).toEqual([]);
  });

  it('migrates only the exact MIR4 v1 guard after the roster preflight', async () => {
    const client = new FakeClient();
    client.stored = {
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v1',
    };
    await migrateMir4SaveNamespaceV1ToV2(client);
    expect(client.stored.save_namespace).toBe('mir4-gameplay-port-v2');
    expect(client.calls.map((call) => call.sql)).toEqual([
      expect.stringContaining('FROM game_profile_guard'),
      'LOCK TABLE character_leases IN SHARE MODE',
      expect.stringContaining('SELECT EXISTS'),
      expect.stringContaining('GROUP BY class'),
      expect.stringContaining('UPDATE game_profile_guard'),
    ]);
    const leaseCheck = client.calls.find((call) => call.sql.includes('SELECT EXISTS'))?.sql;
    expect(leaseCheck).toContain('expires_at >= now()');
    expect(client.calls.some((call) => call.sql.startsWith('DELETE FROM character_leases'))).toBe(
      false,
    );
  });

  it('refuses namespace migration while any live character lease exists', async () => {
    const client = new FakeClient();
    client.stored = {
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v1',
    };
    client.activeLeases = true;

    await expect(migrateMir4SaveNamespaceV1ToV2(client)).rejects.toThrow(
      'requires zero active character leases',
    );
    expect(client.calls.some((call) => call.sql.includes('UPDATE game_profile_guard'))).toBe(false);
  });

  it.each([undefined, null, 0, 'false'])(
    'fails closed on malformed lease preflight %j',
    async (value) => {
      const client = new FakeClient();
      client.stored = {
        game_profile: 'mir4-gameplay-port',
        save_namespace: 'mir4-gameplay-port-v1',
      };
      client.activeLeases = value;

      await expect(migrateMir4SaveNamespaceV1ToV2(client)).rejects.toThrow(
        'character lease preflight returned an invalid result',
      );
      expect(client.calls.some((call) => call.sql.includes('GROUP BY class'))).toBe(false);
      expect(client.calls.some((call) => call.sql.includes('UPDATE game_profile_guard'))).toBe(
        false,
      );
    },
  );

  it('refuses namespace migration from any non-v1 guard', async () => {
    const client = new FakeClient();
    client.stored = {
      game_profile: 'mir4-gameplay-port',
      save_namespace: 'mir4-gameplay-port-v2',
    };
    await expect(migrateMir4SaveNamespaceV1ToV2(client)).rejects.toThrow(
      'expected MIR4 v1 persistence guard',
    );
    expect(client.calls).toHaveLength(1);
  });
});
