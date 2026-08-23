// Canonical identity for authored campaign combat targets. Runtime template
// ids and kill-credit matching must pass through the same accent-insensitive
// slug so Portuguese display names remain stable while receipts stay ASCII.

/** Lowercase, accent-insensitive and idempotent campaign target slug. */
export function mir4ArcTargetSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
