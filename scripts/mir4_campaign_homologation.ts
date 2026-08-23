// Build the reviewable quest-by-quest presentation and routing matrix for the
// complete MIR4 campaign. This is an audit tool only: it reads canonical data
// and native WoC presentation registries, then writes reports under tmp/.

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { VISUALS, visualKeyFor } from '../src/render/characters/manifest';
import {
  MIR4_ARC_NPC_IDENTITIES,
  MIR4_QUESTS_ARC,
  mir4ArcNpcIdentity,
  mir4ArcNpcTemplateId,
} from '../src/sim/content/mir4/arc_campaign';
import { mir4ArcTutorialGuidance } from '../src/sim/content/mir4/arc_tutorial_guidance';
import { stageMobSource } from '../src/sim/mir4/arc_encounters';
import { mir4ArcObjectiveObjectItemId } from '../src/sim/mir4/arc_objectives';
import { mir4ArcStageAnchor } from '../src/sim/mir4/arc_quest_runtime';
import {
  MIR4_ARC_COMBAT_STAGE_KINDS,
  MIR4_ARC_ESCORT_STAGE_KINDS,
  MIR4_ARC_INTERACT_STAGE_KINDS,
  MIR4_ARC_POSITION_STAGE_KINDS,
  MIR4_ARC_RECEIPT_STAGE_KINDS,
  MIR4_ARC_TALK_STAGE_KINDS,
} from '../src/sim/mir4/arc_stage_kinds';
import {
  auditMir4CampaignMatrix,
  mir4CampaignMatrixCsv,
} from './lib/mir4_campaign_homologation.mjs';

const OUTPUT_DIR = resolve(process.env.REPORT_DIR ?? 'tmp/mir4-campaign-homologation');

function stageTargets(stage: (typeof MIR4_QUESTS_ARC)[number]['stages'][number]): string[] {
  if (Array.isArray(stage.target)) return stage.target.map(String);
  return stage.target === undefined ? [] : [String(stage.target)];
}

function npcPresentation(npcId: string) {
  const identity = mir4ArcNpcIdentity(npcId);
  if (!identity) return { npc: null, presentationKey: '', assetUrl: '' };
  const presentationKey = visualKeyFor({
    kind: 'npc',
    templateId: mir4ArcNpcTemplateId(identity.id),
    name: identity.name,
  } as never);
  return {
    npc: { id: identity.id, name: identity.name },
    presentationKey,
    assetUrl: VISUALS[presentationKey]?.url ?? '',
  };
}

function stagePresentation(
  quest: (typeof MIR4_QUESTS_ARC)[number],
  stage: (typeof MIR4_QUESTS_ARC)[number]['stages'][number],
  stageIndex: number,
) {
  const targets = stageTargets(stage);
  if (MIR4_ARC_TALK_STAGE_KINDS.has(stage.kind)) {
    return { presentationKind: 'character', ...npcPresentation(targets[0] ?? '') };
  }
  if (MIR4_ARC_COMBAT_STAGE_KINDS.has(stage.kind)) {
    const source = stageMobSource(stage, 0) ?? targets[0] ?? stage.guardian ?? '';
    const templateId = `mir4_quest_${quest.questId.toLowerCase()}_${stageIndex}_0_audit`;
    const presentationKey = visualKeyFor({ kind: 'mob', templateId, name: source } as never);
    return {
      presentationKind: 'character',
      presentationKey,
      assetUrl: VISUALS[presentationKey]?.url ?? '',
      npc: null,
    };
  }
  if (MIR4_ARC_INTERACT_STAGE_KINDS.has(stage.kind)) {
    return {
      presentationKind: 'quest-object',
      presentationKey: mir4ArcObjectiveObjectItemId(stage.kind),
      assetUrl: '',
      npc: null,
    };
  }
  if (MIR4_ARC_ESCORT_STAGE_KINDS.has(stage.kind)) {
    return {
      presentationKind: 'escort-runtime',
      presentationKey: `mir4_escort_${quest.questId.toLowerCase()}_${stageIndex}`,
      assetUrl: '',
      npc: null,
    };
  }
  if (MIR4_ARC_POSITION_STAGE_KINDS.has(stage.kind)) {
    return {
      presentationKind: 'world-anchor',
      presentationKey: targets[0] ?? `${quest.questId}:${stageIndex}`,
      assetUrl: '',
      npc: null,
    };
  }
  if (MIR4_ARC_RECEIPT_STAGE_KINDS.has(stage.kind)) {
    const tutorial =
      stage.kind === 'system-tutorial' ? mir4ArcTutorialGuidance(quest.questId) : null;
    return {
      presentationKind: stage.kind === 'system-tutorial' ? 'tutorial-ui' : 'runtime-receipt',
      presentationKey: tutorial?.launcherId ?? stage.kind,
      assetUrl: '',
      npc: null,
    };
  }
  return { presentationKind: '', presentationKey: '', assetUrl: '', npc: null };
}

const quests = MIR4_QUESTS_ARC.map((quest) => {
  const giver = quest.giverNpcId ? npcPresentation(quest.giverNpcId) : null;
  const turnIn = quest.turnInNpcId ? npcPresentation(quest.turnInNpcId) : null;
  return {
    questId: quest.questId,
    group: quest.group,
    mapId: quest.mapId,
    title: quest.title,
    stageCount: quest.stages.length,
    giver: giver?.npc
      ? { ...giver.npc, visualKey: giver.presentationKey, assetUrl: giver.assetUrl }
      : null,
    turnIn: turnIn?.npc
      ? { ...turnIn.npc, visualKey: turnIn.presentationKey, assetUrl: turnIn.assetUrl }
      : null,
  };
});

const rows = MIR4_QUESTS_ARC.flatMap((quest) =>
  quest.stages.map((stage, stageIndex) => {
    const tutorial =
      stage.kind === 'system-tutorial' ? mir4ArcTutorialGuidance(quest.questId) : null;
    const anchor = mir4ArcStageAnchor(quest.questId, stage, 0);
    return {
      questId: quest.questId,
      group: quest.group,
      mapId: quest.mapId,
      questTitle: quest.title,
      stageIndex,
      stageKind: stage.kind,
      goal: stage.goal ?? stage.waves ?? 1,
      target: stageTargets(stage).join('|'),
      text: stage.text ?? '',
      anchor: anchor ? { x: anchor.x, z: anchor.z } : null,
      tutorial,
      ...stagePresentation(quest, stage, stageIndex),
    };
  }),
);

/** Canonical 230-quest, 1,204-stage matrix input used by both CI and the CLI report. */
export function buildMir4CampaignHomologationInput() {
  return {
    quests,
    npcs: MIR4_ARC_NPC_IDENTITIES.map((npc) => ({ ...npc })),
    rows,
  };
}

async function main(): Promise<void> {
  const report = auditMir4CampaignMatrix(buildMir4CampaignHomologationInput());
  await mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    writeFile(resolve(OUTPUT_DIR, 'matrix.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
    writeFile(resolve(OUTPUT_DIR, 'matrix.csv'), mir4CampaignMatrixCsv(report), 'utf8'),
  ]);

  console.log(
    JSON.stringify(
      { outputDir: OUTPUT_DIR, ...report.summary, findings: report.findings },
      null,
      2,
    ),
  );
  if (report.findings.some((finding) => finding.severity === 'critical')) process.exitCode = 1;
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await main();
}
