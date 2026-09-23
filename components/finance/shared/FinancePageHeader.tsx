/**
 * Reusable page header component for Finance Module
 */

import React from 'react';
import Button from '../../ui/Button';

interface FinancePageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const FinancePageHeader: React.FC<FinancePageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <div className="flex flex-wrap justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary dark:text-slate-100">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary dark:text-slate-400">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default FinancePageHeader;


