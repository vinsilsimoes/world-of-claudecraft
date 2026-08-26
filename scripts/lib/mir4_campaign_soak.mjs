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

/** A control hand-off between Main and a strengthening quest is not gameplay
 * progress. Count only a higher stage/progress value within the same quest. */
export function isMir4SameQuestStageProgress(previous, next) {
  if (
    typeof previous?.activeQuestId !== 'string' ||
    previous.activeQuestId !== next?.activeQuestId
  ) {
    return false;
  }
  const previousStage = Number(previous.stageIndex) || 0;
  const nextStage = Number(next.stageIndex) || 0;
  return (
    nextStage > previousStage ||
    (nextStage === previousStage &&
      (Number(next.stageProgress) || 0) > (Number(previous.stageProgress) || 0))
  );
}

export function shouldStartMir4PowerGrind({
  tick,
  lastProgressTick,
  stallTicks,
  policyTicks,
  traveling = false,
}) {
  const attemptWindowTicks = Math.min(stallTicks, Math.max(policyTicks, 600));
  return !traveling && tick - lastProgressTick >= attemptWindowTicks;
}

/** A route to a combat objective is still travel. Strength can be judged only
 * after the ordinary Auto Mission path has reached the objective, otherwise a
 * long boss approach is misreported as a failed fight. */
export function isMir4MainJourneyTraveling({ mainQuestId, autoQuestId, routeWaypointCount }) {
  return (
    typeof mainQuestId === 'string' &&
    mainQuestId.length > 0 &&
    autoQuestId === mainQuestId &&
    Number(routeWaypointCount) > 0
  );
}

/** Auto Mission owns the approach to a survival objective, then yields to
 * ordinary single-target combat once the player reaches the final waypoint. */
export function shouldRunMir4SurvivalIntervention({
  stageKind,
  grindingUntilLevel,
  routeWaypointDistance,
  clearanceYards = 10,
}) {
  if (stageKind !== 'survive-zone' || grindingUntilLevel !== null) return false;
  if (routeWaypointDistance === null || routeWaypointDistance === undefined) return true;
  const distance = Number(routeWaypointDistance);
  return Number.isFinite(distance) && distance <= Math.max(0, Number(clearanceYards) || 0);
}

export function shouldEscalateMir4TravelThreatToPowerGrind({
  tick,
  startedTick,
  attemptTicks = 600,
}) {
  return Number.isFinite(startedTick) && tick - startedTick >= Math.max(1, attemptTicks);
}

export function shouldResumeMir4JourneyAfterTravelThreatKill({
  interventionQuestId,
  previousKills,
  currentKills,
}) {
  return (
    typeof interventionQuestId === 'string' &&
    interventionQuestId.length > 0 &&
    Number(currentKills) > Number(previousKills)
  );
}

export function isMir4PowerGrindXpProgress(previousXp, nextXp, grindingUntilLevel) {
  return grindingUntilLevel !== null && Number(nextXp) > Number(previousXp);
}

export function nextMir4PowerGrindTarget(playerLevel, _recommendedLevel) {
  return Math.max(1, Math.floor(Number(playerLevel) || 0) + 1);
}

export function restoredMir4PowerGrindTarget({ playerLevel, sideQuests, progresses }) {
  const hasActiveStrengtheningQuest = sideQuests.some((quest) => {
    const state = progresses?.[quest.questId]?.state;
    return state === 'active' || state === 'ready';
  });
  return hasActiveStrengtheningQuest ? Math.max(1, playerLevel + 1) : null;
}

/** Choose a physical WoC resource node for one bounded strengthening detour.
 * The campaign bot alternates the preferred family so a level trial exercises
 * both the Herbalism -> Training-material bridge and native Mining. Readiness
 * is supplied by the authoritative per-player respawn timer; this helper only
 * ranks already-valid candidates and never invents a resource grant. */
export function selectMir4NativeGatherTarget({
  nodes,
  position,
  preferredType,
  excludedNodeIds = [],
  maxDistanceYards = 140,
}) {
  const excluded = new Set(excludedNodeIds);
  const maximum = Math.max(0, Number(maxDistanceYards) || 0);
  return (
    nodes
      .filter((node) => {
        if (
          !node ||
          (node.type !== 'herb' && node.type !== 'ore') ||
          node.ready !== true ||
          excluded.has(node.id)
        ) {
          return false;
        }
        return (
          Math.hypot(Number(node.x) - Number(position?.x), Number(node.z) - Number(position?.z)) <=
          maximum
        );
      })
      .sort((left, right) => {
        const leftPreferred = left.type === preferredType ? 0 : 1;
        const rightPreferred = right.type === preferredType ? 0 : 1;
        if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;
        const leftDistance = Math.hypot(
          Number(left.x) - Number(position?.x),
          Number(left.z) - Number(position?.z),
        );
        const rightDistance = Math.hypot(
          Number(right.x) - Number(position?.x),
          Number(right.z) - Number(position?.z),
        );
        return leftDistance - rightDistance || String(left.id).localeCompare(String(right.id));
      })[0] ?? null
  );
}

