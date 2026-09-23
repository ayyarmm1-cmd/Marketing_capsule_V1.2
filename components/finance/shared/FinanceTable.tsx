/**
 * Reusable table component for Finance Module
 */

import React from 'react';
import Spinner from '../../ui/Spinner';

interface FinanceTableProps {
  columns: Array<{
    key: string;
    label: string;
    align?: 'left' | 'right' | 'center';
    render?: (row: any, index: number) => React.ReactNode;
  }>;
  data: any[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any, index: number) => void;
  className?: string;
  rowKey?: string | ((row: any, index: number) => string);
}

const FinanceTable: React.FC<FinanceTableProps> = ({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  className = '',
  rowKey = 'id',
}) => {
  // Safety check for data
  const safeData = Array.isArray(data) ? data : [];
  
  if (isLoading && safeData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (safeData.length === 0 && !isLoading) {
    return (
      <p className="text-center text-text-secondary py-8">{emptyMessage}</p>
    );
  }

  const getRowKey = (row: any, index: number): string => {
    try {
      if (!row) return `row-${index}`;
      if (typeof rowKey === 'function') {
        return rowKey(row, index);
      }
      return row[rowKey] || `row-${index}`;
    } catch (error) {
      console.error('Error getting row key:', error, row);
      return `row-${index}`;
    }
  };

  const getAlignClass = (align?: 'left' | 'right' | 'center') => {
    switch (align) {
      case 'right':
        return 'text-right';
      case 'center':
        return 'text-center';
      default:
        return 'text-left';
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow overflow-hidden ${className}`}>
      {isLoading && safeData.length > 0 && (
        <div className="text-center py-4">
          <Spinner /> Loading more...
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 ${getAlignClass(column.align)} text-xs font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-container-bg dark:bg-slate-800">
            {safeData.map((row, index) => {
              if (!row) return null;
              return (
                <tr
                  key={getRowKey(row, index)}
                  onClick={() => onRowClick?.(row, index)}
                  className={onRowClick ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                >
                  {columns.map((column) => {
                    try {
                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3 ${getAlignClass(column.align)} text-sm text-text-primary dark:text-slate-200`}
                        >
                          {column.render ? column.render(row, index) : (row[column.key] ?? '-')}
                        </td>
                      );
                    } catch (error) {
                      console.error(`Error rendering column ${column.key}:`, error, row);
                      return (
                        <td
                          key={column.key}
                          className={`px-4 py-3 ${getAlignClass(column.align)} text-sm text-text-primary dark:text-slate-200`}
                        >
                          -
                        </td>
                      );
                    }
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinanceTable;

