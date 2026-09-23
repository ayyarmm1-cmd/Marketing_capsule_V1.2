const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta?.env) {
    return import.meta.env as Record<string, string | boolean | undefined>;
  }
  try {
    // Support tests or Storybook where import.meta isn't available.
    const globalEnv = (globalThis as any)?.process?.env ?? {};
    return globalEnv;
  } catch {
    return {};
  }
};

const env = getEnv();

export const isFacebookMockModeEnabled = (): boolean => {
  const value = env?.VITE_FACEBOOK_MOCK;
  if (value === undefined || value === null || value === '') {
    return true; // Default to mock mode for review builds
  }
  return String(value).toLowerCase() !== 'false';
};


