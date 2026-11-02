/**
 * Periodic background data refresh, for servers that run for days.
 *
 * The pipeline only downloads what has changed (Scryfall's bulk data timestamp, and a
 * 7-day TTL for rules and combos), so running it on a timer is cheap when nothing is new.
 */

const HOUR_MS = 60 * 60 * 1000;

export interface ScheduledRefresh {
  stop(): void;
}

/**
 * Calls `run` every `intervalHours`, skipping a tick if the previous run has not finished.
 * Failures are left to `run` to report; the schedule continues. An interval of 0 disables it.
 */
export function scheduleRefresh(run: () => Promise<unknown>, intervalHours: number): ScheduledRefresh {
  if (intervalHours <= 0) {
    return { stop() {} };
  }

  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    run()
      .catch(() => {})
      .finally(() => {
        running = false;
      });
  }, intervalHours * HOUR_MS);
  // Don't keep the process alive just for the refresh timer.
  timer.unref();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
