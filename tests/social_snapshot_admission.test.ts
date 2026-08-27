import { describe, expect, it, vi } from 'vitest';
import {
  SocialSnapshotAdmission,
  SocialSnapshotFlights,
} from '../server/social_snapshot_admission';

describe('social snapshot admission', () => {
  it('admits one snapshot, bounds the queue, and prioritizes joins', async () => {
    const admission = new SocialSnapshotAdmission(1, 2);
    const first = await admission.acquire('normal');
    const normal = admission.acquire('normal');
    const join = admission.acquire('join');
    expect(admission.inFlight).toBe(1);
    expect(admission.queued).toBe(2);
    await expect(admission.acquire('normal')).resolves.toBeNull();

    first?.();
    const joinRelease = await join;
    expect(admission.inFlight).toBe(1);
    expect(admission.queued).toBe(1);
    joinRelease?.();
    const normalRelease = await normal;
    expect(admission.inFlight).toBe(1);
    normalRelease?.();
    expect(admission.inFlight).toBe(0);
    expect(admission.queued).toBe(0);
  });

  it('coalesces concurrent requests for one character into one trailing rerun', async () => {
    const flights = new SocialSnapshotFlights<number>();
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let runs = 0;
    const work = vi.fn(async () => {
      runs++;
      if (runs === 1) await firstGate;
    });

    const first = flights.request(7, work);
    await vi.waitFor(() => expect(work).toHaveBeenCalledTimes(1));
    const second = flights.request(7, work);
    const third = flights.request(7, work);
    releaseFirst();
    await Promise.all([first, second, third]);

    expect(work).toHaveBeenCalledTimes(2);
  });
});
