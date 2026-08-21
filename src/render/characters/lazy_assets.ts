import { logAssetMissOnce } from './asset_miss_log';
import {
  mechAssetsReady,
  preloadMechAssets,
  preloadTrainingDummyAssets,
  trainingDummyAssetsReady,
} from './assets';

function reportedLoad(
  promise: Promise<void>,
  failureKey: string,
  failureMessage: string,
): Promise<void> {
  return promise.catch((err) => {
    logAssetMissOnce(failureKey, failureMessage, err);
    throw err;
  });
}

/** Start the lazy asset load required by a visual key, or return null when it is ready. */
export function pendingLazyCharacterAssets(visualKey: string): Promise<void> | null {
  if (visualKey === 'player_mech' && !mechAssetsReady()) {
    return reportedLoad(
      preloadMechAssets(),
      'preload:player_mech',
      'Failed to preload live mech cosmetic:',
    );
  }
  if (visualKey === 'mob_training_dummy' && !trainingDummyAssetsReady()) {
    return reportedLoad(
      preloadTrainingDummyAssets(),
      'preload:mob_training_dummy',
      'Failed to preload the Training Dummy:',
    );
  }
  return null;
}

/**
 * Defer a lazy mob during background zone prewarm. The template stays unmarked,
 * allowing the live view or a later prewarm pass to build it after the load.
 */
export function deferLazyMobTemplatePrewarm(templateId: string, visualKey?: string): boolean {
  // MIR4 camp templates are map-qualified (for example
  // mir4_m03_training_dummy) so their level/loot stays local to the band.
  // They still resolve the same native WoC Training Dummy visual and must use
  // the same deferred asset gate after a renderer rebuild.
  const fallbackVisualKey =
    templateId === 'training_dummy' || templateId.endsWith('_training_dummy')
      ? 'mob_training_dummy'
      : null;
  const pending = pendingLazyCharacterAssets(visualKey ?? fallbackVisualKey ?? '');
  if (!pending) return false;
  void pending.catch(() => undefined);
  return true;
}
