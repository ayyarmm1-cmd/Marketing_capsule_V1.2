import { useEffect, useRef, useCallback } from 'react';

const MIN_CHECK_INTERVAL_MS = 60 * 1000; // Check every 60 seconds

export const useInactivityTimer = (onInactive: () => void, isActive: boolean = true, timeoutHours: number = 3) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const onInactiveRef = useRef(onInactive);

  // Keep refs updated
  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  // Convert hours to milliseconds, ensuring valid number
  const getTimeoutMs = useCallback((hours: number): number => {
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0; // Disabled
    }
    return parsed * 60 * 60 * 1000;
  }, []);

  const timeoutMs = getTimeoutMs(timeoutHours);

  // Check if user has been inactive for too long
  const checkInactivity = useCallback(() => {
    if (timeoutMs <= 0) return;
    
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    if (timeSinceLastActivity >= timeoutMs) {
      console.log(`[Auto-logout] Inactive for ${Math.round(timeSinceLastActivity / 1000 / 60)} minutes. Logging out...`);
      onInactiveRef.current();
    }
  }, [timeoutMs]);

  // Reset last activity timestamp
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Throttled activity handler to avoid excessive updates
  const lastHandledRef = useRef<number>(0);
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only update if more than 5 seconds since last update (throttle)
    if (now - lastHandledRef.current > 5000) {
      lastHandledRef.current = now;
      lastActivityRef.current = now;
    }
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Don't set up timer if not active or timeout is disabled
    if (!isActive || timeoutMs <= 0) {
      return;
    }

    // Reset activity time when timer starts/restarts
    lastActivityRef.current = Date.now();
    
    // Log timer activation
    console.log(`[Auto-logout] Timer active: ${timeoutHours} hours (${timeoutMs}ms)`);

    // Set up periodic check - check every minute or quarter of timeout, whichever is smaller
    const checkInterval = Math.max(Math.min(timeoutMs / 4, MIN_CHECK_INTERVAL_MS), 10000);
    intervalRef.current = setInterval(checkInactivity, checkInterval);

    // Track user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'keydown'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // When user returns to tab: reset activity so time spent away doesn't count as inactive
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        lastActivityRef.current = Date.now(); // Reset - only count inactive time when tab is visible
        checkInactivity();
      }
    };

    const handleFocus = () => {
      lastActivityRef.current = Date.now(); // Reset on window focus
      checkInactivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isActive, timeoutMs, timeoutHours, checkInactivity, handleActivity]);

  return { resetTimer };
};







