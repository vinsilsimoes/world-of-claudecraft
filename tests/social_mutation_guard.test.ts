import { describe, expect, it } from 'vitest';
import {
  consumeSocialMutationToken,
  createSocialMutationGuard,
  SOCIAL_MUTATION_BURST,
  SOCIAL_MUTATION_REFILL_PER_SECOND,
} from '../server/social_mutation_guard';

describe('persistent social mutation guard', () => {
  it('uses a human-safe burst with one operation per second sustained', () => {
    expect(SOCIAL_MUTATION_BURST).toBe(10);
    expect(SOCIAL_MUTATION_REFILL_PER_SECOND).toBe(1);
  });

  it('allows exactly one burst and spends nothing on refusal', () => {
    const state = createSocialMutationGuard(100);
    for (let index = 0; index < SOCIAL_MUTATION_BURST; index++) {
      expect(consumeSocialMutationToken(state, 100)).toBe(true);
    }
    const drained = { ...state };
    expect(consumeSocialMutationToken(state, 100)).toBe(false);
    expect(state).toEqual(drained);
  });

  it('refills at one token per second, caps idle refill, and clamps clock rollback', () => {
    const state = createSocialMutationGuard(100);
    for (let index = 0; index < SOCIAL_MUTATION_BURST; index++) {
      consumeSocialMutationToken(state, 100);
    }
    expect(consumeSocialMutationToken(state, 99)).toBe(false);
    expect(consumeSocialMutationToken(state, 100.5)).toBe(false);
    expect(consumeSocialMutationToken(state, 101)).toBe(true);
    for (let index = 0; index < SOCIAL_MUTATION_BURST; index++) {
      expect(consumeSocialMutationToken(state, 10_000)).toBe(true);
    }
    expect(consumeSocialMutationToken(state, 10_000)).toBe(false);
  });
});
