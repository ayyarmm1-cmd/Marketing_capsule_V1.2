import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const minLoadTime = 1500; // Minimum 1.5 seconds
    
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTime;
        const targetProgress = Math.min((elapsed / minLoadTime) * 100, 95);
        
        if (prev >= 95 && elapsed >= minLoadTime) {
          // Complete loading after minimum time
          clearInterval(interval);
          setTimeout(() => {
            setProgress(100);
            setIsComplete(true);
            setTimeout(() => {
              onComplete();
            }, 500);
          }, 200);
          return 95;
        }
        
        // Smooth progress increase
        return Math.min(prev + Math.random() * 10 + 2, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-500 ${
        isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Simple Background */}
      <div className="absolute inset-0 tech-grid opacity-10"></div>

      {/* Loading Content - Just Logo with Single Animation */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-6">
        {/* Logo with Single Pulse Animation */}
        <div className="w-32 h-32 animate-scale-in">
          <img
            src="/logo.png"
            alt="Marketing Capsule Logo"
            className="w-full h-full object-contain logo-pulse"
          />
        </div>

        {/* Progress Bar - Simple without shimmer */}
        <div className="w-64 space-y-2">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-center text-sm text-gray-400 font-medium">
            {Math.min(Math.round(progress), 100)}%
          </p>
        </div>
      </div>
    </div>
  );
}

