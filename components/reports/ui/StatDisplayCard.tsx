import React from 'react';

interface StatDisplayCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  colorClass?: string; // e.g., 'bg-blue-100 text-blue-700'
  isCurrency?: boolean;
}

const StatDisplayCard: React.FC<StatDisplayCardProps> = ({ 
    title, 
    value, 
    description, 
    icon, 
    colorClass = 'bg-primary-action text-white', 
    isCurrency = false 
}) => {
  return (
    <div className={`p-5 rounded-xl shadow-lg ${colorClass}`}>
      {icon && <div className="mb-2 text-3xl opacity-80">{icon}</div>}
      <h4 className="text-sm font-medium opacity-90 mb-1">{title}</h4>
      <p className="text-3xl font-bold">
        {(() => {
          if (isCurrency) {
            if (typeof value === 'number') {
              return `${value.toLocaleString()} MMK`;
            }
            // If value is a string, assume it's pre-formatted but add MMK if missing.
            return String(value).includes('MMK') ? value : `${value} MMK`;
          }
          // Not currency
          if (typeof value === 'number') {
            return value.toLocaleString();
          }
          // It's a non-currency string (e.g., "50%")
          return value;
        })()}
      </p>
      {description && <p className="text-xs opacity-70 mt-1">{description}</p>}
    </div>
  );
};

export default StatDisplayCard;