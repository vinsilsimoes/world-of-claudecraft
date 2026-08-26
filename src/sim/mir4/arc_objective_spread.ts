// Deterministic spacing for sequential MIR4 interaction objectives. Campaign
// projection can compress several authored points into the same few world yards;
// preserve every readable anchor and arrange only each compressed cluster.

import { resolvePosition } from '../colliders';
import { PLAYER_BODY_RADIUS } from '../pathfind';
import { WORLD_SEED } from '../world_seed';

export interface Mir4ObjectivePoint {
  x: number;
  z: number;
}

export const MIR4_OBJECTIVE_MIN_SEPARATION = 4;
const MIR4_OBJECTIVE_MIN_RING_RADIUS = 5;
const MIR4_OBJECTIVE_ROTATION_ATTEMPTS = 16;
const MIR4_OBJECTIVE_RADIUS_ATTEMPTS = 12;
const MIR4_OBJECTIVE_RADIUS_STEP = 1.5;

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function distance(a: Readonly<Mir4ObjectivePoint>, b: Readonly<Mir4ObjectivePoint>): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function compressedClusters(points: readonly Mir4ObjectivePoint[]): number[][] {
  const visited = new Set<number>();
  const clusters: number[][] = [];
  for (let seed = 0; seed < points.length; seed += 1) {
    if (visited.has(seed)) continue;
    visited.add(seed);
    const cluster = [seed];
    for (let cursor = 0; cursor < cluster.length; cursor += 1) {
      const currentIndex = cluster[cursor];
      const current = currentIndex === undefined ? undefined : points[currentIndex];
      if (!current) continue;
      for (let candidateIndex = 0; candidateIndex < points.length; candidateIndex += 1) {
        if (visited.has(candidateIndex)) continue;
        const candidate = points[candidateIndex];
        if (!candidate || distance(current, candidate) >= MIR4_OBJECTIVE_MIN_SEPARATION) continue;
        visited.add(candidateIndex);
        cluster.push(candidateIndex);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

function ringCandidates(
  center: Readonly<Mir4ObjectivePoint>,
  count: number,
  radius: number,
  rotation: number,
): Mir4ObjectivePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = rotation + (index / count) * Math.PI * 2;
    return resolvePosition(
      WORLD_SEED,
      center.x + Math.sin(angle) * radius,
      center.z + Math.cos(angle) * radius,
      PLAYER_BODY_RADIUS,
    );
  });
}

function candidatesAreReadable(
  candidates: readonly Mir4ObjectivePoint[],
  result: readonly Mir4ObjectivePoint[],
  movingIndexes: ReadonlySet<number>,
): boolean {
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (!candidate) return false;
    for (let prior = 0; prior < index; prior += 1) {
      const priorCandidate = candidates[prior];
      if (priorCandidate && distance(candidate, priorCandidate) < MIR4_OBJECTIVE_MIN_SEPARATION) {
        return false;
      }
    }
    for (let fixedIndex = 0; fixedIndex < result.length; fixedIndex += 1) {
      if (movingIndexes.has(fixedIndex)) continue;
      const fixed = result[fixedIndex];
      if (fixed && distance(candidate, fixed) < MIR4_OBJECTIVE_MIN_SEPARATION) return false;
    }
  }
  return true;
}

/**
 * Preserve readable authored anchors byte-for-byte. For each connected cluster
 * compressed below four yards, preserve its first point and place only the
 * overlapping members on a compact deterministic ring. Candidate positions are
 * resolved against the shipped WoC collision geometry before acceptance.
 */
export function spreadMir4ObjectiveAnchors(
  key: string,
  points: readonly Mir4ObjectivePoint[],
): Mir4ObjectivePoint[] {
  const result = points.map((point) => ({ ...point }));
  for (const cluster of compressedClusters(points)) {
    if (cluster.length <= 1) continue;
    const anchorIndex = cluster[0];
    const center = anchorIndex === undefined ? undefined : result[anchorIndex];
    if (!center) continue;
    const movingIndexes = new Set(cluster.slice(1));
    const satellites = movingIndexes.size;
    const minimumRadius =
      satellites <= 1
        ? MIR4_OBJECTIVE_MIN_RING_RADIUS
        : MIR4_OBJECTIVE_MIN_SEPARATION / (2 * Math.sin(Math.PI / satellites)) + 0.25;
    const baseRadius = Math.max(MIR4_OBJECTIVE_MIN_RING_RADIUS, minimumRadius);
    const baseRotation = ((stableHash(`${key}:${anchorIndex}`) % 360) / 360) * Math.PI * 2;
    let accepted: Mir4ObjectivePoint[] | null = null;
    for (
      let radiusAttempt = 0;
      radiusAttempt < MIR4_OBJECTIVE_RADIUS_ATTEMPTS;
      radiusAttempt += 1
    ) {
      const radius = baseRadius + radiusAttempt * MIR4_OBJECTIVE_RADIUS_STEP;
      for (
        let rotationAttempt = 0;
        rotationAttempt < MIR4_OBJECTIVE_ROTATION_ATTEMPTS;
        rotationAttempt += 1
      ) {
        const rotation =
          baseRotation + (rotationAttempt / MIR4_OBJECTIVE_ROTATION_ATTEMPTS) * Math.PI * 2;
        const candidates = ringCandidates(center, satellites, radius, rotation);
        if (!candidatesAreReadable(candidates, result, movingIndexes)) continue;
        accepted = candidates;
        break;
      }
      if (accepted) break;
    }
    if (!accepted) continue;
    const orderedMovingIndexes = [...movingIndexes];
    for (let index = 0; index < orderedMovingIndexes.length; index += 1) {
      const targetIndex = orderedMovingIndexes[index];
      const point = accepted[index];
      if (targetIndex !== undefined && point) result[targetIndex] = point;
    }
  }
  return result;
}
