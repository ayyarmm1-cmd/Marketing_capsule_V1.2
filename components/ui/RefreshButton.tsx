import React from 'react';
import Button from './Button';

interface RefreshButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  className?: string;
  title?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onClick, 
  isLoading = false, 
  size = 'sm',
  variant = 'ghost',
  className = '',
  title = 'Refresh'
}) => {
  return (
    <Button 
      onClick={onClick} 
      variant={variant} 
      size={size} 
      isLoading={isLoading}
      className={className}
      title={title}
    >
      <svg 
        className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
    </Button>
  );
};

export default RefreshButton;







