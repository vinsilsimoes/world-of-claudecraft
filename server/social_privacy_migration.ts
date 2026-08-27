// One-shot cleanup for the short-lived development build that represented a
// pending friend request as both a request row and a requester -> recipient
// friendship. The friendship edge leaked presence before the recipient had
// consented. A surviving request row identifies those provisional edges
// unambiguously.
//
// This is deliberately not part of SOCIAL_SCHEMA: ensureSchema reapplies that
// DDL on every boot, while this data rewrite must scan/write the global social
// tables only once. The runner is called under ensureSchema's transaction-wide
// advisory lock and records completion in world_state.

export const SOCIAL_PRIVACY_MIGRATION_MARKER_KEY = 'migration:social-pending-friend-privacy-v1';

export interface SocialPrivacyMigrationClient {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount?: number | null }>;
}

export interface SocialPrivacyMigrationResult {
  ran: boolean;
  removedProvisionalEdges: number;
}

const REMOVE_PROVISIONAL_EDGES_SQL = `DELETE FROM friendships f
USING friend_requests r
WHERE f.character_id = r.requester_id
  AND f.friend_id = r.recipient_id`;

const WRITE_MARKER_SQL = `INSERT INTO world_state (key, data, updated_at)
VALUES ($1, $2, now())
ON CONFLICT (key) DO NOTHING`;

export async function runSocialPrivacyMigration(
  client: SocialPrivacyMigrationClient,
): Promise<SocialPrivacyMigrationResult> {
  const marker = await client.query('SELECT 1 FROM world_state WHERE key = $1', [
    SOCIAL_PRIVACY_MIGRATION_MARKER_KEY,
  ]);
  if (marker.rows.length > 0) {
    return { ran: false, removedProvisionalEdges: 0 };
  }

  const removed = await client.query(REMOVE_PROVISIONAL_EDGES_SQL);
  const removedProvisionalEdges = Math.max(0, removed.rowCount ?? 0);
  await client.query(WRITE_MARKER_SQL, [
    SOCIAL_PRIVACY_MIGRATION_MARKER_KEY,
    JSON.stringify({ removedProvisionalEdges }),
  ]);
  return { ran: true, removedProvisionalEdges };
}
