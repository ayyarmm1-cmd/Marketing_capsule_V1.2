import { NotificationType } from '../contexts/NotificationContext';

/**
 * Standardized notification helper for async operations
 * Wraps an async operation with try-catch and shows appropriate notifications
 */
export const notifyOperation = async (
  addNotification: (message: string, type: NotificationType) => void,
  operation: () => Promise<void>,
  successMessage: string,
  errorPrefix: string = 'Operation failed'
): Promise<boolean> => {
  try {
    await operation();
    addNotification(successMessage, 'success');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    addNotification(`${errorPrefix}: ${errorMessage}`, 'error');
    console.error(errorPrefix, error);
    return false;
  }
};

/**
 * Helper for CRUD operations with standardized messages
 */
export const notifyCreate = (
  addNotification: (message: string, type: NotificationType) => void,
  entityName: string,
  operation: () => Promise<void>
): Promise<boolean> => {
  return notifyOperation(
    addNotification,
    operation,
    `${entityName} created successfully`,
    `Failed to create ${entityName.toLowerCase()}`
  );
};

export const notifyUpdate = (
  addNotification: (message: string, type: NotificationType) => void,
  entityName: string,
  operation: () => Promise<void>
): Promise<boolean> => {
  return notifyOperation(
    addNotification,
    operation,
    `${entityName} updated successfully`,
    `Failed to update ${entityName.toLowerCase()}`
  );
};

export const notifyDelete = (
  addNotification: (message: string, type: NotificationType) => void,
  entityName: string,
  operation: () => Promise<void>
): Promise<boolean> => {
  return notifyOperation(
    addNotification,
    operation,
    `${entityName} deleted successfully`,
    `Failed to delete ${entityName.toLowerCase()}`
  );
};

/**
 * Helper for operations that return data
 */
export const notifyOperationWithData = async <T>(
  addNotification: (message: string, type: NotificationType) => void,
  operation: () => Promise<T>,
  successMessage: string,
  errorPrefix: string = 'Operation failed'
): Promise<T | null> => {
  try {
    const result = await operation();
    addNotification(successMessage, 'success');
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    addNotification(`${errorPrefix}: ${errorMessage}`, 'error');
    console.error(errorPrefix, error);
    return null;
  }
};

/**
 * Helper for validation warnings
 */
export const notifyWarning = (
  addNotification: (message: string, type: NotificationType) => void,
  message: string
): void => {
  addNotification(message, 'warning');
};

/**
 * Helper for informational messages
 */
export const notifyInfo = (
  addNotification: (message: string, type: NotificationType) => void,
  message: string
): void => {
  addNotification(message, 'info');
};