/** A native gathering detour is optional campaign exercise. If ordinary
 * collision-safe movement cannot reduce the route distance for a bounded
 * number of policy decisions, skip that physical node instead of pinning the
 * entire campaign runner behind geometry. The caller must not grant rewards. */
export function shouldSkipStalledMir4NativeGatherRoute(stalledTicks, thresholdTicks = 10) {
  return Number.isFinite(stalledTicks) && stalledTicks >= Math.max(1, Number(thresholdTicks) || 1);
}

const POWER_GRIND_STAGE_KINDS = new Set([
  'collect-quest-wallet',
  'defend-anchor',
  'defend-random-landmark',
  'escort-entity',
  'escort-supply-run',
  'guardian-resolution',
  'gather-resource-patches',
  'inspect-clues',
  'inspect-and-resolve-elite',
  'interrupt-ritual',
  'optional-elite-resolution',
  'selective-hunt',
  'short-dungeon-clear',
  'short-dungeon-or-public-event-contribution',
  'survive-zone',
  'track-signs',
]);

export function mir4SoakStageAllowsPowerGrind(stageKind) {
  return POWER_GRIND_STAGE_KINDS.has(stageKind);
}

export function shouldEndMir4PowerGrindForMainStage({
  grindingUntilLevel,
  activeQuestId,
  mainQuestId,
  mainStageKind,
}) {
  return (
    grindingUntilLevel !== null &&
    typeof mainQuestId === 'string' &&
    activeQuestId === mainQuestId &&
    !mir4SoakStageAllowsPowerGrind(mainStageKind)
  );
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
  includeCurrentMap = true,
  preferPreviousMap = false,
  excludedQuestIds = [],
}) {
  const reachedSequence = mapSequence(currentMainMapId);
  const levelSequence = Math.max(1, Math.ceil(playerLevel / 10));
  // When the current map is allowed, its local side quests are the intended
  // strengthening loop even if the character is one level below the chapter
  // recommendation. Falling back to levelSequence first sent an M12 player on
  // a continent-long journey to M11 merely to earn that single level.
  const maximumSequence = includeCurrentMap
    ? reachedSequence
    : Math.min(reachedSequence - 1, levelSequence);
  let eligible = sideQuests
    .filter((quest) => {
      const minimumLevel = quest.levelRange?.[0];
      return (
        mapSequence(quest.mapId) <= maximumSequence &&
        !excludedQuestIds.includes(quest.questId) &&
        (minimumLevel === undefined || playerLevel >= minimumLevel) &&
        progresses[quest.questId]?.state !== 'done'
      );
    })
    .sort(
      (left, right) =>
        mapSequence(right.mapId) - mapSequence(left.mapId) ||
        left.questId.localeCompare(right.questId),
    );
  if (preferPreviousMap) {
    const previousMap = eligible.filter((quest) => mapSequence(quest.mapId) < reachedSequence);
    if (previousMap.length > 0) eligible = previousMap;
  }
  return (
    eligible.find((quest) => {
      const state = progresses[quest.questId]?.state;
      return state === 'active' || state === 'ready';
    })?.questId ??
    eligible.find((quest) => progresses[quest.questId] === undefined)?.questId ??
    null
  );
}

export function shouldSkipStalledMir4StrengtheningQuest({
  tick,
  selectedAtTick,
  lastProgressTick,
  attemptTicks = 600,
}) {
  return (
    Number.isFinite(selectedAtTick) &&
    tick - selectedAtTick >= Math.max(1, attemptTicks) &&
    lastProgressTick <= selectedAtTick
  );
}

export function shouldResumeMir4MainQuest({
  strengtheningQuestId,
  autoQuestId,
  mainQuestId,
  grindStalled = false,
}) {
  return (
    strengtheningQuestId === null &&
    typeof mainQuestId === 'string' &&
    mainQuestId.length > 0 &&
    grindStalled &&
    autoQuestId !== mainQuestId
  );
}

/** Keep the Main Quest route alive only while it is serving as a road finder.
 * The grind owns combat, so the route yields as soon as an ordinary world mob
 * is visible; quest-scoped guardians are deliberately excluded by the caller. */
export function shouldKeepMir4MainQuestGrindRoute({
  resumedMainQuestId,
  autoQuestId,
  mainQuestId,
  hasVisibleGrindTarget,
}) {
  return (
    typeof mainQuestId === 'string' &&
    resumedMainQuestId === mainQuestId &&
    autoQuestId === mainQuestId &&
    hasVisibleGrindTarget !== true
  );
}
