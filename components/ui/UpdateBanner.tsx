import React from 'react';
import Button from './Button';

const UpdateBanner: React.FC = () => {
  const handleRefresh = () => {
    // Perform a hard reload to clear the cache and fetch the new version
    window.location.reload();
  };

  return (
    <div 
      className="fixed top-[78px] sm:top-20 left-0 sm:left-64 right-0 bg-amber-400 dark:bg-amber-500 text-slate-900 p-2 text-center text-sm font-semibold z-[100] shadow-lg flex items-center justify-center"
      role="alert"
    >
      <span>A new version of the app is available.</span>
      <Button 
        variant="secondary" 
        size="sm" 
        className="ml-4 !py-1 !px-3 bg-white/80 hover:bg-white"
        onClick={handleRefresh}
      >
        Refresh to Update
      </Button>
    </div>
  );
};

export default UpdateBanner;
