export interface Mir4CampaignMatrixInput {
  quests: Array<
    Record<string, unknown> & { questId: string; group: string; mapId: string; stageCount: number }
  >;
  npcs: Array<Record<string, unknown> & { id: string; name: string }>;
  rows: Array<Record<string, any> & { questId: string; stageIndex: number; stageKind: string }>;
}

export interface Mir4CampaignMatrixReport extends Mir4CampaignMatrixInput {
  schemaVersion: number;
  generatedAt: string;
  summary: Record<string, unknown>;
  findings: Array<Record<string, unknown>>;
}

export function auditMir4CampaignMatrix(input: Mir4CampaignMatrixInput): Mir4CampaignMatrixReport;
export function mir4CampaignMatrixCsv(report: Mir4CampaignMatrixReport): string;
