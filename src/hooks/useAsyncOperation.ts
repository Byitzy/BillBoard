'use client';
import { useState, useCallback } from 'react';
import type { AsyncState, SafeResult } from '@/types/api';
import { APIError } from '@/types/api';

export function useAsyncOperation<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (asyncFn: () => Promise<T>): Promise<SafeResult<T>> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const data = await asyncFn();
        setState({ data, loading: false, error: null });
        return { success: true, data };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred';
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return {
          success: false,
          error: error instanceof APIError ? error : new APIError(errorMessage),
        };
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  const setData = useCallback((data: T) => {
    setState((prev) => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error, loading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    isIdle: !state.loading && state.data === null && state.error === null,
    isSuccess: !state.loading && state.data !== null && state.error === null,
    isError: !state.loading && state.error !== null,
  };
}

// Hook for managing loading states with multiple operations
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [key]: loading }));
  }, []);

  const isLoading = useCallback(
    (key: string) => {
      return loadingStates[key] ?? false;
    },
    [loadingStates]
  );

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean);
  }, [loadingStates]);

  return {
    setLoading,
    isLoading,
    isAnyLoading,
    loadingStates,
  };
}
