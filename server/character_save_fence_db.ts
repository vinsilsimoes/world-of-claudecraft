import type { QueryResult } from 'pg';

/**
 * Build the one character UPDATE shared by the plain, market escrow, and guild
 * bank save paths. The lease fence rides the write itself so takeover cannot
 * race a separate pre-check. Both the save and lease acquisition lock the
 * character before its lease, preserving one global row-lock order.
 */
export function characterUpdateStatement(
  characterId: number,
  level: number,
  stateJson: string,
  leaseNonce: string | undefined,
  leaseHolder: string,
  leaseTtlSeconds: number,
): { text: string; values: unknown[] } {
  return leaseNonce === undefined
    ? {
        text: 'UPDATE characters SET level = $2, state = $3, updated_at = now() WHERE id = $1',
        values: [characterId, level, stateJson],
      }
    : {
        text: `WITH locked_character AS MATERIALIZED (
               SELECT id
                 FROM characters
                WHERE id = $1
                FOR UPDATE
             ),
             lock_time AS MATERIALIZED (
               SELECT locked_character.id, clock_timestamp() AS checked_at
                 FROM locked_character
             ),
             locked_lease AS MATERIALIZED (
               SELECT lease.character_id, lock_time.checked_at
                 FROM character_leases AS lease
                 JOIN lock_time ON lock_time.id = lease.character_id
                WHERE lease.holder = $4 AND lease.nonce = $5
                  AND lease.expires_at >= lock_time.checked_at
                FOR UPDATE OF lease
             ),
             valid_lease AS MATERIALIZED (
               UPDATE character_leases AS lease
                 SET heartbeat_at = clock_timestamp(),
                      expires_at = clock_timestamp() + make_interval(secs => $6)
                FROM locked_lease
               WHERE lease.character_id = locked_lease.character_id
                 AND lease.holder = $4 AND lease.nonce = $5
                 AND lease.expires_at >= locked_lease.checked_at
               RETURNING lease.character_id
             )
             UPDATE characters AS character
                SET level = $2, state = $3, updated_at = now()
               FROM locked_character
              WHERE character.id = locked_character.id
               AND EXISTS (SELECT 1 FROM valid_lease)`,
        values: [characterId, level, stateJson, leaseHolder, leaseNonce, leaseTtlSeconds],
      };
}

/**
 * Escrow saves retain both row locks while executing several bounded
 * statements. Renew the exact holder and nonce immediately before COMMIT so
 * the lease cannot already be expired when a slow transaction becomes visible.
 */
export async function renewCharacterLeaseBeforeCommit(
  client: { query: (text: string, values?: unknown[]) => Promise<QueryResult> },
  characterId: number,
  leaseNonce: string | undefined,
  leaseHolder: string,
  leaseTtlSeconds: number,
): Promise<boolean> {
  if (leaseNonce === undefined) return true;
  const result = await client.query(
    `UPDATE character_leases
        SET heartbeat_at = clock_timestamp(),
            expires_at = clock_timestamp() + make_interval(secs => $4)
      WHERE character_id = $1 AND holder = $2 AND nonce = $3`,
    [characterId, leaseHolder, leaseNonce, leaseTtlSeconds],
  );
  return (result.rowCount ?? 0) === 1;
}
