// FIX: Import useRef from React to resolve 'Cannot find name' error.
import React, { createContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';
import AlertModal from '../components/ui/AlertModal';
import PromptModal from '../components/ui/PromptModal';
import { setDialogFunctions } from '../utils/dialogUtils';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'success';
}

interface AlertOptions {
  title: string;
  message: string;
  buttonText?: string;
}

interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: string;
  inputPlaceholder?: string;
}

interface ConfirmationContextType {
  showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
  showAlert: (message: string, title?: string) => Promise<void>;
  showPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
}

export const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [confirmationState, setConfirmationState] = useState<ConfirmationOptions | null>(null);
  const [alertState, setAlertState] = useState<AlertOptions | null>(null);
  const [promptState, setPromptState] = useState<PromptOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const awaitingConfirmRef = useRef<{ resolve: (value: boolean) => void } | null>(null);
  const awaitingAlertRef = useRef<{ resolve: () => void } | null>(null);
  const awaitingPromptRef = useRef<{ resolve: (value: string | null) => void } | null>(null);

  const showConfirmation = useCallback((options: ConfirmationOptions) => {
    setConfirmationState(options);
    return new Promise<boolean>((resolve) => {
      awaitingConfirmRef.current = { resolve };
    });
  }, []);

  const showAlert = useCallback((message: string, title: string = 'Alert') => {
    setAlertState({ title, message });
    return new Promise<void>((resolve) => {
      awaitingAlertRef.current = { resolve };
    });
  }, []);

  const showPrompt = useCallback((message: string, defaultValue: string = '', title: string = 'Input') => {
    setPromptState({ title, message, defaultValue });
    return new Promise<string | null>((resolve) => {
      awaitingPromptRef.current = { resolve };
    });
  }, []);

  // Set global functions for dialogUtils
  useEffect(() => {
    setDialogFunctions(showConfirmation, showAlert, showPrompt);
  }, [showConfirmation, showAlert, showPrompt]);

  const handleConfirmClose = () => {
    if (awaitingConfirmRef.current) {
      awaitingConfirmRef.current.resolve(false);
    }
    setConfirmationState(null);
  };

  const handleConfirm = () => {
    if (awaitingConfirmRef.current) {
      awaitingConfirmRef.current.resolve(true);
    }
    setConfirmationState(null);
  };

  const handleAlertClose = () => {
    if (awaitingAlertRef.current) {
      awaitingAlertRef.current.resolve();
    }
    setAlertState(null);
  };

  const handlePromptClose = () => {
    if (awaitingPromptRef.current) {
      awaitingPromptRef.current.resolve(null);
    }
    setPromptState(null);
  };

  const handlePromptConfirm = (value: string) => {
    if (awaitingPromptRef.current) {
      awaitingPromptRef.current.resolve(value);
    }
    setPromptState(null);
  };

  return (
    <ConfirmationContext.Provider value={{ showConfirmation, showAlert, showPrompt }}>
      {children}
      {confirmationState && (
        <ConfirmModal
          isOpen={!!confirmationState}
          onClose={handleConfirmClose}
          onConfirm={handleConfirm}
          title={confirmationState.title}
          message={confirmationState.message}
          confirmText={confirmationState.confirmText}
          cancelText={confirmationState.cancelText}
          confirmVariant={confirmationState.confirmVariant}
          isLoading={isLoading}
        />
      )}
      {alertState && (
        <AlertModal
          isOpen={!!alertState}
          onClose={handleAlertClose}
          title={alertState.title}
          message={alertState.message}
          buttonText={alertState.buttonText}
        />
      )}
      {promptState && (
        <PromptModal
          isOpen={!!promptState}
          onClose={handlePromptClose}
          onConfirm={handlePromptConfirm}
          title={promptState.title}
          message={promptState.message}
          defaultValue={promptState.defaultValue}
          confirmText={promptState.confirmText}
          cancelText={promptState.cancelText}
          inputType={promptState.inputType}
          inputPlaceholder={promptState.inputPlaceholder}
        />
      )}
    </ConfirmationContext.Provider>
  );
};