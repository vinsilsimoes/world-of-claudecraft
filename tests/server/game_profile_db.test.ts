import { describe, expect, it } from 'vitest';
import {
  assertCharacterStateGameProfile,
  ensureGameProfilePersistence,
  GAME_PROFILE_GUARD_SCHEMA,
} from '../../server/game_profile_db';

class FakeClient {
  stored: { game_profile: unknown; save_namespace: unknown } | null = null;
  legacy = false;
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
      save_namespace: 'mir4-gameplay-port-v1',
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
      save_namespace: 'mir4-gameplay-port-v1',
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
      save_namespace: 'mir4-gameplay-port-v1',
    };
    await expect(ensureGameProfilePersistence(tampered, 'woc-classic')).rejects.toThrow(
      'persistence namespace mismatch',
    );
  });
});
