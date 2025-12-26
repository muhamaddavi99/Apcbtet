import { useState, useCallback } from 'react';

interface TimeoutFetchOptions {
  timeout?: number; // in milliseconds
  onTimeout?: () => void;
}

interface TimeoutFetchState {
  isLoading: boolean;
  isTimeout: boolean;
  error: Error | null;
}

export function useTimeoutFetch(defaultTimeout: number = 30000) {
  const [state, setState] = useState<TimeoutFetchState>({
    isLoading: false,
    isTimeout: false,
    error: null,
  });

  const fetchWithTimeout = useCallback(async <T>(
    fetchFn: () => Promise<T>,
    options?: TimeoutFetchOptions
  ): Promise<T | null> => {
    const timeout = options?.timeout ?? defaultTimeout;
    
    setState({ isLoading: true, isTimeout: false, error: null });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeout);
    });

    try {
      const result = await Promise.race([fetchFn(), timeoutPromise]);
      setState({ isLoading: false, isTimeout: false, error: null });
      return result;
    } catch (error: any) {
      if (error.message === 'TIMEOUT') {
        setState({ isLoading: false, isTimeout: true, error: null });
        options?.onTimeout?.();
        return null;
      }
      setState({ isLoading: false, isTimeout: false, error });
      throw error;
    }
  }, [defaultTimeout]);

  const reset = useCallback(() => {
    setState({ isLoading: false, isTimeout: false, error: null });
  }, []);

  return {
    ...state,
    fetchWithTimeout,
    reset,
  };
}
