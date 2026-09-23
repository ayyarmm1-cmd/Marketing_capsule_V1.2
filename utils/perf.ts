export const logTiming = (label: string, startMs: number, extra?: Record<string, unknown>) => {
  const duration = performance.now() - startMs;
  if (import.meta.env.DEV) {
    if (extra) {
      console.log(`[perf] ${label}: ${duration.toFixed(1)}ms`, extra);
    } else {
      console.log(`[perf] ${label}: ${duration.toFixed(1)}ms`);
    }
  }
};

