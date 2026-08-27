// Global admission for DB-backed social snapshots. One snapshot fans out into
// five parallel pool reads, so only one may hydrate at a time against the
// default ten-client pool. Waiting happens here, before any pool checkout, and
// is bounded by the realm's 5,000-player ceiling.

export const SOCIAL_SNAPSHOT_MAX_CONCURRENT = 1;
export const SOCIAL_SNAPSHOT_MAX_QUEUED = 5_000;

export type SocialSnapshotPriority = 'join' | 'normal';
export type SocialSnapshotRelease = () => void;

export class SocialSnapshotAdmission {
  private active = 0;
  private readonly joinWaiters: Array<(release: SocialSnapshotRelease) => void> = [];
  private readonly normalWaiters: Array<(release: SocialSnapshotRelease) => void> = [];

  constructor(
    private readonly maxConcurrent = SOCIAL_SNAPSHOT_MAX_CONCURRENT,
    private readonly maxQueued = SOCIAL_SNAPSHOT_MAX_QUEUED,
  ) {}

  async acquire(priority: SocialSnapshotPriority): Promise<SocialSnapshotRelease | null> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return this.releaseOnce();
    }
    if (this.queued >= this.maxQueued) return null;
    return new Promise<SocialSnapshotRelease>((resolve) => {
      (priority === 'join' ? this.joinWaiters : this.normalWaiters).push(resolve);
    });
  }

  get inFlight(): number {
    return this.active;
  }

  get queued(): number {
    return this.joinWaiters.length + this.normalWaiters.length;
  }

  private releaseOnce(): SocialSnapshotRelease {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.joinWaiters.shift() ?? this.normalWaiters.shift();
      if (next) next(this.releaseOnce());
      else this.active--;
    };
  }
}

/** One active task per key with at most one trailing rerun. */
export class SocialSnapshotFlights<Key> {
  private readonly active = new Map<Key, Promise<void>>();
  private readonly trailing = new Set<Key>();

  async request(key: Key, work: () => Promise<void>): Promise<void> {
    const current = this.active.get(key);
    if (current) {
      this.trailing.add(key);
      await current;
      return;
    }
    const flight = this.run(key, work).finally(() => {
      this.active.delete(key);
      this.trailing.delete(key);
    });
    this.active.set(key, flight);
    await flight;
  }

  private async run(key: Key, work: () => Promise<void>): Promise<void> {
    do {
      this.trailing.delete(key);
      await work();
    } while (this.trailing.delete(key));
  }
}
