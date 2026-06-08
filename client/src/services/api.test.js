import { describe, expect, it, vi } from 'vitest';

import { handle401 } from './api.js';

const makeError = () => ({ config: { url: '/documents', _retried: true } });

describe('handle401', () => {
  it('refreshes once then retries the original request', async () => {
    const refresh = vi.fn().mockResolvedValue('new-token');
    const retry = vi.fn().mockResolvedValue({ data: 'ok' });
    const onFailure = vi.fn();

    const result = await handle401(makeError(), { refresh, retry, onFailure });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: 'ok' });
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('shares a single refresh across concurrent 401s', async () => {
    let resolveRefresh;
    const refresh = vi.fn(() => new Promise((res) => (resolveRefresh = res)));
    const retry = vi.fn().mockResolvedValue({ data: 'ok' });
    const onFailure = vi.fn();

    const p1 = handle401(makeError(), { refresh, retry, onFailure });
    const p2 = handle401(makeError(), { refresh, retry, onFailure });
    resolveRefresh('token');
    await Promise.all([p1, p2]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(2);
  });

  it('calls onFailure and rethrows when refresh fails', async () => {
    const refresh = vi.fn().mockRejectedValue(new Error('refresh failed'));
    const retry = vi.fn();
    const onFailure = vi.fn();

    await expect(handle401(makeError(), { refresh, retry, onFailure })).rejects.toBeDefined();
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });
});
