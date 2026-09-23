// Utility functions to replace browser alert, confirm, and prompt with custom dialogs
// This will be set by the DialogProvider
let globalShowConfirmation: ((options: { title: string; message: string; confirmText?: string; cancelText?: string; confirmVariant?: 'primary' | 'danger' | 'success' }) => Promise<boolean>) | null = null;
let globalShowAlert: ((message: string, title?: string) => Promise<void>) | null = null;
let globalShowPrompt: ((message: string, defaultValue?: string, title?: string) => Promise<string | null>) | null = null;

export const setDialogFunctions = (
  showConfirmation: (options: { title: string; message: string; confirmText?: string; cancelText?: string; confirmVariant?: 'primary' | 'danger' | 'success' }) => Promise<boolean>,
  showAlert: (message: string, title?: string) => Promise<void>,
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
) => {
  globalShowConfirmation = showConfirmation;
  globalShowAlert = showAlert;
  globalShowPrompt = showPrompt;
};

// Custom confirm function to replace window.confirm
export const confirm = async (message: string, title: string = 'Confirm', confirmText: string = 'Confirm', cancelText: string = 'Cancel', confirmVariant: 'primary' | 'danger' | 'success' = 'primary'): Promise<boolean> => {
  if (globalShowConfirmation) {
    return await globalShowConfirmation({ title, message, confirmText, cancelText, confirmVariant });
  }
  // Fallback to browser confirm if not initialized
  return window.confirm(message);
};

// Custom alert function to replace window.alert
export const alert = async (message: string, title: string = 'Alert'): Promise<void> => {
  if (globalShowAlert) {
    return await globalShowAlert(message, title);
  }
  // Fallback to browser alert if not initialized
  window.alert(message);
};

// Custom prompt function to replace window.prompt
export const prompt = async (message: string, defaultValue: string = '', title: string = 'Input'): Promise<string | null> => {
  if (globalShowPrompt) {
    return await globalShowPrompt(message, defaultValue, title);
  }
  // Fallback to browser prompt if not initialized
  return window.prompt(message, defaultValue);
};

