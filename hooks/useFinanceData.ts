/**
 * Reusable hooks for Finance Module data fetching
 */

import { useState, useEffect, useCallback } from 'react';
import { useNotification } from './useNotification';

interface UseFinanceDataOptions<T> {
  fetchFn: () => Promise<T>;
  dependencies?: any[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Generic data fetching hook with loading and error states
 */
export const useFinanceData = <T>({
  fetchFn,
  dependencies = [],
  onSuccess,
  onError,
}: UseFinanceDataOptions<T>) => {
  const { addNotification } = useNotification();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addNotification(`Failed to load data: ${errorMessage}`, 'error');
      onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, onSuccess, onError, addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook for fetching multiple data sources in parallel
 * @param fetchFns - Map of fetch functions
 * @param dependencies - Extra deps that trigger refetch
 * @param options.enabled - When false, skips fetch (for lazy loading). Default true.
 */
export const useFinanceDataMultiple = <T extends Record<string, any>>(
  fetchFns: Record<keyof T, () => Promise<any>>,
  dependencies: any[] = [],
  options?: { enabled?: boolean }
) => {
  const enabled = options?.enabled !== false;
  const { addNotification } = useNotification();
  const [data, setData] = useState<Partial<T>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const keys = Object.keys(fetchFns) as Array<keyof T>;
      const results = await Promise.allSettled(keys.map(key => fetchFns[key]()));
      
      const dataMap = keys.reduce((acc, key, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
          acc[key] = result.value;
        } else {
          console.error(`Failed to fetch ${String(key)}:`, result.reason);
          // Set empty array as fallback for failed requests
          acc[key] = [] as any;
        }
        return acc;
      }, {} as Partial<T>);
      
      setData(dataMap);
      
      // Check if any requests failed
      const failedKeys = keys.filter((key, index) => results[index].status === 'rejected');
      if (failedKeys.length > 0) {
        const errorMessage = `Failed to load: ${failedKeys.join(', ')}`;
        setError(errorMessage);
        addNotification(errorMessage, 'error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      addNotification(`Failed to load data: ${errorMessage}`, 'error');
      console.error('Finance data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
    // fetchFns close over startDate/endDate etc - must re-create fetchData when deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNotification, ...dependencies]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    } else {
      setData({});
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
};

