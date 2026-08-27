import {
  DEFAULT_APPEARANCE,
  type Gender,
  type ModularAppearance,
  normalizeAppearance,
} from '../render/characters/modular';

/**
 * Curated starting looks for the two body choices in character creation.
 * These are presentation defaults only. Every field remains editable in the
 * appearance customizer after the body is selected.
 */
export function startingAppearanceForGender(gender: Gender): ModularAppearance {
  if (gender === 'male') return normalizeAppearance(DEFAULT_APPEARANCE);
  return normalizeAppearance({
    ...DEFAULT_APPEARANCE,
    gender: 'female',
    hair: 'longwavy',
    brows: 'arched',
    eyeShape: 'doe',
    mouth: 'lips',
    beard: 'none',
    lashes: true,
    // Keep the class-specific armour geometry, but give the female starter
    // outfit its own authored colourway so the whole presentation changes.
    outfit: 'rose',
  });
}

/**
 * Changing body choice starts from that body's complete authored preset.
 * Clicking the already-selected body keeps the player's current edits.
 */
export function appearanceAfterGenderSelection(
  current: ModularAppearance,
  gender: Gender,
): ModularAppearance {
  if (current.gender === gender) return current;
  return startingAppearanceForGender(gender);
}
