import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedCallback } from './use-debounced-callback.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedCallback', () => {
  it('fires once after the delay, with the latest args', () => {
    const fn = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(fn, 1000));

    act(() => {
      result.current('a');
      result.current('b');
      result.current('c');
    });
    expect(fn).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1000));
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  it('does not fire if unmounted before the delay elapses', () => {
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(fn, 1000));
    act(() => result.current('x'));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(fn).not.toHaveBeenCalled();
  });
});
