import type { Mir4ClassKey } from '../sim/types';

export interface Mir4DuelQaBootRequest {
  readonly playerClass: Mir4ClassKey;
  readonly playerName: string;
}

/** Development-only entry for the autonomous Warrior versus Elementalist arena. */
export function mir4DuelQaBootRequest(
  params: URLSearchParams,
  dev: boolean,
): Mir4DuelQaBootRequest | null {
  if (!dev || params.get('mir4DuelQa') !== '1') return null;
  return { playerClass: 'warrior', playerName: 'Warrior Duel QA' };
}
