
import React from 'react';

interface ReportSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const ReportSection: React.FC<ReportSectionProps> = ({ title, description, children, className = '' }) => {
  return (
    <section className={`bg-container-bg dark:bg-slate-800 p-6 rounded-xl shadow-xl mb-8 border border-slate-200 dark:border-slate-700 ${className}`}>
      <div className="mb-6 pb-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-slate-200">{title}</h2>
        {description && <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">{description}</p>}
      </div>
      {children}
    </section>
  );
};

export default ReportSection;
