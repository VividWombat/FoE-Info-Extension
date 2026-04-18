/**
 * WorldChallengeRequestHandler.ts
 *
 * Handles server-side World Challenge (Anniversary Event) data.
 *
 * ## Game context
 *
 * The World Challenge is a server-wide cooperative event where all players
 * on a world collectively earn "world progress points" to unlock global
 * rewards. Individual players also progress through personal milestone levels.
 *
 * ## API calls handled
 *
 * | requestClass          | requestMethod | When received       |
 * |----------------------|---------------|---------------------|
 * | WorldChallengeService | getConfig     | Once on login       |
 * | WorldChallengeService | getOverview   | On login + updates  |
 *
 * `getConfig` arrives first and populates the level-threshold table.
 * `getOverview` arrives after and triggers the render. Order is guaranteed
 * because the game sends config before overview in the startup batch.
 *
 * ## Adding new World Challenge data
 *
 * The `WorldChallengeLevel` type already includes `taskReward` and
 * `worldReward`. To display reward details, extend `render()` to read those
 * fields from `nextLevel` — they're already stored in `configLevels`.
 */

import { HandlerMessage } from './types';

/** One milestone level in the World Challenge config. */
type WorldChallengeLevel = {
  level: number;
  /** Cumulative world-progress-points required to complete this level. */
  worldProgressPointsToComplete: number;
  /** Number of individual tasks a player must complete to reach this level. */
  tasksToComplete: number;
  /** Per-player reward for completing individual tasks at this level. */
  taskReward?: { resources?: Record<string, number> };
  /** Server-wide reward unlocked when the world reaches this level. */
  worldReward?: { resources?: Record<string, number> };
};

type WorldChallengeConfig = {
  levels: WorldChallengeLevel[];
};

type WorldChallengeOverview = {
  /** The player's own current challenge level (starts at 1). */
  currentPlayerLevel: number;
  /** Total world-progress-points accumulated by ALL players on this world. */
  worldProgressPoints: number;
};

/**
 * Level definitions cached from the most recent `getConfig` response.
 * These are needed when `getOverview` arrives to calculate progress %.
 */
let configLevels: WorldChallengeLevel[] = [];

export let hudWcState: { level: number; points: number; threshold: number } | null = null;

/**
 * Renders the World Challenge card into `targetDiv`.
 *
 * Shows the player's current level, the world-wide progress bar, and the
 * numeric progress toward the next level threshold.
 */
function render(
  overview: WorldChallengeOverview,
  targetDiv: HTMLElement,
): void {
  const { currentPlayerLevel: level, worldProgressPoints: points } = overview;

  // Look up the next level's threshold from the config we stored earlier.
  const nextLevel = configLevels.find((l) => l.level === level + 1);

  const pointsFmt = points.toLocaleString();
  let progressHTML = '';

  if (nextLevel) {
    const threshold = nextLevel.worldProgressPointsToComplete;
    const pct = Math.min(100, Math.round((points / threshold) * 100));
    const thresholdFmt = threshold.toLocaleString();
    progressHTML = `
      <div class="progress mt-1" style="height:5px;">
        <div class="progress-bar bg-info" role="progressbar" style="width:${pct}%" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
      </div>
      <small>${pointsFmt} / ${thresholdFmt} (${pct}%)</small>`;
  } else {
    // Max level reached or config not yet received — just show raw points.
    progressHTML = `<small>${pointsFmt} world pts</small>`;
  }

  targetDiv.innerHTML = `
    <div class="alert alert-info alert-dismissible show" role="alert">
      <p><strong>World Challenge — Level ${level}</strong></p>
      ${progressHTML}
    </div>`;
}

/**
 * Routes `WorldChallengeService` messages.
 *
 * @param msg              - Parsed message envelope from the network.
 * @param worldchallengeDIV - The panel `<div id="worldchallenge">` to render into.
 * @returns `true` if the message was handled, `false` to pass it down the chain.
 */
export function handleWorldChallengeRequest(
  msg: HandlerMessage,
  worldchallengeDIV: HTMLElement,
): boolean {
  if (msg.requestClass !== 'WorldChallengeService') return false;

  if (msg.requestMethod === 'getConfig') {
    const config = msg.responseData as WorldChallengeConfig | undefined;
    configLevels = config?.levels ?? [];
    return true;
  }

  if (msg.requestMethod === 'getOverview') {
    const overview = msg.responseData as WorldChallengeOverview | undefined;
    if (overview) {
      render(overview, worldchallengeDIV);
      const nextLevel = configLevels.find((l) => l.level === overview.currentPlayerLevel + 1);
      hudWcState = {
        level: overview.currentPlayerLevel,
        points: overview.worldProgressPoints,
        threshold: nextLevel?.worldProgressPointsToComplete ?? 0,
      };
    }
    return true;
  }

  return false;
}
