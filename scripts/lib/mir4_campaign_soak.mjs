function progressTuple(progress, questOrder) {
  const questIndex = progress.activeQuestId ? questOrder.indexOf(progress.activeQuestId) : -1;
  return [
    Number(progress.completed) || 0,
    questIndex,
    Number(progress.stageIndex) || 0,
    Number(progress.stageProgress) || 0,
  ];
}

export function isForwardMir4SoakProgress(previous, next, questOrder) {
  const left = progressTuple(previous, questOrder);
  const right = progressTuple(next, questOrder);
  for (let index = 0; index < left.length; index += 1) {
    if (right[index] > left[index]) return true;
    if (right[index] < left[index]) return false;
  }
  return false;
}

export function shouldStartMir4PowerGrind({
  tick,
  lastProgressTick,
  stallTicks,
  policyTicks,
  playerLevel,
  recommendedLevel,
}) {
  return (
    recommendedLevel > playerLevel && tick - lastProgressTick >= Math.min(stallTicks, policyTicks)
  );
}

export function isMir4PowerGrindXpProgress(previousXp, nextXp, grindingUntilLevel) {
  return grindingUntilLevel !== null && Number(nextXp) > Number(previousXp);
}

const POWER_GRIND_STAGE_KINDS = new Set([
  'activate-sequence',
  'collect-quest-wallet',
  'defend-anchor',
  'defend-random-landmark',
  'escort-entity',
  'escort-supply-run',
  'guardian-resolution',
  'inspect-and-resolve-elite',
  'interrupt-ritual',
  'optional-elite-resolution',
  'selective-hunt',
  'short-dungeon-clear',
  'short-dungeon-or-public-event-contribution',
]);

export function mir4SoakStageAllowsPowerGrind(stageKind) {
  return POWER_GRIND_STAGE_KINDS.has(stageKind);
}

function mapSequence(mapId) {
  const match = /^m(\d{2})-/.exec(String(mapId));
  return match ? Number(match[1]) : -1;
}

export function selectMir4StrengtheningQuest({
  sideQuests,
  progresses,
  currentMainMapId,
  playerLevel,
}) {
  const reachedSequence = mapSequence(currentMainMapId);
  const eligible = sideQuests
    .filter((quest) => {
      const minimumLevel = quest.levelRange?.[0];
      return (
        mapSequence(quest.mapId) <= reachedSequence &&
        (minimumLevel === undefined || playerLevel >= minimumLevel) &&
        progresses[quest.questId]?.state !== 'done'
      );
    })
    .sort(
      (left, right) =>
        mapSequence(right.mapId) - mapSequence(left.mapId) ||
        left.questId.localeCompare(right.questId),
    );
  return (
    eligible.find((quest) => {
      const state = progresses[quest.questId]?.state;
      return state === 'active' || state === 'ready';
    })?.questId ??
    eligible.find((quest) => progresses[quest.questId] === undefined)?.questId ??
    null
  );
}

export function shouldResumeMir4MainQuest({
  strengtheningQuestId,
  autoQuestId,
  mainQuestId,
  resumedMainQuestId,
}) {
  return (
    strengtheningQuestId === null &&
    typeof mainQuestId === 'string' &&
    mainQuestId.length > 0 &&
    resumedMainQuestId !== mainQuestId &&
    autoQuestId !== mainQuestId
  );
}
