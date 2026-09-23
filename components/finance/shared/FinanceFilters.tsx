/**
 * Reusable filter bar component for Finance Module
 */

import React from 'react';
import Input from '../../ui/Input';
import Select from '../../ui/Select';

interface FinanceFiltersProps {
  // Search
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  
  // Date filters
  showDateFilters?: boolean;
  selectedMonth?: number;
  selectedYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
  monthOptions?: Array<{ value: number; label: string }>;
  yearOptions?: Array<{ value: number; label: string }>;
  
  // Status filter
  showStatusFilter?: boolean;
  filterStatus?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: Array<{ value: string; label: string }>;
  
  // Payment method filter
  showMethodFilter?: boolean;
  selectedMethodFilter?: string;
  onMethodChange?: (method: string) => void;
  methodOptions?: Array<{ value: string; label: string }>;
  
  // Date range filters
  showDateRangeFilters?: boolean;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  
  className?: string;
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchLabel = 'Search',
  showDateFilters = false,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  monthOptions = [],
  yearOptions = [],
  showStatusFilter = false,
  filterStatus,
  onStatusChange,
  statusOptions = [],
  showMethodFilter = false,
  selectedMethodFilter,
  onMethodChange,
  methodOptions = [],
  showDateRangeFilters = false,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}) => {
  const hasFilters = 
    onSearchChange || 
    showDateFilters || 
    showStatusFilter || 
    showMethodFilter || 
    showDateRangeFilters;

  if (!hasFilters) return null;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow p-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        {/* Search Input */}
        {onSearchChange && (
          <Input
            label={searchLabel}
            placeholder={searchPlaceholder}
            value={searchTerm || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            containerClassName={showDateFilters || showStatusFilter || showMethodFilter ? 'lg:col-span-2 mb-0' : 'mb-0'}
          />
        )}

        {/* Month Filter */}
        {showDateFilters && onMonthChange && (
          <Select
            label="Month"
            options={monthOptions.map(opt => ({ value: opt.value.toString(), label: opt.label }))}
            value={selectedMonth?.toString() || ''}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            containerClassName="mb-0"
          />
        )}

        {/* Year Filter */}
        {showDateFilters && onYearChange && (
          <Select
            label="Year"
            options={yearOptions.map(opt => ({ value: opt.value.toString(), label: opt.label }))}
            value={selectedYear?.toString() || ''}
            onChange={(e) => onYearChange(Number(e.target.value))}
            containerClassName="mb-0"
          />
        )}

        {/* Status Filter */}
        {showStatusFilter && onStatusChange && (
          <Select
            label="Status"
            options={statusOptions}
            value={filterStatus || ''}
            onChange={(e) => onStatusChange(e.target.value)}
            containerClassName="mb-0"
          />
        )}

        {/* Payment Method Filter */}
        {showMethodFilter && onMethodChange && (
          <Select
            label="Payment Method"
            options={methodOptions}
            value={selectedMethodFilter || ''}
            onChange={(e) => onMethodChange(e.target.value)}
            containerClassName="mb-0"
          />
        )}

        {/* Date Range Filters */}
        {showDateRangeFilters && (
          <>
            {onStartDateChange && (
              <Input
                label="Start Date"
                type="date"
                value={startDate || ''}
                onChange={(e) => onStartDateChange(e.target.value)}
                containerClassName="mb-0"
              />
            )}
            {onEndDateChange && (
              <Input
                label="End Date"
                type="date"
                value={endDate || ''}
                onChange={(e) => onEndDateChange(e.target.value)}
                containerClassName="mb-0"
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FinanceFilters;


