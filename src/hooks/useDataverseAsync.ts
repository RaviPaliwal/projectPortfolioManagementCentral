import { useState, useCallback, useMemo } from 'react';
import type { IOperationResult } from '@microsoft/power-apps/data';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Standardized hook for handling Dataverse SDK operations (IOperationResult).
 * Designed to be stable and avoid infinite re-render loops.
 */
export function useDataverseAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (
    promise: Promise<IOperationResult<T>>,
    options: { onSuccess?: (data: T) => void; onError?: (err: string) => void } = {}
  ) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await promise;
      
      if (result.success) {
        const data = result.data ?? (result as any).value as T;
        setState({ data, loading: false, error: null });
        options.onSuccess?.(data);
        return { success: true, data };
      } else {
        const errorMsg = result.error?.message || 'An unknown Dataverse error occurred.';
        setState({ data: null, loading: false, error: errorMsg });
        options.onError?.(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err: any) {
      const errorMsg = err.message || 'A network error occurred while contacting Dataverse.';
      setState({ data: null, loading: false, error: errorMsg });
      options.onError?.(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  // Memoize the result to prevent infinite loops in dependencies.
  // IMPORTANT: Do NOT include setState or state directly — only expose stable refs
  // so consumers can safely use `state.execute` in dependency arrays without cycles.
  return useMemo(() => ({
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute,
    reset,
  }), [state.data, state.loading, state.error, execute, reset]);
}
