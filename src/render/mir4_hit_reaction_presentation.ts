import type { SimEvent } from '../sim/types';
import type { CharacterVisual } from './characters/visual';

type Mir4HitReactionEvent = Extract<SimEvent, { type: 'mir4HitReaction' }>;

/** Play one server-admitted native reaction and report whether a body accepted it. */
export function playMir4HitReaction(
  visual: CharacterVisual | null,
  event: Mir4HitReactionEvent,
): boolean {
  if (!visual) return false;
  if (event.stance === 'down-02' || event.stance === 'down-03') {
    visual.playMir4HitReaction(
      event.stance,
      event.durationMs,
      event.moveDurationMs,
      event.heightYards,
    );
  } else {
    visual.playMir4HitReaction(event.stance, event.durationMs);
  }
  return true;
}
