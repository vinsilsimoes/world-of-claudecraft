// One authoritative lookup for live mob AI. Classic content is pre-registered
// in MOBS, while the MIR4 campaign derives map-scoped ids from its 20-region
// census. AI callers must see both populations or a generated MIR4 mob spawns
// with combat stats but silently loses proximity aggression.

import { mir4ArcMobTemplate } from '../content/mir4/arc_mobs';
import { MIR4_MOBS } from '../content/mir4/mobs';
import { MOBS } from '../data';
import type { Rng } from '../rng';
import type { CampDef, MobTemplate } from '../types';

export function resolveMobTemplate(
  templateId: string,
  runtimeTemplates?: ReadonlyMap<string, MobTemplate>,
): MobTemplate | undefined {
  return (
    MOBS[templateId] ??
    MIR4_MOBS[templateId] ??
    runtimeTemplates?.get(templateId) ??
    mir4ArcMobTemplate(templateId)
  );
}

export function rollCampMobLevel(template: MobTemplate, camp: CampDef, rng: Rng): number {
  const min = Math.max(template.minLevel, camp.minLevel ?? template.minLevel);
  const max = Math.max(min, Math.min(template.maxLevel, camp.maxLevel ?? template.maxLevel));
  return rng.int(min, max);
}
