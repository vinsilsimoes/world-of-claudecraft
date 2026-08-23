import { mir4ArcObjectiveVisibleTo } from '../src/sim/mir4/arc_objectives';
import type { Entity } from '../src/sim/types';

/** Viewer-relative visibility that must be applied before a snapshot is
 * serialized. Physical campaign objectives are private per quest owner; all
 * other entities retain the existing shared-world visibility policy. */
export function canObserveOwnerScopedEntity(viewer: Entity, entity: Entity): boolean {
  return mir4ArcObjectiveVisibleTo(entity, viewer.id);
}
