/** Global debounced refresh signal — coalesces rapid saves into one refetch wave. */
export const REFRESH_DATA_EVENT = 'refreshData';

const DEFAULT_DEBOUNCE_MS = 2500;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

/** Schedule a single refresh event after debounce (multiple calls within the window merge). */
export function dispatchRefreshData(debounceMs = DEFAULT_DEBOUNCE_MS): void {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    window.dispatchEvent(new CustomEvent(REFRESH_DATA_EVENT));
  }, debounceMs);
}

/** Fire refresh immediately (e.g. explicit user Refresh button — use page refetch instead). */
export function dispatchRefreshDataImmediate(): void {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  window.dispatchEvent(new CustomEvent(REFRESH_DATA_EVENT));
}

/** Subscribe with per-listener debounce so a burst of events still triggers at most one handler run. */
export function subscribeRefreshData(handler: () => void, debounceMs = DEFAULT_DEBOUNCE_MS): () => void {
  let handlerTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedHandler = () => {
    if (handlerTimer) clearTimeout(handlerTimer);
    handlerTimer = setTimeout(() => {
      handlerTimer = null;
      handler();
    }, debounceMs);
  };
  window.addEventListener(REFRESH_DATA_EVENT, debouncedHandler);
  return () => {
    window.removeEventListener(REFRESH_DATA_EVENT, debouncedHandler);
    if (handlerTimer) clearTimeout(handlerTimer);
  };
}
