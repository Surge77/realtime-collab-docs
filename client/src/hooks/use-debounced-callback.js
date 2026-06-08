import { useCallback, useEffect, useRef } from 'react';

/**
 * Return a debounced version of `fn` that fires `delay` ms after the last call.
 * Always invokes the latest `fn`; cancels any pending call on unmount.
 *
 * @template {(...args: any[]) => void} F
 * @param {F} fn
 * @param {number} delay
 */
export function useDebouncedCallback(fn, delay) {
  const timerRef = useRef(undefined);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay],
  );
}
