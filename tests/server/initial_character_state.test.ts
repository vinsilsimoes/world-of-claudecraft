import { describe, expect, it } from 'vitest';
import { initialCharacterState } from '../../server/initial_character_state';
import { Sim } from '../../src/sim/sim';

describe('initial character state profile stamp', () => {
  it('keeps classic creation saves unmarked for backward compatibility', () => {
    const state = initialCharacterState('warrior', 'Classicnew', 2, 'woc-classic');
    expect(state.skin).toBe(2);
    expect(Object.hasOwn(state, 'gameProfile')).toBe(false);
  });

  it('stamps MIR4 creation saves before they can reach Postgres', () => {
    const state = initialCharacterState('warrior', 'Mirfournew', 3, 'mir4-gameplay-port');
    expect(state.skin).toBe(3);
    expect(state.gameProfile).toBe('mir4-gameplay-port');
  });

  it.each([
    ['warrior', 1],
    ['elementalist', 2],
    ['taoist', 3],
    ['arbalist', 4],
    ['lancer', 5],
  ] as const)('creates the native MIR4 identity for %s', (cls, classId) => {
    const state = initialCharacterState(cls, 'Mirfournew', 0, 'mir4-gameplay-port');
    expect(state.gameProfile).toBe('mir4-gameplay-port');
    expect(state.hp).toBeGreaterThan(100);
    expect(state.resource).toBeGreaterThan(0);

    const sim = new Sim({
      seed: 1,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      noPlayer: true,
    });
    const pid = sim.addPlayer(cls, 'Mirfournew', { state });
    expect(sim.entities.get(pid)?.mir4?.classId).toBe(classId);
  });

  it('provisions every new MIR4 character with 50 health and 50 mana potions', () => {
    const state = initialCharacterState('warrior', 'Provisioned', 0, 'mir4-gameplay-port');
    const stacks = (itemId: string) => state.inventory.filter((slot) => slot.itemId === itemId);

    expect(stacks('minor_healing_potion').map((slot) => slot.count)).toEqual([50]);
    expect(stacks('minor_mana_potion').map((slot) => slot.count)).toEqual([50]);
  });

  it('does not add MIR4 starter potions to classic characters', () => {
    const state = initialCharacterState('warrior', 'Classicbags', 0, 'woc-classic');

    expect(state.inventory.some((slot) => slot.itemId === 'minor_healing_potion')).toBe(false);
    expect(state.inventory.some((slot) => slot.itemId === 'minor_mana_potion')).toBe(false);
  });

  it('does not duplicate starter potions when a MIR4 save is restored', () => {
    const state = initialCharacterState('warrior', 'Restored', 0, 'mir4-gameplay-port');
    const sim = new Sim({
      seed: 1,
      playerClass: 'warrior',
      gameProfile: 'mir4-gameplay-port',
      noPlayer: true,
    });
    const pid = sim.addPlayer('warrior', 'Restored', { state });
    const restored = sim.serializeCharacter(pid);
    const count = (itemId: string) =>
      restored?.inventory
        .filter((slot) => slot.itemId === itemId)
        .reduce((total, slot) => total + slot.count, 0);

    expect(count('minor_healing_potion')).toBe(50);
    expect(count('minor_mana_potion')).toBe(50);
  });
});
