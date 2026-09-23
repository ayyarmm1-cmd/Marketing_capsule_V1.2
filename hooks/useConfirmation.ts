import { useContext } from 'react';
import { ConfirmationContext } from '../contexts/ConfirmationContext';

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

// Export convenience functions
export const useDialog = () => {
  const { showConfirmation, showAlert, showPrompt } = useConfirmation();
  return {
    confirm: showConfirmation,
    alert: showAlert,
    prompt: showPrompt,
  };
};