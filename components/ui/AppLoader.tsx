import React from 'react';
import { APP_NAME } from '../../constants';

interface AppLoaderProps {
  logoUrl?: string | null;
}

/**
 * A modern and professional loading screen component for the ERP.
 * Features a pulsing effect on the company logo.
 * @param {AppLoaderProps} props The component props.
 * @returns {JSX.Element} The AppLoader component.
 */
const AppLoader: React.FC<AppLoaderProps> = ({ logoUrl }) => {
  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 flex flex-col items-center justify-center text-black dark:text-white">
      
      {/* Container for the logo */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        
        {/* The company logo with a pulsing effect */}
        {logoUrl ? (
            <img
                src={logoUrl}
                alt="Company Logo"
                className="h-20 w-auto object-contain animate-pulse"
            />
        ) : (
            <div className="animate-pulse">
                {/* Fallback if no logo is provided */}
                 <h1 className="text-3xl font-bold text-primary-action">{APP_NAME}</h1>
            </div>
        )}
      </div>

      {/* The animate-pulse class is now defined globally in index.html */}
    </div>
  );
};

export default AppLoader;