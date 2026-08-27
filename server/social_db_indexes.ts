// Reverse foreign-key support for deleting a character who appears in other
// players' block lists. `blocks` is existing live data, so this builds through
// the post-boot CONCURRENTLY migration seam rather than transactional boot DDL.

export const BLOCKS_BLOCKED_ID_INDEX_SQL = `
CREATE INDEX CONCURRENTLY IF NOT EXISTS blocks_blocked_id
  ON blocks(blocked_id);
`;

export const BLOCKS_BLOCKED_ID_INVALID_INDEX_CHECK_SQL = `
SELECT 1
  FROM pg_index i
 WHERE i.indexrelid = to_regclass('blocks_blocked_id')
   AND NOT i.indisvalid
`;

export const BLOCKS_BLOCKED_ID_INVALID_INDEX_DROP_SQL =
  'DROP INDEX CONCURRENTLY IF EXISTS blocks_blocked_id';
