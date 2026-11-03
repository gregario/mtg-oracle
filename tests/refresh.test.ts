import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleRefresh } from '../src/refresh.js';

const HOUR = 60 * 60 * 1000;

describe('scheduleRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs every interval, not immediately', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const refresh = scheduleRefresh(run, 24);

    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(24 * HOUR);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(24 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);

    refresh.stop();
  });

  it('skips a tick while the previous run is still in progress', async () => {
    let finish!: () => void;
    const run = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const refresh = scheduleRefresh(run, 1);

    await vi.advanceTimersByTimeAsync(1 * HOUR);
    await vi.advanceTimersByTimeAsync(1 * HOUR);
    expect(run).toHaveBeenCalledTimes(1);

    finish();
    await vi.advanceTimersByTimeAsync(1 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);

    refresh.stop();
  });

  it('keeps going after a failed run', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValue(undefined);
    const refresh = scheduleRefresh(run, 1);

    await vi.advanceTimersByTimeAsync(2 * HOUR);
    expect(run).toHaveBeenCalledTimes(2);

    refresh.stop();
  });

  it('stops running after stop()', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleRefresh(run, 1).stop();

    await vi.advanceTimersByTimeAsync(3 * HOUR);
    expect(run).not.toHaveBeenCalled();
  });

  it('does nothing when the interval is 0', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleRefresh(run, 0);

    await vi.advanceTimersByTimeAsync(1000 * HOUR);
    expect(run).not.toHaveBeenCalled();
  });
});
