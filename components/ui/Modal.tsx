import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  footer?: React.ReactNode;
  closeOnOutsideClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer, closeOnOutsideClick = true }) => {
  if (!isOpen) return null;

  const sizeClasses: Record<string,string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-black dark:bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeOnOutsideClick ? onClose : undefined}></div>

        {/* Modal panel */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className={`inline-block align-bottom bg-container-bg dark:bg-slate-800 rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]}`}>
          {title && (
            <div className="bg-container-bg dark:bg-slate-800 px-4 pt-3 pb-2 sm:p-4 sm:pb-2 border-b border-gray-200 dark:border-slate-700">
              <div className="sm:flex sm:items-start">
                <div className="mt-2 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-base leading-5 font-medium text-text-primary dark:text-slate-100" id="modal-title">
                    {title}
                  </h3>
                </div>
                <button
                    onClick={onClose}
                    className="absolute top-0 right-0 mt-4 mr-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
                    aria-label="Close modal"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>
            </div>
          )}
           {!title && (
             <button
                onClick={onClose}
                className="absolute top-0 right-0 mt-4 mr-4 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 z-10" // z-10 to ensure it's above content
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
           )}
          <div className="bg-container-bg dark:bg-slate-800 px-4 pt-3 pb-3 sm:p-4">
            {children}
          </div>
          {footer && (
            <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level, avoiding parent container constraints
  return createPortal(modalContent, document.body);
};

export default Modal;
