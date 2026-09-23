
import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind color class e.g., 'text-primary-action'
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'text-primary-action' }) => {
  const sizeClasses: Record<string, string> = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`animate-spin rounded-full border-t-2 border-b-2 ${sizeClasses[size]} ${color} border-current`}></div>
  );
};

export default Spinner;
