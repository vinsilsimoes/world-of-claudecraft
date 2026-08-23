import { describe, expect, it } from 'vitest';
import {
  auditMir4CampaignMatrix,
  mir4CampaignMatrixCsv,
} from '../scripts/lib/mir4_campaign_homologation.mjs';
import { buildMir4CampaignHomologationInput } from '../scripts/mir4_campaign_homologation';

function completeInput() {
  const quests = Array.from({ length: 230 }, (_, index) => ({
    questId: `Q${index + 1}`,
    group: index < 120 ? 'main' : 'side',
    mapId: `M${Math.floor(index / 12) + 1}`,
    stageCount: index === 0 ? 1 : 0,
  }));
  return {
    quests,
    npcs: [{ id: 'npc-1', name: 'NPC One' }],
    rows: [
      {
        questId: 'Q1',
        group: 'main',
        mapId: 'M1',
        questTitle: 'First',
        stageIndex: 0,
        stageKind: 'talk',
        presentationKind: 'character',
        presentationKey: 'npc_scout',
        assetUrl: '/models/scout.glb',
        npc: { id: 'npc-1', name: 'NPC One' },
        anchor: { x: 1, z: 2 },
      },
    ],
  };
}

describe('MIR4 campaign homologation report', () => {
  it('audits the actual complete campaign dataset, not a synthetic row', () => {
    const report = auditMir4CampaignMatrix(buildMir4CampaignHomologationInput());

    expect(report.findings).toEqual([]);
    expect(report.summary).toMatchObject({
      quests: 230,
      mainQuests: 120,
      stages: 1_204,
      npcs: 80,
      maps: 20,
    });
  });

  it('accepts one complete row for every authored stage and exports reviewable CSV', () => {
    const report = auditMir4CampaignMatrix(completeInput());

    expect(report.findings).toEqual([]);
    expect(report.summary).toMatchObject({ quests: 230, mainQuests: 120, stages: 1, npcs: 1 });
    expect(mir4CampaignMatrixCsv(report)).toContain('Q1,main,M1,First,0,talk');
  });

  it('fails closed on duplicate identities, missing routes and missing tutorial guidance', () => {
    const input = completeInput();
    input.npcs.push({ id: 'npc-1', name: 'NPC One' });
    input.rows[0] = {
      ...input.rows[0],
      stageKind: 'system-tutorial',
      presentationKind: '',
      presentationKey: '',
      assetUrl: '',
      npc: null,
      anchor: null,
    } as never;
    const report = auditMir4CampaignMatrix(input);

    expect(report.findings.map((finding) => finding.code)).toEqual(
      expect.arrayContaining([
        'duplicate-npc-id',
        'duplicate-npc-name',
        'missing-presentation',
        'missing-route-anchor',
        'missing-tutorial-guidance',
      ]),
    );
  });
});
