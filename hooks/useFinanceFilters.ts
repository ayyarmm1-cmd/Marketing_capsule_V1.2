/**
 * Reusable hooks for Finance Module filtering
 */

import { useState, useMemo, useCallback } from 'react';
import { getCurrentMonthYear, getMonthOptions, getYearOptions, isDateInMonthYear, isDateInRange, matchesSearchTerm } from '../utils/financeUtils';

/**
 * Hook for date filtering (month/year)
 */
export const useDateFilters = (initialMonth?: number, initialYear?: number) => {
  const { month: defaultMonth, year: defaultYear } = getCurrentMonthYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth ?? defaultMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear ?? defaultYear);

  const monthOptions = useMemo(() => getMonthOptions(), []);
  const yearOptions = useMemo(() => getYearOptions(5), []);

  const filterByMonthYear = useCallback((dateString: string | Date): boolean => {
    return isDateInMonthYear(dateString, selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const resetFilters = useCallback(() => {
    setSelectedMonth(defaultMonth);
    setSelectedYear(defaultYear);
  }, [defaultMonth, defaultYear]);

  return {
    selectedMonth,
    selectedYear,
    setSelectedMonth,
    setSelectedYear,
    monthOptions,
    yearOptions,
    filterByMonthYear,
    resetFilters,
  };
};

/**
 * Hook for date range filtering
 */
export const useDateRangeFilters = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const filterByDateRange = useCallback((dateString: string | Date): boolean => {
    return isDateInRange(dateString, startDate, endDate);
  }, [startDate, endDate]);

  const resetFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  return {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    filterByDateRange,
    resetFilters,
  };
};

/**
 * Hook for search filtering
 */
export const useSearchFilter = <T>(initialSearchTerm: string = '') => {
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);

  const filterBySearch = useCallback((
    item: T,
    searchFields: Array<keyof T | ((item: T) => string | undefined)>
  ): boolean => {
    if (!searchTerm) return true;
    return matchesSearchTerm(item, searchTerm, searchFields);
  }, [searchTerm]);

  const resetFilter = useCallback(() => {
    setSearchTerm('');
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    filterBySearch,
    resetFilter,
  };
};

/**
 * Hook for status filtering
 */
export const useStatusFilter = <T extends { status?: string }>(initialStatus: string = '') => {
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);

  const filterByStatus = useCallback((item: T): boolean => {
    if (!filterStatus) return true;
    return item.status === filterStatus;
  }, [filterStatus]);

  const resetFilter = useCallback(() => {
    setFilterStatus('');
  }, []);

  return {
    filterStatus,
    setFilterStatus,
    filterByStatus,
    resetFilter,
  };
};

/**
 * Hook for payment method filtering
 */
export const usePaymentMethodFilter = (initialMethod: string = '') => {
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>(initialMethod);

  const filterByMethod = useCallback((method: string): boolean => {
    if (!selectedMethodFilter) return true;
    return method === selectedMethodFilter;
  }, [selectedMethodFilter]);

  const resetFilter = useCallback(() => {
    setSelectedMethodFilter('');
  }, []);

  return {
    selectedMethodFilter,
    setSelectedMethodFilter,
    filterByMethod,
    resetFilter,
  };
};

/**
 * Combined hook for common finance filters (date, search, status)
 */
export const useFinanceFilters = <T extends { status?: string }>(
  options?: {
    initialMonth?: number;
    initialYear?: number;
    initialSearchTerm?: string;
    initialStatus?: string;
    initialMethod?: string;
  }
) => {
  const dateFilters = useDateFilters(options?.initialMonth, options?.initialYear);
  const searchFilter = useSearchFilter<T>(options?.initialSearchTerm);
  const statusFilter = useStatusFilter<T>(options?.initialStatus);
  const methodFilter = usePaymentMethodFilter(options?.initialMethod);

  const resetAllFilters = useCallback(() => {
    dateFilters.resetFilters();
    searchFilter.resetFilter();
    statusFilter.resetFilter();
    methodFilter.resetFilter();
  }, [dateFilters, searchFilter, statusFilter, methodFilter]);

  return {
    ...dateFilters,
    ...searchFilter,
    ...statusFilter,
    ...methodFilter,
    resetAllFilters,
  };
};

