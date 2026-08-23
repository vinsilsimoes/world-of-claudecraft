const EXPECTED_QUESTS = 230;

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function auditMir4CampaignMatrix({ quests, npcs, rows }) {
  const findings = [];
  const expectedRows = quests.reduce((sum, quest) => sum + quest.stageCount, 0);
  const questIdDuplicates = duplicateValues(quests.map((quest) => quest.questId));
  const npcIdDuplicates = duplicateValues(npcs.map((npc) => npc.id));
  const npcNameDuplicates = duplicateValues(npcs.map((npc) => npc.name));

  if (quests.length !== EXPECTED_QUESTS) {
    findings.push({
      severity: 'critical',
      code: 'quest-count-mismatch',
      expected: EXPECTED_QUESTS,
      actual: quests.length,
    });
  }
  if (rows.length !== expectedRows) {
    findings.push({
      severity: 'critical',
      code: 'stage-row-count-mismatch',
      expected: expectedRows,
      actual: rows.length,
    });
  }
  for (const [code, values] of [
    ['duplicate-quest-id', questIdDuplicates],
    ['duplicate-npc-id', npcIdDuplicates],
    ['duplicate-npc-name', npcNameDuplicates],
  ]) {
    if (values.length > 0) findings.push({ severity: 'critical', code, values });
  }

  for (const row of rows) {
    const identity = `${row.questId}:${row.stageIndex}:${row.stageKind}`;
    if (!row.presentationKind || !row.presentationKey) {
      findings.push({ severity: 'high', code: 'missing-presentation', identity });
    }
    if (!row.anchor || !Number.isFinite(row.anchor.x) || !Number.isFinite(row.anchor.z)) {
      findings.push({ severity: 'high', code: 'missing-route-anchor', identity });
    }
    if (row.stageKind === 'system-tutorial' && !row.tutorial?.steps?.length) {
      findings.push({ severity: 'high', code: 'missing-tutorial-guidance', identity });
    }
    if ((row.stageKind === 'talk' || row.stageKind === 'deliver') && !row.npc?.id) {
      findings.push({ severity: 'critical', code: 'missing-stage-npc', identity });
    }
    if (row.presentationKind === 'character' && !row.assetUrl) {
      findings.push({ severity: 'high', code: 'missing-character-asset', identity });
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    summary: {
      quests: quests.length,
      mainQuests: quests.filter((quest) => quest.group === 'main').length,
      stages: rows.length,
      npcs: npcs.length,
      maps: new Set(quests.map((quest) => quest.mapId)).size,
      stageKinds: countBy(rows.map((row) => row.stageKind)),
      presentationKinds: countBy(rows.map((row) => row.presentationKind)),
      characterAssets: new Set(rows.filter((row) => row.assetUrl).map((row) => row.assetUrl)).size,
      findings: findings.length,
    },
    quests,
    npcs,
    rows,
    findings,
  };
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function mir4CampaignMatrixCsv(report) {
  const columns = [
    'questId',
    'group',
    'mapId',
    'questTitle',
    'stageIndex',
    'stageKind',
    'goal',
    'target',
    'presentationKind',
    'presentationKey',
    'assetUrl',
    'npcId',
    'npcName',
    'anchorX',
    'anchorZ',
    'tutorialLauncher',
  ];
  const lines = [columns.join(',')];
  for (const row of report.rows) {
    lines.push(
      [
        row.questId,
        row.group,
        row.mapId,
        row.questTitle,
        row.stageIndex,
        row.stageKind,
        row.goal,
        row.target,
        row.presentationKind,
        row.presentationKey,
        row.assetUrl,
        row.npc?.id,
        row.npc?.name,
        row.anchor?.x,
        row.anchor?.z,
        row.tutorial?.launcherId,
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}
