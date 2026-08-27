import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const game = readFileSync(new URL('../server/game.ts', import.meta.url), 'utf8');
const db = readFileSync(new URL('../server/social_db.ts', import.meta.url), 'utf8');

describe('social snapshot database pressure guard', () => {
  it('limits explicit refreshes and collapses concurrent pushes into one trailing run', () => {
    expect(game).toContain('const SOCIAL_REFRESH_MIN_INTERVAL_MS = 1_000;');
    expect(game).toContain('receivedAtMs - session.lastSocialRefreshAt');
    expect(game).toContain('private readonly socialSnapshotFlights');
    expect(game).toContain('private readonly socialSnapshotAdmission');
    expect(game).toContain('this.socialSnapshotFlights.request(charId');
    expect(game).toContain("this.socialSnapshotAdmission.acquire(firstJoin ? 'join' : 'normal')");
  });

  it('bounds incoming request reads and serializes pair mutations with short deadlines', () => {
    expect(db).toContain("SET LOCAL lock_timeout = '2s'");
    expect(db).toContain("SET LOCAL statement_timeout = '5s'");
    expect(db).toContain('ORDER BY id FOR UPDATE');
    expect(db).toContain('SELECT 1 FROM friend_requests');
    expect(db).toContain('ORDER BY created_at, requester_id');
    expect(db).toContain('LIMIT $2');
    expect(db).toContain('[recipientId, FRIEND_REQUEST_LIMIT]');
    expect(db).toContain("await client.query('ROLLBACK').catch(() => undefined)");
  });
});
