// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest';
import { EDITOR_PLAYTEST_KEY, takeEditorPlaytestRequest } from '../src/game/editor_playtest';
import { buildMir4WocCampaignWorld } from '../src/sim/mir4/woc_comparison_world';

describe('Aeldrune editor playtest handoff', () => {
  beforeEach(() => sessionStorage.clear());

  it('accepts only a profile-pinned Aeldrune campaign world', () => {
    const content = buildMir4WocCampaignWorld();
    const editedProjections = content.mir4ArcMapProjections?.map((projection, index) =>
      index === 0
        ? {
            ...projection,
            objectiveAnchors: [
              { questId: 'M01-Q01', stageId: 'travel', points: [{ x: 17, z: 29 }] },
            ],
          }
        : projection,
    );
    const compactPatch = {
      zones: content.zones,
      camps: content.camps,
      npcs: content.npcs,
      groundObjects: content.groundObjects,
      roads: content.roads,
      props: content.props,
      playerStart: content.playerStart,
      mir4ArcMapProjections: editedProjections,
    };
    sessionStorage.setItem(
      EDITOR_PLAYTEST_KEY,
      JSON.stringify({
        content: compactPatch,
        seed: 7,
        playerClass: 'warrior',
        playerName: 'Mapmaker',
        gameProfile: 'mir4-gameplay-port',
      }),
    );

    const request = takeEditorPlaytestRequest();

    expect(request?.gameProfile).toBe('mir4-gameplay-port');
    expect(request?.content.presentationModel).toBe('builtin');
    expect(request?.content.props.walls).toHaveLength(content.props.walls?.length ?? 0);
    expect(request?.content.travelPortals).toHaveLength(content.travelPortals?.length ?? 0);
    expect(request?.content.mir4ArcMapProjections).toHaveLength(20);
    expect(request?.content.mir4ArcMapProjections?.[0]?.objectiveAnchors?.[0]?.points).toEqual([
      { x: 17, z: 29 },
    ]);
    expect(sessionStorage.getItem(EDITOR_PLAYTEST_KEY)).toBeNull();
  });

  it('rejects the legacy generic-WoC handoff with no Aeldrune profile', () => {
    sessionStorage.setItem(
      EDITOR_PLAYTEST_KEY,
      JSON.stringify({
        content: buildMir4WocCampaignWorld(),
        seed: 7,
        playerClass: 'warrior',
        playerName: 'Mapmaker',
      }),
    );

    expect(takeEditorPlaytestRequest()).toBeNull();
  });
});
